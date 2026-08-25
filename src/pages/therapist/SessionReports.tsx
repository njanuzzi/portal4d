import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SupabaseClient } from '@supabase/supabase-js';
import { ArrowLeft, CalendarClock, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { formatDate, todayISO } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../lib/database.types';

// session_reports não está no database.types.ts (tabela nova) — mesmo padrão
// de client não tipado usado em outras tabelas recentes (leads, QuizInstagram).
const untypedSupabase = supabase as unknown as SupabaseClient;

type ClientProfile = Profile;
type SessionReportStatus = 'rascunho' | 'revisado' | 'publicado';
interface SessionReportRow {
  id: string;
  session_date: string;
  title: string;
  status: SessionReportStatus;
}

const STATUS_VARIANT: Record<SessionReportStatus, 'neutral' | 'warning' | 'success'> = {
  rascunho: 'neutral',
  revisado: 'warning',
  publicado: 'success',
};
const STATUS_LABEL: Record<SessionReportStatus, string> = {
  rascunho: 'Rascunho',
  revisado: 'Revisado',
  publicado: 'Publicado',
};

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function monthYearKey(dateStr: string) {
  return dateStr.slice(0, 7); // "AAAA-MM"
}

function monthYearLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} de ${year}`;
}

export function SessionReports() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [reports, setReports] = useState<SessionReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newDate, setNewDate] = useState(todayISO());
  const [adding, setAdding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const loadReports = async () => {
    if (!clientId) return null;
    const { data, error: reportsError } = await untypedSupabase
      .from('session_reports')
      .select('id, session_date, title, status')
      .eq('client_id', clientId)
      .order('session_date', { ascending: false });
    setReports((data ?? []) as SessionReportRow[]);
    if (reportsError) setError(reportsError.message);
    return data;
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!clientId) return;
      setLoading(true);
      setError('');

      const [{ data: clientRow, error: clientError }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', clientId).eq('role', 'client').maybeSingle(),
        loadReports(),
      ]);

      if (cancelled) return;

      setClient((clientRow ?? null) as ClientProfile | null);
      setError(clientError?.message || '');
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleSync = async () => {
    if (!clientId) return;
    setSyncing(true);
    setSyncMessage('');
    setError('');

    const { data, error: fnError } = await supabase.functions.invoke('sync-notion-sessions', {
      body: { client_id: clientId },
    });

    setSyncing(false);
    if (fnError || data?.error) {
      setError(data?.error || fnError?.message || 'Não foi possível sincronizar agora.');
      return;
    }

    const parts: string[] = [];
    if (data.synced) parts.push(`${data.synced} nova${data.synced !== 1 ? 's' : ''}`);
    if (data.adopted) parts.push(`${data.adopted} preenchida${data.adopted !== 1 ? 's' : ''} num rascunho existente`);
    if (data.skipped) parts.push(`${data.skipped} já sincronizada${data.skipped !== 1 ? 's' : ''} antes`);
    setSyncMessage(parts.length > 0 ? `Sincronizado: ${parts.join(', ')}.` : (data.message || 'Nenhuma sessão nova encontrada.'));
    if (data.errors?.length) setError(data.errors.join(' '));

    await loadReports();
  };

  const handleAdd = async () => {
    if (!clientId || !newDate) return;
    setAdding(true);

    const title = formatDate(newDate);
    const { data, error: insertError } = await untypedSupabase
      .from('session_reports')
      .insert({ client_id: clientId, session_date: newDate, title, content_html: '', status: 'rascunho' })
      .select('id')
      .single();

    setAdding(false);
    if (insertError) { setError(insertError.message); return; }
    navigate(`/reports/${clientId}/sessions/${data.id}`);
  };

  if (loading) return <PageSpinner />;

  if (!client) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link to="/reports" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Relatórios
        </Link>
        <EmptyState icon={<CalendarClock size={40} />} title="Cliente não encontrado" description={error} />
      </div>
    );
  }

  const groups = reports.reduce<Map<string, SessionReportRow[]>>((acc, report) => {
    const key = monthYearKey(report.session_date);
    const list = acc.get(key) ?? [];
    list.push(report);
    acc.set(key, list);
    return acc;
  }, new Map());

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to={`/reports/${client.id}`} className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Relatórios
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-dark font-serif">Relatórios de Sessão — {client.name}</h1>
            <p className="text-dark/50 text-sm mt-1">
              {reports.length} sessão{reports.length !== 1 ? 'ões' : ''} registrada{reports.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" loading={syncing} onClick={handleSync}>
              <RefreshCw size={16} />
              Sincronizar
            </Button>
            <Button onClick={() => { setNewDate(todayISO()); setAddOpen(true); }}>
              <Plus size={16} />
              Nova sessão
            </Button>
          </div>
        </div>
      </div>

      {syncMessage && (
        <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {syncMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {reports.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={40} />}
          title="Nenhum relatório de sessão ainda"
          description="Sincronize com o Notion ou adicione a primeira sessão manualmente"
          action={
            <div className="flex gap-2">
              <Button variant="ghost" loading={syncing} onClick={handleSync}><RefreshCw size={16} />Sincronizar</Button>
              <Button onClick={() => { setNewDate(todayISO()); setAddOpen(true); }}><Plus size={16} />Nova sessão</Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([key, groupReports]) => (
            <div key={key}>
              <h2 className="text-sm font-semibold text-dark/60 font-serif mb-2">{monthYearLabel(key)}</h2>
              <Card>
                <div className="divide-y divide-beige-200">
                  {groupReports.map((report) => (
                    <Link
                      key={report.id}
                      to={`/reports/${client.id}/sessions/${report.id}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-beige-50 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-dark">{formatDate(report.session_date)}</div>
                        {report.title && report.title !== formatDate(report.session_date) && (
                          <div className="text-xs text-dark/40 truncate mt-0.5">{report.title}</div>
                        )}
                      </div>
                      <Badge variant={STATUS_VARIANT[report.status]}>{STATUS_LABEL[report.status]}</Badge>
                      <ChevronRight size={16} className="text-dark/20 group-hover:text-dark/50 transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Nova sessão" size="sm">
        <div className="space-y-4">
          <Input
            label="Data da sessão"
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            required
            autoFocus
          />
          <div className="flex gap-3 pt-2">
            <Button onClick={handleAdd} loading={adding} disabled={!newDate} className="flex-1">
              Criar rascunho
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
