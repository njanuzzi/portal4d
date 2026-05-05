import { useEffect, useState } from 'react';
import { FileText, Eye } from 'lucide-react';

function stripHtml(html: string) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { formatDate } from '../../lib/format';
import type { Report } from '../../lib/database.types';

export function ClientReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewReport, setPreviewReport] = useState<Report | null>(null);

  useEffect(() => {
    supabase
      .from('reports')
      .select('*')
      .eq('user_id', user!.id)
      .eq('published', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReports(data || []);
        setLoading(false);
      });
  }, [user]);

  if (loading) return <PageSpinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-dark font-serif">Meus Relatórios</h1>
        <p className="text-dark/50 text-sm mt-1">{reports.length} relatório{reports.length !== 1 ? 's' : ''} disponível{reports.length !== 1 ? 'is' : ''}</p>
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon={<FileText size={40} />}
          title="Nenhum relatório disponível"
          description="Quando sua terapeuta publicar um relatório, ele aparecerá aqui"
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="gold">Relatório</Badge>
                    </div>
                    <div className="text-sm font-medium text-dark">
                      {formatDate(report.period_start)} — {formatDate(report.period_end)}
                    </div>
                    <div className="text-xs text-dark/40 mt-0.5">
                      Disponível desde {formatDate(report.created_at)}
                    </div>
                    <p className="text-sm text-dark/60 mt-2 line-clamp-3">{stripHtml(report.content_text)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setPreviewReport(report)} className="shrink-0">
                    <Eye size={14} />
                    Ler
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
        <div
          className="prose prose-sm max-w-none text-dark/80 leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-dark [&_h2]:mb-3 [&_p]:mb-2 [&_ul]:pl-4 [&_li]:mb-1"
          dangerouslySetInnerHTML={{ __html: previewReport?.content_text ?? '' }}
        />
      </Modal>
    </div>
  );
}
