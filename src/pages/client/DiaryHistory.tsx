import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Clock, PenLine } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDateLong } from '../../lib/format';
import type { DiaryEntry, EntryAnswer, DiaryQuestion, Diary } from '../../lib/database.types';

interface EntryWithDetails extends DiaryEntry {
  diary: Diary;
  answers: (EntryAnswer & { question: DiaryQuestion })[];
}

interface DayNote {
  id: string;
  noted_at: string;
  content: string | null;
  emotions: Array<{ label: string; intensity: number }> | null;
}

interface TimelineDay {
  date: string;
  entry: EntryWithDetails | null;
  notes: DayNote[];
}

function toLocalISODate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseISODate(date: string) {
  return new Date(`${date}T00:00:00`);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatTime(isoString: string) {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function buildTimeline(
  startDate: string,
  endDate: string,
  entries: EntryWithDetails[],
  notesByDate: Map<string, DayNote[]>,
): TimelineDay[] {
  const byDate = new Map(entries.map(entry => [entry.date, entry]));
  const days: TimelineDay[] = [];
  let current = parseISODate(endDate);
  const start = parseISODate(startDate);

  while (current >= start) {
    const date = toLocalISODate(current);
    days.push({
      date,
      entry: byDate.get(date) ?? null,
      notes: notesByDate.get(date) ?? [],
    });
    current = addDays(current, -1);
  }

  return days;
}

export function DiaryHistory() {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<EntryWithDetails[]>([]);
  const [notesByDate, setNotesByDate] = useState<Map<string, DayNote[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from('diary_entries')
        .select('*, diary:diaries(*), answers:entry_answers(*, question:diary_questions(*))')
        .eq('user_id', user.id)
        .order('date', { ascending: false }),
      supabase
        .from('day_notes')
        .select('id, noted_at, content, emotions')
        .eq('user_id', user.id)
        .order('noted_at', { ascending: true }),
    ]).then(([{ data: entryData }, { data: noteData }]) => {
      setEntries((entryData as EntryWithDetails[]) || []);

      // Group notes by LOCAL date (handles timezone correctly)
      const map = new Map<string, DayNote[]>();
      for (const note of (noteData as DayNote[]) || []) {
        const localDate = toLocalISODate(new Date(note.noted_at));
        if (!map.has(localDate)) map.set(localDate, []);
        map.get(localDate)!.push(note);
      }
      setNotesByDate(map);
      setLoading(false);
    });
  }, [user]);

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) return <PageSpinner />;

  const today = toLocalISODate();
  const startDate = profile?.created_at ? toLocalISODate(new Date(profile.created_at)) : today;
  const timeline = buildTimeline(startDate > today ? today : startDate, today, entries, notesByDate);
  const pendingCount = timeline.filter(day => !day.entry).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-dark font-serif">Histórico</h1>
        <p className="text-dark/50 text-sm mt-1">
          {entries.length} registro{entries.length !== 1 ? 's' : ''} preenchido{entries.length !== 1 ? 's' : ''}
          {pendingCount > 0 && ` • ${pendingCount} pendente${pendingCount !== 1 ? 's' : ''}`}
        </p>
      </div>

      <div className="space-y-3">
        {timeline.map((day) => {
          const { entry, notes } = day;
          const key = day.date; // use date as toggle key for all days
          const isOpen = expanded.has(key);
          const hasNotes = notes.length > 0;

          if (!entry) {
            // ── Pending day ────────────────────────────────────────────────
            return (
              <Card key={day.date} className="border-dashed border-beige-300 bg-beige-50/70">
                <button
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                  onClick={() => toggle(key)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-beige-200 flex items-center justify-center shrink-0">
                      <Clock size={16} className="text-dark/35" />
                    </div>
                    <div>
                      <div className="font-medium text-dark/55 text-sm capitalize">{formatDateLong(day.date)}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-dark/35">Diário pendente</span>
                        {hasNotes && (
                          <span className="flex items-center gap-1 text-[10px] text-petrol-500 font-medium">
                            <PenLine size={10} />
                            {notes.length} anotaç{notes.length !== 1 ? 'ões' : 'ão'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link to={`/diary?date=${day.date}`} onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm">Preencher</Button>
                    </Link>
                    {hasNotes && (
                      isOpen ? <ChevronUp size={15} className="text-dark/30" /> : <ChevronDown size={15} className="text-dark/30" />
                    )}
                  </div>
                </button>

                {isOpen && hasNotes && (
                  <div className="px-4 pb-4 border-t border-beige-100 pt-3 space-y-2">
                    <p className="text-xs font-medium text-dark/40 mb-2 flex items-center gap-1.5">
                      <PenLine size={12} /> Anotações do dia
                    </p>
                    <NotesList notes={notes} />
                  </div>
                )}

                {!hasNotes && isOpen && (
                  <div className="px-4 pb-3 border-t border-beige-100 pt-3">
                    <p className="text-xs text-dark/30 italic">Sem anotações neste dia</p>
                  </div>
                )}
              </Card>
            );
          }

          // ── Filled day ────────────────────────────────────────────────────
          const sortedAnswers = [...entry.answers].sort((a, b) => a.question.order_num - b.question.order_num);
          return (
            <Card key={entry.id} className="border-emerald-200 bg-emerald-50/30">
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-emerald-50 transition-colors text-left"
                onClick={() => toggle(key)}
              >
                <div>
                  <div className="font-medium text-dark text-sm capitalize">{formatDateLong(entry.date)}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-dark/40">{sortedAnswers.length} resposta{sortedAnswers.length !== 1 ? 's' : ''}</span>
                    {hasNotes && (
                      <span className="flex items-center gap-1 text-[10px] text-petrol-500 font-medium">
                        <PenLine size={10} />
                        {notes.length} anotaç{notes.length !== 1 ? 'ões' : 'ão'}
                      </span>
                    )}
                  </div>
                </div>
                {isOpen ? <ChevronUp size={16} className="text-dark/30" /> : <ChevronDown size={16} className="text-dark/30" />}
              </button>

              {isOpen && (
                <div className="px-5 pb-5 border-t border-beige-200 pt-4 space-y-4">
                  {/* Diary answers */}
                  {sortedAnswers.map((answer) => (
                    <div key={answer.id}>
                      <div className="text-xs font-medium text-dark/40 mb-1">{answer.question.text}</div>
                      {answer.question.type === 'scale' && answer.answer_value !== null ? (
                        <div className="flex items-center gap-2">
                          <span className="text-petrol-700 font-semibold text-lg">{answer.answer_value}</span>
                          <div className="flex-1 h-1.5 bg-beige-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-petrol-500 rounded-full"
                              style={{ width: `${(answer.answer_value / 10) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-dark/30">10</span>
                        </div>
                      ) : answer.question.type === 'emotion' && answer.answer_text ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {answer.answer_text.split('|').map(s => s.trim()).filter(Boolean).map(v => (
                            <span key={v} className="inline-flex items-center gap-1 bg-petrol-50 text-petrol-700 text-xs font-medium px-2 py-1 rounded-full">
                              {v}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-dark">{answer.answer_text || answer.answer_value?.toString() || '—'}</p>
                      )}
                    </div>
                  ))}

                  {/* Day notes section */}
                  <div className="pt-2 border-t border-beige-100">
                    <p className="text-xs font-medium text-dark/40 mb-2 flex items-center gap-1.5">
                      <PenLine size={12} /> Anotações do dia
                    </p>
                    {hasNotes ? (
                      <NotesList notes={notes} />
                    ) : (
                      <p className="text-xs text-dark/30 italic">Sem anotações neste dia</p>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Notes list sub-component ────────────────────────────────────────────────

function NotesList({ notes }: { notes: DayNote[] }) {
  return (
    <div className="space-y-2">
      {notes.map(note => (
        <div key={note.id} className="bg-white rounded-lg border border-beige-200 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock size={11} className="text-dark/25" />
            <span className="text-[10px] text-dark/35">{formatTime(note.noted_at)}</span>
          </div>
          {note.content && (
            <p className="text-sm text-dark/80 leading-snug mb-1.5">{note.content}</p>
          )}
          {note.emotions && note.emotions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {note.emotions.map((em, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-petrol-50 text-petrol-700 text-[10px] font-medium px-2 py-0.5 rounded-full">
                  {em.label}
                  <span className="bg-petrol-100 text-petrol-600 rounded-full px-1 text-[9px] font-semibold">{em.intensity}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
