import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk";

// === Relatório técnico do Big Five (só para a terapeuta) via Claude ===
//
// Usado por bfi-assessment-save (geração automática quando a cliente
// conclui) e por bfi-technical-report (terapeuta pede "Gerar novamente" ou
// um ajuste com instrução livre). Salva em client_bfi_reports.
//
// Fatores e itens invertidos: mesma tabela de src/lib/bfiFactors.ts e
// bfi-assessment-save — manter em sincronia.

export const BFI_REPORT_MODEL = "claude-opus-5-5";

const FACTORS: { key: string; label: string; questions: number[] }[] = [
  { key: "extroversao", label: "Extroversão", questions: [1, 7, 10, 17] },
  { key: "amabilidade", label: "Amabilidade", questions: [3, 11, 19, 23] },
  { key: "conscienciosidade", label: "Conscienciosidade", questions: [4, 12, 14, 18, 24] },
  { key: "neuroticismo", label: "Neuroticismo", questions: [5, 8, 13, 15, 20, 21] },
  { key: "abertura", label: "Abertura à Experiência", questions: [2, 6, 9, 16, 22, 25] },
];
const REVERSED = new Set([4, 12, 14, 24, 5, 15, 20, 22]);

const SCALE_LABELS: Record<number, string> = {
  1: "Discordo totalmente",
  2: "Discordo um pouco",
  3: "Nem concordo, nem discordo",
  4: "Concordo um pouco",
  5: "Concordo totalmente",
};

const GENERATE_SYSTEM_PROMPT = `Você é um supervisor clínico produzindo um relatório técnico de apoio para a
psicóloga que conduz o caso, a partir do Big Five Inventory (BFI, versão
brasileira de 25 itens, escala 1-5). Este documento NUNCA é lido pela cliente.

DADOS DE ENTRADA:
- Nome da cliente e se o questionário foi aplicado junto com a terapeuta ou
  preenchido sozinho
- Média de cada um dos 5 fatores (itens invertidos já corrigidos)
- Cada item com a resposta dada (marcando os invertidos)

REGRAS:
- Escreva em português do Brasil, linguagem clínica, direta e técnica, para
  outra profissional.
- O BFI não tem pontos de corte validados para a população brasileira:
  nunca classifique um fator como "alto"/"baixo" em termos absolutos ou
  normativos. Fale em posição relativa entre os 5 fatores desta cliente e
  em proximidade dos extremos da escala (1-5). Trate toda leitura como
  hipótese ("sugere", "é compatível com", "vale investigar").
- O BFI mede traços dimensionais: não faça diagnóstico nem sugira
  transtorno a partir dele.
- Use os itens individuais para apontar nuances e incoerências internas
  (ex.: respostas divergentes dentro do mesmo fator).
- Baseie-se apenas nos dados fornecidos; não invente informações sobre a
  cliente.
- Markdown limpo (##, ###, listas), sem emojis.

ESTRUTURA (nesta ordem):

## 1. Visão geral do perfil
Fatores que mais se destacam (maiores e menores médias desta cliente) e o
desenho geral do perfil.

## 2. Análise por fator
Para cada um dos 5 fatores, em ordem decrescente de média:
### [Fator] — [média]/5
- Como esse nível relativo pode aparecer no dia a dia, nas relações e no
  trabalho
- Itens que chamaram atenção dentro do fator
- Recursos e pontos de vulnerabilidade associados

## 3. Interações entre fatores
Combinações relevantes (ex.: Neuroticismo com Conscienciosidade,
Extroversão com Amabilidade) e o que sugerem sobre o funcionamento.

## 4. Implicações para o processo terapêutico
- Como o perfil pode influenciar o vínculo e a resposta a intervenções
  (ex.: abertura favorecendo técnicas experienciais; menor abertura
  favorecendo abordagens mais estruturadas)
- Focos de trabalho sugeridos
- Hipóteses a explorar em sessão

## 5. Limites desta leitura
Uma ou duas frases sobre o que o instrumento não permite concluir.`;

const REVISE_SYSTEM_PROMPT = `Você é um supervisor clínico revisando um relatório técnico do Big Five que
você mesmo gerou para a psicóloga que conduz o caso. Este documento NUNCA é
lido pela cliente.

A terapeuta vai mandar o relatório atual, os dados da cliente e um pedido de
alteração.

REGRAS:
- Aplique o pedido da terapeuta. Não reescreva partes que não foram
  mencionadas, a menos que o pedido exija ajuste em outras seções para
  manter coerência.
- Mantenha a estrutura Markdown e o estilo clínico direto do relatório.
- O BFI não tem pontos de corte validados para a população brasileira:
  continue tratando leituras como hipóteses e níveis como relativos.
- Não invente dados sobre a cliente além dos fornecidos.
- Devolva o RELATÓRIO COMPLETO revisado, não só o trecho alterado.`;

interface AssessmentRow {
  id: string;
  client_id: string;
  source: string;
  raw_answers: Record<string, number> | null;
  profiles: { name: string } | { name: string }[] | null;
}

