import { useEffect, useMemo, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { Search, Sparkles, Mail, MessageCircle, UserRound, ChevronDown } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDateTime } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { STAGE_TITLES, STAGES, Stage4D } from '../../lib/quizProtocolo4d';

// leads não está no database.types.ts (gerado antes dessa tabela existir) —
// mesmo padrão de client não tipado usado em LeadForm.tsx e QuizInstagram.tsx.
const untypedSupabase = supabase as unknown as SupabaseClient;

type LeadStatus = 'novo' | 'selecao' | 'aprovado' | 'recusado' | 'encaminhado';

interface Lead {
  id: string;
  name: string | null;
  email: string;
  whatsapp: string | null;
  source: string;
  status: LeadStatus;
  answers: Record<string, unknown> | null;
  created_at: string;
}

type OriginFilter = 'todos' | 'quiz' | 'inscricao' | 'newsletter' | 'outros';

const STATUS_LABELS: Record<LeadStatus, string> = {
  novo: 'Novo',
  selecao: 'Seleção',
  aprovado: 'Aprovado(a)',
  recusado: 'Recusado(a)',
  encaminhado: 'Encaminhado(a)',
};

const STATUS_BADGE_VARIANT: Record<LeadStatus, 'neutral' | 'warning' | 'success' | 'error' | 'info'> = {
  novo: 'neutral',
  selecao: 'warning',
  aprovado: 'success',
  recusado: 'error',
  encaminhado: 'info',
};

const ANSWER_LABELS: Record<string, string> = {
  idade: 'Idade',
  sexo: 'Sexo',
  estado_civil: 'Estado civil',
  profissao: 'Profissão',
  como_conheceu: 'Como conheceu a Núbia',
  ja_fez_terapia: 'Já fez terapia antes',
  o_que_fez_parar: 'O que fez parar / o que faltou',
  motivo: 'O que trouxe até aqui',
  travamento_areas: 'Onde o travamento aparece mais forte',
  travamento_detalhe: 'Mais detalhes sobre o travamento',
  autoavaliacao: 'Por que acha que o Protocolo 4D é pra ela(e)',
  triagem_clinica: 'Em acompanhamento clínico/psiquiátrico no momento',
};

function parseQuizStage(source: string): Stage4D | null {
  const match = source.match(/^quiz_instagram_(.+)$/);
  const stage = match?.[1];
  return stage && (STAGES as readonly string[]).includes(stage) ? (stage as Stage4D) : null;
}

function originOf(source: string): 'quiz' | 'inscricao' | 'newsletter' | 'outros' {
  if (source.startsWith('quiz_instagram_')) return 'quiz';
  if (source === 'sessao_avaliacao') return 'inscricao';
  if (source.startsWith('newsletter')) return 'newsletter';
  return 'outros';
}

function whatsappLink(whatsapp: string, name: string | null) {
  const raw = whatsapp.trim();
  const digits = raw.replace(/\D/g, '');
  const number = (raw.startsWith('+') || digits.length > 11) ? digits : `55${digits}`;
  const firstName = name?.split(' ')[0];
  const msg = encodeURIComponent(firstName ? `Olá, ${firstName}!` : 'Olá!');
  return `https://wa.me/${number}?text=${msg}`;
}

function formatAnswerValue(value: unknown): string {
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

const FILTERS: { value: OriginFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'inscricao', label: 'Inscrição' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'newsletter', label: 'Newsletter' },
];

