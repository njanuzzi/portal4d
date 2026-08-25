import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk";

// === Aplica um pedido de alteração da terapeuta sobre um relatório de SESSÃO ===
//
// Recebe { session_report_id, instruction }, pega o content_html atual (HTML
// livre, não JSON estruturado — diferente da devolutiva de esquemas) e pede
// ao Claude pra aplicar só a alteração pedida, mantendo o mesmo modelo/
// estrutura de relatório clínico já usado (seções fixas: Tema central,
// Insights, Modos e dinâmicas, Corpo/emoção, Processos de mudança, Convites,
// Síntese final).

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = `Você está revisando um relatório clínico de sessão de terapia, que você mesmo
escreveu antes a partir da transcrição da sessão.

A terapeuta vai te mandar o HTML atual do relatório e um pedido de alteração
específico.

REGRAS:
- Aplique APENAS a alteração pedida. Não reescreva partes que não foram
  mencionadas, a menos que a alteração exija ajuste em mais de um trecho para
  manter coerência.
- Mantenha a estrutura e o tom clínico-simbólico do relatório original
  (linguagem sensível, em segunda pessoa quando o texto já se dirige à
  cliente, seções organizadas por tema).
- Responda APENAS com o HTML revisado (sem markdown, sem \`\`\`, sem texto
  antes ou depois). Devolva o conteúdo COMPLETO revisado, não só o trecho que
  mudou — o resultado substitui o relatório anterior por inteiro.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { session_report_id, instruction } = await req.json();
    if (!session_report_id || !instruction?.trim()) {
      return new Response(JSON.stringify({ error: "session_report_id e instruction são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: report, error: reportError } = await supabase
      .from("session_reports")
      .select("id, content_html")
      .eq("id", session_report_id)
      .single();
    if (reportError) throw reportError;

    if (!report.content_html?.trim()) {
      return new Response(JSON.stringify({ error: "Relatório ainda está em branco — escreva um conteúdo inicial antes de pedir ajuste à IA" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMessage = `RELATÓRIO ATUAL (HTML):\n\n${report.content_html}\n\nPEDIDO DE ALTERAÇÃO DA TERAPEUTA:\n${instruction}\n\nDevolva o HTML completo revisado.`;

    console.log(`[revise-session-report] Revisando relatório ${session_report_id}`);

    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const response = await stream.finalMessage();
    const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text");
    const revisedHtml = textBlocks.map((b) => b.text).join("\n\n").trim();

    if (!revisedHtml) {
      throw new Error("Claude não retornou conteúdo de texto");
    }

    const { error: updateError } = await supabase
      .from("session_reports")
      .update({
        content_html: revisedHtml,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session_report_id);
    if (updateError) throw updateError;

    console.log(`[revise-session-report] Relatório ${session_report_id} revisado com sucesso`);

    return new Response(
      JSON.stringify({ session_report_id, content_html: revisedHtml, usage: response.usage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[revise-session-report] Erro inesperado:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
