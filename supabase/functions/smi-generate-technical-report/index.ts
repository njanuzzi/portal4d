import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk";

// === Gera o relatório técnico/clínico do SMI (só para a terapeuta) via Claude ===
//
// Clone de generate-technical-report (YSQ), adaptado pros 14 modos
// esquemáticos: sem classificação Crítico/Atenção/Básico (o SMI não tem
// pontos de corte validados pra população BR — só a média 1-6 e a ordem
// relativa entre os modos deste cliente). Inclui como contexto extra os
// cruzamentos entre modos documentados no instrumento, calculados aqui do
// mesmo jeito que a tela do terapeuta calcula (ver SMI_MODE_RELATIONSHIPS
// em src/lib/smiModeOrder.ts — mantido em sincronia manualmente).
//
// Recebe { assessment_id }, busca os scores já calculados
// (client_smi_scores + smi_modes), monta o prompt e chama a API do Claude.
// Salva o resultado em client_smi_reports como rascunho (status='draft').
//
// Chamada pelo próprio Portal4D (terapeuta autenticado), não por webhook
// externo — por isso verify_jwt=true.

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

const TOP_MODES_FOR_RELATIONSHIPS = 4;

const MODE_RELATIONSHIPS: { codes: [string, string]; insight: string }[] = [
  {
    codes: ["crianca_vulneravel", "protetor_desligado"],
    insight: "Criança Vulnerável + Protetor Desligado → hiporregulação emocional e evitação.",
  },
  {
    codes: ["crianca_impulsiva", "crianca_raivosa"],
    insight: "Criança Impulsiva + Criança Raivosa → impulsividade e externalização agressiva.",
  },
  {
    codes: ["pais_punitivos", "crianca_vulneravel"],
    insight: "Pais Punitivos + Criança Vulnerável → ciclos de autocrítica e retraimento.",
  },
];

