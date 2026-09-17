import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = `Você está revisando uma devolutiva para o CLIENTE de uma terapeuta, que você mesmo
escreveu antes a partir dos resultados de um inventário de autoconhecimento.

A terapeuta vai te mandar o JSON atual da devolutiva e um pedido de alteração
específico.

REGRAS:
- Aplique APENAS a alteração pedida. Não reescreva partes que não foram
  mencionadas, a menos que a alteração exija ajuste em mais de um item para
  manter coerência.
- Mantenha a voz SISTÊMICA (sem termos técnicos de Terapia do Esquema como
  "esquema", "modo", "crítico", etc.) e a voz PESSOAL E DIRETA (segunda pessoa,
  "você", com aberturas como "Percebo que você...", nunca terceira pessoa).
- Mantenha a mesma estrutura JSON do original.

Responda APENAS com um JSON válido (sem markdown, sem \`\`\`, sem texto antes ou
depois), no MESMO formato do JSON recebido:

{
  "esquemas": [
    { "nome": "...", "percentual": 66.67, "descricao": "..." }
  ],
  "conclusao": "..."
}

Devolva o JSON COMPLETO revisado (os 5 itens de "esquemas" e a "conclusao"), não
só o trecho que mudou — o resultado substitui a devolutiva anterior por inteiro.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { report_id, instruction } = await req.json();
    if (!report_id || !instruction?.trim()) {
      return new Response(JSON.stringify({ error: "report_id e instruction são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: report, error: reportError } = await supabase
      .from("client_schema_reports")
      .select("id, client_content")
      .eq("id", report_id)
      .single();
    if (reportError) throw reportError;

    if (!report.client_content) {
      return new Response(JSON.stringify({ error: "Relatório do cliente ainda não foi gerado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { todos, ...revisableContent } = report.client_content as { todos?: unknown; [key: string]: unknown };
    const userMessage = `DEVOLUTIVA ATUAL (JSON):\n\n${JSON.stringify(revisableContent, null, 2)}\n\nPEDIDO DE ALTERAÇÃO DA TERAPEUTA:\n${instruction}\n\nDevolva o JSON completo revisado.`;

    console.log(`[revise-client-report] Revisando relatório ${report_id}`);

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
    const rawText = textBlocks.map((b) => b.text).join("\n\n").trim();
    if (!rawText) throw new Error("Claude não retornou conteúdo de texto");

    const jsonText = rawText.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    let revisedText: unknown;
    try { revisedText = JSON.parse(jsonText); }
    catch { throw new Error(`Claude não retornou um JSON válido: ${rawText.slice(0, 300)}`); }
    const revisedContent = { ...(revisedText as object), todos };

    const { error: updateError } = await supabase
      .from("client_schema_reports")
      .update({
        previous_client_content: report.client_content,
        client_content: revisedContent,
        client_content_status: "reviewed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", report_id);
    if (updateError) throw updateError;

    console.log(`[revise-client-report] Relatório ${report_id} revisado com sucesso`);

    return new Response(JSON.stringify({ report_id, client_content: revisedContent, usage: response.usage }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[revise-client-report] Erro inesperado:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
