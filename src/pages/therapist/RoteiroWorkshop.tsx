import { useEffect, useState, FormEvent, ReactNode } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Wand2, RotateCcw, AlertTriangle, Sparkles, ClipboardCheck, Copy, Check, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Badge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { ChecklistReviewItem, Roteiro, RoteiroRewrite } from '../../lib/database.types';

// Mesmo limite validado na Edge Function `extract-roteiro` — checar aqui
// também evita fazer a chamada só pra ela ser rejeitada no servidor.
const MAX_TEXT_LENGTH = 120000;
const WARN_TEXT_LENGTH = 40000;

interface FieldsState {
  title: string;
  cena: string;
  crenca: string;
  mecanismo: string;
  termo: string;
  teste: string;
  fechamento: string;
}

const EMPTY_FIELDS: FieldsState = { title: '', cena: '', crenca: '', mecanismo: '', termo: '', teste: '', fechamento: '' };

const FIELD_META: Record<keyof Omit<FieldsState, 'title'>, { label: string; hint: string }> = {
  cena: { label: 'Cena de abertura', hint: 'Qual momento específico, com detalhe sensorial, abre o texto?' },
  crenca: { label: 'Crença comum', hint: 'O que todo mundo assume sobre isso?' },
  mecanismo: { label: 'O mecanismo', hint: 'O que realmente acontece — o que falta na crença comum?' },
  termo: { label: 'Termo técnico', hint: 'Um termo, usado uma vez, traduzido na mesma frase.' },
  teste: { label: 'Teste aplicável', hint: 'Que critério observável o leitor testa sozinho, hoje?' },
  fechamento: { label: 'Fechamento', hint: 'Como a cena de abertura se resolve?' },
};

// Ordem fixa — mapeia direto pro array `checklist` (5 booleanos) no banco e
// pro array `ai_review` devolvido pela Edge Function `review-roteiro`.
const CHECKLIST_ITEMS = [
  'A primeira frase só serve para esse texto, não para qualquer texto do tema?',
  'Existe só um mecanismo central, do início ao fim?',
  'O termo técnico aparece uma vez só, e é traduzido na mesma frase?',
  'Tem um teste que o leitor aplica sozinho, hoje, sem precisar de mim?',
  'O final resolve a cena de abertura, não resume o texto?',
];

const EMPTY_CHECKLIST = [false, false, false, false, false];

function formatForCopy(fields: FieldsState): string {
  const lines = [fields.title || 'Roteiro sem título', ''];
  (Object.keys(FIELD_META) as (keyof typeof FIELD_META)[]).forEach((field) => {
    lines.push(FIELD_META[field].label, fields[field] || '(vazio)', '');
  });
  return lines.join('\n').trim();
}

