import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
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

interface TimelineDay {
  date: string;
  entry: EntryWithDetails | null;
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

function buildTimeline(startDate: string, endDate: string, entries: EntryWithDetails[]): TimelineDay[] {
  const byDate = new Map(entries.map(entry => [entry.date, entry]));
  const days: TimelineDay[] = [];
  let current = parseISODate(endDate);
  const start = parseISODate(startDate);

  while (current >= start) {
    const date = toLocalISODate(current);
    days.push({ date, entry: byDate.get(date) ?? null });
    current = addDays(current, -1);
  }

  return days;
}

export function DiaryHistory() {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<EntryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase
      .from('diary_entries')
      .select('*, diary:diaries(*), answers:entry_answers(*, question:diary_questions(*))')
      .eq('user_id', user!.id)
      .order('date', { ascending: false })
      .then(({ data }) => {
        setEntries((data as EntryWithDetails[]) || []);
        setLoading(false);
      });
  }, [user]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (loading) return <PageSpinner />;

  const today = toLocalISODate();
  const startDate = profile?.created_at ? toLocalISODate(new Date(profile.created_at)) : today;
  const timeline = buildTimeline(startDate > today ? today : startDate, today, entries);
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
          const entry = day.entry;

          if (!entry) {
            return (
              <Card key={day.date} className="border-dashed border-beige-300 bg-beige-50/70">
                <CardBody className="flex items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-beige-200 flex items-center justify-center shrink-0">
                      <Clock size={16} className="text-dark/35" />
                    </div>
                    <div>
                      <div className="font-medium text-dark/55 text-sm capitalize">{formatDateLong(day.date)}</div>
                      <div className="text-xs text-dark/35 mt-0.5">Diário pendente</div>
                    </div>
                  </div>
                  <Link to={`/diary?date=${day.date}`} className="shrink-0">
                    <Button variant="ghost" size="sm">Preencher</Button>
                  </Link>
                </CardBody>
              </Card>
            );
          }

          const isOpen = expanded.has(entry.id);
          const sortedAnswers = [...entry.answers].sort((a, b) => a.question.order_num - b.question.order_num);
          return (
            <Card key={entry.id} className="border-emerald-200 bg-emerald-50/30">
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-emerald-50 transition-colors text-left"
                onClick={() => toggle(entry.id)}
              >
                <div>
                  <div className="font-medium text-dark text-sm capitalize">{formatDateLong(entry.date)}</div>
                  <div className="text-xs text-dark/40 mt-0.5">{sortedAnswers.length} resposta{sortedAnswers.length !== 1 ? 's' : ''}</div>
                </div>
                {isOpen ? <ChevronUp size={16} className="text-dark/30" /> : <ChevronDown size={16} className="text-dark/30" />}
              </button>

              {isOpen && (
                <div className="px-5 pb-4 border-t border-beige-200 space-y-4 pt-4">
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
                      ) : (
                        <p className="text-sm text-dark">{answer.answer_text || answer.answer_value?.toString() || '—'}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
