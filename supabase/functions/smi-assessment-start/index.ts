import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === Inicia ou retoma uma resposta do Inventário de Modos Esquemáticos (SMI) ===
//
// Espelha o schema-assessment-start do YSQ, mas grava em client_smi_assessments
// (trilha própria, separada de client_assessments) — os dois instrumentos
// numeram perguntas de 1..N e reaproveitar a mesma tabela faria a numeração
// colidir. Mesmo fluxo: formulário público (sem login) pede nome/e-mail/
// whatsapp e mostra o texto de boas-vindas + consentimento LGPD; casa (ou
// cria) o cliente e abre um rascunho (status='in_progress'). O front guarda
// o assessment_id no localStorage pra poder retomar depois.
//
// Casa cliente existente só por e-mail (mesma regra usada em todo o resto
// do sistema) — se bater, cria nova versão do SMI pro cliente sem duplicar
// cadastro. Versão é sequencial por cliente, mas na trilha própria do SMI
// (não compartilha contador com o YSQ).
//
// O consentimento LGPD é exigido também aqui no servidor (não só travado
// no botão do front) — sem isso não abre o rascunho.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
const FROM_ADDRESS = "noreply@nubiajanuzzi.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Avisa a terapeuta por e-mail sempre que um cliente novo se cadastra (via
// início do SMI). Fire-and-forget: uma falha aqui não deve impedir o
// cliente de continuar o formulário.
async function notifyNewSignup(name: string, email: string, whatsapp: string) {
  if (!ZEPTOMAIL_API_KEY) {
    console.warn("[smi-assessment-start] ZEPTOMAIL_API_KEY não configurada, pulando notificação");
    return;
  }
  try {
    const res = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": ZEPTOMAIL_API_KEY,
      },
      body: JSON.stringify({
        from: { address: FROM_ADDRESS, name: "Portal Núbia Januzzi" },
        to: [{ email_address: { address: "contato@nubiajanuzzi.com", name: "Núbia Januzzi" } }],
        subject: `Novo cadastro no portal: ${name}`,
        htmlbody: `
          <div style="font-family: sans-serif; color: #2C2C2C; line-height: 1.6;">
            <p>Um novo cliente se cadastrou pelo Inventário de Modos Esquemáticos (SMI):</p>
            <ul>
              <li><strong>Nome:</strong> ${name}</li>
              <li><strong>E-mail:</strong> ${email}</li>
              <li><strong>WhatsApp:</strong> ${whatsapp || "não informado"}</li>
            </ul>
          </div>
        `,
      }),
    });
    if (!res.ok) {
      console.error("[smi-assessment-start] ZeptoMail respondeu com erro na notificação:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[smi-assessment-start] Falha ao notificar novo cadastro:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();

    // Retomar um rascunho existente (localStorage do navegador)
    if (body?.resume_assessment_id) {
      const { data: assessment } = await supabase
        .from("client_smi_assessments")
        .select("id, client_id, version, raw_answers, status")
        .eq("id", body.resume_assessment_id)
        .maybeSingle();

      if (!assessment || assessment.status !== "in_progress") {
        return json({ error: "not_found" }, 404);
      }

      return json({
        client_id: assessment.client_id,
        assessment_id: assessment.id,
        version: assessment.version,
        raw_answers: assessment.raw_answers ?? {},
      });
    }

    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const whatsapp = String(body?.whatsapp ?? "").trim();
    const honeypot = String(body?.hp ?? "").trim();
    const lgpdConsent = body?.lgpd_consent === true;
    const wantsEmailNotification = body?.wants_email_notification === true;
    const wantsWhatsappNotification = body?.wants_whatsapp_notification === true;

    if (honeypot) {
      // bot de formulário — responde 200 sem criar nada
      return json({ ok: true });
    }

    if (!name || !email) {
      return json({ error: "Nome e e-mail são obrigatórios" }, 400);
    }

    if (!lgpdConsent) {
      return json({ error: "É preciso aceitar o uso dos dados (LGPD) para continuar" }, 400);
    }

    const { data: existingProfile, error: findError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (findError) throw findError;

    let clientId: string;
    if (existingProfile) {
      clientId = existingProfile.id;
    } else {
      const tempPassword = `PortalNJ@${crypto.randomUUID().slice(0, 8)}`;
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name, role: "client" },
      });
      if (createError || !created.user) throw createError ?? new Error("Falha ao criar usuário");
      clientId = created.user.id;

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: clientId,
        email,
        name,
        role: "client",
        active: true,
        whatsapp: whatsapp || null,
      });
      if (profileError) throw profileError;

      await notifyNewSignup(name, email, whatsapp);
    }

    const { data: lastAssessment } = await supabase
      .from("client_smi_assessments")
      .select("version")
      .eq("client_id", clientId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const version = (lastAssessment?.version ?? 0) + 1;

    const { data: assessment, error: assessmentError } = await supabase
      .from("client_smi_assessments")
      .insert({
        client_id: clientId,
        source: "portal",
        submitted_at: new Date().toISOString(),
        raw_answers: {},
        status: "in_progress",
        version,
        lgpd_consent: lgpdConsent,
        wants_email_notification: wantsEmailNotification,
        wants_whatsapp_notification: wantsWhatsappNotification,
      })
      .select("id")
      .single();
    if (assessmentError) throw assessmentError;

    console.log(`[smi-assessment-start] assessment ${assessment.id} (v${version}) iniciado para ${email}`);

    return json({ client_id: clientId, assessment_id: assessment.id, version, raw_answers: {} });
  } catch (err) {
    console.error("[smi-assessment-start] Erro inesperado:", err);
    return json({ error: String(err) }, 500);
  }
});
