import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk";

// === Gera o Relatório Clínico de Fechamento de Mês via Claude ===
//
// Recebe { client_id, period_start, period_end } (period_start/end no
// formato YYYY-MM-DD, cobrindo um mês corrido), busca as session_reports
// já revisadas/publicadas do cliente nesse período, manda pro Claude com
// o prompt clínico da terapeuta, e grava o resultado em `reports`
// (content_text, published=false — a terapeuta decide quando publicar).
//
// Idempotente: se já existir um relatório pra esse client_id + período
// exato, atualiza em vez de duplicar.
//
// Pensado pra ser chamado por um script local (histórico) ou por uma
// automação no fim do mês — não por um clique direto na tela do cliente.

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

// Prompt clínico da terapeuta, verbatim — não alterar o conteúdo, só a
// instrução de formatação de saída é adicionada em código (ver abaixo).
const SYSTEM_PROMPT = `Você é Núbia Januzzi, psicoterapeuta especializada em Neurociências,
Inteligência Emocional e Psicologia Positiva pela PUC, com base em
Terapia do Esquema, ACT e Neurociência do Trauma e do Desenvolvimento Humano.

Sua tarefa é gerar um Relatório Clínico de Fechamento de Mês, em primeira
pessoa, integrando os principais movimentos emocionais, cognitivos e
comportamentais observados nas sessões enviadas.

O relatório será entregue diretamente à cliente, como forma de integração
e continuidade terapêutica — não é diagnóstico, mas uma síntese narrativa
que ajuda a compreender o que amadureceu, o que ainda pede cuidado e qual
direção seguirá no próximo ciclo.

ESTRUTURA FIXA:
1) MOVIMENTOS DO MÊS — movimento emocional geral do mês, linguagem pessoal
   ("Ao longo deste mês, percebi em mim..."), janela de tolerância, regulação.
2) O QUE MAIS APARECEU NAS SESSÕES — temas recorrentes, modos esquemáticos
   ativados, exemplos simbólicos reais das sessões.
3) O QUE AMADURECEU EM MIM — avanços, fortalecimento do adulto saudável,
   exemplos concretos.
4) O QUE AINDA PEDE CUIDADO — padrões que seguem exigindo atenção, como
   mecanismos protetores (não defeitos).
5) DIRECIONAMENTO PARA O PRÓXIMO CICLO — intenções terapêuticas realistas,
   sem cobrança.
6) ENCERRAMENTO — fechamento simbólico/poético, metáforas naturais,
   tom de integração e esperança.

Base teórica implícita: Terapia do Esquema (Young), ACT (Hayes),
Neurociência e Trauma (Siegel, van der Kolk), Psicologia Positiva.
Sem diagnósticos. Sempre em 1ª pessoa.

FORMATO DE SAÍDA: responda em Markdown simples. Cada uma das 6 seções
numeradas acima deve virar um título markdown ("## 1) Movimentos do Mês",
etc — mantenha o título exatamente como está na estrutura fixa, incluindo
o número). Parágrafos separados por linha em branco. Não use JSON, não
use \`\`\`, não escreva nada antes do primeiro título nem depois do
fechamento da seção 6.`;

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(strong|h2|h3|h4)>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

// Converte o markdown de saída do Claude (## títulos + parágrafos) pro
// HTML simples que a tela de Relatórios já sabe renderizar/editar.
function markdownToReportHtml(markdown: string): string {
  let text = markdown.trim();
  text = text.replace(/^##\s+(.+)$/gm, (_m, title) => `<h3>${title.trim()}</h3>`);
  text = text.replace(/\n\n+/g, "<br><br>");
  text = text.replace(/\n/g, "<br>");
  return text.trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { client_id, period_start, period_end } = await req.json();
    if (!client_id || !period_start || !period_end) {
      return json({ error: "client_id, period_start e period_end são obrigatórios" }, 400);
    }

    const { data: client, error: clientError } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("id", client_id)
      .eq("role", "client")
      .single();
    if (clientError || !client) return json({ error: "Cliente não encontrado" }, 404);

    const { data: sessions, error: sessionsError } = await supabase
      .from("session_reports")
      .select("session_date, content_html, status")
      .eq("client_id", client_id)
      .gte("session_date", period_start)
      .lte("session_date", period_end)
      .in("status", ["revisado", "publicado"])
      .order("session_date");
    if (sessionsError) throw sessionsError;

    if (!sessions?.length) {
      return json({ error: `Nenhuma sessão revisada/publicada de ${client.name} entre ${period_start} e ${period_end}.` }, 404);
    }

    const sessionsText = sessions
      .map((s) => {
        const date = new Date(`${s.session_date}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
        return `--- Sessão de ${date} ---\n${stripHtml(s.content_html ?? "")}`;
      })
      .join("\n\n");

    const userMessage = `Cliente: ${client.name}\n\nSessões do período (${sessions.length} sessão${sessions.length !== 1 ? "ões" : ""}):\n\n${sessionsText}`;

    console.log(`[generate-monthly-report] Gerando fechamento de ${client.name} (${period_start} a ${period_end}), ${sessions.length} sessões`);

    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 6000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const response = await stream.finalMessage();
    const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text");
    const rawMarkdown = textBlocks.map((b) => b.text).join("\n\n").trim();
    if (!rawMarkdown) throw new Error("Claude não retornou conteúdo de texto");

    const periodDate = new Date(`${period_start}T00:00:00`);
    const title = `Fechamento de ${MONTH_NAMES[periodDate.getMonth()]} de ${periodDate.getFullYear()}`;
    const contentText = `<h2>${escapeHtml(title)}</h2>${markdownToReportHtml(rawMarkdown)}`;

    const { data: existing } = await supabase
      .from("reports")
      .select("id")
      .eq("user_id", client_id)
      .eq("period_start", period_start)
      .eq("period_end", period_end)
      .maybeSingle();

    let reportId: string;
    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from("reports")
        .update({ content_text: contentText })
        .eq("id", existing.id)
        .select("id")
        .single();
      if (updateError) throw updateError;
      reportId = updated.id;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("reports")
        .insert({ user_id: client_id, period_start, period_end, content_text: contentText, published: false })
        .select("id")
        .single();
      if (insertError) throw insertError;
      reportId = inserted.id;
    }

    console.log(`[generate-monthly-report] Relatório ${reportId} salvo (${existing ? "atualizado" : "novo"})`);

    return json({
      report_id: reportId,
      client_name: client.name,
      sessions_used: sessions.length,
      updated_existing: Boolean(existing),
      usage: response.usage,
    });
  } catch (err) {
    console.error("[generate-monthly-report] Erro inesperado:", err);
    return json({ error: String(err) }, 500);
  }
});
