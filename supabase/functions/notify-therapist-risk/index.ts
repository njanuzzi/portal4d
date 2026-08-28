import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === Notifica a terapeuta por e-mail quando o bot detecta sinal de risco (Fase 3 da V3) ===
//
// Chamada por api/chat.ts quando a tool flagRisk dispara. verify_jwt=false — protegida por
// BOT_INTERNAL_SECRET (não é sessão de usuário, é uma chamada servidor-a-servidor).
//
// Usa e-mail (ZeptoMail), não WhatsApp: a API do WhatsApp Business só permite mensagem de texto livre
// pra um número que mandou mensagem nas últimas 24h — funciona pros lembretes de diário porque é a
// cliente quem inicia o contato, mas não funciona aqui porque é o sistema tentando mandar pra terapeuta,
// que não tem essa janela aberta com o próprio número do sistema. Testado e confirmado que a Meta
// rejeita (erro 200, "permissions") antes de trocar pra e-mail.

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const INTERNAL_SECRET = Deno.env.get("BOT_INTERNAL_SECRET")!;
const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
const FROM_ADDRESS = "noreply@nubiajanuzzi.com";
const THERAPIST_EMAIL = "contato@nubiajanuzzi.com"; // mesmo destino já usado em schema-assessment-start

const CATEGORY_LABEL: Record<string, string> = {
  ideacao_suicida: "ideação suicida",
  autolesao: "autolesão",
  risco_generico: "risco genérico",
};

async function sendAlertEmail(clientName: string, category: string, safeSummary: string) {
  if (!ZEPTOMAIL_API_KEY) {
    console.error("[notify-therapist-risk] ZEPTOMAIL_API_KEY não configurada, alerta não enviado por e-mail");
    return false;
  }
  const label = CATEGORY_LABEL[category] ?? category;
  const res = await fetch("https://api.zeptomail.com/v1.1/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: ZEPTOMAIL_API_KEY,
    },
    body: JSON.stringify({
      from: { address: FROM_ADDRESS, name: "Portal Núbia Januzzi" },
      to: [{ email_address: { address: THERAPIST_EMAIL, name: "Núbia Januzzi" } }],
      subject: `⚠️ Alerta do assistente do portal — ${clientName}`,
      htmlbody: `
        <div style="font-family: sans-serif; color: #2C2C2C; line-height: 1.6;">
          <p><strong>${clientName}</strong> teve um sinal de <strong>${label}</strong> numa conversa com o assistente do portal.</p>
          <p>Resumo (gerado pelo próprio assistente, não é a transcrição da conversa):</p>
          <p style="background: #F4EDE0; padding: 12px; border-radius: 6px;">${safeSummary}</p>
          <p>A cliente já recebeu recursos de emergência (CVV 188) automaticamente na resposta do assistente.</p>
        </div>
      `,
    }),
  });
  if (!res.ok) {
    console.error("[notify-therapist-risk] ZeptoMail respondeu com erro:", res.status, await res.text());
    return false;
  }
  return true;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (req.headers.get("X-Bot-Internal-Secret") !== INTERNAL_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const { client_id, category, safe_summary } = await req.json();
    if (!client_id || !category) {
      return new Response("client_id e category são obrigatórios", { status: 400 });
    }

    const { data: client } = await supabase.from("profiles").select("name").eq("id", client_id).maybeSingle();

    const sent = await sendAlertEmail(client?.name ?? "Uma cliente", category, safe_summary ?? "(sem resumo)");

    return new Response(JSON.stringify({ email_sent: sent }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-therapist-risk] Erro inesperado:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
