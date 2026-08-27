import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SupabaseClient } from '@supabase/supabase-js';
import { ArrowLeft, CalendarClock, CheckCircle2, CheckSquare, ChevronDown, ChevronRight, Plus, RefreshCw, Square, X } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { formatDate, todayISO } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { ReportsTabs } from '../../components/ReportsTabs';
import { ReadStatusBadge } from '../../components/ReadStatusBadge';
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
  first_viewed_at?: string | null;
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
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [initializedCollapse, setInitializedCollapse] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkError, setBulkError] = useState('');

  const toggleMonth = (key: string) => {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const loadReports = async () => {
    if (!clientId) return null;
    const { data, error: reportsError } = await untypedSupabase
      .from('session_reports')
      .select('id, session_date, title, status, first_viewed_at')
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

      const [{ data: clientRow, error: clientError }, reportsData] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', clientId).eq('role', 'client').maybeSingle(),
        loadReports(),
      ]);

      if (cancelled) return;

      if (!initializedCollapse) {
        const monthKeys = Array.from(new Set((reportsData ?? []).map((r: SessionReportRow) => monthYearKey(r.session_date))));
        // Mês mais recente já vem aberto; o resto começa fechado pra a tela não ficar gigante.
        setCollapsedMonths(new Set(monthKeys.slice(1)));
        setInitializedCollapse(true);
      }

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

  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedIds(new Set());
    setBulkError('');
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectMonth = (monthReports: SessionReportRow[]) => {
    const ids = monthReports.map((r) => r.id);
    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(reports.map((r) => r.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkMarkReviewed = async () => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    setBulkError('');

    // Nunca rebaixa uma sessão já publicada — o cliente pode estar vendo
    // ela agora, e "revisado" some da tela dele.
    const ids = reports.filter((r) => selectedIds.has(r.id) && r.status !== 'publicado').map((r) => r.id);

    if (ids.length === 0) {
      setBulkUpdating(false);
      setSelectMode(false);
      setSelectedIds(new Set());
      return;
    }

    const { error: updateError } = await untypedSupabase
      .from('session_reports')
      .update({ status: 'revisado', reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .in('id', ids);

    setBulkUpdating(false);
    if (updateError) { setBulkError(updateError.message); return; }

    setSelectMode(false);
    setSelectedIds(new Set());
    await loadReports();
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
        <ReportsTabs clientId={client.id} active="sessions" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-dark font-serif">Sessões — {client.name}</h1>
            <p className="text-dark/50 text-sm mt-1">
              {reports.length} sessão{reports.length !== 1 ? 'ões' : ''} registrada{reports.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" loading={syncing} onClick={handleSync}>
              <RefreshCw size={16} />
              Sincronizar
            </Button>
            <Button variant="ghost" onClick={toggleSelectMode}>
              {selectMode ? <X size={16} /> : <CheckSquare size={16} />}
              {selectMode ? 'Cancelar seleção' : 'Selecionar'}
            </Button>
            <Button onClick={() => { setNewDate(todayISO()); setAddOpen(true); }}>
              <Plus size={16} />
              Nova sessão
            </Button>
          </div>
        </div>
      </div>

      {selectMode && (
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap rounded-lg border border-petrol-200 bg-petrol-50 px-4 py-3">
          <div className="text-sm text-dark/70">
            {selectedIds.size} sessão{selectedIds.size !== 1 ? 'ões' : ''} selecionada{selectedIds.size !== 1 ? 's' : ''}
            <button type="button" onClick={selectAll} className="ml-3 text-petrol-700 hover:underline">Selecionar todas</button>
            {selectedIds.size > 0 && (
              <button type="button" onClick={clearSelection} className="ml-3 text-dark/50 hover:underline">Limpar</button>
            )}
          </div>
          <Button size="sm" loading={bulkUpdating} disabled={selectedIds.size === 0} onClick={handleBulkMarkReviewed}>
            <CheckCircle2 size={14} />
            Marcar como revisado
          </Button>
        </div>
      )}

      {bulkError && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {bulkError}
        </div>
      )}

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
        <div className="space-y-3">
          {Array.from(groups.entries()).map(([key, groupReports]) => {
            const isOpen = !collapsedMonths.has(key);
            const monthAllSelected = selectMode && groupReports.every((r) => selectedIds.has(r.id));
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-2">
                  {selectMode && (
                    <button
                      type="button"
                      onClick={() => toggleSelectMonth(groupReports)}
                      className="shrink-0 text-dark/40 hover:text-petrol-700 transition-colors"
                      title="Selecionar o mês inteiro"
                    >
                      {monthAllSelected ? <CheckSquare size={16} className="text-petrol-700" /> : <Square size={16} />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleMonth(key)}
                    className="flex items-center gap-2 flex-1 text-left group"
                  >
                    {isOpen ? (
                      <ChevronDown size={16} className="text-dark/40 shrink-0" />
                    ) : (
                      <ChevronRight size={16} className="text-dark/40 shrink-0" />
                    )}
                    <h2 className="text-sm font-semibold text-dark/60 font-serif group-hover:text-dark/80 transition-colors">
                      {monthYearLabel(key)}
                    </h2>
                    <span className="text-xs text-dark/30">({groupReports.length})</span>
                  </button>
                </div>
                {isOpen && (
                  <Card>
                    <div className="divide-y divide-beige-200">
                      {groupReports.map((report) => {
                        const rowContent = (
                          <>
                            {selectMode && (
                              selectedIds.has(report.id)
                                ? <CheckSquare size={16} className="text-petrol-700 shrink-0" />
                                : <Square size={16} className="text-dark/30 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-dark">{formatDate(report.session_date)}</div>
                              {report.title && report.title !== formatDate(report.session_date) && (
                                <div className="text-xs text-dark/40 truncate mt-0.5">{report.title}</div>
                              )}
                            </div>
                            <Badge variant={STATUS_VARIANT[report.status]}>{STATUS_LABEL[report.status]}</Badge>
                            {report.status === 'publicado' && <ReadStatusBadge firstViewedAt={report.first_viewed_at} />}
                            {!selectMode && (
                              <ChevronRight size={16} className="text-dark/20 group-hover:text-dark/50 transition-colors shrink-0" />
                            )}
                          </>
                        );

                        return selectMode ? (
                          <button
                            key={report.id}
                            type="button"
                            onClick={() => toggleSelected(report.id)}
                            className="flex items-center gap-4 px-6 py-4 hover:bg-beige-50 transition-colors group w-full text-left"
                          >
                            {rowContent}
                          </button>
                        ) : (
                          <Link
                            key={report.id}
                            to={`/reports/${client.id}/sessions/${report.id}`}
                            className="flex items-center gap-4 px-6 py-4 hover:bg-beige-50 transition-colors group"
                          >
                            {rowContent}
                          </Link>
                        );
                      })}
                    </div>
                  </Card>
                )}
              </div>
            );
          })}
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
