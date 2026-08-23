import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Heart, Pencil, Save, X, Send, Sparkles, History, CheckCircle2 } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Textarea } from '../../components/ui/Textarea';
import { Input } from '../../components/ui/Input';
import { PageSpinner } from '../../components/ui/Spinner';
import { EsquemasBarChart } from '../../components/EsquemasBarChart';
import { ReportObservations } from '../../components/ReportObservations';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../lib/database.types';
import { diffWords } from '../../lib/diff';

interface ClientEsquema {
  nome: string;
  percentual: number;
  descricao: string;
}

interface ClientContent {
  esquemas: ClientEsquema[];
  conclusao: string;
  todos?: { domain_id: string; percentual: number }[];
}

interface SchemaDomain {
  id: string;
  friendly_name: string | null;
  wiki_description: string | null;
}

type ContentStatus = 'draft' | 'reviewed' | 'published';

interface ReportRow {
  id: string;
  assessment_id: string;
  client_id: string;
  client_content: ClientContent | null;
  previous_client_content: ClientContent | null;
  client_content_status: ContentStatus;
  updated_at: string;
}

interface ViewStatus {
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  acknowledged_at: string | null;
}

const statusLabel: Record<ContentStatus, string> = {
  draft: 'Rascunho',
  reviewed: 'Revisado',
  published: 'Versão final',
};
const statusVariant: Record<ContentStatus, 'warning' | 'success' | 'neutral'> = {
  draft: 'warning',
  reviewed: 'neutral',
  published: 'success',
};

