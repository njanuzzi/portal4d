import { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BookOpen, CheckCircle, Circle, ChevronRight, Pencil, Trash2, XCircle } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { formatDate } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { Diary, DiaryQuestion, QuestionType } from '../../lib/database.types';

const TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Texto livre',
  number: 'Número',
  scale: 'Escala (1-10)',
};

interface EditQuestion {
  id: string;
  text: string;
  type: QuestionType;
}

export function Diaries() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});

  // Edit modal state
  const [editDiary, setEditDiary] = useState<Diary | null>(null);
  const [editName, setEditName] = useState('');
  const [editQuestions, setEditQuestions] = useState<EditQuestion[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete modal state
  const [deleteDiary, setDeleteDiary] = useState<Diary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('diaries')
      .select('*')
      .order('created_at', { ascending: false });

    const list: Diary[] = data ?? [];
    setDiaries(list);

    if (list.length > 0) {
      const { data: counts } = await supabase
        .from('diary_questions')
        .select('diary_id')
        .in('diary_id', list.map((d) => d.id));

      const map: Record<string, number> = {};
      list.forEach((d) => { map[d.id] = 0; });
      (counts ?? []).forEach((row) => { map[row.diary_id] = (map[row.diary_id] ?? 0) + 1; });
      setQuestionCounts(map);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const activateDiary = async (diary: Diary) => {
    setToggling(diary.id);
    const { error: err1 } = await supabase.from('diaries').update({ is_active: false }).neq('id', diary.id);
    if (err1) { setToggling(null); return; }
    const { error: err2 } = await supabase.from('diaries').update({ is_active: true }).eq('id', diary.id);
    if (err2) { setToggling(null); return; }
    setDiaries((prev) => prev.map((d) => ({ ...d, is_active: d.id === diary.id })));
    setToggling(null);
  };

  const deactivateDiary = async (diary: Diary) => {
    setToggling(diary.id);
    const { error } = await supabase.from('diaries').update({ is_active: false }).eq('id', diary.id);
    if (error) { setToggling(null); return; }
    setDiaries((prev) => prev.map((d) => d.id === diary.id ? { ...d, is_active: false } : d));
    setToggling(null);
  };

  const openEdit = async (diary: Diary) => {
    setEditDiary(diary);
    setEditName(diary.name);
    setEditError('');
    const { data: qs } = await supabase
      .from('diary_questions')
      .select('*')
      .eq('diary_id', diary.id)
      .order('order_num', { ascending: true });
    setEditQuestions((qs as DiaryQuestion[] ?? []).map((q) => ({ id: q.id, text: q.text, type: q.type })));
  };

  const handleEditSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editDiary) return;
    setEditLoading(true);
    setEditError('');

    const { error: nameErr } = await supabase
      .from('diaries')
      .update({ name: editName.trim() })
      .eq('id', editDiary.id);

    if (nameErr) {
      setEditError(nameErr.message);
      setEditLoading(false);
      return;
    }

    for (const q of editQuestions) {
      const { error: qErr } = await supabase
        .from('diary_questions')
        .update({ text: q.text, type: q.type })
        .eq('id', q.id);
      if (qErr) {
        setEditError(qErr.message);
        setEditLoading(false);
        return;
      }
    }

    setDiaries((prev) =>
      prev.map((d) => d.id === editDiary.id ? { ...d, name: editName.trim() } : d)
    );
    setEditDiary(null);
    setEditLoading(false);
  };

  const openDelete = (diary: Diary) => {
    setDeleteDiary(diary);
    setDeleteError('');
  };

  const handleDelete = async () => {
    if (!deleteDiary) return;
    if (deleteDiary.is_active) {
      setDeleteError('Desative o diário antes de excluir.');
      return;
    }
    setDeleteLoading(true);
    setDeleteError('');

    const { error } = await supabase.from('diaries').delete().eq('id', deleteDiary.id);
    if (error) {
      setDeleteError(error.message);
      setDeleteLoading(false);
      return;
    }

    const deletedId = deleteDiary.id;
    setDeleteDiary(null);
    setDeleteLoading(false);
    setDiaries((prev) => prev.filter((d) => d.id !== deletedId));
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-dark font-serif">Diários</h1>
          <p className="text-dark/50 text-sm mt-1">Apenas um diário pode estar ativo por vez</p>
        </div>
        <Link to="/diaries/new">
          <Button>
            <Plus size={16} />
            Novo Diário
          </Button>
        </Link>
      </div>

      {diaries.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={40} />}
          title="Nenhum diário criado"
          description="Crie um diário estruturado para seus clientes"
          action={
            <Link to="/diaries/new">
              <Button><Plus size={16} />Criar Diário</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {diaries.map((diary) => (
            <Card key={diary.id} className={diary.is_active ? 'border-petrol-300 ring-1 ring-petrol-200' : ''}>
              <CardBody className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${diary.is_active ? 'bg-petrol-100' : 'bg-beige-200'}`}>
                  <BookOpen size={18} className={diary.is_active ? 'text-petrol-700' : 'text-dark/40'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-dark text-sm">{diary.name}</span>
                    {diary.is_active && <Badge variant="success">Ativo</Badge>}
                  </div>
                  <div className="text-xs text-dark/40 mt-0.5">
                    {questionCounts[diary.id] ?? 0} pergunta{(questionCounts[diary.id] ?? 0) !== 1 ? 's' : ''} · Criado em {formatDate(diary.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {diary.is_active ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={toggling === diary.id}
                      onClick={() => deactivateDiary(diary)}
                    >
                      <XCircle size={14} />
                      Desativar
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={toggling === diary.id}
                      onClick={() => activateDiary(diary)}
                    >
                      <Circle size={14} />
                      Ativar
                    </Button>
                  )}
                  {diary.is_active && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <CheckCircle size={14} />
                      Ativo
                    </span>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => openEdit(diary)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openDelete(diary)}>
                    <Trash2 size={14} className="text-red-400" />
                  </Button>
                  <Link to={`/diaries/${diary.id}`}>
                    <Button variant="ghost" size="sm">
                      <ChevronRight size={14} />
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={!!editDiary} onClose={() => setEditDiary(null)} title="Editar Diário" size="md">
        <form onSubmit={handleEditSave} className="space-y-4">
          <Input
            label="Nome do diário"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
            autoFocus
          />

          {editQuestions.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-dark/80">Perguntas</p>
              {editQuestions.map((q, idx) => (
                <div key={q.id} className="flex gap-2 items-start">
                  <span className="w-5 text-xs text-dark/40 pt-2.5 shrink-0">{idx + 1}.</span>
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={q.text}
                      onChange={(e) => {
                        const updated = [...editQuestions];
                        updated[idx] = { ...updated[idx], text: e.target.value };
                        setEditQuestions(updated);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-beige-300 text-sm text-dark bg-white focus:outline-none focus:ring-2 focus:ring-petrol-400"
                      required
                    />
                    <select
                      value={q.type}
                      onChange={(e) => {
                        const updated = [...editQuestions];
                        updated[idx] = { ...updated[idx], type: e.target.value as QuestionType };
                        setEditQuestions(updated);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-beige-300 text-xs text-dark/70 bg-white focus:outline-none focus:ring-2 focus:ring-petrol-400"
                    >
                      {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
                        <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {editError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {editError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={editLoading} className="flex-1">Salvar</Button>
            <Button type="button" variant="ghost" onClick={() => setEditDiary(null)}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteDiary} onClose={() => setDeleteDiary(null)} title="Excluir Diário" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-dark/70">
            Tem certeza? Esta ação não pode ser desfeita.
          </p>
          {deleteError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {deleteError}
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="danger" loading={deleteLoading} onClick={handleDelete} className="flex-1">
              Excluir
            </Button>
            <Button variant="ghost" onClick={() => setDeleteDiary(null)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
