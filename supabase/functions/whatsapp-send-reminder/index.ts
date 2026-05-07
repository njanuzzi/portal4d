import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MESSAGES } from "../_shared/messages.ts";

const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
const APP_URL = Deno.env.get("VITE_APP_URL") ?? "https://portal4d.vercel.app";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

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

serve(async () => {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD UTC

  // Busca sessões ativas dentro da janela de 24h
  const { data: sessions } = await supabase
    .from("whatsapp_sessions")
    .select("*, profiles(name)")
    .eq("status", "active")
    .gte("last_message_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

  if (!sessions?.length) {
    return new Response("Nenhuma sessão ativa na janela 24h", { status: 200 });
  }

  for (const session of sessions) {
    // Verifica se o cliente já preencheu o diário hoje
    const { data: entry } = await supabase
      .from("diary_entries")
      .select("id")
      .eq("client_id", session.client_id)
      .eq("date", todayStr)
      .maybeSingle();

    if (entry) continue; // Já preencheu — pula

    // Envia lembrete
    const name = (session as any).profiles?.name?.split(" ")[0] ?? "Olá";
    const message = MESSAGES.reminder(name, APP_URL);
    await sendMessage(session.phone, message);

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
