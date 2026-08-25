import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === Registra um cliente como subscriber no Manychat (WhatsApp) ===
//
// Chamada de três formas:
// 1. Automaticamente por um trigger no banco (AFTER INSERT em profiles,
//    quando role='client' e já tem whatsapp) — fire-and-forget via pg_net.
// 2. Manualmente pelo botão "Sincronizar com Manychat" na ficha do cliente
//    (terapeuta), para reprocessar um cliente antigo ou depois de editar
//    o WhatsApp.
// 3. Vinculação manual: quando o número já é subscriber no Manychat (ex:
//    o cliente já mandou mensagem pro WhatsApp antes de ser sincronizado
//    pelo nosso sistema), a API do Manychat não expõe busca de subscriber
//    por telefone — o único jeito de recuperar o ID é copiando da tela do
//    contato no próprio Manychat. Nesse caso o front manda `manual_subscriber_id`
//    e a gente só salva, sem chamar a API.
//
// Idempotente: se o cliente já tem manychat_subscriber_id gravado, não
// cria de novo, só retorna o que já existe.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const MANYCHAT_API_TOKEN = Deno.env.get("MANYCHAT_API_TOKEN");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Normaliza pro formato E.164 (+55DDDNNNNNNNNN) que a API do Manychat espera.
function normalizePhoneE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const withCountry = digits.length > 11 ? digits : `55${digits}`;
  return `+${withCountry}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { client_id, manual_subscriber_id } = await req.json();
    if (!client_id) return json({ error: "client_id obrigatório" }, 400);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, whatsapp, manychat_subscriber_id")
      .eq("id", client_id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return json({ error: "Cliente não encontrado" }, 404);

    if (profile.manychat_subscriber_id) {
      return json({ ok: true, subscriber_id: profile.manychat_subscriber_id, skipped: "already_registered" });
    }

    // Vinculação manual: a terapeuta copiou o ID direto da tela do contato
    // no Manychat, pra casos onde o número já era subscriber antes de
    // passar pelo nosso sistema (a API do Manychat não permite buscar um
    // subscriber pelo telefone).
    if (manual_subscriber_id) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ manychat_subscriber_id: String(manual_subscriber_id).trim() })
        .eq("id", client_id);
      if (updateError) throw updateError;

      console.log(`[manychat-register-subscriber] Cliente ${client_id} vinculado manualmente a subscriber ${manual_subscriber_id}`);
      return json({ ok: true, subscriber_id: String(manual_subscriber_id).trim(), linked_manually: true });
    }

    if (!profile.whatsapp) {
      return json({ ok: false, error: "Cliente sem WhatsApp cadastrado" }, 400);
    }

    if (!MANYCHAT_API_TOKEN) {
      console.error("[manychat-register-subscriber] MANYCHAT_API_TOKEN não configurado");
      return json({ error: "MANYCHAT_API_TOKEN não configurado" }, 500);
    }

    const phone = normalizePhoneE164(profile.whatsapp);
    const [firstName, ...rest] = (profile.name ?? "Cliente").trim().split(/\s+/);
    const lastName = rest.join(" ") || undefined;

    const res = await fetch("https://api.manychat.com/fb/subscriber/createSubscriber", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MANYCHAT_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        whatsapp_phone: phone,
        first_name: firstName,
        last_name: lastName,
        consent_phrase: "Cliente cadastrado no Portal Núbia Januzzi e consentiu receber mensagens de acompanhamento via WhatsApp.",
      }),
    });

    const resBody = await res.json().catch(() => null);

    if (!res.ok || resBody?.status !== "success") {
      console.error("[manychat-register-subscriber] Erro na API do Manychat:", res.status, JSON.stringify(resBody));

      // Caso comum: o número já é subscriber no Manychat (ex: o cliente já
      // mandou mensagem pro WhatsApp, ou um número de teste reaproveitado
      // entre cadastros) — o Manychat não expõe busca de subscriber por
      // telefone via API, então não dá pra recuperar o ID automaticamente.
      // A terapeuta precisa copiar o subscriber ID da tela do contato no
      // Manychat e colar manualmente.
      const alreadyExists = resBody?.details?.messages?.wa_id?.message?.some((m: string) =>
        m.toLowerCase().includes("already exists")
      );
      if (alreadyExists) {
        return json({
          error: "already_exists",
          message: "Esse número de WhatsApp já é subscriber no Manychat. Abra o contato em Contatos → perfil do contato no Manychat, copie o ID e cole no campo abaixo.",
          status: res.status,
          details: resBody,
        }, 409);
      }

      return json({ error: "Falha ao registrar no Manychat", status: res.status, details: resBody }, 502);
    }

    const subscriberId = resBody?.data?.id;
    if (!subscriberId) {
      console.error("[manychat-register-subscriber] Resposta sem subscriber id:", JSON.stringify(resBody));
      return json({ error: "Resposta do Manychat sem subscriber id", details: resBody }, 502);
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ manychat_subscriber_id: String(subscriberId) })
      .eq("id", client_id);
    if (updateError) throw updateError;

    console.log(`[manychat-register-subscriber] Cliente ${client_id} registrado como subscriber ${subscriberId}`);

    return json({ ok: true, subscriber_id: subscriberId });
  } catch (err) {
    console.error("[manychat-register-subscriber] Erro inesperado:", err);
    return json({ error: String(err) }, 500);
  }
});
