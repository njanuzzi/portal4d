import { useEffect, useState, FormEvent } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, BookOpen, ArrowLeft, PenLine, Clock, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { ScaleInput } from '../../components/ui/ScaleInput';
import { Input } from '../../components/ui/Input';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDateLong } from '../../lib/format';
import type { Diary, DiaryQuestion, DiaryEntry, DayNote } from '../../lib/database.types';

// ── Fixed emotion list for notes ──────────────────────────────────────────────

interface FixedEmotion { emoji: string; label: string; }

const FIXED_EMOTIONS: FixedEmotion[] = [
  { emoji: '😊', label: 'Alegria' },
  { emoji: '😢', label: 'Tristeza' },
  { emoji: '😠', label: 'Raiva' },
  { emoji: '😨', label: 'Medo' },
  { emoji: '😰', label: 'Ansiedade' },
  { emoji: '😌', label: 'Calma' },
  { emoji: '😣', label: 'Culpa' },
  { emoji: '😳', label: 'Vergonha' },
  { emoji: '❤️', label: 'Amor' },
  { emoji: '😤', label: 'Frustração' },
  { emoji: '😑', label: 'Tédio' },
  { emoji: '🙏', label: 'Gratidão' },
  { emoji: '😞', label: 'Solidão' },
  { emoji: '✨', label: 'Esperança' },
];

interface SelectedEmotion { label: string; intensity: number; }

// ── Diary answer types ────────────────────────────────────────────────────────

