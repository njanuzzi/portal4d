import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function isInternalRequest(req: Request): Promise<boolean> {
  const token = req.headers.get("X-Portal-Internal-Token") ?? "";
  if (!token) return false;

  const { data, error } = await supabase.rpc("verify_internal_edge_token", { p_token: token });
  if (error) {
    console.error("[send-diary-fill-reminder-emails] Falha ao validar token interno:", error.message);
    return false;
  }
  return data === true;
}

const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
const APP_URL = Deno.env.get("APP_URL") ?? "https://sistema.nubiajanuzzi.com";
const FROM_ADDRESS = "noreply@nubiajanuzzi.com";

async function sendEmail(toAddress: string, toName: string) {
  if (!ZEPTOMAIL_API_KEY) {
    console.warn("[send-diary-fill-reminder-emails] ZEPTOMAIL_API_KEY não configurada — pulando envio");
    return false;
  }
  const firstName = toName?.split(" ")[0] || "oi";
  const htmlBody = `
    <div style="font-family: sans-serif; color: #2C2C2C; line-height: 1.6;">
      <p>Oi, ${firstName}! Seu diário de hoje no Portal Núbia Januzzi ainda não foi preenchido.</p>
      <p><a href="${APP_URL}/diary" style="color: #1B4B5A;">Preencher agora</a></p>
      <p style="color:#888;font-size:12px;">Você está recebendo esse e-mail porque escolheu ser avisado(a) no portal. Pra parar de receber, acesse a página do Diário e desative nas configurações de aviso.</p>
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
        subject: "Seu diário de hoje ainda não foi preenchido",
        htmlbody: htmlBody,
      }),
    });
    if (!res.ok) {
      console.error("[send-diary-fill-reminder-emails] ZeptoMail respondeu com erro:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[send-diary-fill-reminder-emails] Falha ao chamar ZeptoMail:", err);
    return false;
  }
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!(await isInternalRequest(req))) return new Response("Forbidden", { status: 403 });

  const todayStr = new Date().toISOString().split("T")[0];

  const { data: enabledClients } = await supabase
    .from("profiles")
    .select("id, name, email")
    .eq("role", "client")
    .eq("diary_reminder_preference", "enabled");

  const { data: goalRows } = await supabase.from("client_goals").select("user_id");
  const clientsWithGoal = new Set((goalRows ?? []).map((g: { user_id: string }) => g.user_id));

  let sent = 0;
  let skipped = 0;

  for (const client of enabledClients ?? []) {
    if (!clientsWithGoal.has(client.id)) { skipped++; continue; }

    const { data: entry } = await supabase
      .from("diary_entries")
      .select("id")
      .eq("user_id", client.id)
      .eq("date", todayStr)
      .maybeSingle();

    if (entry) { skipped++; continue; }

    const ok = await sendEmail(client.email, client.name ?? "");
    if (ok) sent++;
  }

  console.log(`[send-diary-fill-reminder-emails] enviados: ${sent}, pulados (já preencheram ou sem meta): ${skipped}`);
  return new Response(`Enviados: ${sent}, pulados: ${skipped}`, { status: 200 });
});
