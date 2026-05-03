import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Eye, Globe } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { formatDate } from '../../lib/format';
import { MOCK_CLIENTS, MOCK_REPORTS } from '../../lib/mockData';
import type { Profile, Report } from '../../lib/database.types';

export function ClientReports() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Profile | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  useEffect(() => {
    setClient(MOCK_CLIENTS.find(c => c.id === id) || null);
    setReports(MOCK_REPORTS.filter(r => r.user_id === id));
    setLoading(false);
  }, [id]);

  const togglePublish = (report: Report) => {
    setPublishing(report.id);
    setTimeout(() => {
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, published: !r.published } : r));
      setPublishing(null);
    }, 400);
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to={`/clients/${id}`} className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para {client?.name || 'Cliente'}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-dark font-serif">Relatórios</h1>
            <p className="text-dark/50 text-sm mt-1">{client?.name}</p>
          </div>
          <Link to={`/clients/${id}/report/new`}>
            <Button size="sm">
              <Plus size={16} />
              Novo Relatório
            </Button>
          </Link>
        </div>
      </div>

      {reports.length === 0 ? (
        <EmptyState
          title="Nenhum relatório criado"
          description="Crie o primeiro relatório para este cliente"
          action={
            <Link to={`/clients/${id}/report/new`}>
              <Button><Plus size={16} />Criar Relatório</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardBody className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={report.published ? 'success' : 'neutral'}>
                      {report.published ? 'Publicado' : 'Rascunho'}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium text-dark">
                    {formatDate(report.period_start)} — {formatDate(report.period_end)}
                  </div>
                  <div className="text-xs text-dark/40 mt-0.5">
                    Criado em {formatDate(report.created_at)}
                  </div>
                  <p className="text-sm text-dark/60 mt-2 line-clamp-2">{report.content_text}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setPreviewReport(report)}>
                    <Eye size={14} />
                    Ver
                  </Button>
                  <Button
                    variant={report.published ? 'ghost' : 'secondary'}
                    size="sm"
                    loading={publishing === report.id}
                    onClick={() => togglePublish(report)}
                  >
                    <Globe size={14} />
                    {report.published ? 'Despublicar' : 'Publicar'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!previewReport}
        onClose={() => setPreviewReport(null)}
        title={`Relatório — ${previewReport ? formatDate(previewReport.period_start) : ''} a ${previewReport ? formatDate(previewReport.period_end) : ''}`}
        size="lg"
      >
        <p className="text-dark/80 whitespace-pre-wrap leading-relaxed text-sm">
          {previewReport?.content_text}
        </p>
      </Modal>
    </div>
  );
}