interface Answer {
  question_id: string;
  answer_text: string;
  answer_value: number | null;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toLocalISODate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function currentHHMM() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function isDiaryAvailable(from: string | null, to: string | null): boolean {
  if (!from && !to) return true;
  const now = currentHHMM();
  const f = from ?? '00:00';
  const t = to ?? '23:59';
  if (f <= t) return now >= f && now <= t;
  return now >= f || now <= t; // crosses midnight
}

function isValidISODate(date: string) {
  if (!ISO_DATE_PATTERN.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00`);
  return toLocalISODate(parsed) === date;
}

function resolveDiaryDate(dateParam: string | null) {
  const today = toLocalISODate();
  if (!dateParam || !isValidISODate(dateParam)) return today;
  return dateParam > today ? today : dateParam;
}

function formatTime(isoString: string) {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

type Tab = 'notes' | 'diary';

export function DiaryPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const diaryDate = resolveDiaryDate(searchParams.get('date'));
  const isToday = diaryDate === toLocalISODate();

  const [activeTab, setActiveTab] = useState<Tab>(isToday ? 'notes' : 'diary');

  // Diary state
  const [diary, setDiary] = useState<Diary | null>(null);
  const [questions, setQuestions] = useState<DiaryQuestion[]>([]);
  const [todayEntry, setTodayEntry] = useState<DiaryEntry | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<DayNote[]>([]);
  const [noteContent, setNoteContent] = useState('');
  const [selectedEmotions, setSelectedEmotions] = useState<SelectedEmotion[]>([]);
  const [savingNote, setSavingNote] = useState(false);

  // Goal state
  interface ClientGoal { id: string; goal_text: string; entry_count_at_creation: number; }
  const [currentGoal, setCurrentGoal] = useState<ClientGoal | null>(null);
  const [totalEntries, setTotalEntries] = useState(0);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalPhase, setGoalPhase] = useState<'new' | 'renew'>('new');
  const [goalDraft, setGoalDraft] = useState('');
  const [keepingGoal, setKeepingGoal] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);

  // ── Load diary + notes ──────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setDiary(null);
      setQuestions([]);
      setTodayEntry(null);
      setAnswers([]);
      setSaved(false);

      const [{ data: activeDiary }, { data: entry }, { data: dayNotes }, { data: goalRows }, { count: entryCount }] = await Promise.all([
        supabase.from('diaries').select('*').eq('is_active', true).maybeSingle(),
        supabase.from('diary_entries').select('*').eq('user_id', user!.id).eq('date', diaryDate).maybeSingle(),
        supabase
          .from('day_notes')
          .select('*')
          .eq('user_id', user!.id)
          .gte('noted_at', `${diaryDate}T00:00:00`)
          .lte('noted_at', `${diaryDate}T23:59:59`)
          .order('noted_at', { ascending: true }),
        supabase.from('client_goals').select('id, goal_text, entry_count_at_creation')
          .eq('user_id', user!.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('diary_entries').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      ]);

      const latestGoal = goalRows?.[0] ?? null;
      const total = entryCount ?? 0;
      setCurrentGoal(latestGoal);
      setTotalEntries(total);

      // Determine if goal form should show (only for today)
      if (diaryDate === toLocalISODate()) {
        if (!latestGoal) {
          setGoalPhase('new');
          setGoalDraft('');
          setShowGoalForm(true);
        } else {
          const entriesSinceGoal = total - latestGoal.entry_count_at_creation;
          if (entriesSinceGoal >= 7) {
            setGoalPhase('renew');
            setGoalDraft(latestGoal.goal_text); // pre-fill with previous so client can keep or edit
            setKeepingGoal(false);
            setShowGoalForm(true);
          } else {
            setShowGoalForm(false);
          }
        }
      } else {
        setShowGoalForm(false);
      }

      setDiary(activeDiary);
      setTodayEntry(entry);
      setNotes((dayNotes as DayNote[]) || []);

      if (activeDiary) {
        const { data: qs } = await supabase
          .from('diary_questions')
          .select('*')
          .eq('diary_id', activeDiary.id)
          .order('order_num');

        const loadedQuestions = qs || [];
        setQuestions(loadedQuestions);

        if (entry) {
          const { data: existingAnswers } = await supabase
            .from('entry_answers')
            .select('*')
            .eq('entry_id', entry.id);
          setAnswers(
            loadedQuestions.map(q => {
              const a = existingAnswers?.find(a => a.question_id === q.id);
              return { question_id: q.id, answer_text: a?.answer_text || '', answer_value: a?.answer_value ?? null };
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
  }, [user, diaryDate]);

  // ── Notes actions ───────────────────────────────────────────────────────────

  const toggleEmotion = (label: string) => {
    setSelectedEmotions(prev => {
      const exists = prev.find(e => e.label === label);
      if (exists) return prev.filter(e => e.label !== label);
      return [...prev, { label, intensity: 5 }];
    });
  };

  const setIntensity = (label: string, intensity: number) => {
    setSelectedEmotions(prev => prev.map(e => e.label === label ? { ...e, intensity } : e));
  };

  const handleSaveNote = async () => {
    if (!noteContent.trim() && selectedEmotions.length === 0) return;
    setSavingNote(true);
    const { data: note } = await supabase
      .from('day_notes')
      .insert({
        user_id: user!.id,
        noted_at: new Date().toISOString(),
        content: noteContent.trim() || null,
        emotions: selectedEmotions,
      })
      .select()
      .single();
    if (note) {
      setNotes(prev => [...prev, note as DayNote]);
      setNoteContent('');
      setSelectedEmotions([]);
    }
    setSavingNote(false);
  };

  // ── Goal submit ─────────────────────────────────────────────────────────────

  const handleGoalSubmit = async () => {
    const text = goalDraft.trim();
    if (!text) return;
    setSavingGoal(true);
    const { data: newGoal } = await supabase
      .from('client_goals')
      .insert({
        user_id: user!.id,
        goal_text: text,
        entry_count_at_creation: totalEntries,
      })
      .select('id, goal_text, entry_count_at_creation')
      .single();
    if (newGoal) {
      setCurrentGoal(newGoal as ClientGoal);
      setShowGoalForm(false);
      setGoalDraft('');
      setKeepingGoal(false);
    }
    setSavingGoal(false);
  };

  // ── Diary submit ────────────────────────────────────────────────────────────

  const updateAnswer = (questionId: string, field: 'answer_text' | 'answer_value', value: string | number) => {
    setAnswers(prev => prev.map(a => a.question_id === questionId ? { ...a, [field]: value } : a));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!diary) return;

    // Validate required questions
    for (const q of questions) {
      if (!q.required) continue;
      const a = answers.find(a => a.question_id === q.id);
      const hasValue = q.type === 'scale' ? a?.answer_value !== null : !!a?.answer_text?.trim();
      if (!hasValue) {
        alert(`A pergunta "${q.text}" é obrigatória.`);
        return;
      }
    }

    setSaving(true);
    if (!isValidISODate(diaryDate) || diaryDate > toLocalISODate()) { setSaving(false); return; }

    const { data: entry, error: entryError } = await supabase
      .from('diary_entries')
      .insert({ user_id: user!.id, diary_id: diary.id, date: diaryDate })
      .select()
      .single();

    if (entryError) { setSaving(false); return; }

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

  // ── Render ──────────────────────────────────────────────────────────────────

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

  const available = isDiaryAvailable(diary.available_from, diary.available_to);

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-dark font-serif">{diary.name}</h1>
        <p className="text-dark/50 text-sm mt-1 capitalize">{formatDateLong(diaryDate)}</p>
      </div>

      {/* ── Goal Form — blocks diary access until goal is set ── */}
      {showGoalForm && (
        <Card className="border-2 border-gold-300">
          <CardBody className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center shrink-0">
                <Target size={20} className="text-gold-600" />
              </div>
              <div>
                <h2 className="font-semibold text-dark font-serif">
                  {goalPhase === 'new' ? 'Qual é a sua meta desta semana?' : 'Hora de renovar sua meta!'}
                </h2>
                <p className="text-xs text-dark/50 mt-0.5">
                  {goalPhase === 'new'
                    ? 'Defina uma intenção que guiará suas reflexões nos próximos 7 registros.'
                    : 'Você completou mais um ciclo de 7 registros. Parabéns! Renove ou ajuste sua meta.'}
                </p>
              </div>
            </div>

            {/* Previous goal (renew only) */}
            {goalPhase === 'renew' && currentGoal && (
              <div className="bg-beige-100 rounded-lg p-3 border border-beige-200">
                <p className="text-xs font-medium text-dark/40 mb-1">Sua meta do ciclo anterior</p>
                <p className="text-sm text-dark/70">{currentGoal.goal_text}</p>
              </div>
            )}

            {/* Textarea */}
            <div>
              <Textarea
                placeholder={
                  goalPhase === 'new'
                    ? 'Ex: Quero praticar parar e respirar antes de reagir às situações difíceis.'
                    : 'Edite ou mantenha sua meta para os próximos 7 registros...'
                }
                value={goalDraft}
                onChange={e => setGoalDraft(e.target.value.slice(0, 300))}
                rows={4}
              />
              <div className="flex justify-end mt-1">
                <span className="text-xs text-dark/30">{goalDraft.length}/300</span>
              </div>
            </div>

            <Button
              onClick={handleGoalSubmit}
              loading={savingGoal}
              disabled={!goalDraft.trim()}
              className="w-full"
            >
              {goalPhase === 'new' ? 'Definir minha meta' : 'Confirmar meta'}
            </Button>
          </CardBody>
        </Card>
      )}

      {/* ── Rest of page (hidden while goal form is open) ── */}
      {!showGoalForm && (
        <>
          {/* Current goal reminder */}
          {currentGoal && isToday && (
            <div className="flex items-start gap-2.5 bg-gold-50 border border-gold-200 rounded-xl p-3 mb-4">
              <Target size={14} className="text-gold-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-gold-700 mb-0.5">Meta desta semana</p>
                <p className="text-sm text-dark/70 leading-snug">{currentGoal.goal_text}</p>
              </div>
            </div>
          )}

      {/* Tabs — only show for today */}
      {isToday && (
        <div className="flex gap-1 bg-beige-100 rounded-xl p-1 mb-5">
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'notes'
                ? 'bg-white text-dark shadow-sm'
                : 'text-dark/50 hover:text-dark/70'
            }`}
          >
            <PenLine size={15} />
            Anotações
          </button>
          <button
            onClick={() => setActiveTab('diary')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'diary'
                ? 'bg-white text-dark shadow-sm'
                : 'text-dark/50 hover:text-dark/70'
            }`}
          >
            <BookOpen size={15} />
            Diário
            {saved && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
          </button>
        </div>
      )}

      {/* ── Aba Anotações ── */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          {/* Past notes for the day */}
          {notes.length > 0 && (
            <div className="space-y-3">
              {notes.map(note => (
                <Card key={note.id} className="border-beige-200">
                  <CardBody className="py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={12} className="text-dark/30" />
                      <span className="text-xs text-dark/40">{formatTime(note.noted_at)}</span>
                    </div>
                    {note.content && (
                      <p className="text-sm text-dark mb-2">{note.content}</p>
                    )}
                    {note.emotions && note.emotions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {note.emotions.map((em, i) => {
                          const fixed = FIXED_EMOTIONS.find(f => f.label === em.label);
                          return (
                            <span key={i} className="inline-flex items-center gap-1 bg-petrol-50 text-petrol-700 text-xs font-medium px-2 py-1 rounded-full">
                              {fixed?.emoji} {em.label}
                              <span className="ml-0.5 bg-petrol-100 text-petrol-600 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">{em.intensity}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>
          )}

          {/* New note form */}
          <Card>
            <CardBody className="space-y-4">
              <Textarea
                placeholder="O que está acontecendo agora?"
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                rows={4}
              />

              <div>
                <p className="text-xs font-medium text-dark/50 mb-3">Como você está se sentindo?</p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {FIXED_EMOTIONS.map(em => {
                    const sel = selectedEmotions.find(s => s.label === em.label);
                    return (
                      <button
                        key={em.label}
                        type="button"
                        onClick={() => toggleEmotion(em.label)}
                        className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border-2 transition-all ${
                          sel
                            ? 'border-petrol-500 bg-petrol-50 shadow-sm scale-105'
                            : 'border-beige-300 bg-white hover:border-petrol-300'
                        }`}
                      >
                        <span className="text-2xl leading-none">{em.emoji}</span>
                        <span className={`text-[10px] font-medium text-center leading-tight ${sel ? 'text-petrol-700' : 'text-dark/50'}`}>
                          {em.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Intensity for selected emotions */}
                {selectedEmotions.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <p className="text-xs font-medium text-dark/50">Intensidade <span className="text-dark/30 font-normal">(1 = pouco • 10 = muito)</span></p>
                    {selectedEmotions.map(sel => {
                      const fixed = FIXED_EMOTIONS.find(f => f.label === sel.label);
                      return (
                        <div key={sel.label} className="flex items-center gap-3">
                          <span className="text-sm text-dark/70 w-24 shrink-0">
                            {fixed?.emoji} {sel.label}
                          </span>
                          <div className="flex gap-1 flex-1">
                            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setIntensity(sel.label, n)}
                                className={`flex-1 h-7 rounded text-xs font-medium transition-all ${
                                  sel.intensity === n
                                    ? 'bg-petrol-500 text-white shadow-sm'
                                    : 'bg-beige-100 text-dark/50 hover:bg-petrol-100'
                                }`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Button
                onClick={handleSaveNote}
                loading={savingNote}
                disabled={!noteContent.trim() && selectedEmotions.length === 0}
                className="w-full"
              >
                Salvar anotação
              </Button>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ── Aba Diário ── */}
      {activeTab === 'diary' && (
        <>
          {/* Success state */}
          {saved && todayEntry ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-semibold text-dark font-serif mb-2">
                {isToday ? 'Diário de hoje registrado!' : 'Diário registrado!'}
              </h2>
              <p className="text-dark/50 text-sm capitalize">{formatDateLong(diaryDate)}</p>
              <div className="mt-6 bg-white rounded-xl border border-beige-300 p-4 text-left space-y-3 max-w-sm mx-auto">
                {questions.map((q, idx) => {
                  const a = answers.find(a => a.question_id === q.id);
                  return (
                    <div key={q.id}>
                      <div className="text-xs font-medium text-dark/40 mb-0.5">{idx + 1}. {q.text}</div>
                      <div className="text-sm text-dark">
                        {q.type === 'scale' && a?.answer_value !== null ? (
                          <span className="font-semibold text-petrol-700">{a?.answer_value}/10</span>
                        ) : q.type === 'emotion' && a?.answer_text ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {a.answer_text.split('|').map(s => s.trim()).filter(Boolean).map(v => (
                              <span key={v} className="inline-flex items-center gap-1 bg-petrol-50 text-petrol-700 text-xs font-medium px-2 py-1 rounded-full">{v}</span>
                            ))}
                          </div>
                        ) : (
                          a?.answer_text || a?.answer_value?.toString() || '—'
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {!isToday && (
                <div className="mt-6">
                  <Link to="/diary/history" className="inline-flex items-center gap-2 text-sm text-petrol-600 hover:text-petrol-800 transition-colors">
                    <ArrowLeft size={15} />
                    Voltar para o histórico
                  </Link>
                </div>
              )}
            </div>
          ) : !available && isToday ? (
            /* Blocked by availability window */
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <Clock size={32} className="text-amber-600" />
              </div>
              <h2 className="text-lg font-semibold text-dark mb-2">Diário ainda não disponível</h2>
              <p className="text-dark/50 text-sm max-w-xs mx-auto">
                O Diário abre às{' '}
                <span className="font-semibold text-dark/70">{diary.available_from}</span>
                {diary.available_to && (
                  <> e fecha às <span className="font-semibold text-dark/70">{diary.available_to}</span></>
                )}.
              </p>
              <p className="text-dark/40 text-sm mt-3">
                Use as <button onClick={() => setActiveTab('notes')} className="text-petrol-600 underline underline-offset-2">Anotações do Dia</button> para registrar o que está acontecendo agora.
              </p>
            </div>
          ) : (
            /* Diary form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {questions.map((q, idx) => {
                const answer = answers.find(a => a.question_id === q.id);
                return (
                  <Card key={q.id}>
                    <CardBody>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-dark/40">{idx + 1} / {questions.length}</span>
                        {!q.required && <span className="text-xs text-dark/30">Opcional</span>}
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
                      {q.type === 'emotion' && q.options && q.options.length > 0 && (
                        <div>
                          <p className="text-xs text-dark/40 mb-2">Selecione quantas quiser</p>
                          <div className="flex flex-wrap gap-2">
                            {q.options.map((opt) => {
                              const value = `${opt.emoji} ${opt.label}`;
                              const selected = (answer?.answer_text || '').split('|').map(s => s.trim()).includes(value);
                              const toggle = () => {
                                const current = (answer?.answer_text || '').split('|').map(s => s.trim()).filter(Boolean);
                                const next = selected ? current.filter(v => v !== value) : [...current, value];
                                updateAnswer(q.id, 'answer_text', next.join(' | '));
                              };
                              return (
                                <button
                                  key={opt.label}
                                  type="button"
                                  onClick={toggle}
                                  className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 transition-all ${
                                    selected
                                      ? 'border-petrol-500 bg-petrol-50 shadow-sm scale-105'
                                      : 'border-beige-300 bg-white hover:border-petrol-300'
                                  }`}
                                >
                                  <span className="text-2xl leading-none">{opt.emoji}</span>
                                  <span className={`text-xs font-medium ${selected ? 'text-petrol-700' : 'text-dark/60'}`}>{opt.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
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
          )}
        </>
      )}
        </>
      )}
    </div>
  );
}
