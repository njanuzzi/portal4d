import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import type { QuestionType } from '../../lib/database.types';

interface QuestionDraft {
  text: string;
  type: QuestionType;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Texto livre',
  number: 'Número',
  scale: 'Escala (1 a 10)',
};

export function NewDiary() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([{ text: '', type: 'text' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addQuestion = () => {
    if (questions.length >= 10) return;
    setQuestions((prev) => [...prev, { text: '', type: 'text' }]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: keyof QuestionDraft, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const filledQuestions = questions.filter((q) => q.text.trim());
    if (filledQuestions.length === 0) {
      setError('Adicione pelo menos uma pergunta.');
      return;
    }

    setLoading(true);

    const { data: diary, error: diaryErr } = await supabase
      .from('diaries')
      .insert({ name: name.trim(), is_active: false })
      .select()
      .single();

    if (diaryErr || !diary) {
      setError(diaryErr?.message ?? 'Erro ao criar diário.');
      setLoading(false);
      return;
    }

    const { error: qErr } = await supabase.from('diary_questions').insert(
      filledQuestions.map((q, idx) => ({
        diary_id: diary.id,
        text: q.text.trim(),
        type: q.type,
        order: idx,
      }))
    );

    if (qErr) {
      setError(qErr.message);
      setLoading(false);
      return;
    }

    navigate(`/diaries/${diary.id}`);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to="/diaries" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Diários
        </Link>
        <h1 className="text-2xl font-semibold text-dark font-serif">Novo Diário</h1>
        <p className="text-dark/50 text-sm mt-1">Defina o nome e as perguntas do diário</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardBody>
            <Input
              label="Nome do diário"
              placeholder="Ex: Diário de Acompanhamento Semanal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </CardBody>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-dark">
              Perguntas
              <span className="ml-2 text-dark/40 font-normal">({questions.length}/10)</span>
            </h2>
          </div>

          <div className="space-y-2">
            {questions.map((q, idx) => (
              <Card key={idx}>
                <CardBody className="space-y-3 py-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-beige-200 flex items-center justify-center text-xs font-medium text-dark/50 shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Texto da pergunta"
                        value={q.text}
                        onChange={(e) => updateQuestion(idx, 'text', e.target.value)}
                      />
                      <select
                        value={q.type}
                        onChange={(e) => updateQuestion(idx, 'type', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-beige-300 text-sm text-dark bg-white focus:outline-none focus:ring-2 focus:ring-petrol-400 focus:border-transparent transition-colors"
                      >
                        {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
                          <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeQuestion(idx)}
                      disabled={questions.length <= 1}
                      className="text-dark/20 hover:text-red-400 transition-colors disabled:opacity-30 mt-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {questions.length < 10 && (
            <button
              type="button"
              onClick={addQuestion}
              className="mt-3 flex items-center gap-2 text-sm text-petrol-700 hover:text-petrol-600 transition-colors font-medium"
            >
              <Plus size={15} />
              Adicionar pergunta
            </button>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="submit" loading={loading} className="flex-1">
            Criar Diário
          </Button>
          <Link to="/diaries">
            <Button type="button" variant="ghost">Cancelar</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
