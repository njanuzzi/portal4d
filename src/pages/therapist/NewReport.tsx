import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bold, Eraser, Italic, List, ListOrdered, Quote, Save } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageSpinner } from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../lib/database.types';

type ClientProfile = Profile & { diary_id?: string | null };

const REPORT_SELECT = 'id, user_id, period_start, period_end, content_text, published, active, created_at';

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

export function NewReport() {
  const params = useParams<{ clientId?: string; id?: string }>();
  const clientId = params.clientId ?? params.id;
  const navigate = useNavigate();
  const editorRef = useRef<HTMLDivElement>(null);

  const [client, setClient] = useState<ClientProfile | null>(null);
  const [title, setTitle] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadClient = async () => {
      if (!clientId) {
        setInitLoading(false);
        return;
      }

      const { data, error: clientError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientId)
        .eq('role', 'client')
        .maybeSingle();

      if (cancelled) return;

      setClient((data ?? null) as ClientProfile | null);
      setError(clientError?.message ?? '');
      setInitLoading(false);
    };

    loadClient();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const runEditorCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    setContentHtml(editorRef.current?.innerHTML ?? '');
  };

  const clearEditor = () => {
    if (editorRef.current) editorRef.current.innerHTML = '';
    setContentHtml('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const sanitizedBody = sanitizeHtml(contentHtml);

    if (!clientId || !client) {
      setError('Cliente não encontrado.');
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

    setLoading(true);

    const { error: saveError } = await (supabase as any)
      .from('reports')
      .insert({
        user_id: clientId,
        period_start: periodStart,
        period_end: periodEnd,
        content_text: composeReportContent(title, sanitizedBody),
        published,
        active: true,
      })
      .select(REPORT_SELECT)
      .single();

    if (saveError) {
      setError(saveError.message ?? 'Não foi possível salvar o relatório.');
      setLoading(false);
      return;
    }

    navigate(`/reports/${clientId}`);
  };

  if (initLoading) return <PageSpinner />;

  if (!client) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Link to="/reports" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Relatórios
        </Link>
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error || 'Cliente não encontrado.'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to={`/reports/${client.id}`} className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Relatórios
        </Link>
        <h1 className="text-2xl font-semibold text-dark font-serif">Novo Relatório</h1>
        <p className="text-dark/50 text-sm mt-1">Para: {client.name}</p>
      </div>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resumo do acompanhamento"
              required
              autoFocus
            />

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
                <Button type="button" variant="ghost" size="sm" onClick={() => runEditorCommand('bold')}><Bold size={14} /></Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => runEditorCommand('italic')}><Italic size={14} /></Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => runEditorCommand('insertUnorderedList')}><List size={14} /></Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => runEditorCommand('insertOrderedList')}><ListOrdered size={14} /></Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => runEditorCommand('formatBlock', 'blockquote')}><Quote size={14} /></Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearEditor}><Eraser size={14} /></Button>
              </div>
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => setContentHtml(e.currentTarget.innerHTML)}
                className="min-h-56 w-full rounded-lg border border-beige-300 bg-white px-3 py-2.5 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-petrol-400 focus:border-transparent leading-relaxed"
              />
            </div>

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

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={loading} className="flex-1">
                <Save size={16} />
                {published ? 'Salvar e Publicar' : 'Salvar Rascunho'}
              </Button>
              <Link to={`/reports/${client.id}`}>
                <Button type="button" variant="ghost">Cancelar</Button>
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
