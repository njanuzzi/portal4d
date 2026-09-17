import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk";

// === Oficina de Roteiro: extração automática dos 6 mecanismos ===
//
// Recebe { text } (texto bruto colado pela terapeuta — sessão, rascunho,
// transcrição) e devolve os 6 campos do roteiro (cena, crença, mecanismo,
// termo, teste, fechamento) + sugestão de título, extraídos via Claude.
//
// Não salva nada no banco — só devolve o JSON pro frontend, que preenche o
// formulário como rascunho editável (a terapeuta decide quando salvar).
// Não recebe nem retém o texto bruto em nenhum lugar além desta chamada.

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

// Texto bruto pode vir de sessões inteiras (milhares de linhas) — limite
// generoso o bastante pra sessões longas, mas que evita estourar o contexto
// e custo da chamada. Acima disso, pede pra terapeuta colar um trecho menor.
const MAX_TEXT_LENGTH = 120000;

const SYSTEM_PROMPT = `Você ajuda a extrair a estrutura de um roteiro de artigo a partir de um
texto bruto (sessão, rascunho ou transcrição) colado pela autora. O roteiro
tem 6 elementos fixos, usados pra estruturar textos que desafiam uma crença
comum a partir de um mecanismo psicológico central:

1. CENA — uma cena concreta, sensorial e observável que poderia abrir o
   artigo. Nada abstrato: uma situação real, com lugar, corpo, ação.
2. CRENÇA — a crença comum, quase senso comum, que o texto desafia.
3. MECANISMO — o mecanismo central (psicológico ou comportamental) que
   explica por que essa crença comum falha ou é incompleta.
4. TERMO — um termo técnico relevante (Terapia do Esquema, ACT, TCC,
   neurociência do trauma, ou área correlata) que nomeia esse mecanismo.
5. TESTE — uma pergunta ou teste simples que o leitor pode aplicar a si
   mesmo pra reconhecer esse mecanismo na própria vida.
6. FECHAMENTO — uma frase de fechamento que retoma a cena de abertura,
   fechando o ciclo do artigo.

Além dos 6 campos, sugira um TÍTULO curto (até 70 caracteres) pro artigo.

REGRAS CRÍTICAS:
- Responda sempre em português do Brasil, em linguagem direta e concreta.
  Os campos CENA e FECHAMENTO são de linguagem editorial (voltada ao
  leitor do artigo), não clínica.
- Se o texto de origem parecer sessão clínica, relato de cliente ou
  transcrição de atendimento, NUNCA reproduza trechos literais da fala de
  quem falou — nem entre aspas, nem parafraseando de perto. Extraia só o
  mecanismo/padrão observado, generalizando qualquer nome, dor ou detalhe
  identificável.
- Cada campo é um texto corrido de 1 a 4 frases, nunca uma lista.
- Responda usando exclusivamente a tool "extract_roteiro" — não escreva
  nenhum texto fora da chamada da tool.`;

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "extract_roteiro",
  description: "Registra os 6 campos extraídos do roteiro e o título sugerido.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Título curto sugerido para o artigo (até 70 caracteres)." },
      cena: { type: "string", description: "Cena concreta que poderia abrir o artigo." },
      crenca: { type: "string", description: "Crença comum que o texto desafia." },
      mecanismo: { type: "string", description: "Mecanismo central por trás do padrão." },
      termo: { type: "string", description: "Termo técnico relevante que nomeia o mecanismo." },
      teste: { type: "string", description: "Teste aplicável ao leitor para reconhecer o mecanismo." },
      fechamento: { type: "string", description: "Frase de fechamento que retoma a cena de abertura." },
    },
    required: ["title", "cena", "crenca", "mecanismo", "termo", "teste", "fechamento"],
  },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Não autenticado" }, 401);

    let claims: { role?: string; sub?: string };
    try {
      const payload = jwt.split(".")[1];
      claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    } catch {
      return json({ error: "Token inválido" }, 401);
    }

    if (claims.role !== "service_role") {
      const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", claims.sub).single();
      if (callerProfile?.role !== "therapist") return json({ error: "Só a terapeuta pode usar a Oficina de Roteiro" }, 403);
    }

    const { text } = await req.json();
    if (!text?.trim()) {
      return json({ error: "Cole um texto pra extrair o roteiro." }, 400);
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return json({ error: `Texto muito grande (${text.length} caracteres, limite ${MAX_TEXT_LENGTH}). Cole um trecho menor ou divida em partes.` }, 400);
    }

    console.log(`[extract-roteiro] Extraindo roteiro de texto com ${text.length} caracteres`);

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `TEXTO BRUTO:\n\n${text}` }],
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "extract_roteiro" },
    });

    const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "extract_roteiro");
    if (!toolUse) throw new Error("Claude não retornou a extração esperada");

    const fields = toolUse.input as Record<string, string>;
    const result = {
      title: fields.title?.trim() ?? "",
      cena: fields.cena?.trim() ?? "",
      crenca: fields.crenca?.trim() ?? "",
      mecanismo: fields.mecanismo?.trim() ?? "",
      termo: fields.termo?.trim() ?? "",
      teste: fields.teste?.trim() ?? "",
      fechamento: fields.fechamento?.trim() ?? "",
    };

    console.log(`[extract-roteiro] Extração concluída: "${result.title}"`);

    return json({ ...result, usage: response.usage });
  } catch (err) {
    console.error("[extract-roteiro] Erro inesperado:", err);
    return json({ error: String(err) }, 500);
  }
});
