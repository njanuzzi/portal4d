import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, FileText, TrendingUp, ChevronRight, CheckCircle, Clock } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDate } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { Profile, Diary, Report } from '../../lib/database.types';

type ReportSummary = Pick<Report, 'id' | 'user_id' | 'period_start' | 'period_end' | 'content_text' | 'published' | 'created_at'>;

interface Stats {
  totalClients: number;
  activeClients: number;
  activeDiaries: Diary[];
  reportCount: number;
  recentReports: (ReportSummary & { profile: Profile | null })[];
  todayEntries: number;
}

function currentDateISO() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().split('T')[0];
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

      const today = currentDateISO();

      const [
        totalClientsResult,
        activeClientsResult,
        activeDiariesResult,
        todayEntriesResult,
        reportsCountResult,
        recentReportsResult,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'client'),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'client')
          .eq('active', true),
        supabase
          .from('diaries')
          .select('id, name, is_active, created_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('diary_entries')
          .select('id', { count: 'exact', head: true })
          .eq('date', today),
        supabase
          .from('reports')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('reports')
          .select('id, user_id, period_start, period_end, content_text, published, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      if (cancelled) return;

      const reportRows = (recentReportsResult.data ?? []) as ReportSummary[];
      const profileIds = Array.from(new Set(reportRows.map((report) => report.user_id).filter(Boolean)));
      let profilesById = new Map<string, Profile>();
      let profilesErrorMessage = '';

      if (profileIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, name, role, active, whatsapp, address, created_at')
          .in('id', profileIds);

        if (cancelled) return;

        profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile as Profile]));
        profilesErrorMessage = profilesError?.message ?? '';
      }

      const recentReports = reportRows.map((report) => ({
        ...report,
        profile: profilesById.get(report.user_id) ?? null,
      }));

      const queryError = [
        totalClientsResult.error?.message,
        activeClientsResult.error?.message,
        activeDiariesResult.error?.message,
        todayEntriesResult.error?.message,
        reportsCountResult.error?.message,
        recentReportsResult.error?.message,
        profilesErrorMessage,
      ].find(Boolean);

      setStats({
        totalClients: totalClientsResult.count ?? 0,
        activeClients: activeClientsResult.count ?? 0,
        activeDiaries: (activeDiariesResult.data ?? []) as Diary[],
        reportCount: reportsCountResult.count ?? 0,
        recentReports,
        todayEntries: todayEntriesResult.count ?? 0,
      });
      setError(queryError ?? '');
      setLoading(false);
    };

    fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <PageSpinner />;

  const statCards = [
    { label: 'Total de Clientes', value: stats!.totalClients, sub: `${stats!.activeClients} ativos`, icon: <Users size={20} />, color: 'text-petrol-600', bg: 'bg-petrol-50', to: '/clients' },
    { label: 'Diário Ativo', value: stats!.activeDiaries.length, sub: stats!.activeDiaries[0]?.name || 'Nenhum ativo', icon: <BookOpen size={20} />, color: 'text-gold-600', bg: 'bg-gold-50', to: '/diaries' },
    { label: 'Respostas Hoje', value: stats!.todayEntries, sub: 'registros do dia', icon: <TrendingUp size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50', to: '/reports' },
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <Link
            key={s.label}
            to={s.to}
            className="block h-full rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-400 focus-visible:ring-offset-2"
          >
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
