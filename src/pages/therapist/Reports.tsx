import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bold, Eraser, Eye, FileText, Globe, Italic, List, ListOrdered, PlusCircle, Quote, Save } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { formatDate } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { Profile, Report } from '../../lib/database.types';

type ReportRow = Pick<Report, 'id' | 'user_id' | 'period_start' | 'period_end' | 'content_text' | 'published' | 'created_at'>;

type ClientProfile = Profile & { diary_id?: string | null };

interface ReportWithProfile extends ReportRow {
  profile: ClientProfile | null;
}

const REPORT_SELECT = 'id, user_id, period_start, period_end, content_text, published, created_at';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stripHtml(value: string) {
  const container = document.createElement('div');
  container.innerHTML = value;
  return container.textContent ?? container.innerText ?? '';
}

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

function composeReportContent(title: string, bodyHtml: string) {
  return `<h2>${escapeHtml(title.trim())}</h2>\n${sanitizeHtml(bodyHtml).trim()}`;
}

function getReportTitle(content: string) {
  const container = document.createElement('div');
  container.innerHTML = content;
  const heading = container.querySelector('h2');
  const text = heading?.textContent?.trim() || stripHtml(content).trim();
  return text.split('\n')[0] || 'Relatório clínico';
}

function getReportExcerpt(content: string) {
  const container = document.createElement('div');
  container.innerHTML = content;
  container.querySelector('h2')?.remove();
  const text = (container.textContent ?? '').replace(/\s+/g, ' ').trim();
  return text || 'Sem conteúdo adicional.';
}

