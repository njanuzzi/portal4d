import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === Registra um cliente como subscriber no Manychat (WhatsApp) ===
//
// Chamada de duas formas:
// 1. Automaticamente por um trigger no banco (AFTER INSERT em profiles,
//    quando role='client' e já tem whatsapp) — fire-and-forget via pg_net.
// 2. Manualmente pelo botão "Sincronizar com Manychat" na ficha do cliente
//    (terapeuta), para reprocessar um cliente antigo ou depois de editar
//    o WhatsApp.
//
// Idempotente: se o cliente já tem manychat_subscriber_id gravado, não
// cria de novo, só retorna o que já existe.
//
// ATENÇÃO: o endpoint e os campos do createSubscriber abaixo seguem a
// documentação pública da API do Manychat (não foi possível validar contra
// uma chamada real neste ambiente de desenvolvimento — rede bloqueada
// pro domínio do Manychat). Se o Manychat responder com um formato
// diferente do esperado, o erro completo é logado e retornado pra
// facilitar o ajuste.

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

// Busca um subscriber já existente no Manychat pelo telefone — usado quando
// createSubscriber recusa por já existir (ex: número de teste reaproveitado
// entre cadastros, ou cliente que já mandou mensagem e o Manychat criou o
// subscriber antes da gente). Tenta com e sem o "+" porque não foi possível
// confirmar contra uma chamada real qual formato o findBySystemField espera
// (rede bloqueada pro Manychat neste ambiente de desenvolvimento).
async function findSubscriberByPhone(phone: string): Promise<string | null> {
  const candidates = [phone, phone.replace(/^\+/, "")];
  for (const value of candidates) {
    const url = `https://api.manychat.com/fb/subscriber/findBySystemField?system_field_name=phone&system_field_value=${encodeURIComponent(value)}`;
    const res = await fetch(url, { headers: { "Authorization": `Bearer ${MANYCHAT_API_TOKEN}` } });
    const body = await res.json().catch(() => null);
    console.log("[manychat-register-subscriber] findBySystemField:", { value, status: res.status, body: JSON.stringify(body) });
    if (!res.ok || body?.status !== "success") continue;
    const found = Array.isArray(body?.data) ? body.data[0] : body?.data;
    if (found?.id) return String(found.id);
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { client_id } = await req.json();
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

      // Caso comum: o mesmo número de WhatsApp já é subscriber de OUTRO
      // cadastro no portal (ex: cadastros de teste reaproveitando o mesmo
      // número) — o Manychat só permite um subscriber por número.
      const alreadyExists = resBody?.details?.messages?.wa_id?.message?.some((m: string) =>
        m.toLowerCase().includes("already exists")
      );
      if (alreadyExists) {
        // Recupera o subscriber_id já existente e vincula a este cliente,
        // em vez de só falhar — comum quando o número já mandou mensagem
        // pro WhatsApp antes, ou reaproveita um número já usado em outro
        // cadastro do portal.
        const existingId = await findSubscriberByPhone(phone);
        if (existingId) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ manychat_subscriber_id: existingId })
            .eq("id", client_id);
          if (updateError) throw updateError;

          console.log(`[manychat-register-subscriber] Cliente ${client_id} vinculado a subscriber já existente ${existingId}`);
          return json({ ok: true, subscriber_id: existingId, linked_existing: true });
        }

        return json({
          error: "Esse número de WhatsApp já está registrado no Manychat, mas não consegui recuperar o subscriber_id automaticamente. Veja o console de logs da função para o motivo.",
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
