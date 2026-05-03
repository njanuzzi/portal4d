import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, FileText, TrendingUp, ChevronRight, CheckCircle, Clock } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDate } from '../../lib/format';
import { MOCK_CLIENTS, MOCK_DIARIES, MOCK_REPORTS, MOCK_ENTRIES } from '../../lib/mockData';
import type { Profile, Diary, Report } from '../../lib/database.types';

interface Stats {
  totalClients: number;
  activeClients: number;
  activeDiary: Diary | null;
  recentReports: (Report & { profile: Profile | null })[];
  todayEntries: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setStats({
      totalClients: MOCK_CLIENTS.length,
      activeClients: MOCK_CLIENTS.filter(c => c.active).length,
      activeDiary: MOCK_DIARIES.find(d => d.is_active) || null,
      recentReports: MOCK_REPORTS.slice(0, 5),
      todayEntries: MOCK_ENTRIES.filter(e => e.date === today).length,
    });
    setLoading(false);
  }, []);

  if (loading) return <PageSpinner />;

  const statCards = [
    { label: 'Total de Clientes', value: stats!.totalClients, sub: `${stats!.activeClients} ativos`, icon: <Users size={20} />, color: 'text-petrol-600', bg: 'bg-petrol-50' },
    { label: 'Diário Ativo', value: stats!.activeDiary ? 1 : 0, sub: stats!.activeDiary?.name || 'Nenhum ativo', icon: <BookOpen size={20} />, color: 'text-gold-600', bg: 'bg-gold-50' },
    { label: 'Respostas Hoje', value: stats!.todayEntries, sub: 'registros do dia', icon: <TrendingUp size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Relatórios', value: stats!.recentReports.length, sub: 'mais recentes', icon: <FileText size={20} />, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-dark font-serif">Dashboard</h1>
        <p className="text-dark/50 text-sm mt-1">Visão geral da plataforma</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <Card key={s.label}>
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
          <CardBody>
            {stats!.activeDiary ? (
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-emerald-500 shrink-0" />
                <div>
                  <div className="font-medium text-dark text-sm">{stats!.activeDiary.name}</div>
                  <div className="text-xs text-dark/40">Ativo desde {formatDate(stats!.activeDiary.updated_at)}</div>
                </div>
                <Badge variant="success" className="ml-auto">Ativo</Badge>
              </div>
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
                    <div className="text-sm font-medium text-dark">{(r.profile as Profile | null)?.name || '—'}</div>
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
