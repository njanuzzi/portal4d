import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Eye, Globe } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { formatDate } from '../../lib/format';
import { MOCK_REPORTS } from '../../lib/mockData';
import type { Report, Profile } from '../../lib/database.types';

interface ReportWithProfile extends Report {
  profile: Profile | null;
}

export function Reports() {
  const [reports, setReports] = useState<ReportWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewReport, setPreviewReport] = useState<ReportWithProfile | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  useEffect(() => {
    setReports([...MOCK_REPORTS]);
    setLoading(false);
  }, []);

  const togglePublish = (report: ReportWithProfile) => {
    setPublishing(report.id);
    setTimeout(() => {
      setReports(prev =>
        prev.map(r => r.id === report.id ? { ...r, published: !r.published } : r)
      );
      setPublishing(null);
    }, 400);
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-dark font-serif">Todos os Relatórios</h1>
        <p className="text-dark/50 text-sm mt-1">{reports.length} relatório{reports.length !== 1 ? 's' : ''} no total</p>
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon={<FileText size={40} />}
          title="Nenhum relatório criado"
          description="Acesse um cliente para criar o primeiro relatório"
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardBody className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Link
                      to={`/clients/${report.user_id}`}
                      className="font-medium text-dark text-sm hover:text-petrol-700 transition-colors"
                    >
                      {report.profile?.name || '—'}
                    </Link>
                    <Badge variant={report.published ? 'success' : 'neutral'}>
                      {report.published ? 'Publicado' : 'Rascunho'}
                    </Badge>
                  </div>
                  <div className="text-xs text-dark/50">
                    {formatDate(report.period_start)} — {formatDate(report.period_end)}
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
        title={`Relatório de ${previewReport?.profile?.name || ''} — ${previewReport ? formatDate(previewReport.period_start) : ''} a ${previewReport ? formatDate(previewReport.period_end) : ''}`}
        size="lg"
      >
        <p className="text-dark/80 whitespace-pre-wrap leading-relaxed text-sm">
          {previewReport?.content_text}
        </p>
      </Modal>
    </div>
  );
}
