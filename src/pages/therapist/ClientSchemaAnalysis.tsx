import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Brain, Sparkles, Eye, Heart, RefreshCw } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ReportsTabs } from '../../components/ReportsTabs';
import { ReadStatusBadge } from '../../components/ReadStatusBadge';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../lib/database.types';

interface AssessmentRow {
  id: string;
  version: number;
  submitted_at: string;
  status: string;
}

interface ReportRow {
  id: string;
  assessment_id: string;
  status: 'draft' | 'reviewed' | 'published';
  client_content: unknown;
  client_content_status: 'draft' | 'reviewed' | 'published';
}

const reportStatusLabel: Record<string, string> = {
  draft: 'Rascunho',
  reviewed: 'Revisado',
  published: 'Publicado',
};
const reportStatusVariant: Record<string, 'warning' | 'success' | 'neutral'> = {
  draft: 'warning',
  reviewed: 'success',
  published: 'success',
};

const clientStatusLabel: Record<string, string> = {
  draft: 'Cliente: rascunho',
  reviewed: 'Cliente: revisado',
  published: 'Cliente: versão final',
};
const clientStatusVariant: Record<string, 'warning' | 'success' | 'neutral'> = {
  draft: 'warning',
  reviewed: 'neutral',
  published: 'success',
};

// Rascunho do formulário nativo (por domínio) — o cliente ainda não
// terminou de responder, então não tem scores calculados ainda.
const isIncomplete = (status: string) => status === 'in_progress';

export function ClientSchemaAnalysis() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Profile | null>(null);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [reportsByAssessment, setReportsByAssessment] = useState<Record<string, ReportRow>>({});
  const [viewedByAssessment, setViewedByAssessment] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatingClientId, setGeneratingClientId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    setError('');

    const [{ data: clientRow }, { data: assessmentRows, error: assessmentsError }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).eq('role', 'client').maybeSingle(),
      supabase
        .from('client_assessments')
        .select('id, version, submitted_at, status')
        .eq('client_id', id)
        .order('version', { ascending: false }),
    ]);

    setClient((clientRow ?? null) as Profile | null);
    const rows = (assessmentRows ?? []) as AssessmentRow[];
    setAssessments(rows);

    if (rows.length > 0) {
      const [{ data: reportRows }, { data: publishedRows }] = await Promise.all([
        supabase
          .from('client_schema_reports')
          .select('id, assessment_id, status, client_content, client_content_status')
          .in('assessment_id', rows.map((r) => r.id)),
        supabase
          .from('client_published_reports')
          .select('assessment_id, first_viewed_at')
          .in('assessment_id', rows.map((r) => r.id)),
      ]);
      const map: Record<string, ReportRow> = {};
      ((reportRows ?? []) as ReportRow[]).forEach((r) => { map[r.assessment_id] = r; });
      setReportsByAssessment(map);

      const viewedMap: Record<string, string | null> = {};
      (publishedRows ?? []).forEach((r) => { viewedMap[r.assessment_id] = r.first_viewed_at; });
      setViewedByAssessment(viewedMap);
    }

    if (assessmentsError) setError(assessmentsError.message);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleGenerate = async (assessmentId: string) => {
    setGeneratingId(assessmentId);
    setError('');
    const { error: fnError } = await supabase.functions.invoke('generate-technical-report', {
      body: { assessment_id: assessmentId },
    });
    if (fnError) {
      setError(fnError.message || 'Erro ao gerar o relatório técnico.');
      setGeneratingId(null);
      return;
    }
    await load();
    setGeneratingId(null);
  };

  const handleGenerateClientReport = async (assessmentId: string) => {
    setGeneratingClientId(assessmentId);
    setError('');
    const { error: fnError } = await supabase.functions.invoke('generate-client-report', {
      body: { assessment_id: assessmentId },
    });
    if (fnError) {
      setError(fnError.message || 'Erro ao gerar o relatório do cliente.');
      setGeneratingClientId(null);
      return;
    }
    await load();
    setGeneratingClientId(null);
  };

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to={`/clients/${id}`} className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para {client?.name || 'Cliente'}
        </Link>
        {id && <ReportsTabs clientId={id} active="esquemas" />}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-petrol-50 flex items-center justify-center">
            <Brain size={18} className="text-petrol-700" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-dark font-serif">Análise de Esquemas</h1>
            <p className="text-dark/50 text-sm mt-0.5">{client?.name}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      {assessments.length === 0 ? (
        <EmptyState
          title="Nenhuma resposta ainda"
          description="Esse cliente ainda não respondeu o Inventário de Esquemas pelo Tally."
        />
      ) : (
        <div className="space-y-3">
          {assessments.map((assessment) => {
            const report = reportsByAssessment[assessment.id];
            const isGenerating = generatingId === assessment.id;
            const isGeneratingClient = generatingClientId === assessment.id;
            const incomplete = isIncomplete(assessment.status);
            return (
              <Card key={assessment.id}>
                <CardBody className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-dark">Versão {assessment.version}</span>
                      {incomplete && <Badge variant="neutral">Em andamento</Badge>}
                      {report && (
                        <Badge variant={reportStatusVariant[report.status] ?? 'neutral'}>
                          {reportStatusLabel[report.status] ?? report.status}
                        </Badge>
                      )}
                      {report?.client_content != null && (
                        <Badge variant={clientStatusVariant[report.client_content_status] ?? 'neutral'}>
                          {clientStatusLabel[report.client_content_status] ?? report.client_content_status}
                        </Badge>
                      )}
                      {report?.client_content != null && (
                        <ReadStatusBadge firstViewedAt={viewedByAssessment[assessment.id]} />
                      )}
                    </div>
                    <div className="text-xs text-dark/40">
                      {incomplete
                        ? `Iniciado em ${formatDateTime(assessment.submitted_at)} — aguardando o cliente concluir`
                        : `Respondido em ${formatDateTime(assessment.submitted_at)}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {incomplete ? null : report ? (
                      <Link to={`/clients/${id}/schema-analysis/report/${report.id}`}>
                        <Button size="sm" variant="secondary">
                          <Eye size={14} />
                          Ver Relatório
                        </Button>
                      </Link>
                    ) : (
                      <Button size="sm" loading={isGenerating} onClick={() => handleGenerate(assessment.id)}>
                        <Sparkles size={14} />
                        Gerar Relatório Técnico
                      </Button>
                    )}

                    {report && (
                      report.client_content ? (
                        <>
                          <Link to={`/clients/${id}/schema-analysis/report/${report.id}/cliente`}>
                            <Button size="sm" variant="secondary">
                              <Heart size={14} />
                              Ver Relatório do Cliente
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="secondary"
                            title="Gerar novamente"
                            loading={isGeneratingClient}
                            onClick={() => handleGenerateClientReport(assessment.id)}
                          >
                            <RefreshCw size={14} />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={isGeneratingClient}
                          onClick={() => handleGenerateClientReport(assessment.id)}
                        >
                          <Heart size={14} />
                          Gerar Relatório do Cliente
                        </Button>
                      )
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
