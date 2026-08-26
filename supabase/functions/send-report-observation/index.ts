import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === Comunicação interna sobre um relatório (cliente <-> terapeuta) ===
//
// Recebe { assessment_id, message, observation_id?, parent_id? } OU
// { session_report_id, message, observation_id?, parent_id? } com o JWT de
// quem está chamando (cliente OU terapeuta — o mesmo endpoint serve os dois
// lados). A identidade de quem está mandando NUNCA vem do body, sempre do JWT
// validado pelo Supabase — isso evita que um cliente possa se passar pela
// terapeuta ou vice-versa.
//
// Serve dois tipos de relatório (assessment_id = devolutiva de esquemas,
// session_report_id = relatório de sessão) — exatamente um dos dois precisa
// vir preenchido, igual ao check constraint da tabela report_observations.
//
// Sem observation_id: cria uma observação nova já como "sent" (com parent_id
// opcional, quando é resposta a outra observação).
// Com observation_id: promove uma observação existente (rascunho ou já
// enviada) pra "sent", opcionalmente atualizando o texto — usado tanto para
// "enviar" um rascunho quanto para reenviar após editar.
//
// Sempre manda um e-mail via ZeptoMail pro OUTRO lado da conversa.

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
const APP_URL = Deno.env.get("APP_URL") ?? "https://sistema.nubiajanuzzi.com";
const THERAPIST_FALLBACK_EMAIL = "contato@nubiajanuzzi.com";
const FROM_ADDRESS = "noreply@nubiajanuzzi.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendEmail(toAddress: string, toName: string, subject: string, htmlBody: string) {
  if (!ZEPTOMAIL_API_KEY) {
    console.warn("[send-report-observation] ZEPTOMAIL_API_KEY não configurada — pulando envio de e-mail");
    return false;
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
        from: { address: FROM_ADDRESS, name: "Portal4D" },
        to: [{ email_address: { address: toAddress, name: toName } }],
        subject,
        htmlbody: htmlBody,
      }),
    });
    if (!res.ok) {
      console.error("[send-report-observation] ZeptoMail respondeu com erro:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[send-report-observation] Falha ao chamar ZeptoMail:", err);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { assessment_id, session_report_id, message, observation_id, parent_id } = await req.json();
    if ((!assessment_id && !session_report_id) || (assessment_id && session_report_id)) {
      return new Response(JSON.stringify({ error: "Informe exatamente um entre assessment_id e session_report_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "message é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, name, email")
      .eq("id", user.id)
      .single();
    if (profileError || !callerProfile) throw profileError ?? new Error("Perfil não encontrado");

    // Resolve o dono (client_id) e um rótulo pro e-mail, seja qual for o
    // tipo de relatório referenciado.
    let clientId: string;
    let clientProfile: { name?: string; email?: string } | null;
    let reportLabel: string;

    if (assessment_id) {
      const { data: assessment, error: assessmentError } = await supabase
        .from("client_assessments")
        .select("id, client_id, profiles(name, email)")
        .eq("id", assessment_id)
        .single();
      if (assessmentError || !assessment) throw assessmentError ?? new Error("Assessment não encontrado");
      clientId = assessment.client_id;
      clientProfile = (assessment as unknown as { profiles: typeof clientProfile }).profiles;
      reportLabel = "relatório de esquemas";
    } else {
      const { data: sessionReport, error: sessionReportError } = await supabase
        .from("session_reports")
        .select("id, client_id, profiles(name, email)")
        .eq("id", session_report_id)
        .single();
      if (sessionReportError || !sessionReport) throw sessionReportError ?? new Error("Relatório de sessão não encontrado");
      clientId = sessionReport.client_id;
      clientProfile = (sessionReport as unknown as { profiles: typeof clientProfile }).profiles;
      reportLabel = "relatório de sessão";
    }

    let authorRole: "client" | "therapist";
    let recipientEmail: string;
    let recipientName: string;
    let subject: string;

    if (callerProfile.role === "client") {
      if (clientId !== callerProfile.id) {
        return new Response(JSON.stringify({ error: "Esse relatório não pertence a este cliente" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authorRole = "client";

      // Há mais de um perfil com role='therapist' no banco (conta admin +
      // conta real) — em vez de adivinhar qual pegar, usa sempre o e-mail
      // real documentado, garantindo que a notificação chega na caixa certa.
      recipientEmail = THERAPIST_FALLBACK_EMAIL;
      recipientName = "Núbia";
      subject = `Novo comentário de ${callerProfile.name} no ${reportLabel}`;
    } else if (callerProfile.role === "therapist") {
      authorRole = "therapist";
      recipientEmail = clientProfile?.email ?? "";
      recipientName = clientProfile?.name ?? "Cliente";
      subject = `Sua terapeuta comentou seu ${reportLabel}`;
      if (!recipientEmail) {
        return new Response(JSON.stringify({ error: "Cliente sem e-mail cadastrado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "Perfil sem permissão para comentar" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (observation_id) {
      // Promove uma observação existente (rascunho ou já enviada) pra "sent".
      // Verifica que a linha realmente pertence a quem está chamando antes de mexer.
      const { data: existing, error: fetchError } = await supabase
        .from("report_observations")
        .select("id, assessment_id, session_report_id, client_id, author_role")
        .eq("id", observation_id)
        .single();
      if (fetchError || !existing) throw fetchError ?? new Error("Observação não encontrada");
      const sameTarget = assessment_id
        ? existing.assessment_id === assessment_id
        : existing.session_report_id === session_report_id;
      if (!sameTarget || existing.author_role !== authorRole || existing.client_id !== clientId) {
        return new Response(JSON.stringify({ error: "Essa observação não pertence a você" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await supabase
        .from("report_observations")
        .update({ message: message.trim(), status: "sent", updated_at: new Date().toISOString() })
        .eq("id", observation_id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase.from("report_observations").insert({
        assessment_id: assessment_id ?? null,
        session_report_id: session_report_id ?? null,
        client_id: clientId,
        author_role: authorRole,
        message: message.trim(),
        status: "sent",
        parent_id: parent_id ?? null,
      });
      if (insertError) throw insertError;
    }

    const portalLink = authorRole === "client"
      ? `${APP_URL}/clients/${clientId}`
      : `${APP_URL}/reports`;

    const htmlBody = `
      <div style="font-family: sans-serif; color: #2C2C2C; line-height: 1.6;">
        <p>${authorRole === "client" ? `${escapeHtml(callerProfile.name)} deixou um comentário no ${reportLabel}:` : `Sua terapeuta comentou seu ${reportLabel}:`}</p>
        <blockquote style="border-left: 3px solid #C9A84C; margin: 12px 0; padding: 8px 16px; background: #F4EDE0;">
          ${escapeHtml(message.trim())}
        </blockquote>
        <p><a href="${portalLink}" style="color: #1B4B5A;">Ver no Portal4D</a></p>
      </div>
    `;

    const emailSent = await sendEmail(recipientEmail, recipientName, subject, htmlBody);

    console.log(`[send-report-observation] Observação registrada (${assessment_id ? `assessment ${assessment_id}` : `session_report ${session_report_id}`}, autor ${authorRole}, e-mail enviado: ${emailSent})`);

    return new Response(
      JSON.stringify({ ok: true, email_sent: emailSent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-report-observation] Erro inesperado:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
