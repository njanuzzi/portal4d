import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk";

// === Gera a devolutiva simplificada do SMI para o CLIENTE (voz sistêmica) via Claude ===
//
// Clone de generate-client-report (YSQ): busca os 5 modos de maior média
// (mesma lógica "os 5 mais altos", sem cutoff), monta o prompt em
// linguagem sistêmica (sem jargão de Terapia do Esquema) e salva o
// resultado como JSON estruturado em client_smi_reports.client_content.
//
// O NOME de cada modo (campo "nome") vem sempre de smi_modes.name — fixo
// no banco, nunca gerado pela IA, pelo mesmo motivo do YSQ (consistência
// entre devolutivas e ao longo do tempo). A IA só escreve a "descricao" e
// a "conclusao".
//
// Não mexe em technical_content/status — só complementa a linha já
// existente (criada por smi-generate-technical-report). Por isso é
// update, não upsert.

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

const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = `Você está escrevendo uma devolutiva para o CLIENTE de uma terapeuta, a partir dos
resultados de um inventário de autoconhecimento sobre estados emocionais e
comportamentais que se repetem ("modos"). O cliente provavelmente vai ler isso
rapidamente — nada de texto longo ou técnico.

REGRA 1 — VOZ SISTÊMICA: nunca escreva como um especialista em Terapia do Esquema.
Não use os termos técnicos da Terapia do Esquema (não fale em "modo esquemático",
"esquema", "hipercompensação" como rótulo clínico, etc.). Em vez disso, descreva
cada padrão como algo que a pessoa faz, sente ou repete nos relacionamentos e na
vida — como um estado que ela entra, uma forma de reagir, uma parte dela que
aparece em certas situações. Linguagem acolhedora, concreta, sem diagnóstico,
sem culpa.

REGRA 2 — VOZ PESSOAL E DIRETA: escreva como se a terapeuta estivesse falando
diretamente com o cliente, olhando para ele — segunda pessoa ("você"), nunca
terceira pessoa. Comece cada descrição com uma abertura pessoal e observacional
(ex: "Percebo que você...", "Noto que você...", "Tem um lado seu que..."),
variando a abertura entre os itens para não soar repetitivo.

REGRA 3 — NÃO INVENTE O NOME DO PADRÃO: cada padrão já vem com um nome
padronizado (campo "nome_padrao" na entrada), usado em todas as devolutivas de
todos os clientes. Sua única tarefa é escrever a descrição de cada um — não crie
nem varie o nome, ele é fixo por design.

DADOS DE ENTRADA: nome do cliente e os 5 padrões de maior média (escala 1-6),
cada um com o nome padronizado ("nome_padrao") e a média.

Responda APENAS com um JSON válido (sem markdown, sem \`\`\`, sem texto antes ou
depois), no formato exato abaixo:

{
  "modos": [
    {
      "descricao": "2 a 4 frases, em segunda pessoa e com abertura pessoal, explicando o que esse padrão costuma significar na vida da pessoa e nos relacionamentos — como ele aparece, não por que ele existe."
    }
  ],
  "conclusao": "Um parágrafo (4 a 6 frases), também em segunda pessoa e tom pessoal, como um fechamento da terapeuta compartilhando o que as respostas do questionário revelaram sobre a pessoa como um todo."
}

O array "modos" deve ter exatamente 5 itens, na mesma ordem (maior média
primeiro) em que os dados foram fornecidos.`;

// Claude às vezes cerca o JSON com um bloco de código ou acrescenta uma frase
// antes/depois apesar da instrução de responder só com JSON — extrai o objeto
// de forma tolerante em vez de exigir que a resposta comece exatamente com "{".
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return raw.slice(start, end + 1);
  return raw.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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

    interface ProfileRef { name: string }
    interface ScoreRow { mode_id: string; average_score: number; smi_modes: ProfileRef | ProfileRef[] | null }

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
      .select("mode_id, average_score, smi_modes(name)")
      .eq("assessment_id", assessment_id)
      .order("average_score", { ascending: false });
    if (scoresError) throw scoresError;
    const allScores = (scoresData ?? []) as unknown as ScoreRow[];

    if (!allScores.length) {
      return new Response(JSON.stringify({ error: "Nenhum score encontrado para esse assessment_id" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scores = allScores.slice(0, 5);
    // "todos" alimenta o gráfico completo dos 14 modos na tela do cliente —
    // gerado por código, não pela IA, pra não gastar tokens nem risco de
    // inconsistência nos valores.
    const todos = allScores.map((s) => ({ mode_id: s.mode_id, average_score: s.average_score }));

    const clientName = unwrap(assessment.profiles)?.name ?? "Cliente";

    const modosListForPrompt = scores
      .map((s, i) => `${i + 1}. nome_padrao: "${unwrap(s.smi_modes)?.name}" | média: ${s.average_score}/6`)
      .join("\n");

    const userMessage = `Cliente: ${clientName}\n\n5 padrões de maior média:\n${modosListForPrompt}`;

    console.log(`[smi-generate-client-report] Gerando devolutiva para assessment ${assessment_id}`);

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

    if (!rawText) {
      throw new Error("Claude não retornou conteúdo de texto");
    }

    const jsonText = extractJson(rawText);
    let aiContent: { modos: { descricao: string }[]; conclusao: unknown };
    try {
      aiContent = JSON.parse(jsonText);
    } catch {
      throw new Error(`Claude não retornou um JSON válido: ${rawText.slice(0, 300)}`);
    }

    if (!Array.isArray(aiContent.modos) || aiContent.modos.length !== scores.length) {
      throw new Error(`Claude retornou ${aiContent.modos?.length ?? 0} itens, esperado ${scores.length}`);
    }

    // O nome e a média vêm sempre do banco (determinístico) — só a
    // descrição é da IA. Isso garante nome padronizado entre devolutivas.
    const modos = scores.map((s, i) => ({
      nome: unwrap(s.smi_modes)?.name ?? "—",
      average_score: s.average_score,
      descricao: aiContent.modos[i].descricao,
    }));

    const clientContent = { modos, conclusao: aiContent.conclusao, todos };

    const { data: existing } = await supabase
      .from("client_smi_reports")
      .select("client_content")
      .eq("assessment_id", assessment_id)
      .maybeSingle();

    const { data: report, error: updateError } = await supabase
      .from("client_smi_reports")
      .update({
        previous_client_content: existing?.client_content ?? null,
        client_content: clientContent,
        client_content_status: "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("assessment_id", assessment_id)
      .select("id")
      .single();
    if (updateError) throw updateError;

    console.log(`[smi-generate-client-report] Devolutiva do relatório ${report.id} salva`);

    return new Response(
      JSON.stringify({ report_id: report.id, assessment_id, client_name: clientName, usage: response.usage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[smi-generate-client-report] Erro inesperado:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
