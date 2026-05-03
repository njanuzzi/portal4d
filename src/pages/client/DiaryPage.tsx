import { useEffect, useState, FormEvent } from 'react';
import { CheckCircle, BookOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { ScaleInput } from '../../components/ui/ScaleInput';
import { Input } from '../../components/ui/Input';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDateLong, todayISO } from '../../lib/format';
import type { Diary, DiaryQuestion, DiaryEntry } from '../../lib/database.types';

interface Answer {
  question_id: string;
  answer_text: string;
  answer_value: number | null;
}

export function DiaryPage() {
  const { user } = useAuth();
  const [diary, setDiary] = useState<Diary | null>(null);
  const [questions, setQuestions] = useState<DiaryQuestion[]>([]);
  const [todayEntry, setTodayEntry] = useState<DiaryEntry | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const today = todayISO();

  useEffect(() => {
    const load = async () => {
      const [{ data: activeDiary }, { data: entry }] = await Promise.all([
        supabase.from('diaries').select('id, name, is_active, created_at').eq('is_active', true).maybeSingle(),
        supabase.from('diary_entries').select('*').eq('user_id', user!.id).eq('date', today).maybeSingle(),
      ]);

      setDiary(activeDiary);
      setTodayEntry(entry);

      if (activeDiary) {
        const { data: qs } = await supabase
          .from('diary_questions')
          .select('*')
          .eq('diary_id', activeDiary.id)
          .order('order_num');

        const loadedQuestions = qs || [];
        setQuestions(loadedQuestions);

        if (entry) {
          // Load existing answers
          const { data: existingAnswers } = await supabase
            .from('entry_answers')
            .select('*')
            .eq('entry_id', entry.id);
          setAnswers(
            loadedQuestions.map(q => {
              const a = existingAnswers?.find(a => a.question_id === q.id);
              return {
                question_id: q.id,
                answer_text: a?.answer_text || '',
                answer_value: a?.answer_value ?? null,
              };
            })
          );
          setSaved(true);
        } else {
          setAnswers(loadedQuestions.map(q => ({ question_id: q.id, answer_text: '', answer_value: null })));
        }
      }

      setLoading(false);
    };
    load();
  }, [user, today]);

  const updateAnswer = (questionId: string, field: 'answer_text' | 'answer_value', value: string | number) => {
    setAnswers(prev =>
      prev.map(a => a.question_id === questionId ? { ...a, [field]: value } : a)
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!diary) return;
    setSaving(true);

    // Create entry
    const { data: entry, error: entryError } = await supabase
      .from('diary_entries')
      .insert({ user_id: user!.id, diary_id: diary.id, date: today })
      .select()
      .single();

    if (entryError) {
      setSaving(false);
      return;
    }

    // Save answers
    await supabase.from('entry_answers').insert(
      answers.map(a => ({
        entry_id: entry.id,
        question_id: a.question_id,
        answer_text: a.answer_text || null,
        answer_value: a.answer_value,
      }))
    );

    setTodayEntry(entry);
    setSaved(true);
    setSaving(false);
  };

  if (loading) return <PageSpinner />;

  if (!diary) {
    return (
      <div className="text-center py-16">
        <BookOpen size={48} className="text-beige-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-dark/60">Nenhum diário ativo</h2>
        <p className="text-dark/40 text-sm mt-1">Aguarde sua terapeuta ativar um diário</p>
      </div>
    );
  }

  if (saved && todayEntry) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-semibold text-dark font-serif mb-2">Diário de hoje registrado!</h2>
        <p className="text-dark/50 text-sm capitalize">{formatDateLong(today)}</p>
        <div className="mt-6 bg-white rounded-xl border border-beige-300 p-4 text-left space-y-3 max-w-sm mx-auto">
          {questions.map((q, idx) => {
            const a = answers.find(a => a.question_id === q.id);
            return (
              <div key={q.id}>
                <div className="text-xs font-medium text-dark/40 mb-0.5">{idx + 1}. {q.text}</div>
                <div className="text-sm text-dark">
                  {q.type === 'scale' && a?.answer_value !== null
                    ? <span className="font-semibold text-petrol-700">{a?.answer_value}/10</span>
                    : a?.answer_text || a?.answer_value?.toString() || '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-dark font-serif">{diary.name}</h1>
        <p className="text-dark/50 text-sm mt-1 capitalize">{formatDateLong(today)}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {questions.map((q, idx) => {
          const answer = answers.find(a => a.question_id === q.id);
          return (
            <Card key={q.id}>
              <CardBody>
                <div className="text-xs font-medium text-dark/40 mb-2">
                  {idx + 1} / {questions.length}
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

        {questions.length > 0 && (
          <Button type="submit" loading={saving} size="lg" className="w-full">
            Salvar Registro do Dia
          </Button>
        )}
      </form>
    </div>
  );
}
