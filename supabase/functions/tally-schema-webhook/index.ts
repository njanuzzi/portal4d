import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === Webhook do Tally -> cadastra/atualiza cliente e calcula os 16 esquemas ===

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIELD_LABELS = {
  name: ["Nome Completo", "Nome do Cliente", "Nome"],
  email: ["Seu melhor email", "Email", "E-mail"],
  whatsapp: ["Seu whatsapp", "WhatsApp", "Whatsapp"],
};

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function extractRatingValue(field: any): number | null {
  const raw = field?.value;
  if (typeof raw === "number") return raw;
  const tryParseLabel = (label: string): number | null => {
    const match = label.match(/^(\d+)\s*\./);
    if (match) return parseInt(match[1], 10);
    const asNumber = Number(label);
    return Number.isFinite(asNumber) ? asNumber : null;
  };
  if (typeof raw === "string") return tryParseLabel(raw);
  if (Array.isArray(raw) && raw.length > 0) {
    const selected = raw[0];
    const option = field.options?.find((o: any) => o.id === selected);
    if (option?.text) return tryParseLabel(option.text);
    if (typeof selected === "string") return tryParseLabel(selected);
  }
  return null;
}

function findFieldValue(fields: any[], candidateLabels: string[]): string | null {
  const normalizedCandidates = candidateLabels.map(normalize);
  const field = fields.find((f) => normalizedCandidates.includes(normalize(f.label ?? "")));
  if (!field) return null;
  const v = field.value;
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) return String(v[0] ?? "").trim();
  return v != null ? String(v).trim() : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const fields: any[] = payload?.data?.fields ?? [];
    const tallySubmissionId: string | undefined = payload?.data?.submissionId ?? payload?.data?.responseId;
    const submittedAt: string = payload?.data?.createdAt ?? payload?.createdAt ?? new Date().toISOString();

    if (!fields.length) {
      return new Response(JSON.stringify({ error: "Payload sem campos (data.fields ausente ou vazio)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = findFieldValue(fields, FIELD_LABELS.name);
    const email = findFieldValue(fields, FIELD_LABELS.email);
    const whatsapp = findFieldValue(fields, FIELD_LABELS.whatsapp);

    if (!email) {
      console.error("[tally-schema-webhook] Email não encontrado no payload");
      return new Response(JSON.stringify({ error: "Email do cliente não encontrado no formulário" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: questions, error: questionsError } = await supabase
      .from("schema_questions")
      .select("question_number, question_text, domain_id");
    if (questionsError) throw questionsError;

    const questionByNormalizedText = new Map<string, { question_number: number; domain_id: string }>();
    for (const q of questions!) {
      questionByNormalizedText.set(normalize(q.question_text), {
        question_number: q.question_number,
        domain_id: q.domain_id,
      });
    }

    const rawAnswers: Record<string, number> = {};
    const unmatchedFields: string[] = [];
    for (const field of fields) {
      const label = field?.label;
      if (!label) continue;
      const match = questionByNormalizedText.get(normalize(label));
      if (!match) continue;
      const value = extractRatingValue(field);
      if (value == null) {
        unmatchedFields.push(label);
        continue;
      }
      rawAnswers[String(match.question_number)] = value;
    }

    const answeredCount = Object.keys(rawAnswers).length;
    if (answeredCount < 205) {
      console.warn(`[tally-schema-webhook] Só ${answeredCount}/205 perguntas casadas. Não casadas/sem valor: ${unmatchedFields.length}`);
    }

    const { data: existingProfile, error: findError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (findError) throw findError;

    let clientId: string;
    if (existingProfile) {
      clientId = existingProfile.id;
      console.log(`[tally-schema-webhook] Cliente já cadastrado: ${email} (${clientId})`);
    } else {
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { name },
      });
      if (createUserError) throw createUserError;
      clientId = newUser.user.id;

      const { error: insertProfileError } = await supabase.from("profiles").insert({
        id: clientId,
        email,
        role: "client",
        name,
        whatsapp,
      });
      if (insertProfileError) throw insertProfileError;
      console.log(`[tally-schema-webhook] Novo cliente criado: ${email} (${clientId})`);
    }

    const { data: lastAssessment } = await supabase
      .from("client_assessments")
      .select("version")
      .eq("client_id", clientId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const version = (lastAssessment?.version ?? 0) + 1;

    const { data: assessment, error: assessmentError } = await supabase
      .from("client_assessments")
      .insert({
        client_id: clientId,
        source: "tally",
        tally_submission_id: tallySubmissionId,
        submitted_at: submittedAt,
        raw_answers: rawAnswers,
        version,
        status: "calculated",
      })
      .select("id")
      .single();
    if (assessmentError) throw assessmentError;

    const { data: domains, error: domainsError } = await supabase
      .from("schema_domains")
      .select("id, question_count");
    if (domainsError) throw domainsError;

    const questionsByDomain = new Map<string, number[]>();
    for (const q of questions!) {
      const list = questionsByDomain.get(q.domain_id) ?? [];
      list.push(q.question_number);
      questionsByDomain.set(q.domain_id, list);
    }

    const scoreRows = domains!.map((domain) => {
      const questionNumbers = questionsByDomain.get(domain.id) ?? [];
      const sum = questionNumbers.reduce((total, qn) => total + (rawAnswers[String(qn)] ?? 0), 0);
      const maxScore = domain.question_count * 6;
      const percentual = Math.round((sum / maxScore) * 10000) / 100;
      const classification = percentual >= 66 ? "Crítico" : percentual >= 33 ? "Atenção" : "Básico";
      return {
        assessment_id: assessment.id,
        domain_id: domain.id,
        raw_score: sum,
        percentual,
        classification,
      };
    });

    const { error: scoresError } = await supabase.from("client_schema_scores").insert(scoreRows);
    if (scoresError) throw scoresError;

    console.log(`[tally-schema-webhook] Assessment ${assessment.id} (v${version}) calculado para cliente ${clientId}`);

    return new Response(JSON.stringify({
      client_id: clientId,
      assessment_id: assessment.id,
      version,
      answered_questions: answeredCount,
      scores: scoreRows,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[tally-schema-webhook] Erro inesperado:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
