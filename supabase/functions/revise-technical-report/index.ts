import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function requireTherapist(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const { data: userData, error: userError } = await supabase.auth.getUser(match[1]);
  if (userError || !userData.user) return false;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  return !profileError && profile?.role === "therapist";
}

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = `Você é um supervisor clínico especializado em Terapia do Esquema, revisando um
relatório técnico de apoio que você mesmo gerou antes para o terapeuta que conduz
o caso — este documento NUNCA é lido pelo cliente.

O terapeuta vai te mandar o relatório atual e um pedido de alteração específico.

REGRAS:
- Aplique APENAS a alteração pedida. Não reescreva partes que não foram
  mencionadas, a menos que a alteração exija ajuste em mais de uma seção para
  manter coerência.
- Mantenha a mesma estrutura Markdown (##, ###) e o mesmo estilo clínico direto
  do relatório original.
- Sempre trate hipóteses como hipóteses ("pode indicar", "sugere") — nunca como
  fato fechado.
- Devolva o RELATÓRIO COMPLETO revisado (todas as seções), não só o trecho que
  mudou — o resultado substitui o relatório anterior por inteiro.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!(await requireTherapist(req))) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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
      .select("id, technical_content")
      .eq("id", report_id)
      .single();
    if (reportError) throw reportError;

    if (!report.technical_content) {
      return new Response(JSON.stringify({ error: "Relatório ainda não tem conteúdo técnico gerado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMessage = `RELATÓRIO ATUAL:\n\n${report.technical_content}\n\nPEDIDO DE ALTERAÇÃO DO TERAPEUTA:\n${instruction}\n\nDevolva o relatório completo revisado.`;

    console.log(`[revise-technical-report] Revisando relatório ${report_id}`);

    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const response = await stream.finalMessage();
    const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text");
    const revisedContent = textBlocks.map((b) => b.text).join("\n\n");
    if (!revisedContent) throw new Error("Claude não retornou conteúdo de texto");

    const { error: updateError } = await supabase
      .from("client_schema_reports")
      .update({
        previous_content: report.technical_content,
        technical_content: revisedContent,
        status: "reviewed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", report_id);
    if (updateError) throw updateError;

    console.log(`[revise-technical-report] Relatório ${report_id} revisado com sucesso`);

    return new Response(JSON.stringify({ report_id, technical_content: revisedContent, usage: response.usage }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[revise-technical-report] Erro inesperado:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
