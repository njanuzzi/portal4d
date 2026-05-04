import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, FileText, Pencil, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { formatDate } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { Profile, Report } from '../../lib/database.types';

type ClientProfile = Profile & { diary_id?: string | null };
type ReportRow = Pick<Report, 'id' | 'user_id' | 'period_start' | 'period_end' | 'content_text' | 'published' | 'created_at'> & {
  active?: boolean | null;
};

const REPORT_SELECT = 'id, user_id, period_start, period_end, content_text, published, active, created_at';

function stripHtml(value: string) {
  const container = document.createElement('div');
  container.innerHTML = value;
  return container.textContent ?? container.innerText ?? '';
}

function getReportTitle(content: string) {
  const container = document.createElement('div');
  container.innerHTML = content;
  const heading = container.querySelector('h2');
  const text = heading?.textContent?.trim() || stripHtml(content).trim();
  return text.split('\n')[0] || 'Relatório clínico';
}

export function ReportsByClient() {
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewReport, setPreviewReport] = useState<ReportRow | null>(null);
  const [deleteReport, setDeleteReport] = useState<ReportRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [togglingReportId, setTogglingReportId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!clientId) return;

      setLoading(true);
      setError('');

      const [{ data: clientRow, error: clientError }, { data: reportRows, error: reportsError }] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', clientId)
          .eq('role', 'client')
          .maybeSingle(),
        (supabase as any)
          .from('reports')
          .select(REPORT_SELECT)
          .eq('user_id', clientId)
          .order('created_at', { ascending: false }),
      ]);

      if (cancelled) return;

      setClient((clientRow ?? null) as ClientProfile | null);
      setReports((reportRows ?? []) as ReportRow[]);
      setError(clientError?.message || reportsError?.message || '');
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const handleToggleActive = async (report: ReportRow) => {
    const nextActive = report.active === false;
    setError('');
    setTogglingReportId(report.id);

    const { data: updatedReport, error: updateError } = await (supabase as any)
      .from('reports')
      .update({ active: nextActive })
      .eq('id', report.id)
      .select(REPORT_SELECT)
      .single();

    if (updateError || !updatedReport) {
      setError(updateError?.message ?? 'Não foi possível atualizar o status do relatório.');
      setTogglingReportId(null);
      return;
    }

    setReports((prev) => prev.map((item) => item.id === report.id ? (updatedReport as ReportRow) : item));
    setTogglingReportId(null);
  };

  const handleDelete = async () => {
    if (!deleteReport) return;

    setError('');
    setDeleteLoading(true);

    const { data: deletedRows, error: deleteError } = await supabase
      .from('reports')
      .delete()
      .eq('id', deleteReport.id)
      .select('id');

    if (deleteError) {
      setError(deleteError.message);
      setDeleteLoading(false);
      return;
    }

    if (!deletedRows || deletedRows.length === 0) {
      setError('Não foi possível confirmar a exclusão no banco.');
      setDeleteLoading(false);
      return;
    }

    const deletedId = deleteReport.id;
    setReports((prev) => prev.filter((report) => report.id !== deletedId));
    setDeleteReport(null);
    setDeleteLoading(false);
  };

  if (loading) return <PageSpinner />;

  if (!client) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link to="/reports" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Relatórios
        </Link>
        <EmptyState
          icon={<FileText size={40} />}
          title="Cliente não encontrado"
          description={error || 'Não foi possível carregar os relatórios deste cliente'}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/reports" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Relatórios
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-dark font-serif">Relatórios - {client.name}</h1>
            <p className="text-dark/50 text-sm mt-1">{reports.length} relatório{reports.length !== 1 ? 's' : ''} cadastrado{reports.length !== 1 ? 's' : ''}</p>
          </div>
          <Link to={`/reports/${client.id}/new`}>
            <Button>
              <Plus size={16} />
              Novo Relatório
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {reports.length === 0 ? (
        <EmptyState
          icon={<FileText size={40} />}
          title="Nenhum relatório criado"
          description="Crie o primeiro relatório deste cliente"
          action={
            <Link to={`/reports/${client.id}/new`}>
              <Button><Plus size={16} />Criar Primeiro Relatório</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const isInactive = report.active === false;

            return (
              <Card key={report.id} className={isInactive ? 'opacity-70 bg-beige-50' : ''}>
                <CardBody className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <div className={`font-medium text-sm ${isInactive ? 'text-dark/50' : 'text-dark'}`}>{getReportTitle(report.content_text)}</div>
                      <Badge variant={report.published ? 'success' : 'neutral'}>
                        {report.published ? 'Publicado' : 'Rascunho'}
                      </Badge>
                      <Badge variant={isInactive ? 'neutral' : 'success'}>
                        {isInactive ? 'Inativo' : 'Ativo'}
                      </Badge>
                    </div>
                    <div className="text-xs text-dark/50">
                      {formatDate(report.period_start)} — {formatDate(report.period_end)}
                    </div>
                    <div className="text-xs text-dark/35 mt-1">Criado em {formatDate(report.created_at)}</div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setPreviewReport(report)}>
                      <Eye size={14} />
                      Ver
                    </Button>
                    <Link to={`/reports/${client.id}/edit/${report.id}`}>
                      <Button variant="ghost" size="sm">
                        <Pencil size={14} />
                        Editar
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={togglingReportId === report.id}
                      onClick={() => handleToggleActive(report)}
                    >
                      {isInactive ? <ToggleLeft size={14} /> : <ToggleRight size={14} className="text-emerald-500" />}
                      {isInactive ? 'Ativar' : 'Desativar'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteReport(report)}>
                      <Trash2 size={14} className="text-red-400" />
                      Excluir
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={!!previewReport}
        onClose={() => setPreviewReport(null)}
        title={previewReport ? getReportTitle(previewReport.content_text) : 'Relatório'}
        size="lg"
      >
        <div className="mb-4 flex items-center gap-2 flex-wrap text-xs text-dark/40">
          <span>{previewReport ? formatDate(previewReport.period_start) : ''} — {previewReport ? formatDate(previewReport.period_end) : ''}</span>
          {previewReport && <Badge variant={previewReport.published ? 'success' : 'neutral'}>{previewReport.published ? 'Publicado' : 'Rascunho'}</Badge>}
        </div>
        <div
          className="text-dark/80 leading-relaxed text-sm space-y-3"
          dangerouslySetInnerHTML={{ __html: previewReport?.content_text ?? '' }}
        />
      </Modal>

      <Modal open={!!deleteReport} onClose={() => setDeleteReport(null)} title="Excluir Relatório" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-dark/70">Tem certeza? Esta ação não pode ser desfeita.</p>
          <div className="flex gap-3">
            <Button variant="danger" loading={deleteLoading} onClick={handleDelete} className="flex-1">
              Excluir
            </Button>
            <Button variant="ghost" onClick={() => setDeleteReport(null)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
