import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  ArrowLeft, Bold, Italic, List, ListOrdered, Quote, Eraser, Save,
  Sparkles, CheckCircle2, Send, Trash2,
} from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PageSpinner } from '../../components/ui/Spinner';
import { ReportObservations } from '../../components/ReportObservations';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../lib/database.types';

const untypedSupabase = supabase as unknown as SupabaseClient;

type SessionReportStatus = 'rascunho' | 'revisado' | 'publicado';
interface SessionReportRow {
  id: string;
  client_id: string;
  session_date: string;
  title: string;
  content_html: string;
  status: SessionReportStatus;
}

const STATUS_VARIANT: Record<SessionReportStatus, 'neutral' | 'warning' | 'success'> = {
  rascunho: 'neutral',
  revisado: 'warning',
  publicado: 'success',
};
const STATUS_LABEL: Record<SessionReportStatus, string> = {
  rascunho: 'Rascunho',
  revisado: 'Revisado',
  publicado: 'Publicado',
};

function sanitizeHtml(value: string) {
  const template = document.createElement('template');
  template.innerHTML = value;
  template.content.querySelectorAll('script, style, iframe, object, embed').forEach((node) => node.remove());
  template.content.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attr) => {
      if (attr.name.startsWith('on') || attr.name === 'style') node.removeAttribute(attr.name);
    });
  });
  return template.innerHTML;
}

