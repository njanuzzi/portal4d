import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === Inicia ou retoma uma resposta do Inventário de Modos Esquemáticos (SMI) ===
//
// Espelha o schema-assessment-start do YSQ, mas grava em client_smi_assessments
// (trilha própria, separada de client_assessments) — os dois instrumentos
// numeram perguntas de 1..N e reaproveitar a mesma tabela faria a numeração
// colidir. Mesmo fluxo: formulário público (sem login) pede nome/e-mail/
// whatsapp e mostra o texto de boas-vindas + consentimento LGPD; casa (ou
// cria) o cliente e abre um rascunho (status='in_progress'). O front guarda
// o assessment_id no localStorage pra poder retomar depois.
//
// Casa cliente existente só por e-mail (mesma regra usada em todo o resto
// do sistema) — se bater, cria nova versão do SMI pro cliente sem duplicar
// cadastro. Versão é sequencial por cliente, mas na trilha própria do SMI
// (não compartilha contador com o YSQ).
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

// Mesma normalização usada pelo trigger trigger_create_whatsapp_session (só
// dígitos, prefixa 55 se faltar DDI, remove o 9 extra de celular quando vem
// com DDI) — precisamos calcular o mesmo telefone que ele vai gravar em
// whatsapp_sessions.phone pra conseguir checar de quem é ANTES de tentar
// criar o cadastro, em vez de descobrir só quando o insert já falhou.
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  let normalized = digits.length > 11 ? digits : `55${digits}`;
  if (normalized.startsWith("55") && normalized.length === 13) {
    normalized = normalized.slice(0, 4) + normalized.slice(5);
  }
  return normalized;
}

function normalizeName(raw: string): string {
  return raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

// Avisa a terapeuta por e-mail sempre que um cliente novo se cadastra (via
// início do SMI). Fire-and-forget: uma falha aqui não deve impedir o
// cliente de continuar o formulário.
async function notifyNewSignup(name: string, email: string, whatsapp: string) {
  if (!ZEPTOMAIL_API_KEY) {
    console.warn("[smi-assessment-start] ZEPTOMAIL_API_KEY não configurada, pulando notificação");
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
            <p>Um novo cliente se cadastrou pelo Inventário de Modos Esquemáticos (SMI):</p>
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
      console.error("[smi-assessment-start] ZeptoMail respondeu com erro na notificação:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[smi-assessment-start] Falha ao notificar novo cadastro:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();

    // Retomar um rascunho existente (localStorage do navegador)
    if (body?.resume_assessment_id) {
      const resumeAssessmentId = String(body.resume_assessment_id);
      const resumeToken = String(body?.resume_token ?? "");

      if (!resumeToken) return json({ error: "not_found" }, 404);

      const { data: tokenValid, error: tokenError } = await supabase.rpc("verify_assessment_edit_token", {
        p_instrument: "smi",
        p_assessment_id: resumeAssessmentId,
        p_token: resumeToken,
      });
      if (tokenError) throw tokenError;
      if (!tokenValid) return json({ error: "not_found" }, 404);

      const { data: assessment } = await supabase
        .from("client_smi_assessments")
        .select("id, client_id, version, raw_answers, status")
        .eq("id", resumeAssessmentId)
        .maybeSingle();

      if (!assessment || assessment.status !== "in_progress") {
        return json({ error: "not_found" }, 404);
      }

      return json({
        client_id: assessment.client_id,
        assessment_id: assessment.id,
        edit_token: resumeToken,
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
      // bot de formulário — responde 200 sem criar nada
      return json({ ok: true });
    }

    if (!lgpdConsent) {
      return json({ error: "É preciso aceitar o uso dos dados (LGPD) para continuar" }, 400);
    }

    let clientId: string;

    if (inviteToken) {
      // Link individual gerado pelo terapeuta (ver instrument_invites) — o
      // cliente já é conhecido, pula toda a lógica de match/criação abaixo.
      const { data: inviteRows, error: inviteError } = await supabase.rpc("validate_instrument_invite", {
        p_token: inviteToken,
        p_instrument: "smi",
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

      // E-mail novo, mas o WhatsApp pode já pertencer a um cliente cadastrado
      // (mesma pessoa testando/preenchendo de novo com outro e-mail). Confere
      // no whatsapp_sessions — fonte de verdade do índice único de telefone —
      // e só reaproveita o cadastro existente se o nome também bater; nunca
      // atribuímos o número de outra pessoa a um cadastro novo.
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
          // E-mail já existe no auth mas não tem profile — sobra de uma
          // tentativa anterior que falhou depois de criar o usuário (ex:
          // conflito de WhatsApp abaixo). Recupera o usuário existente em vez
          // de travar o cadastro.
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
          // Rede de segurança pra corrida de requisições simultâneas — a
          // checagem acima já devia ter pego isso antes de chegar aqui.
          ({ error: profileError } = await supabase.from("profiles").upsert({ ...profilePayload, whatsapp: null }));
        }
        if (profileError) throw profileError;

        await notifyNewSignup(name, email, whatsapp);
      }
    }

    const { data: lastAssessment } = await supabase
      .from("client_smi_assessments")
      .select("version")
      .eq("client_id", clientId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const version = (lastAssessment?.version ?? 0) + 1;

    const { data: assessment, error: assessmentError } = await supabase
      .from("client_smi_assessments")
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

    const { data: editToken, error: tokenError } = await supabase.rpc("issue_assessment_edit_token", {
      p_instrument: "smi",
      p_assessment_id: assessment.id,
    });
    if (tokenError || !editToken) {
      await supabase.from("client_smi_assessments").delete().eq("id", assessment.id);
      throw tokenError ?? new Error("Falha ao emitir token de edição");
    }

    console.log(`[smi-assessment-start] assessment ${assessment.id} (v${version}) iniciado para ${email}`);

    return json({ client_id: clientId, assessment_id: assessment.id, edit_token: editToken, version, raw_answers: {} });
  } catch (err) {
    console.error("[smi-assessment-start] Erro inesperado:", err);
    return json({ error: String(err) }, 500);
  }
});
