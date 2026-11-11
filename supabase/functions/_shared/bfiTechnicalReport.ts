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

const INSTRUMENT_NOTE =
  "Instrumento: BFI, versão brasileira de 25 itens, escala de 1 a 5. Médias por fator calculadas com os " +
  "itens invertidos já recodificados (6 - resposta): 4, 12, 14 e 24 (Conscienciosidade), 5, 15 e 20 " +
  "(Neuroticismo) e 22 (Abertura).";

const SCALE_LABELS: Record<number, string> = {
  1: "Discordo totalmente",
  2: "Discordo um pouco",
  3: "Nem concordo, nem discordo",
  4: "Concordo um pouco",
  5: "Concordo totalmente",
};

const GENERATE_SYSTEM_PROMPT = `Você é um supervisor clínico produzindo um relatório técnico de apoio para a
psicóloga que conduz o caso, a partir do Big Five Inventory (BFI). Este
documento NUNCA é lido pela cliente.

DADOS DE ENTRADA:
- Nome da cliente e se o questionário foi aplicado junto com a terapeuta ou
  preenchido sozinho
- Versão do instrumento e forma de cálculo (itens invertidos já
  recodificados)
- Média de cada um dos 5 fatores
- Cada item com a resposta dada (marcando os invertidos)

REGRAS:
- Português do Brasil, linguagem clínica e direta, para outra profissional.
- O BFI descreve tendências de personalidade, não transtornos: não faça
  diagnóstico nem sugira psicopatologia a partir dele.
- Não há pontos de corte validados para a população brasileira: nunca
  classifique um fator como "alto"/"baixo" de forma normativa. Fale em
  posição relativa entre os 5 fatores desta cliente e em proximidade dos
  extremos da escala 1-5. Toda leitura é hipótese ("sugere", "é compatível
  com", "vale investigar").
- Para cada fator, deixe explícito o que a pontuação NÃO permite concluir
  (ex.: amabilidade mais baixa não é agressividade; abertura não é
  inteligência; neuroticismo não é diagnóstico de ansiedade; média central
  em conscienciosidade não indica qual faceta pesa mais).
- Use os itens individuais para apontar nuances e incoerências dentro do
  mesmo fator.
- A versão do instrumento e o cálculo já foram informados nos dados — não
  peça essas informações nem levante dúvida sobre recodificação.
- Baseie-se apenas nos dados fornecidos; não invente fatos sobre a cliente.
- Markdown limpo (##, ###, listas, tabelas), sem emojis.

ESTRUTURA (nesta ordem):

Abra com um parágrafo curto: o Big Five descreve tendências, não transtornos,
e sem pontos de corte brasileiros as interpretações são hipóteses clínicas.

## 1. Visão geral do perfil
- Lista das 5 médias em ordem decrescente (formato "Fator — x,xx/5").
- A combinação que mais chama atenção no perfil e a hipótese que ela
  sugere, junto com o que ainda não se sabe (ex.: se a extroversão aparece
  mais como sociabilidade, assertividade ou busca de estímulo).

## 2. Interpretação clínica de cada fator
Para cada fator, em ordem decrescente de média:
### [Fator] — [média]/5
- Conceito em uma ou duas frases
- **Possíveis manifestações:** 3 a 4 itens
- **Itens que chamaram atenção:** quando houver
- **Na psicoterapia:** o que observar e investigar
- **O que não dá para concluir:** uma frase

## 3. O que a combinação dos fatores pode revelar
Tabela com as colunas "Combinação" e "Hipótese clínica a investigar"
(4 a 6 linhas, só combinações relevantes para este perfil). Depois da
tabela, uma frase lembrando que são possibilidades, não conclusões.

### Uma hipótese a testar
Um ciclo hipotético plausível para este perfil, em quatro passos:
**Situação** → **Interpretação possível** → **Resposta emocional e
comportamental** → **Consequência possível**. Termine dizendo que o ciclo
não é inferido diretamente do BFI e deve ser testado por análise funcional,
história de vida e relatos da cliente.

## 4. Como aprofundar na entrevista clínica
Tabela com as colunas "Dimensão" e "Pergunta clínica", com perguntas
abertas que não induzam resposta, cobrindo regulação emocional,
relacionamentos, flexibilidade cognitiva, empatia e reciprocidade,
autodisciplina e autopercepção (priorize as dimensões mais relevantes
para este perfil). Uma frase final sobre diferenciar traço de estado.

## 5. Possíveis caminhos para o trabalho terapêutico
Itens curtos por abordagem — TCC, Terapia do Esquema, ACT e DBT — sempre
condicionados ao motivo da procura e ao que a entrevista confirmar. Em
Terapia do Esquema, cite esquemas só como possibilidades a verificar com
evidências clínicas independentes. Feche dizendo que a intervenção não
deve ser escolhida só com base no perfil de personalidade.

## 6. Síntese para o prontuário
Um bloco de 2 a 4 parágrafos curtos, em terceira pessoa, linguagem de
prontuário, pronto para copiar: instrumento e médias, padrão descritivo
observado, o que se recomenda investigar e uma frase final de
considerações (resultados descritivos, sem classificação normativa ou
significado diagnóstico isolado; requerem integração com entrevista,
história de vida e demanda).`;

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

  const dataBlock = `Cliente: ${clientName}\nAplicação: ${application}\n${INSTRUMENT_NOTE}\n\nMédias por fator (ordem decrescente):\n${factorLines}\n\nRespostas por item (escala 1-5):\n${itemLines}`;

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
