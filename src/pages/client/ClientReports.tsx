import { useEffect, useState } from 'react';
import { FileText, Eye, Sparkles } from 'lucide-react';

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

interface PadraoEsquema {
  nome: string;
  percentual: number;
  descricao: string;
}

interface PadraoContent {
  esquemas: PadraoEsquema[];
  conclusao: string;
}

interface PadraoRow {
  id: string;
  content: PadraoContent;
  published_at: string;
}

export function ClientReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [padroes, setPadroes] = useState<PadraoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [previewPadrao, setPreviewPadrao] = useState<PadraoRow | null>(null);

  useEffect(() => {
    Promise.all([
      supabase
        .from('reports')
        .select('*')
        .eq('user_id', user!.id)
        .eq('published', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('client_published_reports')
        .select('id, content, published_at')
        .eq('client_id', user!.id)
        .order('published_at', { ascending: false }),
    ]).then(([{ data: reportRows }, { data: padraoRows }]) => {
      setReports(reportRows || []);
      setPadroes((padraoRows ?? []) as unknown as PadraoRow[]);
      setLoading(false);
    });
  }, [user]);

  if (loading) return <PageSpinner />;

  const isEmpty = reports.length === 0 && padroes.length === 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-dark font-serif">Meus Relatórios</h1>
        <p className="text-dark/50 text-sm mt-1">Relatórios e devolutivas que sua terapeuta compartilhou com você</p>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={<FileText size={40} />}
          title="Nenhum relatório disponível"
          description="Quando sua terapeuta publicar um relatório, ele aparecerá aqui"
        />
      ) : (
        <div className="space-y-3">
          {padroes.map((padrao) => (
            <Card key={padrao.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="gold">Seus padrões</Badge>
                    </div>
                    <div className="text-sm font-medium text-dark">
                      Devolutiva do inventário
                    </div>
                    <div className="text-xs text-dark/40 mt-0.5">
                      Disponível desde {formatDate(padrao.published_at)}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setPreviewPadrao(padrao)} className="shrink-0">
                    <Eye size={14} />
                    Ler
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}

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

      <Modal
        open={!!previewPadrao}
        onClose={() => setPreviewPadrao(null)}
        title="Seus padrões"
        size="lg"
      >
        {previewPadrao && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-dark/40">
              <Sparkles size={13} className="text-gold-500" />
              Baseado nas suas respostas ao inventário
            </div>
            <div className="space-y-3">
              {previewPadrao.content.esquemas.map((esquema, i) => (
                <div key={i} className="bg-beige-50 rounded-lg p-4">
                  <h3 className="font-semibold text-dark font-serif mb-2">{esquema.nome}</h3>
                  <div className="w-full h-1.5 bg-beige-200 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-gold-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, esquema.percentual))}%` }}
                    />
                  </div>
                  <p className="text-sm text-dark/70 leading-relaxed">{esquema.descricao}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-beige-300 pt-4">
              <p className="text-sm text-dark/70 leading-relaxed">{previewPadrao.content.conclusao}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
