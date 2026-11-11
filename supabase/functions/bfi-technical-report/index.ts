import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateBfiTechnicalReport, reviseBfiTechnicalReport } from "../_shared/bfiTechnicalReport.ts";

// === Relatório técnico do Big Five — ações da terapeuta ===
//
// { assessment_id }               → gera de novo (o automático roda em
//                                   bfi-assessment-save quando a cliente conclui)
// { assessment_id, instruction }  → ajusta o relatório atual com o pedido
//
// Chamada pelo próprio Portal4D (terapeuta autenticada) — verify_jwt=true.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function requireTherapist(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const { data: userData, error: userError } = await supabase.auth.getUser(match[1]);
  if (userError || !userData.user) return false;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  return !profileError && profile?.role === "therapist";
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!(await requireTherapist(req))) return json({ error: "Forbidden" }, 403);

  try {
    const body = await req.json();
    const assessmentId = String(body?.assessment_id ?? "");
    const instruction = String(body?.instruction ?? "").trim();
    if (!assessmentId) return json({ error: "assessment_id é obrigatório" }, 400);

    if (instruction) {
      console.log(`[bfi-technical-report] Ajustando relatório do assessment ${assessmentId}`);
      await reviseBfiTechnicalReport(supabase, assessmentId, instruction);
    } else {
      console.log(`[bfi-technical-report] Gerando relatório do assessment ${assessmentId}`);
      await generateBfiTechnicalReport(supabase, assessmentId);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("[bfi-technical-report] Erro inesperado:", err);
    return json({ error: String(err) }, 500);
  }
});
