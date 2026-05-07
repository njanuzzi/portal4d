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

async function sendMessage(to: string, body: string): Promise<boolean> {
  console.log("[webhook] sendMessage para:", to, "| tamanho msg:", body.length);
  const res = await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
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
  const resBody = await res.json();
  console.log("[webhook] sendMessage resposta Meta:", { status: res.status, body: resBody });
  return res.ok;
}

async function handleInbound(phone: string, text: string) {
  const keyword = detectKeyword(text);
  console.log("[webhook] handleInbound:", { phone, text, keyword });

  // Busca sessão pelo número exato
  const { data: session, error: sessionError } = await supabase
    .from("whatsapp_sessions")
    .select("*, client_id, profiles(name)")
    .eq("phone", phone)
    .maybeSingle();

  console.log("[webhook] sessão encontrada:", session ? { id: session.id, status: session.status, phone: session.phone } : null);
  if (sessionError) console.error("[webhook] erro ao buscar sessão:", sessionError);

  // Se não achou por número exato, tenta sem o dígito 9 (normalização BR)
  let resolvedSession = session;
  if (!session && phone.startsWith("55") && phone.length === 13) {
    const phoneAlt = "55" + phone.slice(4); // remove o 9: 5548988652228 → 554888652228
    const { data: sessionAlt } = await supabase
      .from("whatsapp_sessions")
      .select("*, client_id, profiles(name)")
      .eq("phone", phoneAlt)
      .maybeSingle();
    if (sessionAlt) {
      console.log("[webhook] sessão encontrada com número alternativo (sem 9):", phoneAlt);
      resolvedSession = sessionAlt;
    }
  }

  // Log da mensagem recebida
  await supabase.from("whatsapp_logs").insert({
    client_id: resolvedSession?.client_id ?? null,
    phone,
    direction: "inbound",
    message: text,
    keyword,
  });

  // Atualiza janela 24h
  if (resolvedSession) {
    await supabase
      .from("whatsapp_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", resolvedSession.id);
  }

  // Roteamento por palavra-chave
  if (keyword === "iniciar" && resolvedSession?.status === "pending") {
    const name = (resolvedSession as any).profiles?.name?.split(" ")[0] ?? "Olá";
    console.log("[webhook] enviando boas-vindas para:", phone, "| nome:", name);
    const ok = await sendMessage(phone, MESSAGES.welcome(name));
    if (ok) {
      await supabase.from("whatsapp_logs").insert({
        client_id: resolvedSession.client_id,
        phone,
        direction: "outbound",
        message: MESSAGES.welcome(name),
      });
    }
    return;
  }

  if (keyword === "entendi" && resolvedSession?.status === "pending") {
    await supabase
      .from("whatsapp_sessions")
      .update({ status: "active", opted_in_at: new Date().toISOString() })
      .eq("id", resolvedSession.id);
    console.log("[webhook] sessão ativada para:", phone);
    await sendMessage(phone, MESSAGES.optinConfirmed);
    await supabase.from("whatsapp_logs").insert({
      client_id: resolvedSession.client_id,
      phone,
      direction: "outbound",
      message: MESSAGES.optinConfirmed,
    });
    return;
  }

  if (keyword === "nao_entendi" && resolvedSession) {
    await supabase
      .from("whatsapp_sessions")
      .update({ status: "paused" })
      .eq("id", resolvedSession.id);
    await notifyTherapist(resolvedSession);
    await sendMessage(phone, MESSAGES.notUnderstood);
    return;
  }

  if (keyword === "respondi" && resolvedSession?.status === "active") {
    await sendMessage(phone, MESSAGES.diaryConfirmed);
    await supabase.from("whatsapp_logs").insert({
      client_id: resolvedSession.client_id,
      phone,
      direction: "outbound",
      message: MESSAGES.diaryConfirmed,
    });
    return;
  }

  console.log("[webhook] nenhuma ação: keyword=", keyword, "| status=", resolvedSession?.status ?? "sem sessão");
}

async function notifyTherapist(session: any) {
  await supabase.from("whatsapp_logs").insert({
    client_id: session.client_id,
    phone: session.phone,
    direction: "outbound",
    message: "ALERTA: cliente respondeu Não entendi",
    keyword: "nao_entendi_alert",
  });
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
    console.log("[webhook] POST recebido:", JSON.stringify(body).slice(0, 300));
    const entry = body?.entry?.[0]?.changes?.[0]?.value;
    const messages = entry?.messages;
    if (messages?.length) {
      const msg = messages[0];
      const phone = msg.from;
      const text = msg.text?.body ?? "";
      await handleInbound(phone, text);
    } else {
      console.log("[webhook] POST sem messages (status update ou outro evento)");
    }
    return new Response("OK", { status: 200 });
  }

  return new Response("Method not allowed", { status: 405 });
});