export function ClientFacingReportPreview() {
  const { id: clientId, reportId } = useParams<{ id: string; reportId: string }>();
  const [client, setClient] = useState<Profile | null>(null);
  const [report, setReport] = useState<ReportRow | null>(null);
  const [viewStatus, setViewStatus] = useState<ViewStatus | null>(null);
  const [domains, setDomains] = useState<SchemaDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [editedEsquemas, setEditedEsquemas] = useState<ClientEsquema[]>([]);
  const [editedConclusao, setEditedConclusao] = useState('');
  const [saving, setSaving] = useState(false);

  const [showDiff, setShowDiff] = useState(false);

  const [instruction, setInstruction] = useState('');
  const [revising, setRevising] = useState(false);
  const [revisionError, setRevisionError] = useState('');

  const [publishing, setPublishing] = useState(false);

  const load = async () => {
    if (!clientId || !reportId) { setLoading(false); return; }
    setLoading(true);
    setError('');

    const [{ data: clientRow }, { data: reportRow, error: reportError }, { data: domainRows }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', clientId).eq('role', 'client').maybeSingle(),
      supabase
        .from('client_schema_reports')
        .select('id, assessment_id, client_id, client_content, previous_client_content, client_content_status, updated_at')
        .eq('id', reportId)
        .maybeSingle(),
      supabase.from('schema_domains').select('id, friendly_name, wiki_description'),
    ]);

    setClient((clientRow ?? null) as Profile | null);
    setReport((reportRow ?? null) as ReportRow | null);
    setDomains((domainRows ?? []) as SchemaDomain[]);
    if (reportError) setError(reportError.message);

    if (reportRow?.assessment_id) {
      const { data: viewRow } = await supabase
        .from('client_published_reports')
        .select('first_viewed_at, last_viewed_at, acknowledged_at')
        .eq('assessment_id', reportRow.assessment_id)
        .maybeSingle();
      setViewStatus((viewRow ?? null) as ViewStatus | null);
    } else {
      setViewStatus(null);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, [clientId, reportId]);

  const startEditing = () => {
    if (!report?.client_content) return;
    setEditedEsquemas(report.client_content.esquemas.map((e) => ({ ...e })));
    setEditedConclusao(report.client_content.conclusao);
    setShowDiff(false);
    setEditing(true);
  };

  const cancelEditing = () => setEditing(false);

  const handleSave = async () => {
    if (!report) return;
    setSaving(true);
    setError('');

    const { error: updateError } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('client_schema_reports') as any)
      .update({
        previous_client_content: report.client_content,
        client_content: { esquemas: editedEsquemas, conclusao: editedConclusao },
        client_content_status: 'reviewed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', report.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setEditing(false);
    await load();
    setSaving(false);
  };

  const handleRevise = async (e: FormEvent) => {
    e.preventDefault();
    if (!reportId || !instruction.trim()) return;

    setRevising(true);
    setRevisionError('');

    const { error: fnError } = await supabase.functions.invoke('revise-client-report', {
      body: { report_id: reportId, instruction: instruction.trim() },
    });

    if (fnError) {
      setRevisionError(fnError.message || 'Erro ao pedir a alteração.');
      setRevising(false);
      return;
    }

    setInstruction('');
    setShowDiff(false);
    await load();
    setRevising(false);
  };

  const handlePublish = async () => {
    if (!report || !report.client_content) return;
    setPublishing(true);

    // Publica um snapshot isolado na tabela que o cliente pode ler — nunca
    // expor client_schema_reports diretamente a ele (mesma linha guarda o
    // texto técnico da terapeuta, e RLS filtra linha, não coluna).
    const { error: publishError } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('client_published_reports') as any)
      .upsert(
        {
          assessment_id: report.assessment_id,
          client_id: report.client_id,
          content: report.client_content,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'assessment_id' }
      );

    if (publishError) {
      setError(publishError.message);
      setPublishing(false);
      return;
    }

    const { error: updateError } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('client_schema_reports') as any)
      .update({ client_content_status: 'published', updated_at: new Date().toISOString() })
      .eq('id', report.id);
    if (updateError) setError(updateError.message);
    await load();
    setPublishing(false);
  };

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) return <PageSpinner />;

  if (!report || !report.client_content) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Link to={`/clients/${clientId}/schema-analysis`} className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar
        </Link>
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error || 'Relatório do cliente ainda não foi gerado.'}
        </div>
      </div>
    );
  }

  const { esquemas, conclusao } = report.client_content;
  const hasPrevious = !!report.previous_client_content;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to={`/clients/${clientId}/schema-analysis`} className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Análise de Esquemas
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold-50 flex items-center justify-center">
              <Heart size={18} className="text-gold-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-dark font-serif">Relatório do Cliente</h1>
              <p className="text-dark/50 text-sm mt-0.5">{client?.name}</p>
            </div>
          </div>
          <Badge variant={statusVariant[report.client_content_status]}>
            {statusLabel[report.client_content_status]}
          </Badge>
        </div>
        <p className="text-xs text-dark/40 mt-2">
          Última atualização em {formatDateTime(report.updated_at)} · pré-visualização — formatação final da página do cliente ainda será desenhada.
        </p>
        {report.client_content_status === 'published' && (
          <p className="text-xs mt-1 flex items-center gap-1.5">
            {viewStatus?.acknowledged_at ? (
              <span className="flex items-center gap-1 text-green-700">
                <CheckCircle2 size={12} />
                Cliente confirmou a leitura em {formatDateTime(viewStatus.acknowledged_at)}
              </span>
            ) : viewStatus?.last_viewed_at ? (
              <span className="text-dark/50">Cliente visualizou em {formatDateTime(viewStatus.last_viewed_at)}, mas ainda não confirmou a leitura</span>
            ) : (
              <span className="text-dark/40">Cliente ainda não visualizou este relatório</span>
            )}
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      {/* Ações: editar / ver mudanças / marcar como final */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          {hasPrevious && !editing && (
            <button
              type="button"
              onClick={() => setShowDiff((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-petrol-700 hover:text-petrol-800 transition-colors"
            >
              <History size={13} />
              {showDiff ? 'Ver texto final' : 'Ver o que mudou na última alteração'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <Button size="sm" variant="ghost" onClick={startEditing}>
              <Pencil size={14} />
              Editar
            </Button>
          )}
          {report.client_content_status !== 'published' && !editing && (
            <Button size="sm" loading={publishing} onClick={handlePublish}>
              <CheckCircle2 size={14} />
              Marcar como versão final
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-3 mb-4">
          {editedEsquemas.map((esquema, i) => (
            <Card key={i}>
              <CardBody className="space-y-2">
                <Input
                  label="Nome"
                  value={esquema.nome}
                  onChange={(e) => setEditedEsquemas((prev) =>
                    prev.map((it, idx) => idx === i ? { ...it, nome: e.target.value } : it)
                  )}
                />
                <Textarea
                  label="Descrição"
                  value={esquema.descricao}
                  rows={4}
                  onChange={(e) => setEditedEsquemas((prev) =>
                    prev.map((it, idx) => idx === i ? { ...it, descricao: e.target.value } : it)
                  )}
                />
              </CardBody>
            </Card>
          ))}
          <Card>
            <CardBody>
              <Textarea
                label="Conclusão"
                value={editedConclusao}
                rows={5}
                onChange={(e) => setEditedConclusao(e.target.value)}
              />
            </CardBody>
          </Card>
          <div className="flex items-center gap-2">
            <Button size="sm" loading={saving} onClick={handleSave}>
              <Save size={14} />
              Salvar alterações
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelEditing} disabled={saving}>
              <X size={14} />
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {esquemas?.map((esquema, i) => {
            const prevEsquema = report.previous_client_content?.esquemas?.[i];
            return (
              <Card key={i}>
                <CardBody>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <h3 className="font-semibold text-dark font-serif">{esquema.nome}</h3>
                    <span className="text-xs font-medium text-gold-700 shrink-0">{esquema.percentual}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-beige-100 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-gold-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, esquema.percentual))}%` }}
                    />
                  </div>
                  {showDiff && prevEsquema ? (
                    <p className="text-sm text-dark/70 leading-relaxed">
                      {diffWords(prevEsquema.descricao, esquema.descricao).map((op, j) => {
                        if (op.type === 'equal') return <span key={j}>{op.value}</span>;
                        if (op.type === 'insert') {
                          return <span key={j} className="bg-green-100 text-green-800 rounded-sm">{op.value}</span>;
                        }
                        return <span key={j} className="bg-red-100 text-red-700 line-through rounded-sm">{op.value}</span>;
                      })}
                    </p>
                  ) : (
                    <p className="text-sm text-dark/70 leading-relaxed">{esquema.descricao}</p>
                  )}
                </CardBody>
              </Card>
            );
          })}

          <Card>
            <CardBody>
              <h3 className="font-semibold text-dark font-serif mb-2">Conclusão</h3>
              {showDiff && report.previous_client_content ? (
                <p className="text-sm text-dark/70 leading-relaxed">
                  {diffWords(report.previous_client_content.conclusao, conclusao).map((op, j) => {
                    if (op.type === 'equal') return <span key={j}>{op.value}</span>;
                    if (op.type === 'insert') {
                      return <span key={j} className="bg-green-100 text-green-800 rounded-sm">{op.value}</span>;
                    }
                    return <span key={j} className="bg-red-100 text-red-700 line-through rounded-sm">{op.value}</span>;
                  })}
                </p>
              ) : (
                <p className="text-sm text-dark/70 leading-relaxed">{conclusao}</p>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Visão geral dos 16 padrões + wiki */}
      {!editing && report.client_content.todos && report.client_content.todos.length > 0 && (
        <Card className="mb-4">
          <CardBody>
            <h3 className="font-semibold text-dark font-serif mb-1">Visão geral dos 16 padrões</h3>
            <p className="text-xs text-dark/40 mb-3">Clique em um padrão para ver a explicação (é o que o cliente também vê).</p>
            <EsquemasBarChart
              items={report.client_content.todos.map((t) => {
                const domain = domains.find((d) => d.id === t.domain_id);
                return { name: domain?.friendly_name ?? '—', percentual: t.percentual, description: domain?.wiki_description ?? undefined };
              })}
            />
          </CardBody>
        </Card>
      )}

      {/* Observações — comunicação com o cliente sobre esse relatório */}
      {!editing && (
        <div className="mb-4">
          <ReportObservations assessmentId={report.assessment_id} clientId={report.client_id} viewerRole="therapist" />
        </div>
      )}

      {/* Pedir alterações à IA */}
      {!editing && (
        <Card>
          <CardBody>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-gold-600" />
              <h2 className="font-semibold text-dark font-serif text-base">Pedir alterações</h2>
            </div>
            <p className="text-xs text-dark/40 mb-3">
              Descreva suas observações — a IA reescreve o relatório do cliente mantendo a voz sistêmica e pessoal.
            </p>

            <form onSubmit={handleRevise} className="space-y-3">
              <Textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Ex: no padrão de Exigência rígida, suavize o tom, ele ficou parecendo uma cobrança."
                rows={4}
                disabled={revising}
              />
              {revisionError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {revisionError}
                </div>
              )}
              <Button type="submit" size="sm" loading={revising} disabled={!instruction.trim()}>
                <Send size={14} />
                Enviar pedido
              </Button>
            </form>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
