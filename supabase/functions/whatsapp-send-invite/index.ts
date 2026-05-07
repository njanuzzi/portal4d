import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    if (!profile?.whatsapp) {
      console.warn("[send-invite] Cliente sem número WhatsApp:", client_id);
      return new Response("Cliente sem número WhatsApp cadastrado", { status: 400, headers: corsHeaders });
    }

    // Normaliza número (remove não-dígitos, adiciona DDI se necessário)
    const digits = profile.whatsapp.replace(/\D/g, "");
    const phone = digits.length > 11 ? digits : `55${digits}`;
    console.log("[send-invite] Número normalizado:", { original: profile.whatsapp, phone });

    // Link de ativação: ao clicar, abre o WhatsApp com "Iniciar" pré-digitado
    // A terapeuta envia este link ao cliente pelo WhatsApp pessoal
    const waLink = `https://wa.me/${WA_DISPLAY_NUMBER}?text=Iniciar`;

    // Remove qualquer sessão anterior deste cliente (evita duplicatas por troca de número)
    await supabase
      .from("whatsapp_sessions")
      .delete()
      .eq("client_id", client_id);

    // Insere nova sessão como "pending"
    const { error: insertError } = await supabase
      .from("whatsapp_sessions")
      .insert({
        client_id,
        phone,
        status: "pending",
        invite_sent_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("[send-invite] Erro ao criar sessão:", insertError);
    }

    console.log("[send-invite] Sessão criada/atualizada para:", phone);

    // Retorna o link — o portal exibe para a terapeuta copiar e enviar ao cliente
    return new Response(JSON.stringify({ link: waLink, phone }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-invite] Erro inesperado:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
