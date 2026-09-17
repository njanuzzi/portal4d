import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
const APP_URL = Deno.env.get("APP_URL") ?? "https://sistema.nubiajanuzzi.com";
const FROM_ADDRESS = "noreply@nubiajanuzzi.com";
const REMINDER_INTERVAL_MS = 2 * 24 * 60 * 60 * 1000;

async function sendEmail(toAddress: string, toName: string) {
  if (!ZEPTOMAIL_API_KEY) {
    console.warn("[send-diary-reminder-emails] ZEPTOMAIL_API_KEY não configurada — pulando envio");
    return false;
  }
  const firstName = toName?.split(" ")[0] || "oi";
  const htmlBody = `
    <div style="font-family: sans-serif; color: #2C2C2C; line-height: 1.6;">
      <p>Oi, ${firstName}! Notamos que você ainda não decidiu se quer receber avisos pra preencher o diário no Portal Núbia Januzzi.</p>
      <p>Se quiser ativar (ou desativar) isso, é só acessar o portal e responder o aviso que aparece na tela do diário.</p>
      <p><a href="${APP_URL}/diary" style="color: #1B4B5A;">Acessar o Portal</a></p>
    </div>
  `;
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
        to: [{ email_address: { address: toAddress, name: toName || "Cliente" } }],
        subject: "Lembrete: preencha seu diário no Portal Núbia Januzzi",
        htmlbody: htmlBody,
      }),
    });
    if (!res.ok) {
      console.error("[send-diary-reminder-emails] ZeptoMail respondeu com erro:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[send-diary-reminder-emails] Falha ao chamar ZeptoMail:", err);
    return false;
  }
}

serve(async () => {
  const nowIso = new Date().toISOString();

  const { data: pending } = await supabase
    .from("profiles")
    .select("id, name, email")
    .eq("role", "client")
    .is("diary_reminder_preference", null)
    .not("diary_reminder_next_at", "is", null)
    .lte("diary_reminder_next_at", nowIso);

  const { data: goalRows } = await supabase.from("client_goals").select("user_id");
  const clientsWithGoal = new Set((goalRows ?? []).map((g: { user_id: string }) => g.user_id));

  let sent = 0;
  for (const client of pending ?? []) {
    if (!clientsWithGoal.has(client.id)) continue;
    const ok = await sendEmail(client.email, client.name ?? "");
    if (ok) sent++;

    await supabase
      .from("profiles")
      .update({ diary_reminder_next_at: new Date(Date.now() + REMINDER_INTERVAL_MS).toISOString() })
      .eq("id", client.id);
  }

  console.log(`[send-diary-reminder-emails] enviados: ${sent} de ${pending?.length ?? 0}`);
  return new Response(`Enviados: ${sent} de ${pending?.length ?? 0}`, { status: 200 });
});
