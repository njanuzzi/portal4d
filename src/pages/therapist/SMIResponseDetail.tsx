import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Layers, Download, Info } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabase';
import { buildRawAnswersCsv, downloadCsv, QuestionRef } from '../../lib/schemaCsv';
import { SMI_CATEGORY_LABELS, SMI_CATEGORY_ORDER, SMI_ETHICAL_NOTICE, SMI_MODE_RELATIONSHIPS } from '../../lib/smiModeOrder';

// Quantos modos (dos 14) entram na leitura de "mais ativados" pra cruzar
// com SMI_MODE_RELATIONSHIPS — não é um cutoff clínico (o instrumento não
// tem pontos de corte validados), só um recorte relativo ao próprio perfil
// do cliente pra destacar os modos mais proeminentes dele.
const TOP_MODES_FOR_RELATIONSHIPS = 4;

interface AssessmentInfo {
  id: string;
  client_id: string;
  version: number;
  submitted_at: string;
  raw_answers: Record<string, number>;
  client_name: string;
  client_email: string;
  client_whatsapp: string | null;
}

interface ModeScore {
  mode_id: string;
  mode_code: string;
  mode_name: string;
  mode_category: string;
  mode_description: string | null;
  average_score: number;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function SMIResponseDetail() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const [assessment, setAssessment] = useState<AssessmentInfo | null>(null);
  const [scores, setScores] = useState<ModeScore[]>([]);
  const [questions, setQuestions] = useState<QuestionRef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!assessmentId) { setLoading(false); return; }
      setLoading(true);

      const [{ data: assessmentRow }, { data: scoreRows }, { data: questionRows }] = await Promise.all([
        supabase
          .from('client_smi_assessments')
          .select('id, client_id, version, submitted_at, raw_answers, profiles(name, email, whatsapp)')
          .eq('id', assessmentId)
          .maybeSingle(),
        supabase
          .from('client_smi_scores')
          .select('mode_id, average_score, smi_modes(code, name, category, description)')
          .eq('assessment_id', assessmentId),
        supabase.from('smi_questions').select('question_number, question_text').order('question_number'),
      ]);

      if (assessmentRow) {
        const row = assessmentRow as unknown as {
          id: string; client_id: string; version: number; submitted_at: string; raw_answers: Record<string, number>;
          profiles: { name: string; email: string; whatsapp: string | null } | { name: string; email: string; whatsapp: string | null }[] | null;
        };
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        setAssessment({
          id: assessmentRow.id,
          client_id: assessmentRow.client_id,
          version: assessmentRow.version,
          submitted_at: assessmentRow.submitted_at,
          raw_answers: (assessmentRow.raw_answers ?? {}) as Record<string, number>,
          client_name: profile?.name ?? '—',
          client_email: profile?.email ?? '—',
          client_whatsapp: profile?.whatsapp ?? null,
        });
      }

      const mapped = ((scoreRows ?? []) as unknown as Array<{
        mode_id: string; average_score: number;
        smi_modes: { code: string; name: string; category: string; description: string | null } | { code: string; name: string; category: string; description: string | null }[] | null;
      }>).map((s) => {
        const mode = Array.isArray(s.smi_modes) ? s.smi_modes[0] : s.smi_modes;
        return {
          mode_id: s.mode_id,
          mode_code: mode?.code ?? '',
          mode_name: mode?.name ?? '—',
          mode_category: mode?.category ?? '',
          mode_description: mode?.description ?? null,
          average_score: s.average_score,
        };
      });
      // Ordena por categoria (ordem clínica do instrumento) e, dentro de
      // cada categoria, do maior pro menor score — destaca os modos mais
      // ativados primeiro dentro de cada bloco.
      mapped.sort((a, b) => {
        if (a.mode_category !== b.mode_category) {
          return SMI_CATEGORY_ORDER.indexOf(a.mode_category) - SMI_CATEGORY_ORDER.indexOf(b.mode_category);
        }
        return b.average_score - a.average_score;
      });
      setScores(mapped);
      setQuestions((questionRows ?? []) as QuestionRef[]);
      setLoading(false);
    };
    load();
  }, [assessmentId]);

  const handleDownload = () => {
    if (!assessment) return;
    const csv = buildRawAnswersCsv(
      [{ name: assessment.client_name, email: assessment.client_email, whatsapp: assessment.client_whatsapp, answers: assessment.raw_answers }],
      questions
    );
    downloadCsv(`respostas-smi-${assessment.client_name.replace(/\s+/g, '-').toLowerCase()}-v${assessment.version}.csv`, csv);
  };

  if (loading) return <PageSpinner />;

  if (!assessment) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Link to="/smi-respostas" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar
        </Link>
        <p className="text-dark/50">Resposta não encontrada.</p>
      </div>
    );
  }

  const groups: { category: string; items: ModeScore[]; averageScore: number }[] = [];
  for (const s of scores) {
    const group = groups.find((g) => g.category === s.mode_category);
    if (group) group.items.push(s);
    else groups.push({ category: s.mode_category, items: [s], averageScore: 0 });
  }
  for (const group of groups) {
    group.averageScore = group.items.reduce((sum, s) => sum + s.average_score, 0) / group.items.length;
  }

  // Modos mais ativados deste cliente (relativo ao próprio perfil, não a um
  // cutoff) — usado só pra decidir quais cruzamentos de SMI_MODE_RELATIONSHIPS
  // valem destacar.
  const topCodes = new Set(
    [...scores]
      .sort((a, b) => b.average_score - a.average_score)
      .slice(0, TOP_MODES_FOR_RELATIONSHIPS)
      .map((s) => s.mode_code)
  );
  const matchedRelationships = SMI_MODE_RELATIONSHIPS.filter(
    (r) => topCodes.has(r.codes[0]) && topCodes.has(r.codes[1])
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to="/smi-respostas" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Respostas do SMI
        </Link>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-petrol-50 flex items-center justify-center">
              <Layers size={18} className="text-petrol-700" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-dark font-serif">{assessment.client_name}</h1>
              <p className="text-dark/50 text-sm mt-0.5">
                v{assessment.version} · {formatDateTime(assessment.submitted_at)}
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={handleDownload}>
            <Download size={16} />
            Baixar respostas do cliente
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-2.5 bg-beige-50 border border-beige-200 rounded-lg px-4 py-3 mb-6">
        <Info size={16} className="text-dark/40 shrink-0 mt-0.5" />
        <p className="text-xs text-dark/60 leading-relaxed">{SMI_ETHICAL_NOTICE}</p>
      </div>

      {matchedRelationships.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-dark/40 mb-2 px-1">
            Cruzamentos identificados
          </h2>
          <Card>
            <div className="divide-y divide-beige-100">
              {matchedRelationships.map((r) => (
                <div key={r.codes.join('+')} className="px-5 py-3.5 text-sm text-dark">
                  {r.insight}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.category}>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-dark/40">
                {SMI_CATEGORY_LABELS[group.category] ?? group.category}
              </h2>
              <span className="text-xs text-dark/40">média {group.averageScore.toFixed(1)}/6</span>
            </div>
            <Card>
              <div className="divide-y divide-beige-100">
                {group.items.map((s) => (
                  <div key={s.mode_id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-dark font-medium">{s.mode_name}</span>
                      <span className="text-sm text-dark/60 shrink-0">{s.average_score.toFixed(1)}/6</span>
                    </div>
                    {s.mode_description && (
                      <p className="text-xs text-dark/50 leading-relaxed mt-1.5">{s.mode_description}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