export function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<OriginFilter>('todos');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    untypedSupabase
      .from('leads')
      .select('id, name, email, whatsapp, source, status, answers, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        setLeads((data ?? []) as Lead[]);
        if (fetchError) setError(fetchError.message);
        setLoading(false);
      });
  }, []);

  async function updateStatus(id: string, newStatus: LeadStatus) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)));
    const { error: updateError } = await untypedSupabase.from('leads').update({ status: newStatus }).eq('id', id);
    if (updateError) setError(updateError.message);
  }

  const counts = useMemo(() => {
    const result: Record<OriginFilter, number> = { todos: leads.length, quiz: 0, inscricao: 0, newsletter: 0, outros: 0 };
    for (const lead of leads) result[originOf(lead.source)] += 1;
    return result;
  }, [leads]);

  const filtered = leads.filter((lead) => {
    if (filter !== 'todos' && originOf(lead.source) !== filter) return false;
    const term = search.toLowerCase();
    if (!term) return true;
    return (lead.name?.toLowerCase().includes(term) ?? false) || lead.email.toLowerCase().includes(term);
  });

  if (loading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-dark font-serif">Leads</h1>
          <p className="text-dark/50 text-sm mt-1">
            {leads.length} pessoa{leads.length !== 1 ? 's' : ''} que fez{leads.length !== 1 ? 'ram' : ''} o quiz, se inscreveu{leads.length !== 1 ? 'ram' : ''} ou se candidatou{leads.length !== 1 ? 'ram' : ''} — ainda não é cliente cadastrado
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-beige-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-petrol-400 text-dark placeholder:text-dark/30"
          />
        </div>
        <div className="flex gap-1.5 shrink-0 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value
                  ? 'bg-petrol-700 text-white'
                  : 'bg-white border border-beige-300 text-dark/60 hover:bg-beige-50'
              }`}
            >
              {f.label} <span className="opacity-60">({counts[f.value]})</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={40} />}
          title={search || filter !== 'todos' ? 'Nenhum lead encontrado' : 'Nenhum lead ainda'}
          description={
            search || filter !== 'todos'
              ? 'Tente um termo ou filtro diferente'
              : 'Quem fizer o quiz do Instagram, se inscrever na newsletter ou se candidatar à sessão de avaliação aparece aqui'
          }
        />
      ) : (
        <Card>
          <div className="divide-y divide-beige-200">
            {filtered.map((lead) => {
              const origin = originOf(lead.source);
              const stage = origin === 'quiz' ? parseQuizStage(lead.source) : null;
              const hasAnswers = !!lead.answers && Object.keys(lead.answers).length > 0;
              const isOpen = expanded === lead.id;

              return (
                <div key={lead.id}>
                  <button
                    type="button"
                    onClick={() => hasAnswers && setExpanded(isOpen ? null : lead.id)}
                    className={`w-full flex items-center gap-4 px-6 py-4 text-left ${hasAnswers ? 'cursor-pointer hover:bg-beige-50' : 'cursor-default'}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-petrol-100 flex items-center justify-center shrink-0">
                      <span className="font-medium text-sm text-petrol-700">
                        {(lead.name || lead.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-dark">
                          {lead.name || <span className="italic text-dark/40">Sem nome</span>}
                        </span>
                        <Badge variant={origin === 'quiz' ? 'gold' : origin === 'inscricao' ? 'gold' : origin === 'newsletter' ? 'info' : 'neutral'}>
                          {origin === 'quiz' ? 'Quiz' : origin === 'inscricao' ? 'Inscrição' : origin === 'newsletter' ? 'Newsletter' : lead.source}
                        </Badge>
                        {stage && <Badge variant="neutral">{STAGE_TITLES[stage]}</Badge>}
                        <Badge variant={STATUS_BADGE_VARIANT[lead.status]}>{STATUS_LABELS[lead.status]}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-dark/40">
                        <span className="flex items-center gap-1 truncate">
                          <Mail size={12} className="shrink-0" />
                          {lead.email}
                        </span>
                        {lead.whatsapp && (
                          <a
                            href={whatsappLink(lead.whatsapp, lead.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-emerald-600 hover:underline shrink-0"
                          >
                            <MessageCircle size={12} />
                            {lead.whatsapp}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-dark/30 shrink-0 hidden sm:block">
                      {formatDateTime(lead.created_at)}
                    </div>
                    {hasAnswers && (
                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-dark/30 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    )}
                  </button>

                  {isOpen && hasAnswers && (
                    <div className="px-6 pb-5 pl-20">
                      <dl className="space-y-3 mb-4">
                        {Object.entries(lead.answers!).map(([key, value]) => (
                          <div key={key}>
                            <dt className="text-xs uppercase tracking-wide text-dark/40 mb-0.5">
                              {ANSWER_LABELS[key] ?? key}
                            </dt>
                            <dd className="text-sm text-dark/80 leading-relaxed">{formatAnswerValue(value)}</dd>
                          </div>
                        ))}
                      </dl>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-dark/40">Status:</label>
                        <select
                          value={lead.status}
                          onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm border border-beige-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-petrol-400"
                        >
                          {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-xs text-dark/30">
        <UserRound size={13} />
        Leads não têm login no portal — pra dar acesso, cadastre como cliente em "Clientes".
      </p>
    </div>
  );
}
