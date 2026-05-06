import { useEffect, useState, FormEvent, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BookOpen, CheckCircle, Circle, ChevronRight, Pencil, Trash2, XCircle, Clock, X } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { formatDate } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { Diary, DiaryQuestion, QuestionType, EmotionOption } from '../../lib/database.types';

const TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Texto livre',
  number: 'Número',
  scale: 'Escala (1 a 10)',
  emotion: 'Escala de emoções',
};

const EMOJI_OPTIONS = [
  '😊','😄','😁','🥰','😍','🤩','😎','🤗',
  '😔','😢','😭','😞','😟','🥺','😕','😣',
  '😰','😨','😧','😦','😱','🫣','😬','😳',
  '😤','😡','😠','🤬','💢','😾','😒','🙄',
  '😌','😏','🤭','😶','😑','😐','🫤','😴',
  '🥱','😪','😫','🤒','🤕','🥴','🤔','🫠',
  '🥳','😇','🤓','🫡','💪','🙏','❤️','💔',
];

interface EditQuestion {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  options: EmotionOption[];
}

function normalizeType(type: string): QuestionType {
  if (['text', 'number', 'scale', 'emotion'].includes(type)) return type as QuestionType;
  return 'text';
}

export function Diaries() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});

  // Edit modal state
  const [editDiary, setEditDiary] = useState<Diary | null>(null);
  const [editName, setEditName] = useState('');
  const [editFrom, setEditFrom] = useState('');
  const [editTo, setEditTo] = useState('');
  const [editQuestions, setEditQuestions] = useState<EditQuestion[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Delete modal state
  const [deleteDiary, setDeleteDiary] = useState<Diary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!openPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpenPicker(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openPicker]);

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
    await supabase.from('diaries').update({ is_active: false }).neq('id', diary.id);
    const { data: updated } = await supabase
      .from('diaries').update({ is_active: true }).eq('id', diary.id).select('*').single();
    if (updated) setDiaries((prev) => prev.map((d) => d.id === diary.id ? updated : { ...d, is_active: false }));
    setToggling(null);
  };

  const deactivateDiary = async (diary: Diary) => {
    setToggling(diary.id);
    const { data: updated } = await supabase
      .from('diaries').update({ is_active: false }).eq('id', diary.id).select('*').single();
    if (updated) setDiaries((prev) => prev.map((d) => d.id === diary.id ? updated : d));
    setToggling(null);
  };

  const openEdit = async (diary: Diary) => {
    setEditDiary(diary);
    setEditName(diary.name);
    setEditFrom(diary.available_from ?? '');
    setEditTo(diary.available_to ?? '');
    setEditError('');
    setOpenPicker(null);
    const { data: qs } = await supabase
      .from('diary_questions')
      .select('*')
      .eq('diary_id', diary.id)
      .order('order_num', { ascending: true });
    setEditQuestions(((qs ?? []) as DiaryQuestion[]).map((q) => ({
      id: q.id,
      text: q.text,
      type: normalizeType(q.type),
      required: q.required ?? true,
      options: (q.options as EmotionOption[]) ?? [],
    })));
  };

  const updateEditQ = (idx: number, field: keyof EditQuestion, value: unknown) => {
    setEditQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== idx) return q;
        return { ...q, [field]: value };
      })
    );
  };

  const updateEditEmotion = (qIdx: number, eIdx: number, field: keyof EmotionOption, value: string) => {
    setEditQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? { ...q, options: q.options.map((e, j) => j === eIdx ? { ...e, [field]: value } : e) }
          : q
      )
    );
  };

  const removeEditEmotion = (qIdx: number, eIdx: number) => {
    setEditQuestions((prev) =>
      prev.map((q, i) => i === qIdx ? { ...q, options: q.options.filter((_, j) => j !== eIdx) } : q)
    );
  };

  const addEditEmotion = (qIdx: number) => {
    setEditQuestions((prev) =>
      prev.map((q, i) => i === qIdx ? { ...q, options: [...q.options, { emoji: '', label: '' }] } : q)
    );
  };

  const handleEditSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editDiary) return;
    setEditLoading(true);
    setEditError('');

    // Validate emotion questions
    for (const q of editQuestions) {
      if (q.type === 'emotion' && q.options.filter((o) => o.emoji && o.label).length < 2) {
        setEditError('Perguntas de emoção precisam ter pelo menos 2 opções preenchidas.');
        setEditLoading(false);
        return;
      }
    }

    const { data: updatedDiary, error: nameErr } = await supabase
      .from('diaries')
      .update({
        name: editName.trim(),
        available_from: editFrom || null,
        available_to: editTo || null,
      })
      .eq('id', editDiary.id)
      .select('*')
      .single();

    if (nameErr || !updatedDiary) {
      setEditError(nameErr?.message ?? 'Não foi possível atualizar o diário.');
      setEditLoading(false);
      return;
    }

    for (const q of editQuestions) {
      const { error: qErr } = await supabase
        .from('diary_questions')
        .update({
          text: q.text,
          type: q.type,
          required: q.required,
          options: q.type === 'emotion' ? q.options.filter((o) => o.emoji && o.label) : null,
        })
        .eq('id', q.id);
      if (qErr) {
        setEditError(qErr.message);
        setEditLoading(false);
        return;
      }
    }

    setDiaries((prev) => prev.map((d) => d.id === editDiary.id ? updatedDiary : d));
    setEditDiary(null);
    setEditLoading(false);
  };

  const openDelete = (diary: Diary) => { setDeleteDiary(diary); setDeleteError(''); };

  const handleDelete = async () => {
    if (!deleteDiary) return;
    if (deleteDiary.is_active) { setDeleteError('Desative o diário antes de excluir.'); return; }
    setDeleteLoading(true);
    setDeleteError('');

    const { data: deletedRows, error } = await supabase
      .from('diaries').delete().eq('id', deleteDiary.id).select('id');

    if (error || !deletedRows?.length) {
      setDeleteError(error?.message ?? 'Não foi possível confirmar a exclusão.');
      setDeleteLoading(false);
      return;
    }

    const deletedId = deleteDiary.id;
    setDeleteDiary(null);
    setDeleteLoading(false);
    setDiaries((prev) => prev.filter((d) => d.id !== deletedId));
    setQuestionCounts((prev) => { const { [deletedId]: _, ...rest } = prev; return rest; });
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
          <Button><Plus size={16} />Novo Diário</Button>
        </Link>
      </div>

      {diaries.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={40} />}
          title="Nenhum diário criado"
          description="Crie um diário estruturado para seus clientes"
          action={<Link to="/diaries/new"><Button><Plus size={16} />Criar Diário</Button></Link>}
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
                    {questionCounts[diary.id] ?? 0} pergunta{(questionCounts[diary.id] ?? 0) !== 1 ? 's' : ''}
                    {diary.available_from && ` · Das ${diary.available_from}${diary.available_to ? ` às ${diary.available_to}` : ''}`}
                    {' · '}Criado em {formatDate(diary.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {diary.is_active ? (
                    <Button variant="ghost" size="sm" loading={toggling === diary.id} onClick={() => deactivateDiary(diary)}>
                      <XCircle size={14} />Desativar
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" loading={toggling === diary.id} onClick={() => activateDiary(diary)}>
                      <Circle size={14} />Ativar
                    </Button>
                  )}
                  {diary.is_active && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <CheckCircle size={14} />Ativo
                    </span>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => openEdit(diary)}><Pencil size={14} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => openDelete(diary)}><Trash2 size={14} className="text-red-400" /></Button>
                  <Link to={`/diaries/${diary.id}`}>
                    <Button variant="ghost" size="sm"><ChevronRight size={14} /></Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={!!editDiary} onClose={() => setEditDiary(null)} title="Editar Diário" size="lg">
        <form onSubmit={handleEditSave} className="space-y-5">
          <Input
            label="Nome do diário"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
            autoFocus
          />

          {/* Availability */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-dark/40" />
              <span className="text-xs font-medium text-dark/60">Horário de disponibilidade (opcional)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-dark/40 mb-1 block">Das</label>
                <input
                  type="time"
                  value={editFrom}
                  onChange={(e) => setEditFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-beige-300 text-sm text-dark bg-white focus:outline-none focus:ring-2 focus:ring-petrol-400 transition-colors"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-dark/40 mb-1 block">Até</label>
                <input
                  type="time"
                  value={editTo}
                  onChange={(e) => setEditTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-beige-300 text-sm text-dark bg-white focus:outline-none focus:ring-2 focus:ring-petrol-400 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Questions */}
          {editQuestions.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-dark/80">Perguntas</p>
              {editQuestions.map((q, idx) => (
                <div key={q.id} className="border border-beige-200 rounded-xl p-3 space-y-2 bg-beige-50/40">
                  <div className="flex items-center gap-2 text-xs text-dark/40 font-medium mb-1">{idx + 1}.</div>
                  <input
                    type="text"
                    value={q.text}
                    onChange={(e) => updateEditQ(idx, 'text', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-beige-300 text-sm text-dark bg-white focus:outline-none focus:ring-2 focus:ring-petrol-400"
                    required
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={q.type}
                      onChange={(e) => updateEditQ(idx, 'type', e.target.value as QuestionType)}
                      className="flex-1 px-3 py-2 rounded-lg border border-beige-300 text-sm text-dark bg-white focus:outline-none focus:ring-2 focus:ring-petrol-400 transition-colors"
                    >
                      {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
                        <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1.5 shrink-0 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={(e) => updateEditQ(idx, 'required', e.target.checked)}
                        className="w-3.5 h-3.5 accent-petrol-600"
                      />
                      <span className="text-xs text-dark/50">Obrigatória</span>
                    </label>
                  </div>

                  {/* Emotion options editor */}
                  {q.type === 'emotion' && (
                    <div className="border border-beige-200 rounded-lg p-3 space-y-2 bg-white">
                      <p className="text-xs font-medium text-dark/50">Opções de emoção</p>
                      {q.options.map((opt, eIdx) => {
                        const pickerKey = `${idx}-${eIdx}`;
                        return (
                          <div key={eIdx} className="flex items-center gap-2">
                            <div className="relative" ref={openPicker === pickerKey ? pickerRef : null}>
                              <button
                                type="button"
                                onClick={() => setOpenPicker(openPicker === pickerKey ? null : pickerKey)}
                                className="w-12 h-9 text-center text-xl rounded-lg border border-beige-300 bg-white hover:border-petrol-400 focus:outline-none focus:ring-2 focus:ring-petrol-400 transition-colors"
                              >
                                {opt.emoji || '＋'}
                              </button>
                              {openPicker === pickerKey && (
                                <div className="absolute z-50 top-10 left-0 bg-white border border-beige-300 rounded-xl shadow-lg p-2 w-52">
                                  <div className="grid grid-cols-8 gap-0.5">
                                    {EMOJI_OPTIONS.map((em) => (
                                      <button
                                        key={em}
                                        type="button"
                                        onClick={() => { updateEditEmotion(idx, eIdx, 'emoji', em); setOpenPicker(null); }}
                                        className="text-xl w-6 h-6 flex items-center justify-center rounded hover:bg-beige-100 transition-colors"
                                      >
                                        {em}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <input
                              type="text"
                              value={opt.label}
                              onChange={(e) => updateEditEmotion(idx, eIdx, 'label', e.target.value)}
                              placeholder="Rótulo"
                              className="flex-1 px-3 py-1.5 rounded-lg border border-beige-300 text-sm text-dark bg-white focus:outline-none focus:ring-2 focus:ring-petrol-400"
                            />
                            <button type="button" onClick={() => removeEditEmotion(idx, eIdx)} className="text-dark/20 hover:text-red-400 transition-colors">
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => addEditEmotion(idx)}
                        className="flex items-center gap-1.5 text-xs text-petrol-600 hover:text-petrol-800 transition-colors mt-1"
                      >
                        <Plus size={13} />
                        Adicionar emoção
                      </button>
                    </div>
                  )}
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

      {/* Delete Modal */}
      <Modal open={!!deleteDiary} onClose={() => setDeleteDiary(null)} title="Excluir Diário" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-dark/70">Tem certeza? Esta ação não pode ser desfeita.</p>
          {deleteError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{deleteError}</div>
          )}
          <div className="flex gap-3">
            <Button variant="danger" loading={deleteLoading} onClick={handleDelete} className="flex-1">Excluir</Button>
            <Button variant="ghost" onClick={() => setDeleteDiary(null)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
