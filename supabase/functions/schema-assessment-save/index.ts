import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === Salva respostas de um domínio do Inventário de Esquemas nativo ===
//
// Chamada a cada "Próximo" do formulário público paginado por domínio —
// só mescla as respostas daquele domínio no raw_answers do rascunho
// (client_assessments.status='in_progress'). Quando `finish: true` vem
// junto (último domínio), além de salvar também calcula os scores e marca
// como concluído — mesma regra de cálculo do tally-schema-webhook (soma
// por domínio, percentual, classificação Crítico/Atenção/Básico).
//
// Só aceita gravar em rascunhos ainda 'in_progress' — depois de calculado
// não dá mais pra alterar por essa rota (evita mexer numa resposta já
// fechada usando o assessment_id como se fosse senha).

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const assessmentId = String(body?.assessment_id ?? "");
    const answers = body?.answers ?? {};
    const finish = body?.finish === true;

    if (!assessmentId) return json({ error: "assessment_id obrigatório" }, 400);

    const { data: assessment, error: findError } = await supabase
      .from("client_assessments")
      .select("id, raw_answers, status")
      .eq("id", assessmentId)
      .maybeSingle();
    if (findError) throw findError;
    if (!assessment || assessment.status !== "in_progress") {
      return json({ error: "Rascunho não encontrado ou já concluído" }, 404);
    }

    const mergedAnswers = { ...(assessment.raw_answers as Record<string, number> ?? {}), ...answers };

    if (!finish) {
      const { error: updateError } = await supabase
        .from("client_assessments")
        .update({ raw_answers: mergedAnswers })
        .eq("id", assessmentId);
      if (updateError) throw updateError;
      return json({ ok: true, answered_count: Object.keys(mergedAnswers).length });
    }

    // Último domínio: calcula os scores e fecha o rascunho
    const { data: questions, error: questionsError } = await supabase
      .from("schema_questions")
      .select("question_number, domain_id");
    if (questionsError) throw questionsError;

    const { data: domains, error: domainsError } = await supabase
      .from("schema_domains")
      .select("id, question_count");
    if (domainsError) throw domainsError;

    const answeredCount = Object.keys(mergedAnswers).length;
    if (answeredCount < (questions?.length ?? 205)) {
      return json({ error: `Faltam respostas: ${answeredCount}/${questions?.length ?? 205}` }, 400);
    }

    const questionsByDomain = new Map<string, number[]>();
    for (const q of questions!) {
      const list = questionsByDomain.get(q.domain_id) ?? [];
      list.push(q.question_number);
      questionsByDomain.set(q.domain_id, list);
    }

    const scoreRows = domains!.map((domain) => {
      const questionNumbers = questionsByDomain.get(domain.id) ?? [];
      const sum = questionNumbers.reduce((total, qn) => total + (mergedAnswers[String(qn)] ?? 0), 0);
      const maxScore = domain.question_count * 6;
      const percentual = Math.round((sum / maxScore) * 10000) / 100;
      const classification = percentual >= 66 ? "Crítico" : percentual >= 33 ? "Atenção" : "Básico";
      return { assessment_id: assessmentId, domain_id: domain.id, raw_score: sum, percentual, classification };
    });

    const { error: updateError } = await supabase
      .from("client_assessments")
      .update({ raw_answers: mergedAnswers, status: "calculated", submitted_at: new Date().toISOString() })
      .eq("id", assessmentId);
    if (updateError) throw updateError;

    const { error: scoresError } = await supabase.from("client_schema_scores").insert(scoreRows);
    if (scoresError) throw scoresError;

    console.log(`[schema-assessment-save] assessment ${assessmentId} finalizado e calculado`);

    return json({ ok: true, scores: scoreRows });
  } catch (err) {
    console.error("[schema-assessment-save] Erro inesperado:", err);
    return json({ error: String(err) }, 500);
  }
});
