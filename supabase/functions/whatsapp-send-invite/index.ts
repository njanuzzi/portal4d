import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MESSAGES } from "../_shared/messages.ts";

const WA_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;
const WA_DISPLAY_NUMBER = Deno.env.get("WHATSAPP_DISPLAY_NUMBER")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { client_id } = await req.json();
    console.log("[send-invite] client_id recebido:", client_id);

    // Busca perfil do cliente
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("name, whatsapp")
      .eq("id", client_id)
      .single();

    if (profileError) {
      console.error("[send-invite] Erro ao buscar perfil:", profileError);
      return new Response("Erro ao buscar perfil do cliente", { status: 500, headers: corsHeaders });
    }

    console.log("[send-invite] Perfil encontrado:", { name: profile?.name, whatsapp: profile?.whatsapp });

    if (!profile?.whatsapp) {
      console.warn("[send-invite] Cliente sem número WhatsApp:", client_id);
      return new Response("Cliente sem número WhatsApp cadastrado", { status: 400, headers: corsHeaders });
    }

    // Normaliza número (remove não-dígitos, adiciona DDI se necessário)
    const digits = profile.whatsapp.replace(/\D/g, "");
    const phone = digits.length > 11 ? digits : `55${digits}`;
    console.log("[send-invite] Número normalizado:", { original: profile.whatsapp, digits, phone });

    // Link de ativação com texto pré-digitado
    const waLink = `https://wa.me/${WA_DISPLAY_NUMBER}?text=Iniciar`;

    // Cria ou atualiza sessão
    await supabase
      .from("whatsapp_sessions")
      .upsert({
        client_id,
        phone,
        status: "pending",
        invite_sent_at: new Date().toISOString(),
      }, { onConflict: "phone" });

    // Envia mensagem com o link via API Meta
    const metaRes = await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WA_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: {
          body: MESSAGES.invite(profile.name, waLink),
        },
      }),
    });

    const metaBody = await metaRes.json();
    console.log("[send-invite] Resposta Meta API:", { status: metaRes.status, body: metaBody });

    if (!metaRes.ok) {
      console.error("[send-invite] Meta API retornou erro:", metaBody);
      return new Response(JSON.stringify({ error: "Falha ao enviar via Meta API", detail: metaBody }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Convite enviado", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("[send-invite] Erro inesperado:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