export function RoteiroWorkshop() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'novo';
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(!isNew);
  const [rawText, setRawText] = useState('');
  const [fields, setFields] = useState<FieldsState>(EMPTY_FIELDS);
  const [checklist, setChecklist] = useState<boolean[]>(EMPTY_CHECKLIST);
  const [autoExtracted, setAutoExtracted] = useState<Set<string>>(new Set());
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [extractedAt, setExtractedAt] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [checklistReview, setChecklistReview] = useState<ChecklistReviewItem[] | null>(null);
  const [fieldRewrite, setFieldRewrite] = useState<RoteiroRewrite | null>(null);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('roteiros').select('*').eq('id', id).maybeSingle();
      if (data) {
        const r = data as Roteiro;
        setFields({
          title: r.title, cena: r.cena, crenca: r.crenca, mecanismo: r.mecanismo,
          termo: r.termo, teste: r.teste, fechamento: r.fechamento,
        });
        setChecklist(r.checklist?.length === CHECKLIST_ITEMS.length ? r.checklist : EMPTY_CHECKLIST);
        setRawText(r.source_text ?? '');
        setExtractedAt(r.extracted_at);
        setChecklistReview(r.ai_review?.length === CHECKLIST_ITEMS.length ? r.ai_review : null);
        setFieldRewrite(r.ai_rewrite ?? null);
        setReviewedAt(r.reviewed_at);
      }
      setLoading(false);
    })();
  }, [id, isNew]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const updateField = (field: keyof FieldsState, value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }));
    setAutoExtracted((prev) => {
      if (!prev.has(field)) return prev;
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  };

  const toggleChecklist = (idx: number) => {
    setChecklist((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  const runExtraction = async () => {
    if (!rawText.trim()) {
      setExtractError('Cole um texto pra extrair o roteiro.');
      return;
    }
    if (rawText.length > MAX_TEXT_LENGTH) {
      setExtractError(`Texto muito grande (${rawText.length.toLocaleString('pt-BR')} caracteres, limite ${MAX_TEXT_LENGTH.toLocaleString('pt-BR')}). Cole um trecho menor ou divida em partes.`);
      return;
    }
    setExtracting(true);
    setExtractError('');
    const { data, error } = await supabase.functions.invoke('extract-roteiro', { body: { text: rawText } });
    setExtracting(false);

    if (error || data?.error) {
      setExtractError(data?.error ?? error?.message ?? 'Não foi possível extrair o roteiro. Verifique sua conexão e tente de novo.');
      return;
    }

    setFields({
      title: data.title ?? '',
      cena: data.cena ?? '',
      crenca: data.crenca ?? '',
      mecanismo: data.mecanismo ?? '',
      termo: data.termo ?? '',
      teste: data.teste ?? '',
      fechamento: data.fechamento ?? '',
    });
    setAutoExtracted(new Set(['title', 'cena', 'crenca', 'mecanismo', 'termo', 'teste', 'fechamento']));
    setExtractedAt(new Date().toISOString());
    setChecklistReview(null);
    setFieldRewrite(null);
    setReviewedAt(null);
  };

  const runReview = async () => {
    const hasContent = (Object.keys(FIELD_META) as (keyof typeof FIELD_META)[]).some((field) => fields[field].trim());
    if (!hasContent) {
      setReviewError('Preencha ao menos um campo antes de pedir a revisão.');
      return;
    }
    setReviewing(true);
    setReviewError('');
    const { data, error } = await supabase.functions.invoke('review-roteiro', {
      body: { cena: fields.cena, crenca: fields.crenca, mecanismo: fields.mecanismo, termo: fields.termo, teste: fields.teste, fechamento: fields.fechamento },
    });
    setReviewing(false);

    if (error || data?.error) {
      setReviewError(data?.error ?? error?.message ?? 'Não foi possível revisar o roteiro. Verifique sua conexão e tente de novo.');
      return;
    }

    setChecklistReview(data.review ?? null);
    setFieldRewrite(data.rewrite ?? null);
    setReviewedAt(new Date().toISOString());
  };

  const applyRewrite = (field: keyof Omit<FieldsState, 'title'>) => {
    if (!fieldRewrite?.[field]) return;
    setFields((prev) => ({ ...prev, [field]: fieldRewrite[field] }));
  };

  const copyAsText = async () => {
    try {
      await navigator.clipboard.writeText(formatForCopy(fields));
      setCopied(true);
    } catch {
      setSaveError('Não foi possível copiar — copie manualmente os campos.');
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveError('');

    const payload = {
      ...fields,
      checklist,
      source_text: rawText || null,
      extracted_at: extractedAt,
      ai_review: checklistReview,
      ai_rewrite: fieldRewrite,
      reviewed_at: reviewedAt,
    };

    if (isNew) {
      const { data, error } = await supabase
        .from('roteiros')
        .insert({ user_id: user.id, ...payload })
        .select('id')
        .single();
      if (error || !data) {
        setSaveError(error?.message ?? 'Não foi possível salvar o roteiro.');
        setSaving(false);
        return;
      }
      navigate(`/roteiros/${data.id}`);
      return;
    }

    const { error } = await supabase.from('roteiros').update(payload).eq('id', id);
    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    navigate('/roteiros');
  };

  if (loading) return <PageSpinner />;

  const textTooLong = rawText.length > MAX_TEXT_LENGTH;
  const textLarge = rawText.length > WARN_TEXT_LENGTH && !textTooLong;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to="/roteiros" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Roteiros
        </Link>
        <h1 className="text-2xl font-semibold text-dark font-serif">{isNew ? 'Novo Roteiro' : 'Editar Roteiro'}</h1>
        <p className="text-dark/50 text-sm mt-1">A extração é um rascunho — revise e edite antes de salvar</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-gold-600" />
              <span className="text-sm font-semibold text-dark">Extração automática</span>
            </div>
            <Textarea
              label="Texto bruto (sessão, rascunho, transcrição)"
              placeholder="Cole aqui o texto de origem..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={10}
            />
            {textLarge && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Texto grande ({rawText.length.toLocaleString('pt-BR')} caracteres) — a extração pode demorar mais.
              </div>
            )}
            {textTooLong && (
              <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Texto muito grande ({rawText.length.toLocaleString('pt-BR')} caracteres, limite {MAX_TEXT_LENGTH.toLocaleString('pt-BR')}). Cole um trecho menor ou divida em partes.
              </div>
            )}
            {extractError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{extractError}</div>
            )}
            <Button type="button" variant="secondary" loading={extracting} disabled={textTooLong} onClick={runExtraction}>
              {extractedAt ? <RotateCcw size={16} /> : <Wand2 size={16} />}
              {extractedAt ? 'Extrair de novo' : 'Extrair automaticamente'}
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={15} className="text-petrol-600" />
              <span className="text-sm font-semibold text-dark">Revisão crítica</span>
            </div>
            <p className="text-xs text-dark/50">A IA avalia os campos preenchidos contra o checklist e sugere uma reescrita por campo — ela nunca marca o checklist nem substitui um campo sozinha.</p>
            {reviewError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{reviewError}</div>
            )}
            <Button type="button" variant="secondary" loading={reviewing} onClick={runReview}>
              <ClipboardCheck size={16} />
              Revisar com IA
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <FieldWithBadge label="Título" auto={autoExtracted.has('title')}>
              <Input
                placeholder="Título do artigo"
                value={fields.title}
                onChange={(e) => updateField('title', e.target.value)}
              />
            </FieldWithBadge>

            {(Object.keys(FIELD_META) as (keyof typeof FIELD_META)[]).map((field) => (
              <FieldWithBadge key={field} label={FIELD_META[field].label} hint={FIELD_META[field].hint} auto={autoExtracted.has(field)}>
                <Textarea
                  value={fields[field]}
                  onChange={(e) => updateField(field, e.target.value)}
                  rows={3}
                />
                {fieldRewrite?.[field] && fieldRewrite[field] !== fields[field] && (
                  <div className="mt-1.5 rounded-lg border border-gold-200 bg-gold-50/60 px-3 py-2">
                    <p className="text-xs font-medium text-gold-700 mb-1">Sugestão da IA</p>
                    <p className="text-sm text-dark/80 whitespace-pre-wrap">{fieldRewrite[field]}</p>
                    <button
                      type="button"
                      onClick={() => applyRewrite(field)}
                      className="mt-1.5 text-xs font-medium text-petrol-700 hover:text-petrol-900 transition-colors"
                    >
                      Usar esta versão
                    </button>
                  </div>
                )}
              </FieldWithBadge>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <span className="text-sm font-semibold text-dark">Checklist de revisão antes de publicar</span>
            <div className="space-y-3">
              {CHECKLIST_ITEMS.map((item, idx) => {
                const review = checklistReview?.[idx];
                return (
                  <div key={idx}>
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={checklist[idx] ?? false}
                        onChange={() => toggleChecklist(idx)}
                        className="w-3.5 h-3.5 mt-0.5 accent-petrol-600 shrink-0"
                      />
                      <span className="text-sm text-dark/70">{item}</span>
                    </label>
                    {review && (
                      <div className={`ml-6 mt-1 flex items-start gap-1.5 text-xs rounded-lg px-2.5 py-1.5 ${review.ok ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-amber-700 bg-amber-50 border border-amber-200'}`}>
                        {review.ok ? <CheckCircle2 size={13} className="shrink-0 mt-0.5" /> : <XCircle size={13} className="shrink-0 mt-0.5" />}
                        <span>{review.comment}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {saveError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</div>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="submit" loading={saving} className="flex-1">Salvar Roteiro</Button>
          <Button type="button" variant="ghost" onClick={copyAsText}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copiado!' : 'Copiar como texto'}
          </Button>
          <Link to="/roteiros">
            <Button type="button" variant="ghost">Cancelar</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

function FieldWithBadge({ label, hint, auto, children }: { label: string; hint?: string; auto: boolean; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <label className="text-sm font-medium text-dark/80">{label}</label>
        {auto && <Badge variant="gold">Extraído por IA</Badge>}
      </div>
      {hint && <p className="text-xs text-dark/40 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}
