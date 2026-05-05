import { useEffect, useState, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertCircle, BookOpen, CheckCircle, KeyRound, Pencil } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { Input } from '../../components/ui/Input';
import { ScaleInput } from '../../components/ui/ScaleInput';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDateLong, todayISO } from '../../lib/format';
import type { QuestionType } from '../../lib/database.types';

interface DiaryQuestion {
  id: string;
  text: string;
  type: QuestionType;
  order_num: number;
}

interface DiaryData {
  client_id: string;
  diary: { id: string; name: string };
  questions: DiaryQuestion[];
  today_entry_id: string | null;
  existing_answers: { question_id: string; answer_text: string | null; answer_value: number | null }[] | null;
}

interface Answer {
  question_id: string;
  answer_text: string;
  answer_value: number | null;
}

export function ClientDiaryForm() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<DiaryData | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  const today = todayISO();

  useEffect(() => {
    if (!token) {
      setError('Link inválido.');
      setLoading(false);
      return;
    }

    const load = async () => {
      const { data: result, error: rpcError } = await (supabase as any)
        .rpc('get_client_diary_data', { p_token: token, p_date: today });

      if (rpcError || !result) {
        setError('Não foi possível carregar o diário. Verifique se o link é válido.');
        setLoading(false);
        return;
      }

      if (result.error === 'invalid_token') {
        setError('Link de acesso inválido ou expirado. Solicite um novo convite.');
        setLoading(false);
        return;
      }

      if (result.error === 'no_active_diary') {
        setData(result);
        setLoading(false);
        return;
      }

      const diaryData = result as DiaryData;
      setData(diaryData);

      const existingMap = new Map(
        (diaryData.existing_answers ?? []).map(a => [a.question_id, a])
      );

      setAnswers(
        diaryData.questions.map(q => {
          const a = existingMap.get(q.id);
          return {
            question_id: q.id,
            answer_text: a?.answer_text ?? '',
            answer_value: a?.answer_value ?? null,
          };
        })
      );

      if (diaryData.today_entry_id) {
        setSaved(true);
      }

      setLoading(false);
    };

    load();
  }, [token, today]);

  const updateAnswer = (questionId: string, field: 'answer_text' | 'answer_value', value: string | number) => {
    setAnswers(prev =>
      prev.map(a => a.question_id === questionId ? { ...a, [field]: value } : a)
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!data || !token) return;
    setSaving(true);
    setError('');

    const payload = answers.map(a => ({
      question_id:  a.question_id,
      answer_text:  a.answer_text || null,
      answer_value: a.answer_value,
    }));

    if (editing && data.today_entry_id) {
      // Update existing entry
      const { data: result, error: rpcError } = await (supabase as any)
        .rpc('update_client_diary_entry', {
          p_token:    token,
          p_entry_id: data.today_entry_id,
          p_answers:  payload,
        });

      if (rpcError || !result || result.error) {
        setSaving(false);
        setError('Erro ao salvar. Tente novamente.');
        return;
      }
    } else {
      // New submission
      const { data: result, error: rpcError } = await (supabase as any)
        .rpc('submit_client_diary_entry', {
          p_token:    token,
          p_date:     today,
          p_diary_id: data.diary.id,
          p_answers:  payload,
        });

      if (rpcError || !result || result.error) {
        if (result?.error !== 'entry_exists') {
          setSaving(false);
          setError('Erro ao salvar. Tente novamente.');
          return;
        }
      }
    }

    setEditing(false);
    setSaved(true);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-beige-100 flex items-center justify-center p-6">
        <PageSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-beige-100 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardBody className="text-center py-10">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <h1 className="text-xl font-semibold text-dark font-serif mb-2">Ops</h1>
            <p className="text-sm text-dark/50 mb-6">{error}</p>
            {token && (
              <Link to={`/client/${token}`}>
                <Button variant="ghost">Voltar</Button>
              </Link>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!data?.diary) {
    return (
      <div className="min-h-screen bg-beige-100 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardBody className="text-center py-10">
            <BookOpen size={48} className="text-beige-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-dark/60">Nenhum diário ativo</h2>
            <p className="text-dark/40 text-sm mt-1">Aguarde sua terapeuta ativar um diário.</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-beige-100 p-6">
      <div className="max-w-lg mx-auto">
        <div className="mb-6 pt-4">
          <div className="flex items-center gap-2 text-petrol-700 text-sm mb-3">
            <KeyRound size={16} />
            Acesso por convite
          </div>
          <h1 className="text-2xl font-semibold text-dark font-serif">{data.diary.name}</h1>
          <p className="text-dark/50 text-sm mt-1 capitalize">{formatDateLong(today)}</p>
        </div>

        {saved && !editing ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-dark font-serif mb-2">
              Diário de hoje registrado!
            </h2>
            <p className="text-dark/50 text-sm capitalize">{formatDateLong(today)}</p>

            <div className="mt-6 bg-white rounded-xl border border-beige-300 p-4 text-left space-y-3">
              {data.questions.map((q, idx) => {
                const a = answers.find(a => a.question_id === q.id);
                return (
                  <div key={q.id}>
                    <div className="text-xs font-medium text-dark/40 mb-0.5">
                      {idx + 1}. {q.text}
                    </div>
                    <div className="text-sm text-dark">
                      {q.type === 'scale' && a?.answer_value !== null
                        ? <span className="font-semibold text-petrol-700">{a?.answer_value}/10</span>
                        : a?.answer_text || a?.answer_value?.toString() || '—'}
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              variant="ghost"
              className="mt-4 gap-2"
              onClick={() => setEditing(true)}
            >
              <Pencil size={14} />
              Editar registro
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {editing && (
              <p className="text-sm text-petrol-700 bg-petrol-50 rounded-lg px-4 py-2">
                Editando o registro de hoje. Suas respostas anteriores estão pré-preenchidas.
              </p>
            )}

            {data.questions.map((q, idx) => {
              const answer = answers.find(a => a.question_id === q.id);
              return (
                <Card key={q.id}>
                  <CardBody>
                    <div className="text-xs font-medium text-dark/40 mb-2">
                      {idx + 1} / {data.questions.length}
                    </div>
                    <label className="block text-sm font-medium text-dark mb-3">{q.text}</label>

                    {q.type === 'text' && (
                      <Textarea
                        placeholder="Escreva sua resposta..."
                        value={answer?.answer_text || ''}
                        onChange={(e) => updateAnswer(q.id, 'answer_text', e.target.value)}
                        rows={3}
                      />
                    )}
                    {q.type === 'number' && (
                      <Input
                        type="number"
                        placeholder="0"
                        value={answer?.answer_text || ''}
                        onChange={(e) => {
                          updateAnswer(q.id, 'answer_text', e.target.value);
                          updateAnswer(q.id, 'answer_value', parseFloat(e.target.value) || 0);
                        }}
                      />
                    )}
                    {q.type === 'scale' && (
                      <ScaleInput
                        value={answer?.answer_value ?? null}
                        onChange={(val) => updateAnswer(q.id, 'answer_value', val)}
                      />
                    )}
                  </CardBody>
                </Card>
              );
            })}

            {data.questions.length > 0 && (
              <div className="flex gap-3">
                {editing && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setEditing(false)}
                  >
                    Cancelar
                  </Button>
                )}
                <Button type="submit" loading={saving} size="lg" className="flex-1">
                  {editing ? 'Salvar alterações' : 'Salvar Registro do Dia'}
                </Button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
