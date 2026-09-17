import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === Inicia ou retoma uma resposta da ENSRA-R (satisfação conjugal) ===
//
// Espelha o rbs-assessment-start (mesma lógica de match/criação de cliente
// e o mesmo suporte a invite_token do link individual gerado pelo
// terapeuta), mas grava em client_ensra_assessments — trilha própria.
//
// O consentimento LGPD é exigido também aqui no servidor (não só travado
// no botão do front) — sem isso não abre o rascunho.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
const FROM_ADDRESS = "noreply@nubiajanuzzi.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  let normalized = digits.length > 11 ? digits : `55${digits}`;
  if (normalized.startsWith("55") && normalized.length === 13) {
    normalized = normalized.slice(0, 4) + normalized.slice(5);
  }
  return normalized;
}

function normalizeName(raw: string): string {
  return raw.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

async function notifyNewSignup(name: string, email: string, whatsapp: string) {
  if (!ZEPTOMAIL_API_KEY) {
    console.warn("[ensra-assessment-start] ZEPTOMAIL_API_KEY não configurada, pulando notificação");
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
        subject: `Novo cadastro no portal: ${name}`,
        htmlbody: `
          <div style="font-family: sans-serif; color: #2C2C2C; line-height: 1.6;">
            <p>Um novo cliente se cadastrou pela ENSRA-R:</p>
            <ul>
              <li><strong>Nome:</strong> ${name}</li>
              <li><strong>E-mail:</strong> ${email}</li>
              <li><strong>WhatsApp:</strong> ${whatsapp || "não informado"}</li>
            </ul>
          </div>
        `,
      }),
    });
    if (!res.ok) {
      console.error("[ensra-assessment-start] ZeptoMail respondeu com erro na notificação:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[ensra-assessment-start] Falha ao notificar novo cadastro:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();

    if (body?.resume_assessment_id) {
      const { data: assessment } = await supabase
        .from("client_ensra_assessments")
        .select("id, client_id, version, raw_answers, status")
        .eq("id", body.resume_assessment_id)
        .maybeSingle();

      if (!assessment || assessment.status !== "in_progress") {
        return json({ error: "not_found" }, 404);
      }

      return json({
        client_id: assessment.client_id,
        assessment_id: assessment.id,
        version: assessment.version,
        raw_answers: assessment.raw_answers ?? {},
      });
    }

    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const whatsapp = String(body?.whatsapp ?? "").trim();
    const honeypot = String(body?.hp ?? "").trim();
    const lgpdConsent = body?.lgpd_consent === true;
    const wantsEmailNotification = body?.wants_email_notification === true;
    const wantsWhatsappNotification = body?.wants_whatsapp_notification === true;
    const inviteToken = String(body?.invite_token ?? "").trim();

    if (honeypot) {
      return json({ ok: true });
    }

    if (!lgpdConsent) {
      return json({ error: "É preciso aceitar o uso dos dados (LGPD) para continuar" }, 400);
    }

    let clientId: string;

    if (inviteToken) {
      const { data: inviteRows, error: inviteError } = await supabase.rpc("validate_instrument_invite", {
        p_token: inviteToken,
        p_instrument: "ensra",
      });
      if (inviteError) throw inviteError;
      const invite = inviteRows?.[0];
      if (!invite) return json({ error: "invalid_invite" }, 404);
      clientId = invite.client_id;
    } else {
      if (!name || !email) {
        return json({ error: "Nome e e-mail são obrigatórios" }, 400);
      }

      const { data: existingProfile, error: findError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (findError) throw findError;

      let matchedExistingClientId: string | null = null;
      let whatsappBelongsToAnotherClient = false;
      if (!existingProfile && whatsapp) {
        const normalizedPhone = normalizePhone(whatsapp);
        const { data: session } = await supabase
          .from("whatsapp_sessions")
          .select("client_id, profiles(name)")
          .eq("phone", normalizedPhone)
          .maybeSingle();
        if (session) {
          const owner = Array.isArray(session.profiles) ? session.profiles[0] : session.profiles;
          if (owner?.name && normalizeName(owner.name) === normalizeName(name)) {
            matchedExistingClientId = session.client_id;
          } else {
            whatsappBelongsToAnotherClient = true;
          }
        }
      }

      if (existingProfile) {
        clientId = existingProfile.id;
      } else if (matchedExistingClientId) {
        clientId = matchedExistingClientId;
      } else {
        const tempPassword = `PortalNJ@${crypto.randomUUID().slice(0, 8)}`;
        const { data: created, error: createError } = await supabase.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { name, role: "client" },
        });

        if (createError) {
          if (createError.code === "email_exists") {
            const { data: usersPage, error: listError } = await supabase.auth.admin.listUsers();
            if (listError) throw listError;
            const existingUser = usersPage.users.find((u) => u.email?.toLowerCase() === email);
            if (!existingUser) throw createError;
            clientId = existingUser.id;
          } else {
            throw createError;
          }
        } else if (!created.user) {
          throw new Error("Falha ao criar usuário");
        } else {
          clientId = created.user.id;
        }

        const profilePayload = {
          id: clientId,
          email,
          name,
          role: "client",
          active: true,
          whatsapp: whatsappBelongsToAnotherClient ? null : (whatsapp || null),
        };
        let { error: profileError } = await supabase.from("profiles").upsert(profilePayload);
        if (profileError?.message?.includes("whatsapp_sessions_phone_idx")) {
          ({ error: profileError } = await supabase.from("profiles").upsert({ ...profilePayload, whatsapp: null }));
        }
        if (profileError) throw profileError;

        await notifyNewSignup(name, email, whatsapp);
      }
    }

    const { data: lastAssessment } = await supabase
      .from("client_ensra_assessments")
      .select("version")
      .eq("client_id", clientId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const version = (lastAssessment?.version ?? 0) + 1;

    const { data: assessment, error: assessmentError } = await supabase
      .from("client_ensra_assessments")
      .insert({
        client_id: clientId,
        source: "portal",
        submitted_at: new Date().toISOString(),
        raw_answers: {},
        status: "in_progress",
        version,
        lgpd_consent: lgpdConsent,
        wants_email_notification: wantsEmailNotification,
        wants_whatsapp_notification: wantsWhatsappNotification,
      })
      .select("id")
      .single();
    if (assessmentError) throw assessmentError;

    console.log(`[ensra-assessment-start] assessment ${assessment.id} (v${version}) iniciado para ${email}`);

    return json({ client_id: clientId, assessment_id: assessment.id, version, raw_answers: {} });
  } catch (err) {
    console.error("[ensra-assessment-start] Erro inesperado:", err);
    return json({ error: String(err) }, 500);
  }
});
