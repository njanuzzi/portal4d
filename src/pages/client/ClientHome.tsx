import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle, Clock, FileText, ChevronRight, Flame, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDateLong, todayISO } from '../../lib/format';

interface HomeData {
  todayFilled: boolean;
  totalEntries: number;
  streak: number;
  pendingReports: number;
  pastPendingCount: number;
}

function calcStreak(dates: string[], today: string): number {
  if (!dates.length) return 0;
  const set = new Set(dates);
  let streak = 0;
  const d = new Date(today + 'T00:00:00');
  while (true) {
    const iso = d.toISOString().split('T')[0];
    if (!set.has(iso)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function ClientHome() {
  const { user, profile } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);

  const today = todayISO();

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const [
        { data: entries },
        { count: reportCount },
      ] = await Promise.all([
        supabase
          .from('diary_entries')
          .select('date')
          .eq('user_id', user.id)
          .order('date', { ascending: false }),
        supabase
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('published', true),
      ]);

      const dates = (entries ?? []).map((e: { date: string }) => e.date);
      const todayFilled = dates.includes(today);
      const streak = calcStreak(dates, today);

      // Conta dias passados sem preenchimento desde o cadastro
      const filledSet = new Set(dates);
      const registeredAt = profile?.created_at
        ? profile.created_at.split('T')[0]
        : today;
      let pastPendingCount = 0;
      const start = new Date(registeredAt + 'T00:00:00');
      const todayDate = new Date(today + 'T00:00:00');
      for (let d = new Date(start); d < todayDate; d.setDate(d.getDate() + 1)) {
        const iso = d.toISOString().split('T')[0];
        if (!filledSet.has(iso)) pastPendingCount++;
      }

      setData({
        todayFilled,
        totalEntries: dates.length,
        streak,
        pendingReports: reportCount ?? 0,
        pastPendingCount,
      });
      setLoading(false);
    };

    load();
  }, [user, today]);

  if (loading) return <PageSpinner />;

  const firstName = profile?.name?.split(' ')[0] || 'Cliente';

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold text-dark font-serif">Olá, {firstName}!</h1>
        <p className="text-dark/50 text-sm mt-0.5 capitalize">{formatDateLong(today)}</p>
      </div>

      {/* Past pending days warning */}
      {data!.pastPendingCount > 0 && (
        <Link to="/diary/history" className="block">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100 transition-colors">
            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                {data!.pastPendingCount} dia{data!.pastPendingCount !== 1 ? 's' : ''} anterior{data!.pastPendingCount !== 1 ? 'es' : ''} sem preenchimento
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Toque para ver o histórico e preencher os dias em aberto
              </p>
            </div>
            <ChevronRight size={16} className="text-amber-500 shrink-0 mt-0.5" />
          </div>
        </Link>
      )}

      {/* Today's diary CTA */}
      {data!.todayFilled ? (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardBody className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle size={22} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-emerald-800">Diário de hoje preenchido!</div>
              <div className="text-xs text-emerald-600 mt-0.5">Parabéns por manter sua rotina</div>
            </div>
            <Link
              to="/diary/history"
              className="text-xs text-emerald-700 hover:text-emerald-900 flex items-center gap-1 shrink-0"
            >
              Ver <ChevronRight size={12} />
            </Link>
          </CardBody>
        </Card>
      ) : (
        <Card className="border-petrol-200">
          <CardBody className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-petrol-100 flex items-center justify-center shrink-0">
              <Clock size={22} className="text-petrol-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-dark">Diário de hoje pendente</div>
              <div className="text-xs text-dark/50 mt-0.5">Leva só alguns minutos</div>
            </div>
            <Link to="/diary">
              <Button size="sm">Preencher</Button>
            </Link>
          </CardBody>
        </Card>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardBody className="text-center py-4">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame size={16} className="text-orange-500" />
            </div>
            <div className="text-2xl font-semibold text-dark">{data!.streak}</div>
            <div className="text-xs text-dark/40 mt-0.5">dia{data!.streak !== 1 ? 's' : ''} seguido{data!.streak !== 1 ? 's' : ''}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-4">
            <div className="flex items-center justify-center gap-1 mb-1">
              <BookOpen size={16} className="text-petrol-500" />
            </div>
            <div className="text-2xl font-semibold text-dark">{data!.totalEntries}</div>
            <div className="text-xs text-dark/40 mt-0.5">registro{data!.totalEntries !== 1 ? 's' : ''} total</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-4">
            <div className="flex items-center justify-center gap-1 mb-1">
              <FileText size={16} className="text-gold-600" />
            </div>
            <div className="text-2xl font-semibold text-dark">{data!.pendingReports}</div>
            <div className="text-xs text-dark/40 mt-0.5">relatório{data!.pendingReports !== 1 ? 's' : ''}</div>
          </CardBody>
        </Card>
      </div>

      {/* Quick links */}
      <div className="space-y-2">
        <Link to="/diary/history" className="block">
          <Card className="hover:border-petrol-300 transition-colors cursor-pointer">
            <CardBody className="flex items-center gap-3 py-3.5">
              <div className="w-8 h-8 rounded-lg bg-petrol-50 flex items-center justify-center">
                <BookOpen size={16} className="text-petrol-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-dark">Histórico do diário</div>
                <div className="text-xs text-dark/40">{data!.totalEntries} registro{data!.totalEntries !== 1 ? 's' : ''}</div>
              </div>
              <ChevronRight size={16} className="text-dark/30" />
            </CardBody>
          </Card>
        </Link>

        <Link to="/reports" className="block">
          <Card className="hover:border-petrol-300 transition-colors cursor-pointer">
            <CardBody className="flex items-center gap-3 py-3.5">
              <div className="w-8 h-8 rounded-lg bg-gold-50 flex items-center justify-center">
                <FileText size={16} className="text-gold-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-dark">Meus relatórios</div>
                <div className="text-xs text-dark/40">{data!.pendingReports} disponível{data!.pendingReports !== 1 ? 'is' : ''}</div>
              </div>
              <ChevronRight size={16} className="text-dark/30" />
            </CardBody>
          </Card>
        </Link>
      </div>
    </div>
  );
}
