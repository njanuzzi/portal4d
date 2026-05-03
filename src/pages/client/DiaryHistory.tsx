import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDateLong } from '../../lib/format';
import type { DiaryEntry, EntryAnswer, DiaryQuestion, Diary } from '../../lib/database.types';

interface EntryWithDetails extends DiaryEntry {
  diary: Diary;
  answers: (EntryAnswer & { question: DiaryQuestion })[];
}

export function DiaryHistory() {
  const { user } = useAuth();
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
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) return <PageSpinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-dark font-serif">Histórico</h1>
        <p className="text-dark/50 text-sm mt-1">{entries.length} registro{entries.length !== 1 ? 's' : ''}</p>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={40} />}
          title="Nenhum registro ainda"
          description="Comece respondendo o diário de hoje"
        />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const isOpen = expanded.has(entry.id);
            const sortedAnswers = [...entry.answers].sort((a, b) => a.question.order_num - b.question.order);
            return (
              <Card key={entry.id}>
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-beige-50 transition-colors text-left"
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
      )}
    </div>
  );
}
