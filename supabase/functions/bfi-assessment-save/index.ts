import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === Salva respostas do Big Five Inventory (BFI) ===
//
// Diferente do SMI/YSQ, o BFI não é paginado por bloco temático — os 25
// itens são respondidos numa página só no front (ordem mista é proposital
// do instrumento original; agrupar por fator induziria viés de resposta).
// Por isso esta função é sempre chamada uma única vez, já com finish=true
// e as 25 respostas completas — mas mantém a mesma forma de chamada do
// SMI/YSQ (assessment_id + answers + finish) por consistência.
//
// Os 5 fatores e quais números de questão entram em cada um são fixos (não
// vêm do banco) — mesmo mapeamento usado em src/lib/bfiFactors.ts no
// frontend. Não há pontos de corte validados pra população brasileira
// ainda (conforme o próprio instrumento), então o resultado fica só como
// média por fator, sem classificação.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const FACTORS: Record<string, number[]> = {
  extroversao: [1, 7, 10, 17],
  amabilidade: [3, 11, 19, 23],
  conscienciosidade: [4, 12, 14, 18, 24],
  neuroticismo: [5, 8, 13, 15, 20, 21],
  abertura: [2, 6, 9, 16, 22, 25],
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
      p_instrument: "bfi",
      p_assessment_id: assessmentId,
      p_token: editToken,
    });
    if (tokenError) throw tokenError;
    if (!tokenValid) {
      return json({ error: "Rascunho não encontrado ou já concluído" }, 404);
    }

    const { data: assessment, error: findError } = await supabase
      .from("client_bfi_assessments")
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
        .from("client_bfi_assessments")
        .update({ raw_answers: mergedAnswers })
        .eq("id", assessmentId);
      if (updateError) throw updateError;
      return json({ ok: true, answered_count: Object.keys(mergedAnswers).length });
    }

    const { data: questions, error: questionsError } = await supabase
      .from("bfi_questions")
      .select("question_number");
    if (questionsError) throw questionsError;

    const answeredCount = Object.keys(mergedAnswers).length;
    if (answeredCount < (questions?.length ?? 25)) {
      return json({ error: `Faltam respostas: ${answeredCount}/${questions?.length ?? 25}` }, 400);
    }

    const scores = Object.entries(FACTORS).map(([factor, questionNumbers]) => {
      const sum = questionNumbers.reduce((total, qn) => total + (mergedAnswers[String(qn)] ?? 0), 0);
      const averageScore = Math.round((sum / questionNumbers.length) * 100) / 100;
      return { factor, average_score: averageScore };
    });

    const { error: updateError } = await supabase
      .from("client_bfi_assessments")
      .update({ raw_answers: mergedAnswers, status: "calculated", submitted_at: new Date().toISOString() })
      .eq("id", assessmentId);
    if (updateError) throw updateError;

    console.log(`[bfi-assessment-save] assessment ${assessmentId} finalizado e calculado`);

    return json({ ok: true, scores });
  } catch (err) {
    console.error("[bfi-assessment-save] Erro inesperado:", err);
    return json({ error: String(err) }, 500);
  }
});
