import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Layers, Download, Info, Sparkles, Heart, Pencil, Save, X, CheckCircle2 } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Textarea } from '../../components/ui/Textarea';
import { PageSpinner } from '../../components/ui/Spinner';
import { EsquemasBarChart } from '../../components/EsquemasBarChart';
import { supabase } from '../../lib/supabase';
import { buildRawAnswersCsv, downloadCsv, QuestionRef } from '../../lib/schemaCsv';
import { SMI_CATEGORY_LABELS, SMI_CATEGORY_ORDER, SMI_ETHICAL_NOTICE, SMI_MODE_RELATIONSHIPS } from '../../lib/smiModeOrder';

// Quantos modos (dos 14) entram na leitura de "mais ativados" pra cruzar
// com SMI_MODE_RELATIONSHIPS — não é um cutoff clínico (o instrumento não
// tem pontos de corte validados), só um recorte relativo ao próprio perfil
// do cliente pra destacar os modos mais proeminentes dele.
const TOP_MODES_FOR_RELATIONSHIPS = 4;

interface AssessmentInfo {
  id: string;
  client_id: string;
  version: number;
  submitted_at: string;
  status: string;
  raw_answers: Record<string, number>;
  client_name: string;
  client_email: string;
  client_whatsapp: string | null;
}

interface ModeScore {
  mode_id: string;
  mode_code: string;
  mode_name: string;
  mode_category: string;
  mode_description: string | null;
  average_score: number;
}

interface ClientModo {
  nome: string;
  average_score: number;
  descricao: string;
}

interface ClientContent {
  modos: ClientModo[];
  conclusao: string;
  todos?: { mode_id: string; average_score: number }[];
}

type ContentStatus = 'draft' | 'reviewed' | 'published';

interface ReportInfo {
  id: string;
  technical_content: string | null;
  previous_content: string | null;
  status: ContentStatus;
  client_content: ClientContent | null;
  previous_client_content: ClientContent | null;
  client_content_status: ContentStatus;
  generated_with: string | null;
  updated_at: string;
}

interface PublishedViewInfo {
  first_viewed_at: string | null;
  acknowledged_at: string | null;
}

