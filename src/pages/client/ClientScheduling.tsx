import { useEffect, useState } from 'react';
import { Video, Calendar, ExternalLink } from 'lucide-react';
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
  title: string | null;
  start_time: string;
  end_time: string | null;
  zoom_join_url: string | null;
  status: 'scheduled' | 'cancelled' | 'rescheduled';
}

const statusLabel: Record<Appointment['status'], string> = {
  scheduled: 'Confirmado',
  cancelled: 'Cancelado',
  rescheduled: 'Remarcado',
};
const statusVariant: Record<Appointment['status'], 'success' | 'error' | 'warning'> = {
  scheduled: 'success',
  cancelled: 'error',
  rescheduled: 'warning',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
  });
}

export function ClientScheduling() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('appointments')
      .select('id, title, start_time, end_time, zoom_join_url, status')
      .eq('client_id', user.id)
      .order('start_time', { ascending: true })
      .then(({ data }) => {
        setAppointments((data ?? []) as Appointment[]);
        setLoading(false);
      });
  }, [user]);

  const now = Date.now();
  const upcoming = appointments.filter((a) => a.status !== 'cancelled' && new Date(a.start_time).getTime() >= now - 60 * 60 * 1000);
  const past = appointments.filter((a) => !upcoming.includes(a));

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

      <h2 className="text-sm font-semibold text-dark/60 uppercase tracking-wide mb-3">Meus agendamentos</h2>

      {loading ? (
        <PageSpinner />
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={<Calendar size={40} />}
          title="Nenhum agendamento ainda"
          description="Marque uma sessão acima para ela aparecer aqui"
        />
      ) : (
        <div className="space-y-3">
          {[...upcoming, ...past].map((appt) => (
            <Card key={appt.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={statusVariant[appt.status]}>{statusLabel[appt.status]}</Badge>
                    </div>
                    <div className="text-sm font-medium text-dark capitalize">{formatDateTime(appt.start_time)}</div>
                    {appt.title && <div className="text-xs text-dark/40 mt-0.5">{appt.title}</div>}
                  </div>
                  {appt.status === 'scheduled' && appt.zoom_join_url && (
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
          ))}
        </div>
      )}
    </div>
  );
}
