import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, BookOpen, PenLine, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card, CardBody } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDateLong } from '../../lib/format';
import type { Profile, DiaryEntry, EntryAnswer, DiaryQuestion, Diary, DayNote } from '../../lib/database.types';

interface EntryWithDetails extends DiaryEntry {
  diary: Diary;
  answers: (EntryAnswer & { question: DiaryQuestion })[];
}

interface NoteEmotion { label: string; intensity: number; }

const EMOTION_EMOJIS: Record<string, string> = {
  Alegria: '😊', Tristeza: '😢', Raiva: '😠', Medo: '😨',
  Ansiedade: '😰', Calma: '😌', Culpa: '😣', Vergonha: '😳',
  Amor: '❤️', Frustração: '😤', Tédio: '😑', Gratidão: '🙏',
  Solidão: '😞', Esperança: '✨',
};

function formatTime(isoString: string) {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function toLocalISODate(isoString: string) {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Tab = 'diary' | 'notes';

export function ClientEntries() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<EntryWithDetails[]>([]);
  const [notes, setNotes] = useState<DayNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Tab>('diary');

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      const [{ data: profile }, { data: entryRows }, { data: noteRows }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('diary_entries')
          .select('*, diary:diaries(*), answers:entry_answers(*, question:diary_questions(*))')
          .eq('user_id', id)
          .order('date', { ascending: false }),
        supabase
          .from('day_notes')
          .select('*')
          .eq('user_id', id)
          .order('noted_at', { ascending: false }),
      ]);

      setClient(profile ?? null);
      setEntries((entryRows as EntryWithDetails[]) ?? []);
      setNotes((noteRows as DayNote[]) ?? []);
      setLoading(false);
    };

    load();
  }, [id]);

  const toggle = (entryId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(entryId) ? next.delete(entryId) : next.add(entryId);
      return next;
    });
  };

  if (loading) return <PageSpinner />;

  // Group notes by local date
  const notesByDate = notes.reduce<Record<string, DayNote[]>>((acc, note) => {
    const date = toLocalISODate(note.noted_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(note);
    return acc;
  }, {});
  const noteDates = Object.keys(notesByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to={`/clients/${id}`} className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para {client?.name || 'Cliente'}
        </Link>
        <h1 className="text-2xl font-semibold text-dark font-serif">{client?.name || 'Cliente'}</h1>
        <p className="text-dark/50 text-sm mt-1">
          {entries.length} registro{entries.length !== 1 ? 's' : ''} de diário
          {' · '}
          {notes.length} anotaç{notes.length !== 1 ? 'ões' : 'ão'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-beige-100 rounded-xl p-1 mb-5">
        <button
          onClick={() => setActiveTab('diary')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'diary' ? 'bg-white text-dark shadow-sm' : 'text-dark/50 hover:text-dark/70'
          }`}
        >
          <BookOpen size={15} />
          Registros do Diário
          {entries.length > 0 && (
            <span className="bg-petrol-100 text-petrol-700 text-xs rounded-full px-1.5 py-0.5">{entries.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'notes' ? 'bg-white text-dark shadow-sm' : 'text-dark/50 hover:text-dark/70'
          }`}
        >
          <PenLine size={15} />
          Anotações
          {notes.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs rounded-full px-1.5 py-0.5">{notes.length}</span>
          )}
        </button>
      </div>

      {/* ── Aba Diário ── */}
      {activeTab === 'diary' && (
        entries.length === 0 ? (
          <EmptyState title="Nenhum registro ainda" description="O cliente ainda não respondeu o diário" />
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const isOpen = expanded.has(entry.id);
              const sortedAnswers = [...entry.answers].sort((a, b) => a.question.order_num - b.question.order_num);

              return (
                <Card key={entry.id}>
                  <button
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-beige-50 transition-colors text-left"
                    onClick={() => toggle(entry.id)}
                  >
                    <div>
                      <div className="font-medium text-dark text-sm capitalize">{formatDateLong(entry.date)}</div>
                      <div className="text-xs text-dark/40 mt-0.5">
                        {entry.diary?.name} · {sortedAnswers.length} resposta{sortedAnswers.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-dark/30" /> : <ChevronDown size={16} className="text-dark/30" />}
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-4 border-t border-beige-200 space-y-4 pt-4">
                      {sortedAnswers.map((answer) => (
                        <div key={answer.id}>
                          <div className="text-xs font-medium text-dark/50 mb-1">{answer.question.text}</div>
                          {answer.question.type === 'scale' && answer.answer_value !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-petrol-700 text-white text-sm flex items-center justify-center font-semibold">
                                {answer.answer_value}
                              </div>
                              <div className="flex-1 h-2 bg-beige-200 rounded-full overflow-hidden">
                                <div className="h-full bg-petrol-600 rounded-full" style={{ width: `${(answer.answer_value / 10) * 100}%` }} />
                              </div>
                              <span className="text-xs text-dark/30">10</span>
                            </div>
                          ) : answer.question.type === 'emotion' && answer.answer_text ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {answer.answer_text.split('|').map(s => s.trim()).filter(Boolean).map(v => (
                                <span key={v} className="inline-flex items-center gap-1 bg-petrol-50 text-petrol-700 text-xs font-medium px-2 py-1 rounded-full">{v}</span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-dark bg-beige-50 rounded-lg px-3 py-2">
                              {answer.answer_text || answer.answer_value?.toString() || '—'}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* ── Aba Anotações ── */}
      {activeTab === 'notes' && (
        notes.length === 0 ? (
          <EmptyState title="Nenhuma anotação ainda" description="O cliente ainda não fez anotações do dia" />
        ) : (
          <div className="space-y-6">
            {noteDates.map(date => (
              <div key={date}>
                <h3 className="text-xs font-semibold text-dark/40 uppercase tracking-wide mb-2 capitalize">
                  {formatDateLong(date)}
                </h3>
                <div className="space-y-2">
                  {notesByDate[date].map(note => {
                    const emotions = (note.emotions || []) as NoteEmotion[];
                    return (
                      <Card key={note.id} className="border-beige-200">
                        <CardBody className="py-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock size={12} className="text-dark/30" />
                            <span className="text-xs text-dark/40">{formatTime(note.noted_at)}</span>
                          </div>
                          {note.content && (
                            <p className="text-sm text-dark mb-2 whitespace-pre-wrap">{note.content}</p>
                          )}
                          {emotions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {emotions.map((em, i) => (
                                <span key={i} className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-medium px-2 py-1 rounded-full">
                                  {EMOTION_EMOJIS[em.label] || ''} {em.label}
                                  <span className="ml-0.5 bg-amber-100 text-amber-600 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                                    {em.intensity}
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}
                        </CardBody>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
