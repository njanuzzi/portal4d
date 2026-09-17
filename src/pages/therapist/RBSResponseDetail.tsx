import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Sparkles, Download, Info } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { EsquemasBarChart } from '../../components/EsquemasBarChart';
import { supabase } from '../../lib/supabase';
import { buildRawAnswersCsv, downloadCsv, QuestionRef } from '../../lib/schemaCsv';
import { computeRbsScores } from '../../lib/rbsScore';

interface AssessmentInfo {
  id: string;
  version: number;
  submitted_at: string;
  status: string;
  raw_answers: Record<string, number>;
  client_name: string;
  client_email: string;
  client_whatsapp: string | null;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function RBSResponseDetail() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const [assessment, setAssessment] = useState<AssessmentInfo | null>(null);
  const [questions, setQuestions] = useState<QuestionRef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!assessmentId) { setLoading(false); return; }
      setLoading(true);

      const [{ data: assessmentRow }, { data: questionRows }] = await Promise.all([
        supabase
          .from('client_rbs_assessments')
          .select('id, version, submitted_at, status, raw_answers, profiles(name, email, whatsapp)')
          .eq('id', assessmentId)
          .maybeSingle(),
        supabase.from('rbs_questions').select('question_number, question_text').order('question_number'),
      ]);

      if (assessmentRow) {
        const row = assessmentRow as unknown as {
          id: string; version: number; submitted_at: string; status: string; raw_answers: Record<string, number>;
          profiles: { name: string; email: string; whatsapp: string | null } | { name: string; email: string; whatsapp: string | null }[] | null;
        };
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        setAssessment({
          id: row.id,
          version: row.version,
          submitted_at: row.submitted_at,
          status: row.status,
          raw_answers: row.raw_answers ?? {},
          client_name: profile?.name ?? '—',
          client_email: profile?.email ?? '—',
          client_whatsapp: profile?.whatsapp ?? null,
        });
      }
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
    downloadCsv(`respostas-rbs-${assessment.client_name.replace(/\s+/g, '-').toLowerCase()}-v${assessment.version}.csv`, csv);
  };

  if (loading) return <PageSpinner />;

  if (!assessment) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Link to="/rbs-respostas" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar
        </Link>
        <p className="text-dark/50">Resposta não encontrada.</p>
      </div>
    );
  }

  const { subscales, global } = computeRbsScores(assessment.raw_answers);
  const incomplete = assessment.status === 'in_progress';

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to="/rbs-respostas" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Respostas do RBS
        </Link>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-petrol-50 flex items-center justify-center">
              <Sparkles size={18} className="text-petrol-700" />
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
        <p className="text-xs text-dark/60 leading-relaxed">
          O RBS não tem pontos de corte validados para a população brasileira — a interpretação deve ser dimensional
          e comparativa (intraindivíduo e entre fatores), não como medida isolada.
        </p>
      </div>

      {incomplete ? (
        <p className="text-sm text-dark/40">Este cliente ainda não concluiu o preenchimento.</p>
      ) : (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-dark font-serif text-base">Subescalas</h2>
              <span className="text-xs text-dark/40">Escala global: {global.toFixed(2)}/7</span>
            </div>
            <EsquemasBarChart
              items={subscales.map((s) => ({
                name: s.label,
                percentual: ((s.average - 1) / 6) * 100,
                displayValue: `${s.average.toFixed(2)}/7`,
              }))}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
