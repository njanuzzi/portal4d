import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MESSAGES } from "../_shared/messages.ts";

const MANYCHAT_API_TOKEN = Deno.env.get("MANYCHAT_API_TOKEN")!;
const APP_URL = Deno.env.get("VITE_APP_URL") ?? "https://portal4d.vercel.app";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Envio pelo Manychat (substitui o envio direto pela API da Meta) — usa o
// subscriber_id gravado em profiles.manychat_subscriber_id no cadastro.
async function sendMessage(subscriberId: string, text: string): Promise<boolean> {
  const res = await fetch("https://api.manychat.com/fb/sending/sendContent", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${MANYCHAT_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subscriber_id: subscriberId,
      data: { version: "v2", content: { messages: [{ type: "text", text }] } },
    }),
  });
  const resBody = await res.json();
  console.log("[send-reminder] Manychat sendContent resposta:", { status: res.status, body: resBody });
  return res.ok;
}

serve(async () => {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD UTC

  // Busca sessões ativas dentro da janela de 24h
  const { data: sessions } = await supabase
    .from("whatsapp_sessions")
    .select("*, profiles(name, manychat_subscriber_id)")
    .eq("status", "active")
    .gte("last_message_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

  if (!sessions?.length) {
    return new Response("Nenhuma sessão ativa na janela 24h", { status: 200 });
  }

  for (const session of sessions as unknown as Array<
    { id: string; client_id: string; phone: string; profiles: { name: string; manychat_subscriber_id: string | null } | null }
  >) {
    const subscriberId = session.profiles?.manychat_subscriber_id;
    if (!subscriberId) {
      console.warn("[send-reminder] cliente sem manychat_subscriber_id, pulando:", session.client_id);
      continue;
    }

    // Verifica se o cliente já preencheu o diário hoje
    const { data: entry } = await supabase
      .from("diary_entries")
      .select("id")
      .eq("client_id", session.client_id)
      .eq("date", todayStr)
      .maybeSingle();

    if (entry) continue; // Já preencheu — pula

    // Envia lembrete
    const name = session.profiles?.name?.split(" ")[0] ?? "Olá";
    const message = MESSAGES.reminder(name, APP_URL);
    const ok = await sendMessage(subscriberId, message);
    if (!ok) continue;

    // Atualiza last_reminder_at + log
    await supabase
      .from("whatsapp_sessions")
      .update({ last_reminder_at: now.toISOString() })
      .eq("id", session.id);

    await supabase.from("whatsapp_logs").insert({
      client_id: session.client_id,
      phone: session.phone,
      direction: "outbound",
      message,
    });
  }

  return new Response("Lembretes enviados", { status: 200 });
});
