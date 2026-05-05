import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDateLong } from '../../lib/format';
import type { Profile, DiaryEntry, EntryAnswer, DiaryQuestion, Diary } from '../../lib/database.types';

interface EntryWithDetails extends DiaryEntry {
  diary: Diary;
  answers: (EntryAnswer & { question: DiaryQuestion })[];
}

export function ClientEntries() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<EntryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      const [{ data: profile }, { data: entryRows }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('diary_entries')
          .select('*, diary:diaries(*), answers:entry_answers(*, question:diary_questions(*))')
          .eq('user_id', id)
          .order('date', { ascending: false }),
      ]);

      setClient(profile ?? null);
      setEntries((entryRows as EntryWithDetails[]) ?? []);
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

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to={`/clients/${id}`} className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para {client?.name || 'Cliente'}
        </Link>
        <h1 className="text-2xl font-semibold text-dark font-serif">Registros do Diário</h1>
        <p className="text-dark/50 text-sm mt-1">
          {entries.length} registro{entries.length !== 1 ? 's' : ''} encontrado{entries.length !== 1 ? 's' : ''}
        </p>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="Nenhum registro ainda"
          description="O cliente ainda não respondeu o diário"
        />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const isOpen = expanded.has(entry.id);
            const sortedAnswers = [...entry.answers].sort(
              (a, b) => a.question.order_num - b.question.order_num
            );

            return (
              <Card key={entry.id}>
                <button
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-beige-50 transition-colors text-left"
                  onClick={() => toggle(entry.id)}
                >
                  <div>
                    <div className="font-medium text-dark text-sm capitalize">
                      {formatDateLong(entry.date)}
                    </div>
                    <div className="text-xs text-dark/40 mt-0.5">
                      {entry.diary?.name} · {sortedAnswers.length} resposta{sortedAnswers.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {isOpen
                    ? <ChevronUp size={16} className="text-dark/30" />
                    : <ChevronDown size={16} className="text-dark/30" />}
                </button>

                {isOpen && (
                  <div className="px-6 pb-4 border-t border-beige-200 space-y-4 pt-4">
                    {sortedAnswers.map((answer) => (
                      <div key={answer.id}>
                        <div className="text-xs font-medium text-dark/50 mb-1">
                          {answer.question.text}
                        </div>
                        {answer.question.type === 'scale' && answer.answer_value !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-petrol-700 text-white text-sm flex items-center justify-center font-semibold">
                              {answer.answer_value}
                            </div>
                            <div className="flex-1 h-2 bg-beige-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-petrol-600 rounded-full"
                                style={{ width: `${(answer.answer_value / 10) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-dark/30">10</span>
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
      )}
    </div>
  );
}