const statusLabel: Record<ContentStatus, string> = { draft: 'Rascunho', reviewed: 'Revisado', published: 'Publicado' };
const statusVariant: Record<ContentStatus, 'warning' | 'success' | 'neutral'> = { draft: 'warning', reviewed: 'success', published: 'success' };

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function SMIResponseDetail() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const [assessment, setAssessment] = useState<AssessmentInfo | null>(null);
  const [scores, setScores] = useState<ModeScore[]>([]);
  const [questions, setQuestions] = useState<QuestionRef[]>([]);
  const [report, setReport] = useState<ReportInfo | null>(null);
  const [publishedView, setPublishedView] = useState<PublishedViewInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [generatingTechnical, setGeneratingTechnical] = useState(false);
  const [editingTechnical, setEditingTechnical] = useState(false);
  const [technicalDraft, setTechnicalDraft] = useState('');
  const [savingTechnical, setSavingTechnical] = useState(false);
  const [markingReviewed, setMarkingReviewed] = useState(false);

  const [generatingClient, setGeneratingClient] = useState(false);
  const [editingClient, setEditingClient] = useState(false);
  const [editedModos, setEditedModos] = useState<ClientModo[]>([]);
  const [editedConclusao, setEditedConclusao] = useState('');
  const [savingClient, setSavingClient] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [reportError, setReportError] = useState('');

  const load = async () => {
    if (!assessmentId) { setLoading(false); return; }
    setLoading(true);

    const [{ data: assessmentRow }, { data: scoreRows }, { data: questionRows }, { data: reportRow }] = await Promise.all([
      supabase
        .from('client_smi_assessments')
        .select('id, client_id, version, submitted_at, status, raw_answers, profiles(name, email, whatsapp)')
        .eq('id', assessmentId)
        .maybeSingle(),
      supabase
        .from('client_smi_scores')
        .select('mode_id, average_score, smi_modes(code, name, category, description)')
        .eq('assessment_id', assessmentId),
      supabase.from('smi_questions').select('question_number, question_text').order('question_number'),
      supabase
        .from('client_smi_reports')
        .select('id, technical_content, previous_content, status, client_content, previous_client_content, client_content_status, generated_with, updated_at')
        .eq('assessment_id', assessmentId)
        .maybeSingle(),
    ]);

    if (assessmentRow) {
      const row = assessmentRow as unknown as {
        id: string; client_id: string; version: number; submitted_at: string; status: string; raw_answers: Record<string, number>;
        profiles: { name: string; email: string; whatsapp: string | null } | { name: string; email: string; whatsapp: string | null }[] | null;
      };
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      setAssessment({
        id: assessmentRow.id,
        client_id: assessmentRow.client_id,
        version: assessmentRow.version,
        submitted_at: assessmentRow.submitted_at ?? '',
        status: row.status,
        raw_answers: (assessmentRow.raw_answers ?? {}) as Record<string, number>,
        client_name: profile?.name ?? '—',
        client_email: profile?.email ?? '—',
        client_whatsapp: profile?.whatsapp ?? null,
      });
    }

    const mapped = ((scoreRows ?? []) as unknown as Array<{
      mode_id: string; average_score: number;
      smi_modes: { code: string; name: string; category: string; description: string | null } | { code: string; name: string; category: string; description: string | null }[] | null;
    }>).map((s) => {
      const mode = Array.isArray(s.smi_modes) ? s.smi_modes[0] : s.smi_modes;
      return {
        mode_id: s.mode_id,
        mode_code: mode?.code ?? '',
        mode_name: mode?.name ?? '—',
        mode_category: mode?.category ?? '',
        mode_description: mode?.description ?? null,
        average_score: s.average_score,
      };
    });
    // Ordena por categoria (ordem clínica do instrumento) e, dentro de
    // cada categoria, do maior pro menor score — destaca os modos mais
    // ativados primeiro dentro de cada bloco.
    mapped.sort((a, b) => {
      if (a.mode_category !== b.mode_category) {
        return SMI_CATEGORY_ORDER.indexOf(a.mode_category) - SMI_CATEGORY_ORDER.indexOf(b.mode_category);
      }
      return b.average_score - a.average_score;
    });
    setScores(mapped);
    setQuestions((questionRows ?? []) as QuestionRef[]);
    setReport((reportRow ?? null) as ReportInfo | null);

    if (reportRow) {
      const { data: viewRow } = await supabase
        .from('client_smi_published_reports')
        .select('first_viewed_at, acknowledged_at')
        .eq('assessment_id', assessmentId)
        .maybeSingle();
      setPublishedView((viewRow ?? null) as PublishedViewInfo | null);
    } else {
      setPublishedView(null);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, [assessmentId]);

  const handleDownload = () => {
    if (!assessment) return;
    const csv = buildRawAnswersCsv(
      [{ name: assessment.client_name, email: assessment.client_email, whatsapp: assessment.client_whatsapp, answers: assessment.raw_answers }],
      questions
    );
    downloadCsv(`respostas-smi-${assessment.client_name.replace(/\s+/g, '-').toLowerCase()}-v${assessment.version}.csv`, csv);
  };

  const handleGenerateTechnical = async () => {
    if (!assessmentId) return;
    setGeneratingTechnical(true);
    setReportError('');
    const { error } = await supabase.functions.invoke('smi-generate-technical-report', { body: { assessment_id: assessmentId } });
    if (error) { setReportError(error.message || 'Erro ao gerar a análise técnica.'); setGeneratingTechnical(false); return; }
    await load();
    setGeneratingTechnical(false);
  };

  const startEditTechnical = () => { setTechnicalDraft(report?.technical_content ?? ''); setEditingTechnical(true); };
  const cancelEditTechnical = () => setEditingTechnical(false);

  const saveTechnical = async () => {
    if (!report) return;
    setSavingTechnical(true);
    setReportError('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('client_smi_reports') as any)
      .update({ previous_content: report.technical_content, technical_content: technicalDraft, updated_at: new Date().toISOString() })
      .eq('id', report.id);
    if (error) { setReportError(error.message); setSavingTechnical(false); return; }
    setEditingTechnical(false);
    await load();
    setSavingTechnical(false);
  };

  const markTechnicalReviewed = async () => {
    if (!report) return;
    setMarkingReviewed(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('client_smi_reports') as any)
      .update({ status: 'reviewed', updated_at: new Date().toISOString() })
      .eq('id', report.id);
    setMarkingReviewed(false);
    if (error) { setReportError(error.message); return; }
    await load();
  };

  const handleGenerateClient = async () => {
    if (!assessmentId) return;
    setGeneratingClient(true);
    setReportError('');
    const { error } = await supabase.functions.invoke('smi-generate-client-report', { body: { assessment_id: assessmentId } });
    if (error) { setReportError(error.message || 'Erro ao gerar a devolutiva do cliente.'); setGeneratingClient(false); return; }
    await load();
    setGeneratingClient(false);
  };

  const startEditClient = () => {
    if (!report?.client_content) return;
    setEditedModos(report.client_content.modos.map((m) => ({ ...m })));
    setEditedConclusao(report.client_content.conclusao);
    setEditingClient(true);
  };
  const cancelEditClient = () => setEditingClient(false);

  const saveClient = async () => {
    if (!report) return;
    setSavingClient(true);
    setReportError('');
    const nextContent: ClientContent = { modos: editedModos, conclusao: editedConclusao, todos: report.client_content?.todos };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('client_smi_reports') as any)
      .update({
        previous_client_content: report.client_content,
        client_content: nextContent,
        client_content_status: 'reviewed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', report.id);
    if (error) { setReportError(error.message); setSavingClient(false); return; }
    setEditingClient(false);
    await load();
    setSavingClient(false);
  };

  const handlePublish = async () => {
    if (!report?.client_content || !assessment) return;
    setPublishing(true);
    setReportError('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: publishError } = await (supabase.from('client_smi_published_reports') as any).upsert(
      {
        assessment_id: assessment.id,
        client_id: assessment.client_id,
        content: report.client_content,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'assessment_id' }
    );
    if (publishError) { setReportError(publishError.message); setPublishing(false); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from('client_smi_reports') as any)
      .update({ client_content_status: 'published', updated_at: new Date().toISOString() })
      .eq('id', report.id);
    if (updateError) setReportError(updateError.message);
    await load();
    setPublishing(false);
  };

  if (loading) return <PageSpinner />;

  if (!assessment) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Link to="/smi-respostas" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar
        </Link>
        <p className="text-dark/50">Resposta não encontrada.</p>
      </div>
    );
  }

  const groups: { category: string; items: ModeScore[]; averageScore: number }[] = [];
  for (const s of scores) {
    const group = groups.find((g) => g.category === s.mode_category);
    if (group) group.items.push(s);
    else groups.push({ category: s.mode_category, items: [s], averageScore: 0 });
  }
  for (const group of groups) {
    group.averageScore = group.items.reduce((sum, s) => sum + s.average_score, 0) / group.items.length;
  }

  // Modos mais ativados deste cliente (relativo ao próprio perfil, não a um
  // cutoff) — usado só pra decidir quais cruzamentos de SMI_MODE_RELATIONSHIPS
  // valem destacar.
  const topCodes = new Set(
    [...scores]
      .sort((a, b) => b.average_score - a.average_score)
      .slice(0, TOP_MODES_FOR_RELATIONSHIPS)
      .map((s) => s.mode_code)
  );
  const relationshipChecks = SMI_MODE_RELATIONSHIPS.map((r) => ({
    ...r,
    matched: topCodes.has(r.codes[0]) && topCodes.has(r.codes[1]),
  }));

  const incomplete = assessment.status === 'in_progress';

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to="/smi-respostas" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Respostas do SMI
        </Link>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-petrol-50 flex items-center justify-center">
              <Layers size={18} className="text-petrol-700" />
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
        <p className="text-xs text-dark/60 leading-relaxed">{SMI_ETHICAL_NOTICE}</p>
      </div>

      <div className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-dark/40 mb-2 px-1">
          Cruzamentos entre modos
        </h2>
        <Card>
          <div className="divide-y divide-beige-100">
            {relationshipChecks.map((r) => (
              <div key={r.codes.join('+')} className="px-5 py-3.5 flex items-start gap-3">
                <span
                  className={`shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full ${r.matched ? 'bg-petrol-600' : 'bg-dark/15'}`}
                />
                <span className={`text-sm ${r.matched ? 'text-dark' : 'text-dark/35'}`}>{r.insight}</span>
              </div>
            ))}
          </div>
        </Card>
        <p className="text-xs text-dark/40 mt-2 px-1">
          Identificado quando os dois modos do par estão entre os {TOP_MODES_FOR_RELATIONSHIPS} mais ativados
          deste cliente — não é um ponto de corte clínico validado.
        </p>
      </div>

      <div className="space-y-6 mb-6">
        {groups.map((group) => (
          <div key={group.category}>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-dark/40">
                {SMI_CATEGORY_LABELS[group.category] ?? group.category}
              </h2>
              <span className="text-xs text-dark/40">média {group.averageScore.toFixed(1)}/6</span>
            </div>
            <Card>
              <div className="divide-y divide-beige-100">
                {group.items.map((s) => (
                  <div key={s.mode_id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-dark font-medium">{s.mode_name}</span>
                      <span className="text-sm text-dark/60 shrink-0">{s.average_score.toFixed(1)}/6</span>
                    </div>
                    {s.mode_description && (
                      <p className="text-xs text-dark/50 leading-relaxed mt-1.5">{s.mode_description}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ))}
      </div>

      {!incomplete && (
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-dark/40 px-1">Minha Análise</h2>

          {reportError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{reportError}</div>
          )}

          {/* Análise técnica */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-gold-600" />
                  <h3 className="font-semibold text-dark font-serif text-base">Análise técnica</h3>
                </div>
                {report && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={statusVariant[report.status]}>{statusLabel[report.status]}</Badge>
                    {report.status === 'draft' && (
                      <Button size="sm" variant="ghost" loading={markingReviewed} onClick={markTechnicalReviewed}>
                        <CheckCircle2 size={14} />
                        Marcar como revisado
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {!report ? (
                <>
                  <p className="text-xs text-dark/40 mb-3">Gera um rascunho a partir dos 14 modos deste cliente pra você revisar.</p>
                  <Button size="sm" loading={generatingTechnical} onClick={handleGenerateTechnical}>
                    <Sparkles size={14} />
                    Gerar Análise com IA
                  </Button>
                </>
              ) : editingTechnical ? (
                <div className="space-y-3">
                  <Textarea value={technicalDraft} onChange={(e) => setTechnicalDraft(e.target.value)} rows={16} />
                  <div className="flex items-center gap-2">
                    <Button size="sm" loading={savingTechnical} onClick={saveTechnical}>
                      <Save size={14} />
                      Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEditTechnical} disabled={savingTechnical}>
                      <X size={14} />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-dark/40 mb-2">
                    Atualizado em {formatDateTime(report.updated_at)}
                    {report.generated_with ? ` · gerado com ${report.generated_with}` : ''}
                  </p>
                  <div className="text-sm text-dark/80 whitespace-pre-wrap leading-relaxed mb-3 max-h-96 overflow-y-auto">
                    {report.technical_content}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={startEditTechnical}>
                      <Pencil size={14} />
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" loading={generatingTechnical} onClick={handleGenerateTechnical}>
                      <Sparkles size={14} />
                      Gerar novamente
                    </Button>
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          {/* Devolutiva do cliente */}
          {report && (
            <Card>
              <CardBody>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2">
                    <Heart size={16} className="text-gold-600" />
                    <h3 className="font-semibold text-dark font-serif text-base">Devolutiva do cliente</h3>
                  </div>
                  {report.client_content && (
                    <Badge variant={statusVariant[report.client_content_status]}>{statusLabel[report.client_content_status]}</Badge>
                  )}
                </div>

                {!report.client_content ? (
                  <>
                    <p className="text-xs text-dark/40 mb-3">
                      Gera uma versão simplificada, sem termos técnicos, com os 5 modos de maior média — é o que o
                      cliente vai ler.
                    </p>
                    <Button size="sm" loading={generatingClient} onClick={handleGenerateClient}>
                      <Heart size={14} />
                      Gerar Devolutiva com IA
                    </Button>
                  </>
                ) : editingClient ? (
                  <div className="space-y-3">
                    {editedModos.map((modo, i) => (
                      <Card key={i}>
                        <CardBody className="space-y-2">
                          <p className="text-sm font-medium text-dark">{modo.nome} — {modo.average_score.toFixed(1)}/6</p>
                          <Textarea
                            label="Descrição"
                            value={modo.descricao}
                            rows={3}
                            onChange={(e) => setEditedModos((prev) => prev.map((m, idx) => idx === i ? { ...m, descricao: e.target.value } : m))}
                          />
                        </CardBody>
                      </Card>
                    ))}
                    <Textarea label="Conclusão" value={editedConclusao} rows={4} onChange={(e) => setEditedConclusao(e.target.value)} />
                    <div className="flex items-center gap-2">
                      <Button size="sm" loading={savingClient} onClick={saveClient}>
                        <Save size={14} />
                        Salvar alterações
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEditClient} disabled={savingClient}>
                        <X size={14} />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-dark/40 mb-3">Atualizado em {formatDateTime(report.updated_at)}</p>
                    <div className="space-y-3 mb-4">
                      {report.client_content.modos.map((modo, i) => (
                        <div key={i} className="bg-beige-50 rounded-lg p-4">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <h4 className="font-semibold text-dark font-serif">{modo.nome}</h4>
                            <span className="text-xs font-medium text-gold-700 shrink-0">{modo.average_score.toFixed(1)}/6</span>
                          </div>
                          <p className="text-sm text-dark/70 leading-relaxed">{modo.descricao}</p>
                        </div>
                      ))}
                      <div className="border-t border-beige-300 pt-3">
                        <p className="text-sm text-dark/70 leading-relaxed">{report.client_content.conclusao}</p>
                      </div>
                    </div>

                    {report.client_content.todos && report.client_content.todos.length > 0 && (
                      <div className="border-t border-beige-300 pt-3 mb-4">
                        <h4 className="font-semibold text-dark font-serif mb-1 text-sm">Visão geral dos 14 modos</h4>
                        <p className="text-xs text-dark/40 mb-3">É o que o cliente também vê.</p>
                        <EsquemasBarChart
                          items={report.client_content.todos.map((t) => {
                            const mode = scores.find((s) => s.mode_id === t.mode_id);
                            return {
                              name: mode?.mode_name ?? '—',
                              percentual: (t.average_score / 6) * 100,
                              displayValue: `${t.average_score.toFixed(1)}/6`,
                              description: mode?.mode_description ?? undefined,
                            };
                          })}
                        />
                      </div>
                    )}

                    {report.client_content_status === 'published' && (
                      <p className="text-xs mb-3">
                        {publishedView?.acknowledged_at ? (
                          <span className="flex items-center gap-1 text-green-700">
                            <CheckCircle2 size={12} />
                            Cliente confirmou a leitura em {formatDateTime(publishedView.acknowledged_at)}
                          </span>
                        ) : publishedView?.first_viewed_at ? (
                          <span className="text-dark/50">Cliente visualizou, mas ainda não confirmou a leitura</span>
                        ) : (
                          <span className="text-dark/40">Cliente ainda não visualizou esta devolutiva</span>
                        )}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={startEditClient}>
                        <Pencil size={14} />
                        Editar
                      </Button>
                      <Button size="sm" variant="ghost" loading={generatingClient} onClick={handleGenerateClient}>
                        <Heart size={14} />
                        Gerar novamente
                      </Button>
                      {report.client_content_status !== 'published' && (
                        <Button size="sm" loading={publishing} onClick={handlePublish}>
                          <CheckCircle2 size={14} />
                          Publicar para o Cliente
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
