import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SupabaseClient } from '@supabase/supabase-js';
import { ArrowLeft, UserCircle, Download, Info, CheckCircle2, RotateCcw, Lock } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Textarea } from '../../components/ui/Textarea';
import { PageSpinner } from '../../components/ui/Spinner';
import { EsquemasBarChart } from '../../components/EsquemasBarChart';
import { supabase } from '../../lib/supabase';
import { buildRawAnswersCsv, downloadCsv, QuestionRef } from '../../lib/schemaCsv';
import { computeBfiFactorScores } from '../../lib/bfiFactors';
import { BfiClientContent, buildBfiClientContent } from '../../lib/bfiClientReport';
import { BfiTechnicalReportCard } from '../../components/BfiTechnicalReportCard';

// client_bfi_published_reports é tabela nova, fora dos tipos gerados —
// mesmo padrão de client não tipado usado no SMI/ClientReports.
const untypedSupabase = supabase as unknown as SupabaseClient;

interface PublishedReport {
  content: BfiClientContent;
  published_at: string;
  first_viewed_at: string | null;
  acknowledged_at: string | null;
}

interface AssessmentInfo {
  id: string;
  client_id: string;
  source: string;
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

export function BFIResponseDetail() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const [assessment, setAssessment] = useState<AssessmentInfo | null>(null);
  const [questions, setQuestions] = useState<QuestionRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [published, setPublished] = useState<PublishedReport | null>(null);
  const [clientContent, setClientContent] = useState<BfiClientContent | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!assessmentId) { setLoading(false); return; }
      setLoading(true);

      const [{ data: assessmentRow }, { data: questionRows }, { data: publishedRow }] = await Promise.all([
        supabase
          .from('client_bfi_assessments')
          .select('id, client_id, source, version, submitted_at, status, raw_answers, profiles(name, email, whatsapp)')
          .eq('id', assessmentId)
          .maybeSingle(),
        supabase.from('bfi_questions').select('question_number, question_text').order('question_number'),
        untypedSupabase
          .from('client_bfi_published_reports')
          .select('content, published_at, first_viewed_at, acknowledged_at')
          .eq('assessment_id', assessmentId)
          .maybeSingle(),
      ]);

      if (assessmentRow) {
        const row = assessmentRow as unknown as {
          id: string; client_id: string; source: string; version: number; submitted_at: string; status: string;
          raw_answers: Record<string, number>;
          profiles: { name: string; email: string; whatsapp: string | null } | { name: string; email: string; whatsapp: string | null }[] | null;
        };
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        const publishedReport = (publishedRow ?? null) as PublishedReport | null;
        setPublished(publishedReport);
        // Já liberada: parte do texto que a cliente está vendo. Senão, do
        // modelo gerado a partir das médias.
        setClientContent(publishedReport?.content ?? buildBfiClientContent(computeBfiFactorScores(row.raw_answers ?? {})));
        setAssessment({
          id: row.id,
          client_id: row.client_id,
          source: row.source,
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
    downloadCsv(`respostas-bfi-${assessment.client_name.replace(/\s+/g, '-').toLowerCase()}-v${assessment.version}.csv`, csv);
  };

  const updateFactorText = (key: string, descricao: string) => {
    setClientContent((prev) =>
      prev ? { ...prev, fatores: prev.fatores.map((f) => (f.key === key ? { ...f, descricao } : f)) } : prev
    );
  };

  const handleResetText = () => {
    if (!assessment) return;
    setClientContent(buildBfiClientContent(computeBfiFactorScores(assessment.raw_answers)));
  };

  const handlePublish = async () => {
    if (!assessment || !clientContent) return;
    setPublishing(true);
    setPublishError('');
    const now = new Date().toISOString();
    const { data, error } = await untypedSupabase
      .from('client_bfi_published_reports')
      .upsert(
        {
          assessment_id: assessment.id,
          client_id: assessment.client_id,
          content: clientContent,
          published_at: published?.published_at ?? now,
          updated_at: now,
        },
        { onConflict: 'assessment_id' }
      )
      .select('content, published_at, first_viewed_at, acknowledged_at')
      .single();
    if (error) setPublishError(error.message);
    else setPublished(data as PublishedReport);
    setPublishing(false);
  };

  if (loading) return <PageSpinner />;

  if (!assessment) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Link to="/bfi-respostas" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar
        </Link>
        <p className="text-dark/50">Resposta não encontrada.</p>
      </div>
    );
  }

  const factorScores = computeBfiFactorScores(assessment.raw_answers);
  const incomplete = assessment.status === 'in_progress';

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to="/bfi-respostas" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Respostas do BFI
        </Link>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-petrol-50 flex items-center justify-center">
              <UserCircle size={18} className="text-petrol-700" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-dark font-serif">{assessment.client_name}</h1>
              <p className="text-dark/50 text-sm mt-0.5">
                v{assessment.version} · {formatDateTime(assessment.submitted_at)}
              </p>
              {assessment.source === 'terapeuta' && (
                <Badge variant="info" className="mt-1">Aplicado com a terapeuta</Badge>
              )}
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
          O BFI não tem pontos de corte validados para a população brasileira — os resultados abaixo são só a
          média por fator (escala 1-5), sem classificação. Use como hipótese complementar à entrevista clínica,
          não como medida isolada.
        </p>
      </div>

      {incomplete ? (
        <p className="text-sm text-dark/40">Este cliente ainda não concluiu o preenchimento.</p>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardBody>
              <h2 className="font-semibold text-dark font-serif text-base mb-4">Fatores</h2>
              <EsquemasBarChart
                items={factorScores.map((f) => ({
                  name: f.label,
                  percentual: ((f.average - 1) / 4) * 100,
                  displayValue: `${f.average.toFixed(2)}/5`,
                }))}
              />
            </CardBody>
          </Card>

          <BfiTechnicalReportCard assessmentId={assessment.id} />

          {clientContent && (
            <Card>
              <CardBody className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="font-semibold text-dark font-serif text-base">Devolutiva para a cliente</h2>
                  {published ? (
                    <Badge variant="success">Liberada no portal</Badge>
                  ) : (
                    <Badge variant="neutral">
                      <Lock size={11} className="mr-1" />
                      Só você vê
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-dark/50 leading-relaxed">
                  {published
                    ? `Liberada em ${formatDateTime(published.published_at)}. Se editar os textos, clique em "Atualizar no portal" para a cliente ver a nova versão.`
                    : 'A cliente ainda não vê nada deste resultado. Revise os textos abaixo (eles partem das médias de cada fator) e libere quando quiser.'}
                </p>

                {clientContent.fatores.map((fator) => (
                  <Textarea
                    key={fator.key}
                    label={`${fator.nome} · ${fator.average.toFixed(2)}/5`}
                    rows={4}
                    value={fator.descricao}
                    onChange={(e) => updateFactorText(fator.key, e.target.value)}
                  />
                ))}
                <Textarea
                  label="Mensagem final"
                  rows={4}
                  value={clientContent.conclusao}
                  onChange={(e) => setClientContent({ ...clientContent, conclusao: e.target.value })}
                />

                {published && (
                  <p className="text-xs">
                    {published.acknowledged_at ? (
                      <span className="flex items-center gap-1 text-green-700">
                        <CheckCircle2 size={12} />
                        Cliente confirmou a leitura em {formatDateTime(published.acknowledged_at)}
                      </span>
                    ) : published.first_viewed_at ? (
                      <span className="text-dark/50">Cliente visualizou, mas ainda não confirmou a leitura</span>
                    ) : (
                      <span className="text-dark/40">Cliente ainda não visualizou esta devolutiva</span>
                    )}
                  </p>
                )}

                {publishError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{publishError}</div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" loading={publishing} onClick={handlePublish}>
                    <CheckCircle2 size={14} />
                    {published ? 'Atualizar no portal' : 'Liberar no portal da cliente'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleResetText}>
                    <RotateCcw size={14} />
                    Voltar ao texto sugerido
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
