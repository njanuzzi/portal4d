import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === Cadastro pelo formulário público /cadastrocliente ===
//
// Chamado direto do navegador (sem JWT do Supabase, por isso verify_jwt
// desligado) quando um cliente novo preenche o próprio cadastro no site.
// Faz o mesmo que "Novo Cliente" faz manualmente: cria o usuário de auth, a
// linha em profiles (role='client'), vincula o diário ativo (se houver) e
// manda o e-mail de primeiro acesso. Se o cliente respondeu a pergunta de
// opinião sobre o app, grava em client_signup_feedback (fica separado de
// profiles porque é dado de onboarding, não um campo de perfil).
//
// Proteção contra abuso:
// - honeypot ("hp") para bots de formulário;
// - rate limit server-side por IP, e-mail e telefone;
// - validação de formato/tamanho antes de qualquer criação em Auth.
//
// O registro do convite (client_invites) roda ANTES do e-mail de
// redefinição de senha, e cada um checa/loga seu próprio erro em vez de
// deixar a chamada seguinte ser pulada silenciosamente se uma delas falhar.

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const APP_URL = Deno.env.get("APP_URL") ?? "https://sistema.nubiajanuzzi.com";
const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
const FROM_ADDRESS = "noreply@nubiajanuzzi.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0] ??
    ""
  ).trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Avisa a terapeuta por e-mail sempre que um cliente novo se cadastra.
// Fire-and-forget: uma falha aqui não deve impedir o cadastro do cliente.
async function notifyNewSignup(name: string, email: string, whatsapp: string) {
  if (!ZEPTOMAIL_API_KEY) {
    console.warn("[client-self-signup] ZEPTOMAIL_API_KEY não configurada, pulando notificação");
    return;
  }
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
        to: [{ email_address: { address: "contato@nubiajanuzzi.com", name: "Núbia Januzzi" } }],
        subject: `Novo cadastro no portal: ${name.replace(/[\r\n]+/g, " ")}`,
        htmlbody: `
          <div style="font-family: sans-serif; color: #2C2C2C; line-height: 1.6;">
            <p>Um novo cliente se cadastrou pelo formulário rápido:</p>
            <ul>
              <li><strong>Nome:</strong> ${escapeHtml(name)}</li>
              <li><strong>E-mail:</strong> ${escapeHtml(email)}</li>
              <li><strong>WhatsApp:</strong> ${escapeHtml(whatsapp)}</li>
            </ul>
          </div>
        `,
      }),
    });
    if (!res.ok) {
      console.error("[client-self-signup] ZeptoMail respondeu com erro na notificação:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[client-self-signup] Falha ao notificar novo cadastro:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const whatsapp = String(body?.whatsapp ?? "").trim();
    const feedback = String(body?.feedback ?? "").trim();
    const honeypot = String(body?.hp ?? "").trim();

    if (honeypot) {
      console.log("[client-self-signup] Honeypot preenchido, ignorando envio (provável bot)");
      return json({ ok: true });
    }

    if (!name || !email || !whatsapp) {
      return json({ error: "Nome, e-mail e WhatsApp são obrigatórios" }, 400);
    }

    const phoneDigits = whatsapp.replace(/\D/g, "");
    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (
      name.length > 120 ||
      email.length > 254 ||
      whatsapp.length > 40 ||
      feedback.length > 2000 ||
      !emailLooksValid ||
      phoneDigits.length < 10 ||
      phoneDigits.length > 15
    ) {
      return json({ error: "Dados de cadastro inválidos" }, 400);
    }

    const clientIp = getClientIp(req);
    const { data: rateAllowed, error: rateError } = await supabase.rpc("check_client_signup_rate_limit", {
      p_ip: clientIp,
      p_email: email,
      p_phone: whatsapp,
    });
    if (rateError) throw rateError;
    if (!rateAllowed) {
      console.warn("[client-self-signup] Rate limit excedido");
      return json(
        { error: "Muitas tentativas. Tente novamente mais tarde." },
        429,
        { "Retry-After": "3600" },
      );
    }

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      console.log("[client-self-signup] Cadastro existente, retornando sucesso genérico");
      return json({ ok: true, skipped: "already_exists" });
    }

    const { data: activeDiary } = await supabase
      .from("diaries")
      .select("id")
      .eq("is_active", true)
      .maybeSingle();

    const tempPassword = `PortalNJ@${crypto.randomUUID().slice(0, 8)}`;
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name, role: "client" },
    });
    if (createError || !created.user) throw createError ?? new Error("Falha ao criar usuário");

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: created.user.id,
      email,
      name,
      role: "client",
      active: true,
      whatsapp,
      diary_id: activeDiary?.id ?? null,
    });
    if (profileError) {
      const { error: cleanupError } = await supabase.auth.admin.deleteUser(created.user.id);
      if (cleanupError) {
        console.error("[client-self-signup] Falha ao remover usuário após erro de profile:", cleanupError);
      }
      throw profileError;
    }

    if (feedback) {
      const { error: feedbackError } = await supabase
        .from("client_signup_feedback")
        .upsert({ client_id: created.user.id, feedback });
      if (feedbackError) console.error("[client-self-signup] Falha ao gravar feedback de cadastro:", feedbackError);
    }

    const { error: inviteError } = await supabase
      .from("client_invites")
      .insert({ client_id: created.user.id, email });
    if (inviteError) console.error("[client-self-signup] Falha ao registrar convite em client_invites:", inviteError);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${APP_URL}/reset-password`,
      });
      if (resetError) console.error("[client-self-signup] Falha ao enviar e-mail de primeiro acesso:", resetError);
    } catch (resetErr) {
      console.error("[client-self-signup] Exceção ao enviar e-mail de primeiro acesso:", resetErr);
    }

    await notifyNewSignup(name, email, whatsapp);

    console.log("[client-self-signup] Cliente cadastrado via /cadastrocliente");

    return json({ ok: true });
  } catch (err) {
    console.error("[client-self-signup] Erro inesperado:", err);
    return json({ error: "Não foi possível concluir o cadastro agora." }, 500);
  }
});
