import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const MANYCHAT_API_TOKEN = Deno.env.get("MANYCHAT_API_TOKEN");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Sequência de opt-in em 3 perguntas (configurada no Flow Builder do
// Manychat, com botões de resposta rápida) — cada botão dispara uma
// External Request pra cá com uma dessas keywords. Guardamos a resposta
// permanentemente no perfil do cliente (não na sessão, que é recriada a
// cada reenvio de convite) e também marcamos/desmarcamos uma tag no
// Manychat com o mesmo nome — as automações recorrentes (lembrete diário,
// lembrete semanal de agendamento) e os broadcasts avulsos (reflexões)
// são configurados lá dentro do Manychat mirando essas tags, já que a API
// do Manychat não permite disparar templates de WhatsApp por fora da
// plataforma.
const OPTIN_KEYWORD_MAP: Record<string, { column: string; value: boolean; tag: string }> = {
  diario_sim: { column: "whatsapp_diary_reminder_optin", value: true, tag: "diario_optin" },
  diario_nao: { column: "whatsapp_diary_reminder_optin", value: false, tag: "diario_optin" },
  agendamento_sim: { column: "whatsapp_appointment_reminder_optin", value: true, tag: "agendamento_optin" },
  agendamento_nao: { column: "whatsapp_appointment_reminder_optin", value: false, tag: "agendamento_optin" },
  info_sim: { column: "whatsapp_general_info_optin", value: true, tag: "info_optin" },
  info_nao: { column: "whatsapp_general_info_optin", value: false, tag: "info_optin" },
};

// Marca (Sim) ou desmarca (Não) a tag no contato do Manychat correspondente
// à resposta. Best-effort: se o Manychat recusar, só loga — o dado
// permanente já foi salvo em profiles logo antes desta chamada.
async function setSubscriberTag(subscriberId: string, tagName: string, add: boolean) {
  if (!MANYCHAT_API_TOKEN) {
    console.error("[manychat-webhook] MANYCHAT_API_TOKEN não configurado, pulando tag");
    return;
  }
  const endpoint = add ? "addTagByName" : "removeTagByName";
  const res = await fetch(`https://api.manychat.com/fb/subscriber/${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${MANYCHAT_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ subscriber_id: subscriberId, name: tagName }),
  });
  const body = await res.json().catch(() => null);
  console.log(`[manychat-webhook] ${endpoint}:`, { subscriberId, tagName, status: res.status, body: JSON.stringify(body) });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("[manychat-webhook] payload recebido:", JSON.stringify(body));

    const { whatsapp_id, last_text_input, keyword } = body;

    if (!whatsapp_id || !keyword) {
      return new Response("Campos obrigatórios: whatsapp_id, keyword", { status: 400, headers: corsHeaders });
    }

    // Normaliza o número para o mesmo formato salvo no banco
    const digits = whatsapp_id.replace(/\D/g, "");
    let phone = digits.length > 11 ? digits : `55${digits}`;
    if (phone.startsWith("55") && phone.length === 13) {
      phone = phone.slice(0, 4) + phone.slice(5);
    }

    console.log("[manychat-webhook] keyword:", keyword, "| phone:", phone);

    // Busca sessão do cliente
    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("*, client_id")
      .eq("phone", phone)
      .maybeSingle();

    // Log da mensagem recebida
    await supabase.from("whatsapp_logs").insert({
      client_id: session?.client_id ?? null,
      phone,
      direction: "inbound",
      message: last_text_input ?? keyword,
      keyword,
    });

    if (!session) {
      console.log("[manychat-webhook] nenhuma sessão encontrada para:", phone);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Atualiza janela 24h
    await supabase
      .from("whatsapp_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", session.id);

    // Roteamento por palavra-chave
    if (keyword === "iniciar" && session.status === "pending") {
      console.log("[manychat-webhook] sessão pending, aguardando entendi");
      // ManyChat envia a mensagem de boas-vindas automaticamente
    }

    if (keyword === "entendi" && session.status === "pending") {
      await supabase
        .from("whatsapp_sessions")
        .update({ status: "active", opted_in_at: new Date().toISOString() })
        .eq("id", session.id);
      console.log("[manychat-webhook] sessão ativada para:", phone);
      await supabase.from("whatsapp_logs").insert({
        client_id: session.client_id,
        phone,
        direction: "outbound",
        message: "Sessão ativada via ManyChat",
      });
    }

    if (keyword === "nao_entendi") {
      await supabase
        .from("whatsapp_sessions")
        .update({ status: "paused" })
        .eq("id", session.id);
      await supabase.from("whatsapp_logs").insert({
        client_id: session.client_id,
        phone,
        direction: "outbound",
        message: "ALERTA: cliente respondeu Não entendi",
        keyword: "nao_entendi_alert",
      });
      console.log("[manychat-webhook] sessão pausada para:", phone);
    }

    if (keyword === "respondi" && session.status === "active") {
      await supabase.from("whatsapp_logs").insert({
        client_id: session.client_id,
        phone,
        direction: "outbound",
        message: "Cliente confirmou preenchimento do diário",
      });
      console.log("[manychat-webhook] diário confirmado para:", phone);
    }

    // As 3 perguntas de opt-in (diário / agendamento / informações gerais)
    const optin = OPTIN_KEYWORD_MAP[keyword];
    if (optin && session.client_id) {
      await supabase
        .from("profiles")
        .update({ [optin.column]: optin.value })
        .eq("id", session.client_id);

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("manychat_subscriber_id")
        .eq("id", session.client_id)
        .maybeSingle();
      if (profileRow?.manychat_subscriber_id) {
        await setSubscriberTag(profileRow.manychat_subscriber_id, optin.tag, optin.value);
      }

      await supabase.from("whatsapp_logs").insert({
        client_id: session.client_id,
        phone,
        direction: "outbound",
        message: `Opt-in registrado: ${optin.column} = ${optin.value}`,
        keyword,
      });
      console.log(`[manychat-webhook] opt-in ${optin.column}=${optin.value} para:`, phone);
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("[manychat-webhook] erro:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
