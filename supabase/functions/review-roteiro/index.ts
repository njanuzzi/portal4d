import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk";

// === Oficina de Roteiro: revisão crítica + reescrita via IA ===
//
// Recebe os 6 campos do roteiro como estão na tela (não o texto bruto) e
// devolve duas coisas na mesma chamada: (a) um parecer item a item contra
// os 5 critérios do checklist de revisão, sempre com o motivo, nunca só
// sim/não; (b) uma reescrita sugerida para cada um dos 6 campos, corrigindo
// só o que o parecer apontou — mantendo a voz e as escolhas da autora, não
// uma versão genérica.
//
// Não salva nada no banco e não marca o checklist sozinha — devolve o JSON
// pro frontend, que mostra o parecer ao lado de cada item e a reescrita ao
// lado de cada campo com um botão "Usar esta versão". A decisão final é
// sempre da usuária.

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

// Mesma ordem e mesmo texto exibido na tela — o parecer da IA responde
// exatamente a estes 5 critérios, na mesma ordem do array `checklist`.
const CHECKLIST_ITEMS = [
  "A primeira frase só serve para esse texto, não para qualquer texto do tema?",
  "Existe só um mecanismo central, do início ao fim?",
  "O termo técnico aparece uma vez só, e é traduzido na mesma frase?",
  "Tem um teste que o leitor aplica sozinho, hoje, sem precisar de mim?",
  "O final resolve a cena de abertura, não resume o texto?",
];

const SYSTEM_PROMPT = `Você revisa criticamente um roteiro de artigo já preenchido (6 campos) contra
5 critérios fixos de qualidade, e sugere uma reescrita pontual pra cada
campo. Nunca reproduza trechos literais de falas de cliente ou sessão
clínica se algum campo ainda carregar esse tipo de conteúdo — generalize.

Os 6 campos, na ordem que devem ser lidos:
1. CENA — cena concreta que abre o artigo.
2. CRENÇA — crença comum que o texto desafia.
3. MECANISMO — mecanismo central por trás do padrão.
4. TERMO — termo técnico que nomeia o mecanismo.
5. TESTE — teste aplicável ao leitor.
6. FECHAMENTO — frase de fechamento que retoma a cena.

Os 5 critérios do checklist, NESTA ORDEM EXATA (responda um item por
critério, na mesma ordem):
1. "${CHECKLIST_ITEMS[0]}" — avalie principalmente o campo CENA.
2. "${CHECKLIST_ITEMS[1]}" — avalie principalmente o campo MECANISMO.
3. "${CHECKLIST_ITEMS[2]}" — avalie principalmente o campo TERMO.
4. "${CHECKLIST_ITEMS[3]}" — avalie principalmente o campo TESTE.
5. "${CHECKLIST_ITEMS[4]}" — avalie os campos CENA e FECHAMENTO juntos.

REGRAS CRÍTICAS:
- Pra cada um dos 5 critérios, diga se o conteúdo atual bate ou não (campo
  "ok" true/false) e sempre justifique numa frase curta e específica (nunca
  "sim"/"não" sem motivo — ex: "o termo aparece duas vezes; na segunda vez
  ele não está traduzido").
- Se um campo estiver vazio, o critério correspondente é "ok" false com um
  comentário dizendo que o campo está vazio.
- Pra cada um dos 6 campos, escreva uma reescrita sugerida que mantenha a
  voz e as escolhas de quem já escreveu — corrija só o que o parecer
  apontou, não reescreva do zero nem generalize o texto.
- Se um campo já está bom, a reescrita pode repetir o texto original quase
  igual, só com o ajuste fino necessário.
- Responda sempre em português do Brasil, linguagem direta.
- Responda usando exclusivamente a tool "review_roteiro" — não escreva
  nenhum texto fora da chamada da tool.`;

const REVIEW_TOOL: Anthropic.Tool = {
  name: "review_roteiro",
  description: "Registra o parecer por item do checklist e a reescrita sugerida dos 6 campos.",
  input_schema: {
    type: "object",
    properties: {
      review: {
        type: "array",
        description: "Exatamente 5 itens, um por critério do checklist, na mesma ordem.",
        items: {
          type: "object",
          properties: {
            ok: { type: "boolean", description: "Se o conteúdo atual atende esse critério." },
            comment: { type: "string", description: "Justificativa curta e específica, sempre presente." },
          },
          required: ["ok", "comment"],
        },
      },
      rewrite: {
        type: "object",
        description: "Reescrita sugerida para cada um dos 6 campos.",
        properties: {
          cena: { type: "string" },
          crenca: { type: "string" },
          mecanismo: { type: "string" },
          termo: { type: "string" },
          teste: { type: "string" },
          fechamento: { type: "string" },
        },
        required: ["cena", "crenca", "mecanismo", "termo", "teste", "fechamento"],
      },
    },
    required: ["review", "rewrite"],
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

    const { cena, crenca, mecanismo, termo, teste, fechamento } = await req.json();
    const fields = { cena, crenca, mecanismo, termo, teste, fechamento };
    const hasContent = Object.values(fields).some((v) => typeof v === "string" && v.trim());
    if (!hasContent) {
      return json({ error: "Preencha ao menos um campo antes de pedir a revisão." }, 400);
    }

    const userMessage = `ROTEIRO ATUAL:

CENA: ${cena?.trim() || "(vazio)"}
CRENÇA: ${crenca?.trim() || "(vazio)"}
MECANISMO: ${mecanismo?.trim() || "(vazio)"}
TERMO: ${termo?.trim() || "(vazio)"}
TESTE: ${teste?.trim() || "(vazio)"}
FECHAMENTO: ${fechamento?.trim() || "(vazio)"}`;

    console.log("[review-roteiro] Revisando roteiro");

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      tools: [REVIEW_TOOL],
      tool_choice: { type: "tool", name: "review_roteiro" },
    });

    const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "review_roteiro");
    if (!toolUse) throw new Error("Claude não retornou a revisão esperada");

    const result = toolUse.input as { review: { ok: boolean; comment: string }[]; rewrite: Record<string, string> };
    if (!Array.isArray(result.review) || result.review.length !== CHECKLIST_ITEMS.length) {
      throw new Error("Revisão retornada em formato inesperado");
    }

    console.log("[review-roteiro] Revisão concluída");

    return json({ review: result.review, rewrite: result.rewrite, usage: response.usage });
  } catch (err) {
    console.error("[review-roteiro] Erro inesperado:", err);
    return json({ error: String(err) }, 500);
  }
});