async function loadInput(supabase: SupabaseClient, assessmentId: string) {
  const { data, error } = await supabase
    .from("client_bfi_assessments")
    .select("id, client_id, source, raw_answers, profiles(name)")
    .eq("id", assessmentId)
    .single();
  if (error) throw error;
  const assessment = data as unknown as AssessmentRow;

  const { data: questionRows, error: questionsError } = await supabase
    .from("bfi_questions")
    .select("question_number, question_text")
    .order("question_number");
  if (questionsError) throw questionsError;

  const answers = assessment.raw_answers ?? {};
  const profile = Array.isArray(assessment.profiles) ? assessment.profiles[0] : assessment.profiles;
  const clientName = profile?.name ?? "Cliente";
  const questionText = new Map(
    ((questionRows ?? []) as { question_number: number; question_text: string }[]).map((q) => [q.question_number, q.question_text]),
  );

  const factors = FACTORS.map((factor) => {
    const sum = factor.questions.reduce((total, qn) => {
      const answer = answers[String(qn)] ?? 0;
      return total + (answer && REVERSED.has(qn) ? 6 - answer : answer);
    }, 0);
    return { ...factor, average: Math.round((sum / factor.questions.length) * 100) / 100 };
  }).sort((a, b) => b.average - a.average);

  const factorLines = factors.map((f) => `- ${f.label}: ${f.average.toFixed(2)}/5`).join("\n");
  const itemLines = factors
    .map((f) => {
      const items = f.questions
        .map((qn) => {
          const answer = answers[String(qn)];
          const reversed = REVERSED.has(qn) ? " [item invertido]" : "";
          return `  - ${qn}. ${questionText.get(qn) ?? "—"}${reversed}: ${answer ?? "—"} (${SCALE_LABELS[answer] ?? "sem resposta"})`;
        })
        .join("\n");
      return `${f.label}:\n${items}`;
    })
    .join("\n\n");

  const application = assessment.source === "terapeuta"
    ? "Aplicado junto com a terapeuta, em sessão."
    : "Preenchido pela cliente sozinha, pelo link.";

  const dataBlock = `Cliente: ${clientName}\nAplicação: ${application}\n\nMédias por fator (ordem decrescente):\n${factorLines}\n\nRespostas por item (escala 1-5):\n${itemLines}`;

  return { assessment, dataBlock };
}

async function callClaude(system: string, userMessage: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
  const stream = anthropic.beta.messages.stream({
    model: BFI_REPORT_MODEL,
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    // Se o modelo recusar por política, a própria API refaz no modelo de
    // reserva em vez de devolver vazio.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system,
    messages: [{ role: "user", content: userMessage }],
  });
  const response = await stream.finalMessage();

  if (response.stop_reason === "refusal") {
    throw new Error("O modelo recusou gerar este relatório.");
  }
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n\n")
    .trim();
  if (!text) throw new Error("Claude não retornou conteúdo de texto");
  return text;
}

// Gera (ou regera) o relatório. Marca 'generating' antes de chamar o Claude
// pra tela da terapeuta mostrar o andamento; em caso de falha grava 'error'
// sem apagar o texto anterior.
export async function generateBfiTechnicalReport(supabase: SupabaseClient, assessmentId: string): Promise<void> {
  const { assessment, dataBlock } = await loadInput(supabase, assessmentId);

  const { data: existing } = await supabase
    .from("client_bfi_reports")
    .select("technical_content")
    .eq("assessment_id", assessmentId)
    .maybeSingle();

  const { error: markError } = await supabase.from("client_bfi_reports").upsert(
    {
      assessment_id: assessmentId,
      client_id: assessment.client_id,
      status: "generating",
      error_message: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "assessment_id" },
  );
  if (markError) throw markError;

  try {
    const content = await callClaude(GENERATE_SYSTEM_PROMPT, dataBlock);
    const { error } = await supabase
      .from("client_bfi_reports")
      .update({
        technical_content: content,
        previous_content: existing?.technical_content ?? null,
        status: "ready",
        generated_with: BFI_REPORT_MODEL,
        updated_at: new Date().toISOString(),
      })
      .eq("assessment_id", assessmentId);
    if (error) throw error;
  } catch (err) {
    await supabase
      .from("client_bfi_reports")
      .update({ status: existing?.technical_content ? "ready" : "error", error_message: String(err), updated_at: new Date().toISOString() })
      .eq("assessment_id", assessmentId);
    throw err;
  }
}

// Aplica um pedido livre da terapeuta sobre o relatório atual.
export async function reviseBfiTechnicalReport(
  supabase: SupabaseClient,
  assessmentId: string,
  instruction: string,
): Promise<string> {
  const { data: report, error } = await supabase
    .from("client_bfi_reports")
    .select("technical_content")
    .eq("assessment_id", assessmentId)
    .single();
  if (error) throw error;
  if (!report.technical_content) throw new Error("Relatório ainda não tem conteúdo gerado");

  const { dataBlock } = await loadInput(supabase, assessmentId);
  const userMessage =
    `DADOS DA CLIENTE:\n${dataBlock}\n\nRELATÓRIO ATUAL:\n\n${report.technical_content}\n\n` +
    `PEDIDO DE ALTERAÇÃO DA TERAPEUTA:\n${instruction}\n\nDevolva o relatório completo revisado.`;
  const revised = await callClaude(REVISE_SYSTEM_PROMPT, userMessage);

  const { error: updateError } = await supabase
    .from("client_bfi_reports")
    .update({
      previous_content: report.technical_content,
      technical_content: revised,
      status: "ready",
      error_message: null,
      generated_with: BFI_REPORT_MODEL,
      updated_at: new Date().toISOString(),
    })
    .eq("assessment_id", assessmentId);
  if (updateError) throw updateError;
  return revised;
}