const SYSTEM_PROMPT = `Você é um supervisor clínico especializado em Terapia do Esquema, produzindo um
relatório técnico de apoio para a terapeuta que conduz o caso — este documento
NUNCA é lido pelo cliente.

DADOS DE ENTRADA que você recebe:
- Nome do cliente
- Lista dos 14 modos esquemáticos do SMI, cada um com: nome, categoria
  (Criança / Enfrentamento Disfuncional / Hipercompensador / Pais
  Internalizados / Adulto Saudável), média (escala 1-6) e a descrição
  clínica do modo
- Ordenados do maior para o menor score
- Cruzamentos entre modos identificados (quando os dois modos de um par
  documentado estão entre os mais ativados deste cliente)

REGRAS DE FORMATAÇÃO:
- Use Markdown limpo (##, ###, listas) — nada de emojis obrigatórios, isso é
  para leitura numa tela, não para colar em planilha.
- Linguagem clínica, direta, técnica — você está escrevendo para outra
  profissional, não precisa suavizar.
- O SMI não tem pontos de corte validados para a população brasileira —
  nunca trate um score como "alto" ou "baixo" em termos absolutos, só
  relativos aos outros 13 modos deste cliente. Trate qualquer leitura como
  hipótese ("pode indicar", "sugere", "é compatível com").

ESTRUTURA (siga esta ordem, todos os blocos):

## 1. Resumo geral do perfil de modos
- Quais modos são centrais (maior média) e por que parecem centrais no
  funcionamento atual.
- O padrão geral parece dominado por modos Criança, por enfrentamento
  disfuncional, por hipercompensação, por vozes parentais internalizadas,
  ou o Adulto Saudável aparece bem presente?

## 2. Análise individual dos modos
Para CADA um dos 14 modos, em ordem decrescente de média, mesmo os mais
baixos (mais breve para esses):
### [NOME DO MODO] — [média]/6
- Conceito clínico do modo
- Como esse nível relativo (comparado aos outros 13 modos deste cliente)
  pode se manifestar no dia a dia, relacionamentos e trabalho
- Comportamentos observáveis esperados
- Situações-gatilho prováveis

## 3. Cruzamentos entre modos
- Comente cada cruzamento identificado nos dados de entrada (se nenhum foi
  identificado, diga isso explicitamente e não invente um)
- Padrões de interação (reforço mútuo, compensação, ciclo de manutenção do
  sofrimento)

## 4. Ferramentas e recomendações terapêuticas
- Psicoeducação sobre modos: tópicos a abordar com o cliente
- Vivência imagética / reencenação
- Diálogo com os modos (cadeira vazia, diálogo socrático)
- Fortalecimento do Adulto Saudável
- Tarefas de casa

## 5. Alertas clínicos e sugestões
- Resistências prováveis / defesas esperadas
- Fragilidades no vínculo terapêutico
- Riscos clínicos a monitorar
- Temas prioritários para próximas sessões

INSTRUÇÕES FINAIS:
- Analise todos os 14 modos — não pule nenhum.
- Baseie-se apenas nos dados fornecidos, não invente modos ou scores.
- O texto deve estar pronto para leitura direta na tela da terapeuta, sem
  necessidade de edição adicional.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { assessment_id } = await req.json();
    if (!assessment_id) {
      return new Response(JSON.stringify({ error: "assessment_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    interface ProfileRef { name: string }
    interface ModeRef { code: string; name: string; category: string; description: string | null }
    interface ScoreRow { average_score: number; smi_modes: ModeRef | ModeRef[] | null }

    const unwrap = <T,>(value: T | T[] | null): T | null => (Array.isArray(value) ? value[0] ?? null : value);

    const { data: assessmentData, error: assessmentError } = await supabase
      .from("client_smi_assessments")
      .select("id, client_id, profiles(name)")
      .eq("id", assessment_id)
      .single();
    if (assessmentError) throw assessmentError;
    const assessment = assessmentData as unknown as { id: string; client_id: string; profiles: ProfileRef | ProfileRef[] | null };

    const { data: scoresData, error: scoresError } = await supabase
      .from("client_smi_scores")
      .select("average_score, smi_modes(code, name, category, description)")
      .eq("assessment_id", assessment_id)
      .order("average_score", { ascending: false });
    if (scoresError) throw scoresError;
    const scores = (scoresData ?? []) as unknown as ScoreRow[];

    if (!scores.length) {
      return new Response(JSON.stringify({ error: "Nenhum score encontrado para esse assessment_id" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientName = unwrap(assessment.profiles)?.name ?? "Cliente";

    const rows = scores.map((s) => {
      const mode = unwrap(s.smi_modes);
      return {
        code: mode?.code ?? "",
        name: mode?.name ?? "—",
        category: mode?.category ?? "",
        description: mode?.description ?? null,
        average_score: s.average_score,
      };
    });

    const topCodes = new Set(rows.slice(0, TOP_MODES_FOR_RELATIONSHIPS).map((r) => r.code));
    const matchedRelationships = MODE_RELATIONSHIPS.filter(
      (r) => topCodes.has(r.codes[0]) && topCodes.has(r.codes[1])
    );

    const modosList = rows
      .map((r) => `- ${r.name} (${r.category}): ${r.average_score}/6${r.description ? ` — ${r.description}` : ""}`)
      .join("\n");

    const crossList = matchedRelationships.length > 0
      ? matchedRelationships.map((r) => `- ${r.insight}`).join("\n")
      : "Nenhum cruzamento documentado foi identificado neste perfil.";

    const userMessage = `Cliente: ${clientName}\n\nModos (ordenados por média):\n${modosList}\n\nCruzamentos identificados:\n${crossList}`;

    console.log(`[smi-generate-technical-report] Gerando relatório para assessment ${assessment_id}`);

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
    const technicalContent = textBlocks.map((b) => b.text).join("\n\n");

    if (!technicalContent) {
      throw new Error("Claude não retornou conteúdo de texto");
    }

    const { data: existing } = await supabase
      .from("client_smi_reports")
      .select("technical_content")
      .eq("assessment_id", assessment_id)
      .maybeSingle();

    const { data: report, error: upsertError } = await supabase
      .from("client_smi_reports")
      .upsert(
        {
          assessment_id,
          client_id: assessment.client_id,
          technical_content: technicalContent,
          previous_content: existing?.technical_content ?? null,
          status: "draft",
          generated_with: MODEL,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "assessment_id" }
      )
      .select("id")
      .single();
    if (upsertError) throw upsertError;

    console.log(`[smi-generate-technical-report] Relatório ${report.id} salvo (draft)`);

    return new Response(
      JSON.stringify({
        report_id: report.id,
        assessment_id,
        client_name: clientName,
        usage: response.usage,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[smi-generate-technical-report] Erro inesperado:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
