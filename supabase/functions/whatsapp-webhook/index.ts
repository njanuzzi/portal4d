import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MESSAGES } from "../_shared/messages.ts";

const VERIFY_TOKEN = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN")!;
const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const NOTION_API_KEY = Deno.env.get("NOTION_API_KEY")!;
const NOTION_SESSIONS_DB_ID = Deno.env.get("NOTION_SESSIONS_DB_ID")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

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

  // Se não achou por número exato, tenta variante BR (com/sem dígito 9 após o DDD)
  let resolvedSession = session;
  if (!session && phone.startsWith("55")) {
    let phoneAlt: string | null = null;
    if (phone.length === 12) {
      // Meta envia sem 9 (554888652228) → tenta com 9 (5548988652228)
      phoneAlt = phone.slice(0, 4) + "9" + phone.slice(4);
    } else if (phone.length === 13) {
      // Sessão salva sem 9 → tenta removendo (5548988652228 → 554888652228)
      phoneAlt = phone.slice(0, 4) + phone.slice(5);
    }
    if (phoneAlt) {
      const { data: sessionAlt } = await supabase
        .from("whatsapp_sessions")
        .select("*, client_id, profiles(name)")
        .eq("phone", phoneAlt)
        .maybeSingle();
      if (sessionAlt) {
        console.log("[webhook] sessão encontrada com número alternativo:", phoneAlt);
        resolvedSession = sessionAlt;
      }
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

  // Mensagem livre (não é keyword) com sessão ativa → assistente IA
  if (!keyword && resolvedSession?.status === "active" && text.trim().length > 0) {
    await handleBotConversation(phone, text, resolvedSession);
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

// ─── Assistente terapêutico IA ───────────────────────────────────────────────

async function fetchNotionSessions(clientName: string): Promise<string> {
  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_SESSIONS_DB_ID}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: {
          property: "Cliente",
          rich_text: { contains: clientName.split(" ")[0] },
        },
        sorts: [{ property: "Data da Sessão", direction: "descending" }],
        page_size: 10,
      }),
    });

    if (!res.ok) {
      console.error("[bot] Notion query falhou:", res.status);
      return "Nenhuma sessão encontrada.";
    }

    const data = await res.json();
    if (!data.results?.length) return "Nenhuma sessão encontrada.";

    const sessions = data.results.map((page: any) => {
      const title = page.properties["Nome da Sessão"]?.title?.[0]?.plain_text ?? "Sessão";
      const date = page.properties["Data da Sessão"]?.date?.start ?? "";
      const status = page.properties["Status da Sessão"]?.status?.name ?? "";

      // Extrai texto do corpo da página (blocos de parágrafo já carregados no sumário)
      const temas = page.properties["Temas"]?.multi_select?.map((t: any) => t.name).join(", ") ?? "";
      const humor = page.properties["Humor da cliente"]?.select?.name ?? "";

      return `[${date}] ${title} | Status: ${status}${temas ? ` | Temas: ${temas}` : ""}${humor ? ` | Humor: ${humor}` : ""}`;
    });

    return sessions.join("\n");
  } catch (err) {
    console.error("[bot] Erro ao buscar Notion:", err);
    return "Nenhuma sessão encontrada.";
  }
}

async function transcribeAudio(mediaId: string): Promise<string> {
  try {
    // 1. Busca URL do arquivo de mídia na Meta
    const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { "Authorization": `Bearer ${WA_TOKEN}` },
    });
    const mediaData = await mediaRes.json();
    const audioUrl = mediaData.url;
    if (!audioUrl) return "";

    // 2. Baixa o arquivo de áudio
    const audioRes = await fetch(audioUrl, {
      headers: { "Authorization": `Bearer ${WA_TOKEN}` },
    });
    const audioBuffer = await audioRes.arrayBuffer();

    // 3. Envia para Whisper
    const formData = new FormData();
    formData.append("file", new Blob([audioBuffer], { type: "audio/ogg" }), "audio.ogg");
    formData.append("model", "whisper-1");
    formData.append("language", "pt");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    });

    const whisperData = await whisperRes.json();
    console.log("[bot] Transcrição Whisper:", whisperData.text);
    return whisperData.text ?? "";
  } catch (err) {
    console.error("[bot] Erro ao transcrever áudio:", err);
    return "";
  }
}

