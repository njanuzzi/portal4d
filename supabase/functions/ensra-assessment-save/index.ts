import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === Salva respostas da ENSRA-R (satisfação conjugal) ===
//
// 5 itens numa página só (sem paginação) — o front sempre chama esta
// função uma única vez, já com finish=true e as 5 respostas completas.
//
// Unidimensional: escala global = média direta dos 5 itens (escala 0-8 por
// item). Não há pontos de corte validados pra população brasileira ainda.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

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
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const assessmentId = String(body?.assessment_id ?? "");
    const answers = body?.answers ?? {};
    const finish = body?.finish === true;

    if (!assessmentId) return json({ error: "assessment_id obrigatório" }, 400);

    const { data: assessment, error: findError } = await supabase
      .from("client_ensra_assessments")
      .select("id, raw_answers, status")
      .eq("id", assessmentId)
      .maybeSingle();
    if (findError) throw findError;
    if (!assessment || assessment.status !== "in_progress") {
      return json({ error: "Rascunho não encontrado ou já concluído" }, 404);
    }

    const mergedAnswers = { ...(assessment.raw_answers as Record<string, number> ?? {}), ...answers };

    if (!finish) {
      const { error: updateError } = await supabase
        .from("client_ensra_assessments")
        .update({ raw_answers: mergedAnswers })
        .eq("id", assessmentId);
      if (updateError) throw updateError;
      return json({ ok: true, answered_count: Object.keys(mergedAnswers).length });
    }

    const { data: questions, error: questionsError } = await supabase
      .from("ensra_questions")
      .select("question_number");
    if (questionsError) throw questionsError;

    const answeredCount = Object.keys(mergedAnswers).length;
    const totalQuestions = questions?.length ?? 5;
    if (answeredCount < totalQuestions) {
      return json({ error: `Faltam respostas: ${answeredCount}/${totalQuestions}` }, 400);
    }

    const sum = Object.values(mergedAnswers).reduce((total: number, v) => total + (Number(v) || 0), 0);
    const global = Math.round((sum / totalQuestions) * 100) / 100;

    const { error: updateError } = await supabase
      .from("client_ensra_assessments")
      .update({ raw_answers: mergedAnswers, status: "calculated", submitted_at: new Date().toISOString() })
      .eq("id", assessmentId);
    if (updateError) throw updateError;

    console.log(`[ensra-assessment-save] assessment ${assessmentId} finalizado e calculado`);

    return json({ ok: true, scores: { global } });
  } catch (err) {
    console.error("[ensra-assessment-save] Erro inesperado:", err);
    return json({ error: String(err) }, 500);
  }
});
