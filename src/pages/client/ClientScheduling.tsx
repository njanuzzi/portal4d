import { useCallback, useEffect, useMemo, useState } from 'react';
import { Video, Calendar, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const CAL_LINK = 'https://cal.com/nubia-januzzi-orbex7/sessao-de-mentoria';

interface Appointment {
  id: string;
  cal_booking_uid: string;
  title: string | null;
  start_time: string;
  end_time: string | null;
  zoom_join_url: string | null;
  status: 'scheduled' | 'cancelled' | 'rescheduled';
}

type DisplayStatus = Appointment['status'] | 'completed';

const statusLabel: Record<DisplayStatus, string> = {
  scheduled: 'Confirmado',
  completed: 'Realizada',
  cancelled: 'Cancelado',
  rescheduled: 'Remarcado',
};
const statusVariant: Record<DisplayStatus, 'success' | 'error' | 'warning' | 'neutral'> = {
  scheduled: 'success',
  completed: 'neutral',
  cancelled: 'error',
  rescheduled: 'warning',
};

// Sem um evento do Cal.com pra "sessão terminou", tratamos como realizada
// assim que o horário previsto de término (ou 1h após o início, se não
// tiver end_time) já passou — sem precisar de nenhuma marcação manual.
function displayStatus(appt: Appointment): DisplayStatus {
  if (appt.status !== 'scheduled') return appt.status;
  const endMs = appt.end_time ? new Date(appt.end_time).getTime() : new Date(appt.start_time).getTime() + 60 * 60 * 1000;
  return endMs < Date.now() ? 'completed' : 'scheduled';
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
  });
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function AppointmentCard({ appt }: { appt: Appointment }) {
  const status = displayStatus(appt);
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
            </div>
            <div className="text-sm font-medium text-dark capitalize">{formatDateTime(appt.start_time)}</div>
            {appt.title && <div className="text-xs text-dark/40 mt-0.5">{appt.title}</div>}
            {status === 'scheduled' && (
              <a
                href={`https://cal.com/booking/${appt.cal_booking_uid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-petrol-600 hover:text-petrol-800 underline underline-offset-2 mt-1 inline-block"
              >
                Cancelar ou reagendar
              </a>
            )}
          </div>
          {status === 'scheduled' && appt.zoom_join_url && (
            <a href={appt.zoom_join_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
              <Button size="sm">
                <Video size={14} />
                Entrar
                <ExternalLink size={12} />
              </Button>
            </a>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export function ClientScheduling() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => new Set([monthKey(new Date().toISOString())]));

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('appointments')
      .select('id, cal_booking_uid, title, start_time, end_time, zoom_join_url, status')
      .eq('client_id', user.id)
      .order('start_time', { ascending: true });
    setAppointments((data ?? []) as Appointment[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // O agendamento acontece dentro do iframe do Cal.com — nosso app só fica
  // sabendo quando o webhook grava no banco, então escuta em tempo real em
  // vez de exigir um refresh manual pra ver o agendamento novo aparecer.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`appointments-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `client_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const now = Date.now();
  const upcoming = appointments.filter((a) => a.status === 'scheduled' && new Date(a.start_time).getTime() >= now - 60 * 60 * 1000);

  // Histórico: tudo que não é próximo — cancelados e passados. Agrupado por
  // mês pra não virar uma lista infinita conforme o tempo passa.
  const historyGroups = useMemo(() => {
    const history = appointments
      .filter((a) => !upcoming.includes(a))
      .slice()
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    const groups = new Map<string, Appointment[]>();
    for (const appt of history) {
      const key = monthKey(appt.start_time);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(appt);
    }
    return Array.from(groups.entries()).map(([key, items]) => ({ key, items }));
  }, [appointments, upcoming]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-dark font-serif">Agendamento</h1>
        <p className="text-dark/50 text-sm mt-1">Marque sua sessão e acompanhe seus agendamentos</p>
      </div>

      <Card className="mb-6 overflow-hidden">
        <iframe
          src={CAL_LINK}
          title="Agendar sessão"
          className="w-full border-0"
          style={{ height: 700 }}
        />
      </Card>

      {loading ? (
        <PageSpinner />
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={<Calendar size={40} />}
          title="Nenhum agendamento ainda"
          description="Marque uma sessão acima para ela aparecer aqui"
        />
      ) : (
        <>
          <h2 className="text-sm font-semibold text-dark/60 uppercase tracking-wide mb-3">Próximos</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-dark/40 mb-6">Nenhum agendamento confirmado no momento.</p>
          ) : (
            <div className="space-y-3 mb-6">
              {upcoming.map((appt) => <AppointmentCard key={appt.id} appt={appt} />)}
            </div>
          )}

          {historyGroups.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-dark/60 uppercase tracking-wide mb-3">Histórico</h2>
              <div className="space-y-2">
                {historyGroups.map(({ key, items }) => {
                  const isOpen = expandedMonths.has(key);
                  return (
                    <div key={key}>
                      <button
                        type="button"
                        onClick={() => toggleMonth(key)}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-beige-100 hover:bg-beige-200 transition-colors text-left"
                      >
                        <span className="text-sm font-medium text-dark">{monthLabel(key)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-dark/40">{items.length}</span>
                          {isOpen ? <ChevronUp size={15} className="text-dark/40" /> : <ChevronDown size={15} className="text-dark/40" />}
                        </div>
                      </button>
                      {isOpen && (
                        <div className="space-y-3 mt-3">
                          {items.map((appt) => <AppointmentCard key={appt.id} appt={appt} />)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
