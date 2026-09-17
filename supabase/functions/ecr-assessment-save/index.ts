import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === Salva respostas da ECR-R (apego adulto) ===
//
// 10 itens numa página só (sem paginação) — o front sempre chama esta
// função uma única vez, já com finish=true e as 10 respostas completas.
//
// 2 subescalas (somas): ansiedade e evitacao. Sem escala global — o
// instrumento só reporta as duas subescalas separadamente. Mesmo
// mapeamento usado em src/lib/ecrScore.ts no frontend. Não há pontos de
// corte validados pra população brasileira ainda.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const SUBSCALES: Record<string, number[]> = {
  ansiedade: [2, 4, 6, 8, 10],
  evitacao: [1, 3, 5, 7, 9],
};

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
    const editToken = String(body?.edit_token ?? "");
    const answers = body?.answers ?? {};
    const finish = body?.finish === true;

    if (!assessmentId || !editToken) {
      return json({ error: "Rascunho não encontrado ou já concluído" }, 404);
    }

    const { data: tokenValid, error: tokenError } = await supabase.rpc("verify_assessment_edit_token", {
      p_instrument: "ecr",
      p_assessment_id: assessmentId,
      p_token: editToken,
    });
    if (tokenError) throw tokenError;
    if (!tokenValid) {
      return json({ error: "Rascunho não encontrado ou já concluído" }, 404);
    }

    const { data: assessment, error: findError } = await supabase
      .from("client_ecr_assessments")
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
        .from("client_ecr_assessments")
        .update({ raw_answers: mergedAnswers })
        .eq("id", assessmentId);
      if (updateError) throw updateError;
      return json({ ok: true, answered_count: Object.keys(mergedAnswers).length });
    }

    const { data: questions, error: questionsError } = await supabase
      .from("ecr_questions")
      .select("question_number");
    if (questionsError) throw questionsError;

    const answeredCount = Object.keys(mergedAnswers).length;
    const totalQuestions = questions?.length ?? 10;
    if (answeredCount < totalQuestions) {
      return json({ error: `Faltam respostas: ${answeredCount}/${totalQuestions}` }, 400);
    }

    const subscaleSums = Object.entries(SUBSCALES).map(([key, questionNumbers]) => {
      const sum = questionNumbers.reduce((total, qn) => total + (mergedAnswers[String(qn)] ?? 0), 0);
      return { key, sum };
    });

    const { error: updateError } = await supabase
      .from("client_ecr_assessments")
      .update({ raw_answers: mergedAnswers, status: "calculated", submitted_at: new Date().toISOString() })
      .eq("id", assessmentId);
    if (updateError) throw updateError;

    console.log(`[ecr-assessment-save] assessment ${assessmentId} finalizado e calculado`);

    return json({ ok: true, scores: { subscales: subscaleSums } });
  } catch (err) {
    console.error("[ecr-assessment-save] Erro inesperado:", err);
    return json({ error: String(err) }, 500);
  }
});
