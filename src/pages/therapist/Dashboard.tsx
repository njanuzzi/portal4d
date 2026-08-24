import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, FileText, TrendingUp, ChevronRight, CheckCircle, Clock, XCircle, MessageCircle } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDate, formatDateLong, todayISO } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { Profile, Diary, Report } from '../../lib/database.types';

type ReportSummary = Pick<Report, 'id' | 'user_id' | 'period_start' | 'period_end' | 'content_text' | 'published' | 'created_at'>;

interface ClientTodayStatus {
  id: string;
  name: string;
  registeredAt: string;
  firstLogin: string | null;   // null = never logged in
  whatsapp: string | null;
  responded: boolean;
  entryId: string | null;
  lastEntryDate: string | null;
  daysSinceActivity: number;
  hasGoal: boolean;
}

interface Stats {
  totalClients: number;
  activeClients: number;
  activeDiaries: Diary[];
  reportCount: number;
  recentReports: (ReportSummary & { profile: Profile | null })[];
  todayEntries: number;
  clientsToday: ClientTodayStatus[];
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchDashboard = async () => {
      setLoading(true);
      setError('');

      const today = todayISO();

      const [
        totalClientsResult,
        activeClientsResult,
        activeDiariesResult,
        todayEntriesResult,
        reportsCountResult,
        recentReportsResult,
        allActiveClientsResult,
        lastLoginResult,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client').eq('active', true),
        supabase.from('diaries').select('id, name, is_active, created_at').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('diary_entries').select('id', { count: 'exact', head: true }).eq('date', today),
        supabase.from('reports').select('id', { count: 'exact', head: true }),
        supabase.from('reports').select('id, user_id, period_start, period_end, content_text, published, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('id, name, created_at, whatsapp').eq('role', 'client').eq('active', true).order('name'),
        supabase.rpc('get_clients_last_login'),
      ]);

      if (cancelled) return;

      // Build today's status per client
      const activeClients = (allActiveClientsResult.data ?? []) as { id: string; name: string; created_at: string; whatsapp: string | null }[];
      let clientsToday: ClientTodayStatus[] = [];

      // Build first-login map from RPC (null means never really logged in)
      const firstLoginMap = new Map<string, string | null>();
      for (const row of ((lastLoginResult.data ?? []) as { client_id: string; last_login: string | null; first_login: string | null }[])) {
        firstLoginMap.set(row.client_id, row.first_login ?? null);
      }

      if (activeClients.length > 0) {
        const clientIds = activeClients.map(c => c.id);

        // Fetch today's entries, all entries (to find last response per client)
        // and quais clientes já têm ao menos uma meta cadastrada — o sistema
        // só cobra preenchimento de quem já passou por essa etapa.
        const [{ data: todayEntryRows }, { data: allEntryRows }, { data: goalRows }] = await Promise.all([
          supabase
            .from('diary_entries')
            .select('id, user_id')
            .eq('date', today)
            .in('user_id', clientIds),
          supabase
            .from('diary_entries')
            .select('user_id, date')
            .in('user_id', clientIds)
            .order('date', { ascending: false }),
          supabase
            .from('client_goals')
            .select('user_id')
            .in('user_id', clientIds),
        ]);

        if (cancelled) return;

        const respondedMap = new Map(
          (todayEntryRows ?? []).map(e => [e.user_id, e.id])
        );
        const clientsWithGoal = new Set((goalRows ?? []).map(g => g.user_id));

        // Most recent entry date per client (first occurrence per user since sorted desc)
        const lastEntryMap = new Map<string, string>();
        for (const e of (allEntryRows ?? [])) {
          if (!lastEntryMap.has(e.user_id)) lastEntryMap.set(e.user_id, e.date);
        }

        const daysBetween = (dateStr: string) => {
          const ms = new Date(today + 'T00:00:00').getTime() - new Date(dateStr + 'T00:00:00').getTime();
          return Math.floor(ms / 86_400_000);
        };

        clientsToday = activeClients.map(c => {
          const lastEntryDate = lastEntryMap.get(c.id) ?? null;
          const registeredAt = c.created_at.split('T')[0];
          const firstLogin = firstLoginMap.get(c.id) ?? null;
          // Days counter: only starts after first login; never logged in = 0
          let daysSinceActivity = 0;
          if (firstLogin) {
            const firstLoginDate = firstLogin.split('T')[0];
            daysSinceActivity = lastEntryDate
              ? daysBetween(lastEntryDate)
              : daysBetween(firstLoginDate);
          }
          return {
            id: c.id,
            name: c.name,
            registeredAt,
            firstLogin,
            whatsapp: c.whatsapp ?? null,
            responded: respondedMap.has(c.id),
            entryId: respondedMap.get(c.id) ?? null,
            lastEntryDate,
            daysSinceActivity,
            hasGoal: clientsWithGoal.has(c.id),
          };
        });
      }

      // Enrich recent reports with profile names
      const reportRows = (recentReportsResult.data ?? []) as ReportSummary[];
      const profileIds = Array.from(new Set(reportRows.map(r => r.user_id).filter(Boolean)));
      let profilesById = new Map<string, Profile>();

      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, name, role, active, whatsapp, address, created_at')
          .in('id', profileIds);

        if (cancelled) return;
        profilesById = new Map((profiles ?? []).map(p => [p.id, p as Profile]));
      }