async function handleBotConversation(phone: string, text: string, session: any) {
  const clientId = session.client_id;
  const clientName = (session as any).profiles?.name ?? "cliente";

  console.log("[bot] iniciando conversa para:", phone, "| cliente:", clientName);

  // Salva mensagem da cliente
  await supabase.from("bot_conversations").insert({
    client_id: clientId,
    phone,
    role: "user",
    content: text,
  });

  // Busca histórico das últimas 10 mensagens
  const { data: history } = await supabase
    .from("bot_conversations")
    .select("role, content")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(10);

  const messages = (history ?? []).reverse().map((m: any) => ({
    role: m.role,
    content: m.content,
  }));

  // Busca sessões do Notion
  const notionSessions = await fetchNotionSessions(clientName);

  const systemPrompt = `Você é uma assistente de apoio terapêutico do Protocolo 4D, criado pela psicoterapeuta Nubia Januzzi.
Você tem acesso às anotações das sessões desta cliente para oferecer um suporte mais personalizado e acolhedor.

HISTÓRICO DE SESSÕES DA CLIENTE ${clientName.toUpperCase()}:
${notionSessions}

DIRETRIZES OBRIGATÓRIAS:
- Nunca faça diagnósticos ou prescrições
- Nunca se passe pela terapeuta nem imite seu estilo pessoal
- Sempre acolha com empatia antes de orientar
- Use os temas das sessões para contextualizar suas respostas quando relevante
- Se a cliente demonstrar crise, sofrimento intenso ou risco, oriente a entrar em contato IMEDIATAMENTE com a Nubia e, se necessário, ligar para o CVV (188)
- Quando não souber responder adequadamente, diga que vai avisar a terapeuta
- Responda sempre em português brasileiro, de forma calorosa, direta e sem jargões clínicos
- Máximo de 3 parágrafos por resposta
- Nunca mencione que tem acesso a anotações de sessões a menos que seja necessário`;

  // Chama Claude
  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  const claudeData = await claudeRes.json();
  const resposta = claudeData.content?.[0]?.text;

  if (!resposta) {
    console.error("[bot] Claude não retornou resposta:", claudeData);
    return;
  }

  console.log("[bot] resposta Claude:", resposta.slice(0, 100));

  // Salva resposta do assistente
  await supabase.from("bot_conversations").insert({
    client_id: clientId,
    phone,
    role: "assistant",
    content: resposta,
  });

  // Envia para o WhatsApp
  const ok = await sendMessage(phone, resposta);
  if (ok) {
    await supabase.from("whatsapp_logs").insert({
      client_id: clientId,
      phone,
      direction: "outbound",
      message: resposta,
      keyword: "bot_response",
    });
  }
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

      let text = msg.text?.body ?? "";

      // Transcreve áudio se necessário
      if (msg.type === "audio" && msg.audio?.id) {
        console.log("[webhook] mensagem de áudio recebida, transcrevendo...");
        text = await transcribeAudio(msg.audio.id);
        if (!text) {
          await sendMessage(phone, "Recebi seu áudio, mas não consegui entender. Pode escrever sua mensagem? 😊");
          return new Response("OK", { status: 200 });
        }
        console.log("[webhook] áudio transcrito:", text);
      }

      await handleInbound(phone, text);
    } else {
      console.log("[webhook] POST sem messages (status update ou outro evento)");
    }
    return new Response("OK", { status: 200 });
  }

  return new Response("Method not allowed", { status: 405 });
});
