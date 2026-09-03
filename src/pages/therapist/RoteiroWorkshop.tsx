import { useEffect, useState, FormEvent, ReactNode } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Wand2, RotateCcw, AlertTriangle, Sparkles } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Badge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Roteiro } from '../../lib/database.types';

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

const FIELD_LABELS: Record<keyof Omit<FieldsState, 'title'>, string> = {
  cena: 'Cena',
  crenca: 'Crença',
  mecanismo: 'Mecanismo',
  termo: 'Termo técnico',
  teste: 'Teste',
  fechamento: 'Fechamento',
};

export function RoteiroWorkshop() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'novo';
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(!isNew);
  const [rawText, setRawText] = useState('');
  const [fields, setFields] = useState<FieldsState>(EMPTY_FIELDS);
  const [autoExtracted, setAutoExtracted] = useState<Set<string>>(new Set());
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [extractedAt, setExtractedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

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
        setExtractedAt(r.extracted_at);
      }
      setLoading(false);
    })();
  }, [id, isNew]);

  const updateField = (field: keyof FieldsState, value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }));
    setAutoExtracted((prev) => {
      if (!prev.has(field)) return prev;
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
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
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveError('');

    const payload = { ...fields, extracted_at: extractedAt };

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
        {isNew && (
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
        )}

        <Card>
          <CardBody className="space-y-4">
            <FieldWithBadge label="Título" auto={autoExtracted.has('title')}>
              <Input
                placeholder="Título do artigo"
                value={fields.title}
                onChange={(e) => updateField('title', e.target.value)}
              />
            </FieldWithBadge>

            {(Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[]).map((field) => (
              <FieldWithBadge key={field} label={FIELD_LABELS[field]} auto={autoExtracted.has(field)}>
                <Textarea
                  value={fields[field]}
                  onChange={(e) => updateField(field, e.target.value)}
                  rows={3}
                />
              </FieldWithBadge>
            ))}
          </CardBody>
        </Card>

        {saveError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</div>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="submit" loading={saving} className="flex-1">Salvar Roteiro</Button>
          <Link to="/roteiros">
            <Button type="button" variant="ghost">Cancelar</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

function FieldWithBadge({ label, auto, children }: { label: string; auto: boolean; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <label className="text-sm font-medium text-dark/80">{label}</label>
        {auto && <Badge variant="gold">Extraído por IA</Badge>}
      </div>
      {children}
    </div>
  );
}
