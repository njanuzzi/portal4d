import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Brain, Download } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabase';
import { buildRawAnswersCsv, downloadCsv, titleCase } from '../../lib/schemaCsv';

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

interface DomainScore {
  domain_id: string;
  domain_name: string;
  percentual: number;
  classification: string;
}

const classificationVariant: Record<string, 'success' | 'warning' | 'error'> = {
  'Básico': 'success',
  'Atenção': 'warning',
  'Crítico': 'error',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function SchemaResponseDetail() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const [assessment, setAssessment] = useState<AssessmentInfo | null>(null);
  const [scores, setScores] = useState<DomainScore[]>([]);
  const [questionNumbers, setQuestionNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!assessmentId) { setLoading(false); return; }
      setLoading(true);

      const [{ data: assessmentRow }, { data: scoreRows }, { data: questionRows }] = await Promise.all([
        supabase
          .from('client_assessments')
          .select('id, client_id, version, submitted_at, raw_answers, profiles(name, email, whatsapp)')
          .eq('id', assessmentId)
          .maybeSingle(),
        supabase
          .from('client_schema_scores')
          .select('domain_id, percentual, classification, schema_domains(name)')
          .eq('assessment_id', assessmentId)
          .order('percentual', { ascending: false }),
        supabase.from('schema_questions').select('question_number').order('question_number'),
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

      setScores(((scoreRows ?? []) as unknown as Array<{ domain_id: string; percentual: number; classification: string; schema_domains: { name: string } | { name: string }[] | null }>).map((s) => {
        const domain = Array.isArray(s.schema_domains) ? s.schema_domains[0] : s.schema_domains;
        return { domain_id: s.domain_id, domain_name: domain?.name ?? '—', percentual: s.percentual, classification: s.classification };
      }));
      setQuestionNumbers((questionRows ?? []).map((q) => q.question_number));
      setLoading(false);
    };
    load();
  }, [assessmentId]);

  const handleDownload = () => {
    if (!assessment) return;
    const csv = buildRawAnswersCsv(
      [{ name: assessment.client_name, email: assessment.client_email, whatsapp: assessment.client_whatsapp, answers: assessment.raw_answers }],
      questionNumbers
    );
    downloadCsv(`respostas-${assessment.client_name.replace(/\s+/g, '-').toLowerCase()}-v${assessment.version}.csv`, csv);
  };

  if (loading) return <PageSpinner />;

  if (!assessment) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Link to="/schema-respostas" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar
        </Link>
        <p className="text-dark/50">Resposta não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to="/schema-respostas" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Respostas do Inventário
        </Link>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-petrol-50 flex items-center justify-center">
              <Brain size={18} className="text-petrol-700" />
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

      <Card>
        <div className="divide-y divide-beige-100">
          {scores.map((s) => (
            <div key={s.domain_id} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-dark font-medium">{titleCase(s.domain_name)}</span>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-sm text-dark/60">{s.percentual}%</span>
                <Badge variant={classificationVariant[s.classification] ?? 'neutral'}>{s.classification}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Link
        to={`/clients/${assessment.client_id}/schema-analysis`}
        className="inline-block mt-4 text-sm text-petrol-700 hover:underline"
      >
        Ir para Análise de Esquemas / gerar relatório →
      </Link>
    </div>
  );
}
