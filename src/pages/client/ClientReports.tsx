import { useEffect, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { FileText, Eye, Sparkles, CheckCircle2 } from 'lucide-react';

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
import { EsquemasBarChart } from '../../components/EsquemasBarChart';
import { ReportObservations } from '../../components/ReportObservations';
import { formatDate } from '../../lib/format';
import type { Report } from '../../lib/database.types';

// session_reports não está no database.types.ts (tabela nova) — mesmo padrão
// de client não tipado usado em outras tabelas recentes.
const untypedSupabase = supabase as unknown as SupabaseClient;

interface SessionReportRow {
  id: string;
  session_date: string;
  title: string;
  content_html: string;
  published_at: string | null;
}

interface PadraoEsquema {
  nome: string;
  percentual: number;
  descricao: string;
}

interface PadraoContent {
  esquemas: PadraoEsquema[];
  conclusao: string;
  todos?: { domain_id: string; percentual: number }[];
}

interface PadraoRow {
  id: string;
  assessment_id: string;
  content: PadraoContent;
  published_at: string;
  first_viewed_at: string | null;
  acknowledged_at: string | null;
}

interface SchemaDomain {
  id: string;
  friendly_name: string | null;
  wiki_description: string | null;
}

export function ClientReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [padroes, setPadroes] = useState<PadraoRow[]>([]);
  const [domains, setDomains] = useState<SchemaDomain[]>([]);
  const [sessionReports, setSessionReports] = useState<SessionReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [previewPadrao, setPreviewPadrao] = useState<PadraoRow | null>(null);
  const [previewSessionReport, setPreviewSessionReport] = useState<SessionReportRow | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);

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
        .select('id, assessment_id, content, published_at, first_viewed_at, acknowledged_at')
        .eq('client_id', user!.id)
        .order('published_at', { ascending: false }),
      supabase.from('schema_domains').select('id, friendly_name, wiki_description'),
      untypedSupabase
        .from('session_reports')
        .select('id, session_date, title, content_html, published_at')
        .eq('client_id', user!.id)
        .eq('status', 'publicado')
        .order('session_date', { ascending: false }),
    ]).then(([{ data: reportRows }, { data: padraoRows }, { data: domainRows }, { data: sessionReportRows }]) => {
      setReports(reportRows || []);
      setPadroes((padraoRows ?? []) as unknown as PadraoRow[]);
      setDomains((domainRows ?? []) as SchemaDomain[]);
      setSessionReports((sessionReportRows ?? []) as SessionReportRow[]);
      setLoading(false);
    });
  }, [user]);

  // Marca a visualização assim que a devolutiva é aberta — sinal passivo,
  // distinto da confirmação explícita que o cliente dá com o botão abaixo.
  useEffect(() => {
    if (!previewPadrao) return;
    void supabase
      .rpc('record_report_view', { p_assessment_id: previewPadrao.assessment_id })
      .then(() => {}, () => {});
  }, [previewPadrao]);

  const handleAcknowledge = async () => {
    if (!previewPadrao) return;
    setAcknowledging(true);
    const { error } = await supabase.rpc('record_report_acknowledgment', {
      p_assessment_id: previewPadrao.assessment_id,
    });
    if (!error) {
      const acknowledgedAt = new Date().toISOString();
      setPadroes((prev) =>
        prev.map((p) => (p.id === previewPadrao.id && !p.acknowledged_at ? { ...p, acknowledged_at: acknowledgedAt } : p))
      );
      setPreviewPadrao((prev) => (prev && !prev.acknowledged_at ? { ...prev, acknowledged_at: acknowledgedAt } : prev));
    }
    setAcknowledging(false);
  };

  if (loading) return <PageSpinner />;

  const isEmpty = reports.length === 0 && padroes.length === 0 && sessionReports.length === 0;

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

          {sessionReports.map((sessionReport) => (
            <Card key={sessionReport.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="gold">Relatório de sessão</Badge>
                    </div>
                    <div className="text-sm font-medium text-dark">
                      {formatDate(sessionReport.session_date)}
                    </div>
                    {sessionReport.published_at && (
                      <div className="text-xs text-dark/40 mt-0.5">
                        Disponível desde {formatDate(sessionReport.published_at)}
                      </div>
                    )}
                    <p className="text-sm text-dark/60 mt-2 line-clamp-3">{stripHtml(sessionReport.content_html)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setPreviewSessionReport(sessionReport)} className="shrink-0">
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
        open={!!previewSessionReport}
        onClose={() => setPreviewSessionReport(null)}
        title={`Relatório da sessão — ${previewSessionReport ? formatDate(previewSessionReport.session_date) : ''}`}
        size="lg"
      >
        {previewSessionReport && (
          <div className="space-y-4">
            <div
              className="prose prose-sm max-w-none text-dark/80 leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-dark [&_h2]:mb-3 [&_p]:mb-2 [&_ul]:pl-4 [&_li]:mb-1"
              dangerouslySetInnerHTML={{ __html: previewSessionReport.content_html }}
            />
            <div className="border-t border-beige-300 pt-4">
              <ReportObservations sessionReportId={previewSessionReport.id} clientId={user!.id} viewerRole="client" />
            </div>
          </div>
        )}
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

            {previewPadrao.content.todos && previewPadrao.content.todos.length > 0 && (
              <div className="border-t border-beige-300 pt-4">
                <h3 className="font-semibold text-dark font-serif mb-1">Visão geral dos 16 padrões</h3>
                <p className="text-xs text-dark/40 mb-3">Toque em um padrão para ler a explicação.</p>
                <EsquemasBarChart
                  items={previewPadrao.content.todos.map((t) => {
                    const domain = domains.find((d) => d.id === t.domain_id);
                    return { name: domain?.friendly_name ?? '—', percentual: t.percentual, description: domain?.wiki_description ?? undefined };
                  })}
                />
              </div>
            )}

            <div className="border-t border-beige-300 pt-4">
              {previewPadrao.acknowledged_at ? (
                <div className="flex items-center gap-1.5 text-sm text-green-700">
                  <CheckCircle2 size={15} />
                  Você confirmou a leitura em {formatDate(previewPadrao.acknowledged_at)}
                </div>
              ) : (
                <Button size="sm" variant="ghost" loading={acknowledging} onClick={handleAcknowledge}>
                  <CheckCircle2 size={14} />
                  Confirmar que li o relatório
                </Button>
              )}
            </div>

            <div className="border-t border-beige-300 pt-4">
              <ReportObservations assessmentId={previewPadrao.assessment_id} clientId={user!.id} viewerRole="client" />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