export function SessionReportDetail() {
  const { clientId, sessionReportId } = useParams<{ clientId: string; sessionReportId: string }>();
  const navigate = useNavigate();
  const editorRef = useRef<HTMLDivElement>(null);

  const [client, setClient] = useState<Profile | null>(null);
  const [report, setReport] = useState<SessionReportRow | null>(null);
  const [title, setTitle] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [initialContentHtml, setInitialContentHtml] = useState('');
  const [initLoading, setInitLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [instruction, setInstruction] = useState('');
  const [asking, setAsking] = useState(false);
  const [aiError, setAiError] = useState('');

  const [statusBusy, setStatusBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    if (!clientId || !sessionReportId) return;

    const [{ data: clientRow }, { data: reportRow, error: reportError }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', clientId).eq('role', 'client').maybeSingle(),
      untypedSupabase
        .from('session_reports')
        .select('id, client_id, session_date, title, content_html, status')
        .eq('id', sessionReportId)
        .eq('client_id', clientId)
        .maybeSingle(),
    ]);

    setClient((clientRow ?? null) as Profile | null);
    const loadedReport = reportRow as SessionReportRow | null;
    setReport(loadedReport);
    setTitle(loadedReport?.title ?? '');
    setSessionDate(loadedReport?.session_date ?? '');
    setContentHtml(loadedReport?.content_html ?? '');
    setInitialContentHtml(loadedReport?.content_html ?? '');
    if (reportError) setError(reportError.message);
    setInitLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, sessionReportId]);

  const runEditorCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    setContentHtml(editorRef.current?.innerHTML ?? '');
  };

  const clearEditor = () => {
    if (editorRef.current) editorRef.current.innerHTML = '';
    setContentHtml('');
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!report) return;
    setError('');
    setSaving(true);

    const sanitized = sanitizeHtml(contentHtml);
    const { error: updateError } = await untypedSupabase
      .from('session_reports')
      .update({ title: title.trim() || report.title, session_date: sessionDate, content_html: sanitized, updated_at: new Date().toISOString() })
      .eq('id', report.id);

    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    setReport({ ...report, title: title.trim() || report.title, session_date: sessionDate, content_html: sanitized });
    setInitialContentHtml(sanitized);
  };

  const handleAskAi = async () => {
    if (!report || !instruction.trim()) return;
    setAsking(true);
    setAiError('');

    const { data, error: fnError } = await supabase.functions.invoke('revise-session-report', {
      body: { session_report_id: report.id, instruction: instruction.trim() },
    });

    setAsking(false);
    if (fnError || !data?.content_html) {
      setAiError(fnError?.message || 'Não foi possível pedir o ajuste agora.');
      return;
    }

    setContentHtml(data.content_html);
    setInitialContentHtml(data.content_html);
    if (editorRef.current) editorRef.current.innerHTML = data.content_html;
    setInstruction('');
  };

  const updateStatus = async (status: SessionReportStatus) => {
    if (!report) return;
    setStatusBusy(true);
    const fields: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'revisado') fields.reviewed_at = new Date().toISOString();
    if (status === 'publicado') fields.published_at = new Date().toISOString();

    const { error: updateError } = await untypedSupabase.from('session_reports').update(fields).eq('id', report.id);
    setStatusBusy(false);
    if (updateError) { setError(updateError.message); return; }
    setReport({ ...report, status });
  };

  const handleDelete = async () => {
    if (!report) return;
    setDeleting(true);
    const { error: deleteError } = await untypedSupabase.from('session_reports').delete().eq('id', report.id);
    setDeleting(false);
    if (deleteError) { setError(deleteError.message); return; }
    navigate(`/reports/${clientId}/sessions`);
  };

  if (initLoading) return <PageSpinner />;

  if (!client || !report) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Link to={clientId ? `/reports/${clientId}/sessions` : '/reports'} className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar
        </Link>
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error || 'Relatório não encontrado.'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to={`/reports/${client.id}/sessions`} className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Relatórios de Sessão
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-semibold text-dark font-serif">Relatório de Sessão</h1>
          <Badge variant={STATUS_VARIANT[report.status]}>{STATUS_LABEL[report.status]}</Badge>
        </div>
        <p className="text-dark/50 text-sm mt-1">Cliente: {client.name}</p>
      </div>

      <Card className="mb-4">
        <CardBody>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input label="Data da sessão" type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-dark/80">Conteúdo do Relatório</label>
              <div className="flex flex-wrap gap-2 border border-beige-300 rounded-lg bg-beige-50 p-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => runEditorCommand('bold')}><Bold size={14} /></Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => runEditorCommand('italic')}><Italic size={14} /></Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => runEditorCommand('insertUnorderedList')}><List size={14} /></Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => runEditorCommand('insertOrderedList')}><ListOrdered size={14} /></Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => runEditorCommand('formatBlock', 'blockquote')}><Quote size={14} /></Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearEditor}><Eraser size={14} /></Button>
              </div>
              <div
                key={report.id}
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: initialContentHtml }}
                onInput={(e) => setContentHtml(e.currentTarget.innerHTML)}
                className="min-h-64 w-full rounded-lg border border-beige-300 bg-white px-3 py-2.5 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-petrol-400 focus:border-transparent leading-relaxed"
              />
              {!contentHtml.trim() && (
                <p className="text-xs text-dark/40">
                  Em branco — ainda não sincronizado ou refinado a partir da transcrição.
                </p>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
            )}

            <Button type="submit" loading={saving} className="w-full">
              <Save size={16} />
              Salvar
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardBody>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-gold-500" />
            <h2 className="font-semibold text-dark font-serif text-base">Pedir ajuste à IA</h2>
          </div>
          <p className="text-xs text-dark/40 mb-3">
            Descreva o que quer mudar (ex: "deixe o tópico 3 mais curto") — a IA reescreve o relatório inteiro aplicando só esse ajuste.
          </p>
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="O que você quer ajustar?"
            rows={3}
            disabled={asking}
          />
          {aiError && <p className="text-sm text-red-600 mt-2">{aiError}</p>}
          <Button size="sm" className="mt-3" loading={asking} onClick={handleAskAi} disabled={!instruction.trim()}>
            <Sparkles size={14} />
            Pedir ajuste
          </Button>
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardBody>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-semibold text-dark font-serif text-base">Status</h2>
              <p className="text-xs text-dark/40 mt-0.5">
                {report.status === 'publicado'
                  ? 'Já está visível pro cliente.'
                  : 'Marque como revisado quando conferir o texto, e publique quando quiser liberar pro cliente.'}
              </p>
            </div>
            <div className="flex gap-2">
              {report.status === 'rascunho' && (
                <Button variant="ghost" size="sm" loading={statusBusy} onClick={() => updateStatus('revisado')}>
                  <CheckCircle2 size={14} />
                  Marcar como revisado
                </Button>
              )}
              {report.status !== 'publicado' && (
                <Button size="sm" loading={statusBusy} onClick={() => updateStatus('publicado')}>
                  <Send size={14} />
                  Publicar
                </Button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="mb-4">
        <ReportObservations sessionReportId={report.id} clientId={client.id} viewerRole="therapist" />
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 size={14} className="text-red-400" />
          Excluir sessão
        </Button>
      </div>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Excluir Relatório de Sessão" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-dark/70">Tem certeza? Esta ação não pode ser desfeita.</p>
          <div className="flex gap-3">
            <Button variant="danger" loading={deleting} onClick={handleDelete} className="flex-1">Excluir</Button>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