export function Reports() {
  const editorRef = useRef<HTMLDivElement>(null);
  const [reports, setReports] = useState<ReportWithProfile[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewReport, setPreviewReport] = useState<ReportWithProfile | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [selectedClientId, setSelectedClientId] = useState('');
  const [title, setTitle] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [published, setPublished] = useState(false);

  const loadReports = async () => {
    const [{ data: reportRows, error: reportsError }, { data: clientRows, error: clientsError }] = await Promise.all([
      supabase
        .from('reports')
        .select(REPORT_SELECT)
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, email, name, role, active, whatsapp, address, created_at')
        .eq('role', 'client')
        .eq('active', true)
        .order('name', { ascending: true }),
    ]);

    const loadedClients = (clientRows ?? []) as ClientProfile[];
    const profileIds = Array.from(new Set((reportRows ?? []).map((report) => report.user_id).filter(Boolean)));
    let profilesById = new Map<string, ClientProfile>();
    let profilesErrorMessage = '';

    if (profileIds.length > 0) {
      const { data: profileRows, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, name, role, active, whatsapp, address, created_at')
        .in('id', profileIds);

      profilesById = new Map((profileRows ?? []).map((profile) => [profile.id, profile as ClientProfile]));
      profilesErrorMessage = profilesError?.message ?? '';
    }

    setClients(loadedClients);
    setSelectedClientId((current) => current || loadedClients[0]?.id || '');
    setReports(((reportRows ?? []) as ReportRow[]).map((report) => ({
      ...report,
      profile: profilesById.get(report.user_id) ?? null,
    })));

    const loadError = reportsError?.message || clientsError?.message || profilesErrorMessage;
    if (loadError) setError(loadError);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      await loadReports();
      if (!cancelled) setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const runEditorCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    setContentHtml(editorRef.current?.innerHTML ?? '');
  };

  const clearEditor = () => {
    if (editorRef.current) editorRef.current.innerHTML = '';
    setContentHtml('');
  };

  const resetForm = () => {
    setTitle('');
    setPeriodStart('');
    setPeriodEnd('');
    setContentHtml('');
    setPublished(false);
    if (editorRef.current) editorRef.current.innerHTML = '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const sanitizedBody = sanitizeHtml(contentHtml);

    if (!selectedClientId) {
      setError('Selecione um cliente ativo.');
      return;
    }
    if (!title.trim()) {
      setError('Informe o título do relatório.');
      return;
    }
    if (!periodStart || !periodEnd) {
      setError('Preencha o período do relatório.');
      return;
    }
    if (!stripHtml(sanitizedBody).trim()) {
      setError('O conteúdo do relatório não pode estar vazio.');
      return;
    }

    setSaving(true);

    const { data: createdReport, error: saveError } = await supabase
      .from('reports')
      .insert({
        user_id: selectedClientId,
        period_start: periodStart,
        period_end: periodEnd,
        content_text: composeReportContent(title, sanitizedBody),
        published,
      })
      .select(REPORT_SELECT)
      .single();

    if (saveError || !createdReport) {
      setError(saveError?.message ?? 'Não foi possível salvar o relatório.');
      setSaving(false);
      return;
    }

    const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
    setReports((prev) => [{ ...(createdReport as ReportRow), profile: selectedClient }, ...prev]);
    resetForm();
    setSaving(false);
  };

  const togglePublish = async (report: ReportWithProfile) => {
    setError('');
    setPublishing(report.id);

    const { data: updatedReport, error: updateError } = await supabase
      .from('reports')
      .update({ published: !report.published })
      .eq('id', report.id)
      .select(REPORT_SELECT)
      .single();

    if (updateError || !updatedReport) {
      setError(updateError?.message ?? 'Não foi possível atualizar o status do relatório.');
      setPublishing(null);
      return;
    }

    setReports((prev) => prev.map((item) => (
      item.id === report.id
        ? { ...(updatedReport as ReportRow), profile: item.profile }
        : item
    )));
    setPublishing(null);
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-dark font-serif">Todos os Relatórios</h1>
        <p className="text-dark/50 text-sm mt-1">{reports.length} relatório{reports.length !== 1 ? 's' : ''} no total</p>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <div className="px-6 py-4 border-b border-beige-300 flex items-center justify-between">
          <h2 className="font-semibold text-dark text-sm">Novo Relatório</h2>
          <PlusCircle size={18} className="text-petrol-700" />
        </div>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-dark/80">Cliente</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-beige-300 text-dark text-sm bg-white focus:outline-none focus:ring-2 focus:ring-petrol-400 focus:border-transparent transition-colors"
                  required
                >
                  {clients.length === 0 ? (
                    <option value="">Nenhum cliente ativo</option>
                  ) : (
                    clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))
                  )}
                </select>
              </div>

              <Input
                label="Título"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Resumo do acompanhamento"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Período — Início"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
              />
              <Input
                label="Período — Fim"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-dark/80">Conteúdo do Relatório</label>
              <div className="flex flex-wrap gap-2 border border-beige-300 rounded-lg bg-beige-50 p-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => runEditorCommand('bold')}>
                  <Bold size={14} />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => runEditorCommand('italic')}>
                  <Italic size={14} />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => runEditorCommand('insertUnorderedList')}>
                  <List size={14} />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => runEditorCommand('insertOrderedList')}>
                  <ListOrdered size={14} />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => runEditorCommand('formatBlock', 'blockquote')}>
                  <Quote size={14} />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearEditor}>
                  <Eraser size={14} />
                </Button>
              </div>
              <div
                ref={editorRef}
                contentEditable
                onInput={(e) => setContentHtml(e.currentTarget.innerHTML)}
                className="min-h-48 w-full rounded-lg border border-beige-300 bg-white px-3 py-2.5 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-petrol-400 focus:border-transparent leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-beige-300 text-petrol-700 focus:ring-petrol-400"
                />
                <div>
                  <div className="text-sm font-medium text-dark">Publicado</div>
                  <div className="text-xs text-dark/40">Desmarcado salva como rascunho</div>
                </div>
              </label>

              <Button type="submit" loading={saving} disabled={clients.length === 0}>
                <Save size={16} />
                {published ? 'Salvar e Publicar' : 'Salvar Rascunho'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {reports.length === 0 ? (
        <EmptyState
          icon={<FileText size={40} />}
          title="Nenhum relatório criado"
          description="Use o editor acima para criar o primeiro relatório"
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
                  <div className="font-medium text-dark text-sm">{getReportTitle(report.content_text)}</div>
                  <div className="text-xs text-dark/50 mt-1">
                    {formatDate(report.period_start)} — {formatDate(report.period_end)}
                  </div>
                  <p className="text-sm text-dark/60 mt-2 line-clamp-2">{getReportExcerpt(report.content_text)}</p>
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
        <div
          className="text-dark/80 leading-relaxed text-sm space-y-3"
          dangerouslySetInnerHTML={{ __html: previewReport?.content_text ?? '' }}
        />
      </Modal>
    </div>
  );
}
