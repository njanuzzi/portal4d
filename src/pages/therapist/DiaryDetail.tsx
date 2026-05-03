import { useEffect, useState, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { MOCK_DIARIES, MOCK_QUESTIONS } from '../../lib/mockData';
import type { Diary, DiaryQuestion, QuestionType } from '../../lib/database.types';

export function DiaryDetail() {
  const { id } = useParams<{ id: string }>();
  const [diary, setDiary] = useState<Diary | null>(null);
  const [questions, setQuestions] = useState<DiaryQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingQ, setAddingQ] = useState(false);
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<QuestionType>('text');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    setDiary(MOCK_DIARIES.find(d => d.id === id) || null);
    setQuestions(MOCK_QUESTIONS.filter(q => q.diary_id === id).sort((a, b) => a.order - b.order));
    setLoading(false);
  }, [id]);

  const addQuestion = (e: FormEvent) => {
    e.preventDefault();
    if (!qText.trim()) return;
    setSaving(true);
    setTimeout(() => {
      const newQ: DiaryQuestion = {
        id: `dev-q-${Date.now()}`,
        diary_id: id!,
        order: questions.length,
        text: qText.trim(),
        type: qType,
        created_at: new Date().toISOString(),
      };
      MOCK_QUESTIONS.push(newQ);
      setQuestions(prev => [...prev, newQ]);
      setQText('');
      setQType('text');
      setAddingQ(false);
      setSaving(false);
    }, 300);
  };

  const deleteQuestion = (qId: string) => {
    setDeleting(qId);
    setTimeout(() => {
      const idx = MOCK_QUESTIONS.findIndex(q => q.id === qId);
      if (idx !== -1) MOCK_QUESTIONS.splice(idx, 1);
      setQuestions(prev => prev.filter(q => q.id !== qId));
      setDeleting(null);
    }, 300);
  };

  const typeLabels: Record<QuestionType, string> = {
    text: 'Texto livre',
    number: 'Número',
    scale: 'Escala (1-10)',
  };

  if (loading) return <PageSpinner />;
  if (!diary) return <div className="p-6"><p className="text-dark/50">Diário não encontrado.</p></div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to="/diaries" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Diários
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-dark font-serif">{diary.name}</h1>
          {diary.is_active && <Badge variant="success">Ativo</Badge>}
        </div>
        <p className="text-dark/50 text-sm mt-1">{questions.length} pergunta{questions.length !== 1 ? 's' : ''}</p>
      </div>

      {questions.length === 0 ? (
        <EmptyState
          title="Nenhuma pergunta adicionada"
          description="Adicione perguntas para montar o diário"
          action={
            <Button onClick={() => setAddingQ(true)}>
              <Plus size={16} />
              Adicionar Pergunta
            </Button>
          }
        />
      ) : (
        <div className="space-y-2 mb-4">
          {questions.map((q, idx) => (
            <Card key={q.id}>
              <CardBody className="flex items-center gap-3 py-3">
                <GripVertical size={16} className="text-dark/20 shrink-0" />
                <div className="w-6 h-6 rounded-full bg-beige-200 flex items-center justify-center text-xs font-medium text-dark/50 shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-dark">{q.text}</div>
                  <div className="text-xs text-dark/40 mt-0.5">{typeLabels[q.type]}</div>
                </div>
                <button
                  onClick={() => deleteQuestion(q.id)}
                  disabled={deleting === q.id}
                  className="text-dark/20 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={15} />
                </button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {addingQ ? (
        <Card className="border-petrol-200">
          <CardBody>
            <form onSubmit={addQuestion} className="space-y-4">
              <Input
                label="Texto da pergunta"
                placeholder="Ex: Como você está se sentindo hoje?"
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                required
                autoFocus
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-dark/80">Tipo de resposta</label>
                <select
                  value={qType}
                  onChange={(e) => setQType(e.target.value as QuestionType)}
                  className="px-3 py-2.5 rounded-lg border border-beige-300 text-sm text-dark bg-white focus:outline-none focus:ring-2 focus:ring-petrol-400"
                >
                  <option value="text">Texto livre</option>
                  <option value="number">Número</option>
                  <option value="scale">Escala (1 a 10)</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" loading={saving} size="sm">Adicionar</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setAddingQ(false)}>Cancelar</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : (
        questions.length > 0 && (
          <Button variant="ghost" onClick={() => setAddingQ(true)}>
            <Plus size={16} />
            Adicionar Pergunta
          </Button>
        )
      )}
    </div>
  );
}
