import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === Salva respostas da Escala de Crenças Românticas (RBS) ===
//
// 13 itens numa página só (sem paginação) — o front sempre chama esta
// função uma única vez, já com finish=true e as 13 respostas completas.
//
// 4 subescalas (médias): amor_encontra_uma_maneira, amor_a_primeira_vista,
// um_e_unico, idealizacao. Escala global = média das 4 subescalas (não é a
// média direta dos 13 itens). Mesmo mapeamento usado em
// src/lib/rbsScore.ts no frontend. Não há pontos de corte validados pra
// população brasileira ainda.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const SUBSCALES: Record<string, number[]> = {
  amor_encontra_uma_maneira: [3, 7, 9, 11, 13],
  amor_a_primeira_vista: [4, 10],
  um_e_unico: [1, 2, 8],
  idealizacao: [5, 6, 12],
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
      p_instrument: "rbs",
      p_assessment_id: assessmentId,
      p_token: editToken,
    });
    if (tokenError) throw tokenError;
    if (!tokenValid) {
      return json({ error: "Rascunho não encontrado ou já concluído" }, 404);
    }

    const { data: assessment, error: findError } = await supabase
      .from("client_rbs_assessments")
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
        .from("client_rbs_assessments")
        .update({ raw_answers: mergedAnswers })
        .eq("id", assessmentId);
      if (updateError) throw updateError;
      return json({ ok: true, answered_count: Object.keys(mergedAnswers).length });
    }

    const { data: questions, error: questionsError } = await supabase
      .from("rbs_questions")
      .select("question_number");
    if (questionsError) throw questionsError;

    const answeredCount = Object.keys(mergedAnswers).length;
    const totalQuestions = questions?.length ?? 13;
    if (answeredCount < totalQuestions) {
      return json({ error: `Faltam respostas: ${answeredCount}/${totalQuestions}` }, 400);
    }

    const subscaleAverages = Object.entries(SUBSCALES).map(([key, questionNumbers]) => {
      const sum = questionNumbers.reduce((total, qn) => total + (mergedAnswers[String(qn)] ?? 0), 0);
      return { key, average: sum / questionNumbers.length };
    });
    const global = subscaleAverages.reduce((total, s) => total + s.average, 0) / subscaleAverages.length;

    const { error: updateError } = await supabase
      .from("client_rbs_assessments")
      .update({ raw_answers: mergedAnswers, status: "calculated", submitted_at: new Date().toISOString() })
      .eq("id", assessmentId);
    if (updateError) throw updateError;

    console.log(`[rbs-assessment-save] assessment ${assessmentId} finalizado e calculado`);

    return json({ ok: true, scores: { subscales: subscaleAverages, global } });
  } catch (err) {
    console.error("[rbs-assessment-save] Erro inesperado:", err);
    return json({ error: String(err) }, 500);
  }
});
