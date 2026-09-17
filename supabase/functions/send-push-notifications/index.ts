import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @deno-types="https://esm.sh/web-push@3.6.7/src/index.d.ts"
import webpush from "https://esm.sh/web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL") ?? "mailto:nubiajanuzzicontato@gmail.com";

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async () => {
  const todayStr = new Date().toISOString().split("T")[0];

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*, profiles(name)");

  if (!subscriptions?.length) {
    return new Response("Nenhuma subscription encontrada", { status: 200 });
  }

  let sent = 0;
  let skipped = 0;

  for (const sub of subscriptions) {
    const { data: entry } = await supabase
      .from("diary_entries")
      .select("id")
      .eq("user_id", sub.client_id)
      .eq("date", todayStr)
      .maybeSingle();

    if (entry) { skipped++; continue; }

    const name = (sub as any).profiles?.name?.split(" ")[0] ?? "olá";

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({
          title: "Protocolo 4D 📋",
          body: `Oi, ${name}! Seu diário de hoje ainda não foi preenchido. Acesse agora! 💙`,
          url: "/diary",
        })
      );
      sent++;
    } catch (err) {
      console.error("[push] erro ao enviar para", sub.endpoint, err);
      if ((err as any)?.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
    }
  }

  console.log(`[push] enviados: ${sent}, pulados (já preencheram): ${skipped}`);
  return new Response(`Enviados: ${sent}, pulados: ${skipped}`, { status: 200 });
});
