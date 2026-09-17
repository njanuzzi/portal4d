import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === Salva respostas de um modo do Inventário de Modos Esquemáticos (SMI) ===
//
// Espelha o schema-assessment-save do YSQ, mas calcula a MÉDIA por modo (não
// percentual/classificação) — é assim que o SMI define o score de cada um
// dos 14 modos, e não há pontos de corte validados pra população brasileira
// ainda, então classification fica sempre null (coluna existe só pra ficar
// pronta se um dia houver cutoffs).
//
// Chamada a cada "Próximo" do formulário público paginado por modo — só
// mescla as respostas daquele modo no raw_answers do rascunho
// (client_smi_assessments.status='in_progress'). Quando `finish: true` vem
// junto (último modo), além de salvar também calcula os scores e marca
// como concluído.
//
// Só aceita gravar em rascunhos ainda 'in_progress' e exige o edit_token
// emitido na criação/retomada. O assessment_id é apenas identificador interno.

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
      p_instrument: "smi",
      p_assessment_id: assessmentId,
      p_token: editToken,
    });
    if (tokenError) throw tokenError;
    if (!tokenValid) {
      return json({ error: "Rascunho não encontrado ou já concluído" }, 404);
    }

    const { data: assessment, error: findError } = await supabase
      .from("client_smi_assessments")
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
        .from("client_smi_assessments")
        .update({ raw_answers: mergedAnswers })
        .eq("id", assessmentId);
      if (updateError) throw updateError;
      return json({ ok: true, answered_count: Object.keys(mergedAnswers).length });
    }

    // Último modo: calcula os scores e fecha o rascunho
    const { data: questions, error: questionsError } = await supabase
      .from("smi_questions")
      .select("question_number, mode_id");
    if (questionsError) throw questionsError;

    const { data: modes, error: modesError } = await supabase
      .from("smi_modes")
      .select("id, question_count");
    if (modesError) throw modesError;

    const answeredCount = Object.keys(mergedAnswers).length;
    if (answeredCount < (questions?.length ?? 124)) {
      return json({ error: `Faltam respostas: ${answeredCount}/${questions?.length ?? 124}` }, 400);
    }

    const questionsByMode = new Map<string, number[]>();
    for (const q of questions!) {
      const list = questionsByMode.get(q.mode_id) ?? [];
      list.push(q.question_number);
      questionsByMode.set(q.mode_id, list);
    }

    const scoreRows = modes!.map((mode) => {
      const questionNumbers = questionsByMode.get(mode.id) ?? [];
      const sum = questionNumbers.reduce((total, qn) => total + (mergedAnswers[String(qn)] ?? 0), 0);
      const averageScore = Math.round((sum / mode.question_count) * 100) / 100;
      return { assessment_id: assessmentId, mode_id: mode.id, raw_sum: sum, average_score: averageScore, classification: null };
    });

    const { error: updateError } = await supabase
      .from("client_smi_assessments")
      .update({ raw_answers: mergedAnswers, status: "calculated", submitted_at: new Date().toISOString() })
      .eq("id", assessmentId);
    if (updateError) throw updateError;

    const { error: scoresError } = await supabase.from("client_smi_scores").insert(scoreRows);
    if (scoresError) throw scoresError;

    console.log(`[smi-assessment-save] assessment ${assessmentId} finalizado e calculado`);

    return json({ ok: true, scores: scoreRows });
  } catch (err) {
    console.error("[smi-assessment-save] Erro inesperado:", err);
    return json({ error: String(err) }, 500);
  }
});