      const queryError = [
        totalClientsResult.error?.message,
        activeClientsResult.error?.message,
        activeDiariesResult.error?.message,
        todayEntriesResult.error?.message,
        reportsCountResult.error?.message,
        recentReportsResult.error?.message,
      ].find(Boolean);

      setStats({
        totalClients: totalClientsResult.count ?? 0,
        activeClients: activeClientsResult.count ?? 0,
        activeDiaries: (activeDiariesResult.data ?? []) as Diary[],
        reportCount: reportsCountResult.count ?? 0,
        recentReports: reportRows.map(r => ({ ...r, profile: profilesById.get(r.user_id) ?? null })),
        todayEntries: todayEntriesResult.count ?? 0,
        clientsToday,
      });

      setError(queryError ?? '');
      setLoading(false);
    };

    fetchDashboard();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <PageSpinner />;

  const respondedCount = stats!.clientsToday.filter(c => c.responded).length;
  const pendingCount = stats!.clientsToday.filter(c => !c.responded).length;

  const whatsappLink = (client: ClientTodayStatus) => {
    if (!client.whatsapp) return null;
    const raw = client.whatsapp.trim();
    const digits = raw.replace(/\D/g, '');
    // If typed with + prefix or more than 11 digits → already has country code
    const number = (raw.startsWith('+') || digits.length > 11) ? digits : `55${digits}`;
    const msg = encodeURIComponent(
      `Olá, ${client.name.split(' ')[0]}! Lembrete para preencher o diário de hoje no portal. 😊`
    );
    return `https://wa.me/${number}?text=${msg}`;
  };

  const statCards = [
    { label: 'Total de Clientes', value: stats!.totalClients, sub: `${stats!.activeClients} ativos`, icon: <Users size={20} />, color: 'text-petrol-600', bg: 'bg-petrol-50', to: '/clients' },
    { label: 'Diário Ativo', value: stats!.activeDiaries.length, sub: stats!.activeDiaries[0]?.name || 'Nenhum ativo', icon: <BookOpen size={20} />, color: 'text-gold-600', bg: 'bg-gold-50', to: '/diaries' },
    { label: 'Respostas Hoje', value: stats!.todayEntries, sub: `${pendingCount} pendente${pendingCount !== 1 ? 's' : ''}`, icon: <TrendingUp size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50', to: '/dashboard' },
    { label: 'Relatórios', value: stats!.reportCount, sub: 'total criado', icon: <FileText size={20} />, color: 'text-amber-600', bg: 'bg-amber-50', to: '/reports' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-dark font-serif">Dashboard</h1>
        <p className="text-dark/50 text-sm mt-1">Visão geral da plataforma</p>
      </div>

      {error && (
        <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <Link key={s.label} to={s.to} className="block h-full rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-400 focus-visible:ring-offset-2">
            <Card className="h-full cursor-pointer transition-all hover:border-petrol-300 hover:shadow-md">
              <CardBody className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center ${s.color}`}>
                  {s.icon}
                </div>
                <div>
                  <div className="text-2xl font-semibold text-dark">{s.value}</div>
                  <div className="text-xs text-dark/50">{s.label}</div>
                  <div className="text-xs text-dark/35 mt-0.5">{s.sub}</div>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      {/* Today's diary status */}
      {stats!.clientsToday.length > 0 && (
        <Card className="mb-6">
          <div className="px-6 py-4 border-b border-beige-300 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-dark text-sm">Diário de Hoje</h2>
              <p className="text-xs text-dark/40 mt-0.5 capitalize">{formatDateLong(todayISO())}</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle size={13} />
                {respondedCount} respondeu{respondedCount !== 1 ? 'ram' : ''}
              </span>
              {pendingCount > 0 && (
                <span className="flex items-center gap-1 text-dark/40">
                  <Clock size={13} />
                  {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <div className="divide-y divide-beige-100">
            {stats!.clientsToday.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-6 py-3">
                <Link to={`/clients/${c.id}`} className="flex items-center gap-3 hover:opacity-75 transition-opacity">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${c.responded ? 'bg-emerald-100 text-emerald-700' : 'bg-beige-200 text-dark/40'}`}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-dark hover:text-petrol-700 transition-colors">{c.name}</span>
                </Link>
                <div className="flex items-center gap-3">
                  {c.responded ? (
                    <>
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle size={13} /> Respondeu
                      </span>
                      <Link
                        to={`/clients/${c.id}/entries`}
                        className="text-xs text-petrol-600 hover:text-petrol-800 flex items-center gap-1"
                      >
                        Ver <ChevronRight size={12} />
                      </Link>
                    </>
                  ) : !c.firstLogin ? (
                    // Never logged in — awaiting first access
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-beige-100 text-dark/40">
                      <Clock size={12} /> Aguardando acesso
                    </span>
                  ) : !c.hasGoal ? (
                    // Já acessou, mas ainda não definiu uma meta — o sistema só
                    // cobra preenchimento depois dessa etapa, então não faz
                    // sentido mostrar "dias sem responder" ainda.
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-beige-100 text-dark/40">
                        <XCircle size={12} /> Sem meta cadastrada
                      </span>
                      {whatsappLink(c) && (
                        <a
                          href={whatsappLink(c)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Enviar lembrete via WhatsApp"
                          className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 transition-colors"
                        >
                          <MessageCircle size={13} />
                          <span className="hidden sm:inline">Lembrete</span>
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-dark/35">
                        <XCircle size={13} /> Pendente
                      </span>
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                        c.daysSinceActivity === 0
                          ? 'bg-beige-100 text-dark/40'
                          : c.daysSinceActivity <= 2
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {c.lastEntryDate
                          ? `${c.daysSinceActivity}d sem responder`
                          : c.daysSinceActivity === 0
                            ? 'acessou hoje'
                            : `${c.daysSinceActivity}d sem responder`
                        }
                      </span>
                      {whatsappLink(c) && (
                        <a
                          href={whatsappLink(c)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Enviar lembrete via WhatsApp"
                          className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 transition-colors"
                        >
                          <MessageCircle size={13} />
                          <span className="hidden sm:inline">Lembrete</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active diary */}
        <Card>
          <div className="px-6 py-4 border-b border-beige-300 flex items-center justify-between">
            <h2 className="font-semibold text-dark text-sm">Diário Ativo</h2>
            <Link to="/diaries" className="text-xs text-petrol-600 hover:text-petrol-800 flex items-center gap-1">
              Gerenciar <ChevronRight size={12} />
            </Link>
          </div>
          <CardBody className={stats!.activeDiaries.length > 0 ? 'space-y-3' : ''}>
            {stats!.activeDiaries.length > 0 ? (
              stats!.activeDiaries.map((diary) => (
                <div key={diary.id} className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-emerald-500 shrink-0" />
                  <div>
                    <div className="font-medium text-dark text-sm">{diary.name}</div>
                    <div className="text-xs text-dark/40">Ativo desde {formatDate(diary.created_at)}</div>
                  </div>
                  <Badge variant="success" className="ml-auto">Ativo</Badge>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-3">
                <Clock size={20} className="text-dark/30 shrink-0" />
                <div>
                  <div className="text-sm text-dark/50">Nenhum diário ativo</div>
                  <Link to="/diaries/new" className="text-xs text-petrol-600 hover:underline">Criar diário</Link>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent reports */}
        <Card>
          <div className="px-6 py-4 border-b border-beige-300 flex items-center justify-between">
            <h2 className="font-semibold text-dark text-sm">Relatórios Recentes</h2>
            <Link to="/reports" className="text-xs text-petrol-600 hover:text-petrol-800 flex items-center gap-1">
              Ver todos <ChevronRight size={12} />
            </Link>
          </div>
          <CardBody className="divide-y divide-beige-200">
            {stats!.recentReports.length === 0 ? (
              <p className="text-sm text-dark/40 py-2">Nenhum relatório criado</p>
            ) : (
              stats!.recentReports.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div>
                    <div className="text-sm font-medium text-dark">{r.profile?.name || '—'}</div>
                    <div className="text-xs text-dark/40">{formatDate(r.period_start)} – {formatDate(r.period_end)}</div>
                  </div>
                  <Badge variant={r.published ? 'success' : 'neutral'}>
                    {r.published ? 'Publicado' : 'Rascunho'}
                  </Badge>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
