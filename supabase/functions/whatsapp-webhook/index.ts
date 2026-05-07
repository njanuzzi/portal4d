import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MESSAGES } from "../_shared/messages.ts";

const VERIFY_TOKEN = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN")!;
const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Palavras-chave reconhecidas (normalizado: minúsculo, sem acento)
const KEYWORDS: Record<string, string> = {
  "iniciar": "iniciar",
  "entendi": "entendi",
  "nao entendi": "nao_entendi",
  "não entendi": "nao_entendi",
  "respondi": "respondi",
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function detectKeyword(text: string): string | null {
  const norm = normalize(text);
  return KEYWORDS[norm] ?? null;
}

async function sendMessage(to: string, body: string) {
  await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
}

async function handleInbound(phone: string, text: string) {
  const keyword = detectKeyword(text);

  // Busca sessão pelo número
  const { data: session } = await supabase
    .from("whatsapp_sessions")
    .select("*, client_id, profiles(name)")
    .eq("phone", phone)
    .maybeSingle();

  // Log da mensagem recebida
  await supabase.from("whatsapp_logs").insert({
    client_id: session?.client_id ?? null,
    phone,
    direction: "inbound",
    message: text,
    keyword,
  });

  // Atualiza janela 24h
  if (session) {
    await supabase
      .from("whatsapp_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("phone", phone);
  }

  // Roteamento por palavra-chave
  if (keyword === "iniciar" && session?.status === "pending") {
    const name = (session as any).profiles?.name?.split(" ")[0] ?? "Olá";
    await sendMessage(phone, MESSAGES.welcome(name));
    await supabase.from("whatsapp_logs").insert({
      client_id: session.client_id,
      phone,
      direction: "outbound",
      message: MESSAGES.welcome(name),
    });
    return;
  }

  if (keyword === "entendi" && session?.status === "pending") {
    await supabase
      .from("whatsapp_sessions")
      .update({ status: "active", opted_in_at: new Date().toISOString() })
      .eq("phone", phone);
    await sendMessage(phone, MESSAGES.optinConfirmed);
    await supabase.from("whatsapp_logs").insert({
      client_id: session.client_id,
      phone,
      direction: "outbound",
      message: MESSAGES.optinConfirmed,
    });
    return;
  }

  if (keyword === "nao_entendi" && session) {
    await supabase
      .from("whatsapp_sessions")
      .update({ status: "paused" })
      .eq("phone", phone);
    // Notifica terapeuta por e-mail
    await notifyTherapist(session);
    await sendMessage(phone, MESSAGES.notUnderstood);
    return;
  }

  if (keyword === "respondi" && session?.status === "active") {
    await sendMessage(phone, MESSAGES.diaryConfirmed);
    await supabase.from("whatsapp_logs").insert({
      client_id: session.client_id,
      phone,
      direction: "outbound",
      message: MESSAGES.diaryConfirmed,
    });
    return;
  }
}

async function notifyTherapist(session: any) {
  // Envia e-mail via ZeptoMail (mesmo padrão da V1)
  // Também cria um alerta na tabela para o dashboard
  await supabase.from("whatsapp_logs").insert({
    client_id: session.client_id,
    phone: session.phone,
    direction: "outbound",
    message: "ALERTA: cliente respondeu Não entendi",
    keyword: "nao_entendi_alert",
  });
  // TODO: integrar com ZeptoMail (mesmo helper da V1)
}

serve(async (req) => {
  // Verificação do webhook pela Meta (GET)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // Mensagens recebidas (POST)
  if (req.method === "POST") {
    const body = await req.json();
    const entry = body?.entry?.[0]?.changes?.[0]?.value;
    const messages = entry?.messages;
    if (messages?.length) {
      const msg = messages[0];
      const phone = msg.from;
      const text = msg.text?.body ?? "";
      await handleInbound(phone, text);
    }
    return new Response("OK", { status: 200 });
  }

  return new Response("Method not allowed", { status: 405 });
});
