import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk";

// === Gera a devolutiva simplificada para o CLIENTE (voz sistêmica) via Claude ===
//
// Recebe { assessment_id }, busca os 5 esquemas de maior percentual (não filtra
// por classificação — o cliente quase nunca lê relatório longo, então a lógica é
// "os 5 mais altos", como decidido com a terapeuta), monta o prompt em linguagem
// sistêmica (sem jargão de Terapia do Esquema) e salva o resultado como JSON
// estruturado em client_schema_reports.client_content.
//
// O NOME de cada esquema (campo "nome") vem sempre de schema_domains.friendly_name
// — fixo no banco, nunca gerado pela IA. Isso garante que o mesmo esquema apareça
// com o mesmo nome em qualquer devolutiva de qualquer cliente, em qualquer versão
// (importante pro cliente conseguir comparar % entre respostas diferentes ao longo
// do tempo sem achar que são padrões diferentes). A IA só escreve a "descricao"
// (como aquele padrão aparece na vida da pessoa) e a "conclusao".
//
// Não mexe em technical_content/status — só complementa a linha já existente
// (criada por generate-technical-report). Por isso é update, não upsert.

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
resultados de um inventário de autoconhecimento. O cliente provavelmente vai ler
isso rapidamente — nada de texto longo ou técnico.

REGRA 1 — VOZ SISTÊMICA: nunca escreva como um especialista em Terapia do Esquema.
Não use os termos técnicos da Terapia do Esquema (não fale em "esquema", "modo",
"crítico", "subjugação" como rótulo clínico, etc.). Em vez disso, descreva cada
padrão como algo que a pessoa faz, sente ou repete nos relacionamentos e na vida —
como um papel que ela aprendeu a exercer, uma forma de se proteger, uma crenca
sobre si mesma ou sobre os outros. Linguagem acolhedora, concreta, sem
diagnóstico, sem culpa.

REGRA 2 — VOZ PESSOAL E DIRETA: escreva como se a terapeuta estivesse falando
diretamente com o cliente, olhando para ele — segunda pessoa ("você"), nunca
terceira pessoa ("[Nome] tende a..."). Comece cada descrição com uma abertura
pessoal e observacional (ex: "Percebo que você...", "Noto que você...", "Você
costuma..."), variando a abertura entre os itens para não soar repetitivo. Pode
usar o primeiro nome do cliente ocasionalmente, mas o texto tem que soar como uma
fala dirigida à pessoa, não uma descrição sobre ela.

REGRA 3 — NÃO INVENTE O NOME DO PADRÃO: cada padrão já vem com um nome
padronizado (campo "nome_padrao" na entrada), usado em todas as devolutivas de
todos os clientes. Sua única tarefa é escrever a descrição de cada um — não crie
nem varie o nome, ele é fixo por design.

DADOS DE ENTRADA: nome do cliente e os 5 padrões de maior percentual, cada um com
o nome técnico interno (só pra você entender do que se trata, não usar no texto),
o nome padronizado ("nome_padrao") e o percentual.

Responda APENAS com um JSON válido (sem markdown, sem \`\`\`, sem texto antes ou
depois), no formato exato abaixo:

{
  "esquemas": [
    {
      "descricao": "2 a 4 frases, em segunda pessoa e com abertura pessoal, explicando o que esse padrão costuma significar na vida da pessoa e nos relacionamentos — como ele se manifesta, não por que ele existe."
    }
  ],
  "conclusao": "Um parágrafo (4 a 6 frases), também em segunda pessoa e tom pessoal, como um fechamento da terapeuta compartilhando o que as respostas do questionário revelaram sobre a pessoa como um todo — não uma análise técnica de como os padrões se cruzam, e sim uma síntese acolhedora do que esse conjunto de respostas mostra."
}

O array "esquemas" deve ter exatamente 5 itens, na mesma ordem (maior percentual
primeiro) em que os dados foram fornecidos — item 1 da resposta corresponde ao
item 1 dos dados de entrada, e assim por diante.`;

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

    const { data: assessment, error: assessmentError } = await supabase
      .from("client_assessments")
      .select("id, client_id, profiles(name)")
      .eq("id", assessment_id)
      .single();
    if (assessmentError) throw assessmentError;

    const { data: allScores, error: scoresError } = await supabase
      .from("client_schema_scores")
      .select("domain_id, percentual, schema_domains(name, friendly_name)")
      .eq("assessment_id", assessment_id)
      .order("percentual", { ascending: false });
    if (scoresError) throw scoresError;

    if (!allScores?.length) {
      return new Response(JSON.stringify({ error: "Nenhum score encontrado para esse assessment_id" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scores = (allScores as any[]).slice(0, 5);
    const todos = (allScores as any[]).map((s) => ({ domain_id: s.domain_id, percentual: s.percentual }));

    const clientName = (assessment as any)?.profiles?.name ?? "Cliente";

    const esquemasList = scores
      .map((s, i) => `${i + 1}. nome_padrao: "${s.schema_domains.friendly_name}" | nome técnico (referência interna): ${s.schema_domains.name} | percentual: ${s.percentual}%`)
      .join("\n");

    const userMessage = `Cliente: ${clientName}\n\n5 padrões de maior percentual:\n${esquemasList}`;

    console.log(`[generate-client-report] Gerando devolutiva para assessment ${assessment_id}`);

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
    let aiContent: { esquemas: { descricao: string }[]; conclusao: unknown };
    try {
      aiContent = JSON.parse(jsonText);
    } catch {
      throw new Error(`Claude não retornou um JSON válido: ${rawText.slice(0, 300)}`);
    }

    if (!Array.isArray(aiContent.esquemas) || aiContent.esquemas.length !== scores.length) {
      throw new Error(`Claude retornou ${aiContent.esquemas?.length ?? 0} itens, esperado ${scores.length}`);
    }

    const esquemas = scores.map((s, i) => ({
      nome: s.schema_domains.friendly_name,
      percentual: s.percentual,
      descricao: aiContent.esquemas[i].descricao,
    }));

    const clientContent = { esquemas, conclusao: aiContent.conclusao, todos };

    const { data: existing } = await supabase
      .from("client_schema_reports")
      .select("client_content")
      .eq("assessment_id", assessment_id)
      .maybeSingle();

    const { data: report, error: updateError } = await supabase
      .from("client_schema_reports")
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

    console.log(`[generate-client-report] Devolutiva do relatório ${report.id} salva`);

    return new Response(
      JSON.stringify({ report_id: report.id, assessment_id, client_name: clientName, usage: response.usage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[generate-client-report] Erro inesperado:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
