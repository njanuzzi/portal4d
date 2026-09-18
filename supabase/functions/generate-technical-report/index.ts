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

const SYSTEM_PROMPT = `Você é um supervisor clínico especializado em Terapia do Esquema, produzindo um
relatório técnico de apoio para o terapeuta que conduz o caso — este documento
NUNCA é lido pelo cliente.

DADOS DE ENTRADA que você recebe:
- Nome do cliente
- Lista dos 16 esquemas, cada um com: nome, percentual, classificação
  (Crítico >=66%, Atenção >=33%, Básico abaixo), e — quando disponível — o modo
  de vulnerabilidade provável (hipótese heurística, não diagnóstica)
- Ordenados do maior para o menor percentual

REGRAS DE FORMATAÇÃO:
- Use Markdown limpo (##, ###, listas) — nada de emojis obrigatórios, isso é
  para leitura numa tela, não para colar em planilha.
- Linguagem clínica, direta, técnica — você está escrevendo para outro
  profissional, não precisa suavizar.
- Sempre trate hipóteses como hipóteses ("pode indicar", "sugere", "é
  compatível com") — nunca como fato fechado.

ESTRUTURA (siga esta ordem, todos os blocos):

## 1. Resumo geral do perfil esquemático
- Quais esquemas são centrais (maior percentual) e por que parecem centrais
  no funcionamento atual.
- Quais modos de vulnerabilidade parecem mais presentes, com base nos
  esquemas de maior percentual (use o campo modo de vulnerabilidade
  fornecido nos dados — não invente correspondência esquema→modo).
- O padrão geral parece crônico/rígido, oscilante ou evasivo?

## 2. Análise individual dos esquemas
Para CADA um dos 16 esquemas, em ordem decrescente de percentual, mesmo os
Básicos (mais breve para esses):
### [NOME DO ESQUEMA] — [percentual]% ([classificação])
- Conceito clínico do esquema
- Hipótese sobre origem/manutenção (vivências precoces, padrões relacionais)
- Modo de vulnerabilidade associado (se disponível nos dados)
- Impacto em relacionamentos íntimos
- Impacto profissional/produtividade
- Comportamentos observáveis esperados
- Situações-gatilho específicas e combinação com outros esquemas elevados
  do mesmo cliente

## 3. Cruzamento de esquemas
- Cruzamentos relevantes entre os esquemas Críticos e de Atenção
- Padrões de interação (reforço mútuo, compensação, fusão, conflito)
- Impactos emocionais/relacionais desses cruzamentos combinados

## 4. Ferramentas e recomendações terapêuticas
- Psicoeducação: tópicos a abordar com o cliente
- Vivência imagética / reencenação
- Exercícios de enfrentamento emocional
- Diálogo socrático: perguntas que confrontem crenças centrais com segurança
- Tarefas de casa
- Técnicas de regulação emocional

## 5. Alertas clínicos e sugestões
- Resistências prováveis / defesas esperadas
- Fragilidades no vínculo terapêutico (esquemas que reativam desconfiança,
  abandono, submissão em relação a você)
- Riscos clínicos a monitorar
- Temas prioritários para próximas sessões

## 6. Reflexos em treino, alimentação e corpo
Com base nos esquemas mais ativados, elabore hipóteses sobre como podem
influenciar rotina de treino, alimentação, imagem corporal e autocuidado
físico — SOMENTE para os esquemas realmente ativados neste cliente (não
force esse bloco se não houver esquemas dos grupos tipicamente associados:
Fracasso, Defectividade/Vergonha, Padrões Inflexíveis, Dependência/
Incompetência, Autocontrole/Autodisciplina Insuficientes, Subjugação,
Privação Emocional).

## 7. Pontos de atenção na condução clínica
Este bloco NÃO é uma hipótese diagnóstica de transtorno de personalidade —
é um sinalizador prático de onde redobrar atenção na condução do caso.
Para os esquemas/modos mais elevados deste cliente, aponte:
- Quais combinações de esquema+modo costumam pedir mais cuidado técnico
  (ex: rigidez terapêutica, ritmo de exposição, manejo de ruptura de
  vínculo)
- Se a intensidade/persistência/generalização do padrão sugere algo mais
  arraigado que vale acompanhar de perto (sem nomear cluster ou transtorno)
- O que observar nas próprias sessões (fala, reação a limites, dinâmica de
  idealização/desvalorização, evitação de temas centrais)
Trate tudo isso como observação a confirmar clinicamente, nunca como
conclusão.

INSTRUÇÕES FINAIS:
- Analise todos os 16 esquemas — não pule nenhum.
- Baseie-se apenas nos dados fornecidos, não invente esquemas ou percentuais.
- O texto deve estar pronto para leitura direta na tela do terapeuta, sem
  necessidade de edição adicional.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!(await requireTherapist(req))) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { assessment_id } = await req.json();
    if (!assessment_id) {
      return new Response(JSON.stringify({ error: "assessment_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: assessment, error: assessmentError } = await supabase
      .from("client_assessments")
      .select("id, client_id, version, profiles(name)")
      .eq("id", assessment_id)
      .single();
    if (assessmentError) throw assessmentError;

    const { data: scores, error: scoresError } = await supabase
      .from("client_schema_scores")
      .select("percentual, classification, schema_domains(name, schema_vulnerability_modes(mode_name))")
      .eq("assessment_id", assessment_id)
      .order("percentual", { ascending: false });
    if (scoresError) throw scoresError;

    if (!scores?.length) {
      return new Response(JSON.stringify({ error: "Nenhum score encontrado para esse assessment_id" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientName = (assessment as any)?.profiles?.name ?? "Cliente";
    const esquemasList = (scores as any[])
      .map((s) => {
        const modoRaw = s.schema_domains?.schema_vulnerability_modes;
        const modo = Array.isArray(modoRaw) ? modoRaw[0]?.mode_name : modoRaw?.mode_name;
        return `- ${s.schema_domains.name}: ${s.percentual}% (${s.classification})${modo ? ` — modo de vulnerabilidade provável: ${modo}` : ""}`;
      })
      .join("\n");

    const userMessage = `Cliente: ${clientName}\n\nEsquemas (ordenados por percentual):\n${esquemasList}`;

    console.log(`[generate-technical-report] Gerando relatório para assessment ${assessment_id}`);

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
    if (!technicalContent) throw new Error("Claude não retornou conteúdo de texto");

    const { data: report, error: upsertError } = await supabase
      .from("client_schema_reports")
      .upsert({
        assessment_id,
        client_id: (assessment as any).client_id,
        technical_content: technicalContent,
        status: "draft",
        generated_with: MODEL,
        updated_at: new Date().toISOString(),
      }, { onConflict: "assessment_id" })
      .select("id")
      .single();
    if (upsertError) throw upsertError;

    console.log(`[generate-technical-report] Relatório ${report.id} salvo (draft)`);

    return new Response(JSON.stringify({
      report_id: report.id,
      assessment_id,
      client_name: clientName,
      usage: response.usage,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[generate-technical-report] Erro inesperado:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
