import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === Salva respostas da Escala de Amor do MARQ ===
//
// Unidimensional e curta (9 itens numa página só, sem paginação) — o front
// sempre chama esta função uma única vez, já com finish=true e as 9
// respostas completas.
//
// Diferente do BFI (que tem 5 fatores, cada um usando um subconjunto de
// perguntas), o MARQ usa as 9 perguntas inteiras pros dois escores — só
// muda a forma de agregar: "Escala global" é a SOMA, "Escore total" é a
// MÉDIA. Não há pontos de corte validados pra população brasileira ainda
// (conforme o próprio instrumento).

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
    const editToken = String(body?.edit_token ?? "");
    const answers = body?.answers ?? {};
    const finish = body?.finish === true;

    if (!assessmentId || !editToken) {
      return json({ error: "Rascunho não encontrado ou já concluído" }, 404);
    }

    const { data: tokenValid, error: tokenError } = await supabase.rpc("verify_assessment_edit_token", {
      p_instrument: "marq",
      p_assessment_id: assessmentId,
      p_token: editToken,
    });
    if (tokenError) throw tokenError;
    if (!tokenValid) {
      return json({ error: "Rascunho não encontrado ou já concluído" }, 404);
    }

    const { data: assessment, error: findError } = await supabase
      .from("client_marq_assessments")
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
        .from("client_marq_assessments")
        .update({ raw_answers: mergedAnswers })
        .eq("id", assessmentId);
      if (updateError) throw updateError;
      return json({ ok: true, answered_count: Object.keys(mergedAnswers).length });
    }

    const { data: questions, error: questionsError } = await supabase
      .from("marq_questions")
      .select("question_number");
    if (questionsError) throw questionsError;

    const answeredCount = Object.keys(mergedAnswers).length;
    const totalQuestions = questions?.length ?? 9;
    if (answeredCount < totalQuestions) {
      return json({ error: `Faltam respostas: ${answeredCount}/${totalQuestions}` }, 400);
    }

    const sum = Object.values(mergedAnswers).reduce((total: number, v) => total + (Number(v) || 0), 0);
    const average = Math.round((sum / totalQuestions) * 100) / 100;

    const { error: updateError } = await supabase
      .from("client_marq_assessments")
      .update({ raw_answers: mergedAnswers, status: "calculated", submitted_at: new Date().toISOString() })
      .eq("id", assessmentId);
    if (updateError) throw updateError;

    console.log(`[marq-assessment-save] assessment ${assessmentId} finalizado e calculado`);

    return json({ ok: true, scores: { global: sum, escore_total: average } });
  } catch (err) {
    console.error("[marq-assessment-save] Erro inesperado:", err);
    return json({ error: String(err) }, 500);
  }
});
