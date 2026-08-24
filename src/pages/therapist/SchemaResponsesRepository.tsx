import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, ChevronRight, Download } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageSpinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { supabase } from '../../lib/supabase';
import { buildRawAnswersCsv, downloadCsv } from '../../lib/schemaCsv';

interface AssessmentRow {
  id: string;
  client_id: string;
  version: number;
  submitted_at: string;
  client_name: string;
  client_email: string;
  client_whatsapp: string | null;
  raw_answers: Record<string, number>;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function SchemaResponsesRepository() {
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [questionNumbers, setQuestionNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const [{ data: questionRows }, { data: assessmentRows }] = await Promise.all([
        supabase.from('schema_questions').select('question_number').order('question_number'),
        supabase
          .from('client_assessments')
          .select('id, client_id, version, submitted_at, raw_answers, profiles(name, email, whatsapp)')
          .neq('status', 'in_progress')
          .order('submitted_at', { ascending: false }),
      ]);

      setQuestionNumbers((questionRows ?? []).map((q) => q.question_number));

      const rows: AssessmentRow[] = ((assessmentRows ?? []) as unknown as Array<{
        id: string; client_id: string; version: number; submitted_at: string; raw_answers: Record<string, number>;
        profiles: { name: string; email: string; whatsapp: string | null } | { name: string; email: string; whatsapp: string | null }[] | null;
      }>).map((a) => {
        const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
        return {
          id: a.id,
          client_id: a.client_id,
          version: a.version,
          submitted_at: a.submitted_at,
          client_name: profile?.name ?? '—',
          client_email: profile?.email ?? '—',
          client_whatsapp: profile?.whatsapp ?? null,
          raw_answers: a.raw_answers ?? {},
        };
      });
      setAssessments(rows);
      setLoading(false);
    };
    load();
  }, []);

  const filteredAssessments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return assessments;
    return assessments.filter((a) => a.client_name.toLowerCase().includes(term) || a.client_email.toLowerCase().includes(term));
  }, [assessments, search]);

  const handleExportAll = () => {
    const csv = buildRawAnswersCsv(
      filteredAssessments.map((a) => ({ name: a.client_name, email: a.client_email, whatsapp: a.client_whatsapp, answers: a.raw_answers })),
      questionNumbers
    );
    downloadCsv(`respostas-esquemas-${new Date().toISOString().split('T')[0]}.csv`, csv);
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-petrol-50 flex items-center justify-center">
          <Brain size={18} className="text-petrol-700" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-dark font-serif">Respostas do Inventário</h1>
          <p className="text-dark/50 text-sm mt-0.5">Todas as submissões do Inventário de Esquemas, de todos os clientes</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <div className="max-w-sm flex-1 min-w-[200px]">
          <Input
            placeholder="Buscar por cliente ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="secondary" onClick={handleExportAll} disabled={filteredAssessments.length === 0}>
          <Download size={16} />
          Baixar respostas dos clientes
        </Button>
      </div>

      {filteredAssessments.length === 0 ? (
        <EmptyState
          icon={<Brain size={40} />}
          title="Nenhuma resposta ainda"
          description="As submissões do Inventário de Esquemas vão aparecer aqui"
        />
      ) : (
        <Card>
          <div className="divide-y divide-beige-100">
            {filteredAssessments.map((a) => (
              <Link
                key={a.id}
                to={`/schema-respostas/${a.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-beige-50 transition-colors"
              >
                <div>
                  <div className="font-medium text-dark text-sm">{a.client_name}</div>
                  <div className="text-xs text-dark/40 mt-0.5">v{a.version} · {formatDateTime(a.submitted_at)}</div>
                </div>
                <ChevronRight size={16} className="text-dark/30" />
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
