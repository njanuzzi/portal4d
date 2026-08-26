import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SupabaseClient } from '@supabase/supabase-js';
import { ArrowLeft, CalendarClock, Download, Eye, FileText, Pencil, Plus, Sparkles, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { formatDate } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import DOMPurify from 'dompurify';
import type { Profile, Report } from '../../lib/database.types';

// session_reports não está no database.types.ts (tabela nova) — mesmo padrão
// de client não tipado usado em SessionReports.tsx.
const untypedSupabase = supabase as unknown as SupabaseClient;

type SessionReportStatus = 'rascunho' | 'revisado' | 'publicado';
interface SessionOption {
  id: string;
  session_date: string;
  title: string;
  status: SessionReportStatus;
}

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

function lastDayOfMonth(key: string) {
  const [year, month] = key.split('-').map(Number);
  return String(new Date(year, month, 0).getDate()).padStart(2, '0');
}

type ClientProfile = Profile & { diary_id?: string | null };
type ReportRow = Pick<Report, 'id' | 'user_id' | 'period_start' | 'period_end' | 'content_text' | 'published' | 'created_at'> & {
  active?: boolean | null;
};
type WeekOption = {
  weekNumber: number;
  startDate: string;
  endDate: string;
  entryCount: number;
};
type DiaryEntryRow = { id: string; date: string };
type EntryAnswerRow = {
  entry_id: string;
  question_id: string;
  answer_text: string | null;
  answer_value: number | null;
};
type DiaryQuestionRow = {
  id: string;
  order_num: number;
  text: string;
  type: string;
};
type DayNoteRow = {
  noted_at: string;
  content: string | null;
  emotions: { label: string; intensity: number }[] | null;
};

const REPORT_SELECT = 'id, user_id, period_start, period_end, content_text, published, active, created_at';
const CSV_HEADERS = ['data', 'horario', 'secao', 'pergunta_ou_conteudo', 'tipo', 'resposta_texto', 'resposta_valor', 'emocoes'];

function stripHtml(value: string) {
  const container = document.createElement('div');
  container.innerHTML = DOMPurify.sanitize(value);
  return container.textContent ?? container.innerText ?? '';
}

function getReportTitle(content: string) {
  const container = document.createElement('div');
  container.innerHTML = DOMPurify.sanitize(content);
  const heading = container.querySelector('h2');
  const text = heading?.textContent?.trim() || stripHtml(content).trim();
  return text.split('\n')[0] || 'Relatório clínico';
}

function parseISODate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: string, days: number) {
  const parsed = parseISODate(date);
  parsed.setDate(parsed.getDate() + days);
  return toISODate(parsed);
}

function todayISO() {
  return toISODate(new Date());
}

function formatShortDate(date: string) {
  return parseISODate(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatCsvDate(date: string) {
  return parseISODate(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function dateRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  let current = startDate;

  while (current <= endDate) {
    dates.push(current);
    current = addDays(current, 1);
  }

  return dates;
}

function buildWeeks(entryDates: string[]) {
  if (entryDates.length === 0) return [];

  const today = todayISO();
  const firstDate = entryDates[0];
  const weeks: WeekOption[] = [];
  let startDate = firstDate;
  let weekNumber = 1;

  while (startDate <= today) {
    const fullEndDate = addDays(startDate, 6);
    const endDate = fullEndDate > today ? today : fullEndDate;
    const entryCount = entryDates.filter((date) => date >= startDate && date <= endDate).length;

    weeks.push({ weekNumber, startDate, endDate, entryCount });
    startDate = addDays(startDate, 7);
    weekNumber += 1;
  }

  return weeks;
}

function csvCell(value: string | number | null | undefined) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsv(rows: Array<Array<string | number | null | undefined>>) {
  const lines = [CSV_HEADERS, ...rows].map((row) => row.map(csvCell).join(','));
  return `${String.fromCharCode(0xfeff)}${lines.join(String.fromCharCode(10))}`;
}

function formatNoteTime(isoString: string) {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatNoteDate(isoString: string) {
  const d = new Date(isoString);
  return toISODate(d);
}

function sanitizeFilePart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'cliente';
}

function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ReportsByClient() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewReport, setPreviewReport] = useState<ReportRow | null>(null);
  const [deleteReport, setDeleteReport] = useState<ReportRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [togglingReportId, setTogglingReportId] = useState<string | null>(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvExporting, setCsvExporting] = useState(false);
  const [csvMessage, setCsvMessage] = useState('');
  const [weekOptions, setWeekOptions] = useState<WeekOption[]>([]);
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number | null>(null);

  const [monthlyModalOpen, setMonthlyModalOpen] = useState(false);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyError, setMonthlyError] = useState('');
  const [sessionsByMonth, setSessionsByMonth] = useState<Map<string, SessionOption[]>>(new Map());
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [checkedSessionIds, setCheckedSessionIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [schemaReportAvailable, setSchemaReportAvailable] = useState(false);
  const [includeSchemaReport, setIncludeSchemaReport] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!clientId) return;

      setLoading(true);
      setError('');

      const [{ data: clientRow, error: clientError }, { data: reportRows, error: reportsError }] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', clientId)
          .eq('role', 'client')
          .maybeSingle(),
        (supabase as any)
          .from('reports')
          .select(REPORT_SELECT)
          .eq('user_id', clientId)
          .order('created_at', { ascending: false }),
      ]);

      if (cancelled) return;

      setClient((clientRow ?? null) as ClientProfile | null);
      setReports((reportRows ?? []) as ReportRow[]);
      setError(clientError?.message || reportsError?.message || '');
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const selectedWeek = weekOptions.find((week) => week.weekNumber === selectedWeekNumber) ?? null;

  const openCsvModal = async () => {
    if (!clientId) return;

    setCsvModalOpen(true);
    setCsvLoading(true);
    setCsvMessage('');

    const { data: entryRows, error: entriesError } = await supabase
      .from('diary_entries')
      .select('id, date')
      .eq('user_id', clientId);

    if (entriesError) {
      setCsvMessage(entriesError.message);
      setCsvLoading(false);
      return;
    }

    const entries = (entryRows ?? []) as DiaryEntryRow[];
    const entryDates = entries.map(({ date }) => date).sort();

    if (entryDates.length === 0) {
      setCsvMessage('Nenhuma entrada de diário encontrada para este cliente.');
      setCsvLoading(false);
      return;
    }

    const weeks = buildWeeks(entryDates);
    setWeekOptions(weeks);
    setSelectedWeekNumber(weeks.length > 0 ? weeks[weeks.length - 1].weekNumber : null);
    setCsvLoading(false);
  };

  const handleExportCsv = async () => {
    if (!clientId || !selectedWeek) return;

    setCsvExporting(true);

    const periodDates = dateRange(selectedWeek.startDate, selectedWeek.endDate);

    // 1. Busca entradas do diário + anotações da semana em paralelo
    const { data: entryRows, error: entriesError } = await supabase
      .from('diary_entries')
      .select('id, date')
      .eq('user_id', clientId)
      .in('date', periodDates);

    if (entriesError) {
      console.error('CSV export error:', entriesError);
      setCsvExporting(false);
      return;
    }

    const entryIds = (entryRows ?? []).map((e: DiaryEntryRow) => e.id);

    // 2. Busca respostas, perguntas e anotações em paralelo
    const [
      { data: answerRows, error: answersError },
      { data: questionRows, error: questionsError },
      { data: noteRows, error: notesError },
    ] = await Promise.all([
      entryIds.length > 0
        ? supabase
            .from('entry_answers')
            .select('entry_id, question_id, answer_text, answer_value')
            .in('entry_id', entryIds)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from('diary_questions')
        .select('id, order_num, text, type')
        .order('order_num', { ascending: true }),
      supabase
        .from('day_notes')
        .select('noted_at, content, emotions')
        .eq('user_id', clientId)
        .gte('noted_at', `${selectedWeek.startDate}T00:00:00`)
        .lte('noted_at', `${selectedWeek.endDate}T23:59:59`)
        .order('noted_at', { ascending: true }),
    ]);

    if (answersError || questionsError || notesError) {
      console.error('CSV export error:', answersError || questionsError || notesError);
      setCsvExporting(false);
      return;
    }

    const entries = (entryRows ?? []) as DiaryEntryRow[];
    const answers = (answerRows ?? []) as EntryAnswerRow[];
    const questions = (questionRows ?? []) as DiaryQuestionRow[];
    const notes = (noteRows ?? []) as DayNoteRow[];

    const answerMap = new Map<string, Map<string, EntryAnswerRow>>();
    for (const answer of answers) {
      const entryMap = answerMap.get(answer.entry_id) ?? new Map();
      entryMap.set(answer.question_id, answer);
      answerMap.set(answer.entry_id, entryMap);
    }

    const csvRows: Array<Array<string | number | null | undefined>> = [];

    // Seção Diário
    for (const entry of entries) {
      const entryAnswers = answerMap.get(entry.id) ?? new Map();
      for (const question of questions) {
        const answer = entryAnswers.get(question.id);
        csvRows.push([
          formatCsvDate(entry.date),
          '',
          'Diário',
          question.text,
          question.type,
          answer?.answer_text ?? null,
          answer?.answer_value ?? null,
          '',
        ]);
      }
    }

    // Seção Anotações
    for (const note of notes) {
      const emotions = (note.emotions ?? [])
        .map((e) => `${e.label} (${e.intensity})`)
        .join(' | ');
      csvRows.push([
        formatCsvDate(formatNoteDate(note.noted_at)),
        formatNoteTime(note.noted_at),
        'Anotação',
        note.content ?? '',
        'nota',
        null,
        null,
        emotions || null,
      ]);
    }

    const csvContent = buildCsv(csvRows);
    const filename = `diario_${sanitizeFilePart(client?.name ?? 'cliente')}_semana_${selectedWeek.weekNumber}.csv`;

    downloadCsv(filename, csvContent);
    setCsvExporting(false);
  };

  const handleToggleActive = async (report: ReportRow) => {
    setTogglingReportId(report.id);

    const newActive = !report.active;
    const { error: updateError } = await supabase
      .from('reports')
      .update({ active: newActive })
      .eq('id', report.id);

    if (updateError) {
      console.error('Toggle active error:', updateError);
    } else {
      setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, active: newActive } : r)));
    }

    setTogglingReportId(null);
  };

  const handleDelete = async () => {
    if (!deleteReport) return;

    setDeleteLoading(true);

    const { error: deleteError } = await supabase
      .from('reports')
      .delete()
      .eq('id', deleteReport.id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
    } else {
      setReports((prev) => prev.filter((r) => r.id !== deleteReport.id));
      setDeleteReport(null);
    }

    setDeleteLoading(false);
  };

  const openMonthlyModal = async () => {
    if (!clientId) return;

    setMonthlyModalOpen(true);
    setMonthlyLoading(true);
    setMonthlyError('');
    setIncludeSchemaReport(false);

    const [{ data, error: sessionsError }, { data: schemaReports, error: schemaError }] = await Promise.all([
      untypedSupabase
        .from('session_reports')
        .select('id, session_date, title, status')
        .eq('client_id', clientId)
        .in('status', ['revisado', 'publicado'])
        .order('session_date', { ascending: false }),
      untypedSupabase
        .from('client_schema_reports')
        .select('id')
        .eq('client_id', clientId)
        .in('status', ['reviewed', 'published'])
        .not('technical_content', 'is', null)
        .limit(1),
    ]);

    if (sessionsError) {
      setMonthlyError(sessionsError.message);
      setMonthlyLoading(false);
      return;
    }

    setSchemaReportAvailable(!schemaError && (schemaReports ?? []).length > 0);

    const sessions = (data ?? []) as SessionOption[];
    const groups = sessions.reduce<Map<string, SessionOption[]>>((acc, session) => {
      const key = monthYearKey(session.session_date);
      const list = acc.get(key) ?? [];
      list.push(session);
      acc.set(key, list);
      return acc;
    }, new Map());

    setSessionsByMonth(groups);

    if (groups.size === 0) {
      setSelectedMonthKey(null);
      setCheckedSessionIds(new Set());
    } else {
      const mostRecentKey = Array.from(groups.keys())[0];
      setSelectedMonthKey(mostRecentKey);
      setCheckedSessionIds(new Set((groups.get(mostRecentKey) ?? []).map((s) => s.id)));
    }

    setMonthlyLoading(false);
  };

  const handleMonthChange = (key: string) => {
    setSelectedMonthKey(key);
    setCheckedSessionIds(new Set((sessionsByMonth.get(key) ?? []).map((s) => s.id)));
  };

  const toggleSessionChecked = (id: string) => {
    setCheckedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerateMonthlyReport = async () => {
    if (!clientId || !selectedMonthKey || checkedSessionIds.size === 0) return;

    setGenerating(true);
    setMonthlyError('');

    const periodStart = `${selectedMonthKey}-01`;
    const periodEnd = `${selectedMonthKey}-${lastDayOfMonth(selectedMonthKey)}`;

    const { data, error: fnError } = await supabase.functions.invoke('generate-monthly-report', {
      body: {
        client_id: clientId,
        period_start: periodStart,
        period_end: periodEnd,
        session_report_ids: Array.from(checkedSessionIds),
        include_schema_report: includeSchemaReport,
      },
    });

    setGenerating(false);

    if (fnError || data?.error) {
      setMonthlyError(data?.error || fnError?.message || 'Não foi possível gerar o fechamento agora.');
      return;
    }

    setMonthlyModalOpen(false);
    navigate(`/reports/${clientId}/edit/${data.report_id}`);
  };

  if (loading) return <PageSpinner />;

  if (!client) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link to="/reports" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Relatórios
        </Link>
        <EmptyState
          icon={<FileText size={40} />}
          title="Cliente não encontrado"
          description={error || 'Não foi possível carregar os relatórios deste cliente'}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/reports" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Relatórios
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-dark font-serif">Relatórios - {client.name}</h1>
            <p className="text-dark/50 text-sm mt-1">{reports.length} relatório{reports.length !== 1 ? 's' : ''} cadastrado{reports.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Link to={`/reports/${client.id}/sessions`}>
              <Button variant="ghost">
                <CalendarClock size={16} />
                Relatórios de Sessão
              </Button>
            </Link>
            <Button variant="ghost" onClick={openCsvModal}>
              <Download size={16} />
              Exportar CSV
            </Button>
            <Button variant="ghost" onClick={openMonthlyModal}>
              <Sparkles size={16} />
              Gerar Fechamento com IA
            </Button>
            <Link to={`/reports/${client.id}/new`}>
              <Button>
                <Plus size={16} />
                Novo Relatório
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {reports.length === 0 ? (
        <EmptyState
          icon={<FileText size={40} />}
          title="Nenhum relatório criado"
          description="Crie o primeiro relatório deste cliente"
          action={
            <Link to={`/reports/${client.id}/new`}>
              <Button><Plus size={16} />Criar Primeiro Relatório</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const isInactive = report.active === false;

            return (
              <Card key={report.id} className={isInactive ? 'opacity-70 bg-beige-50' : ''}>
                <CardBody className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <div className={`font-medium text-sm ${isInactive ? 'text-dark/50' : 'text-dark'}`}>{getReportTitle(report.content_text)}</div>
                      <Badge variant={report.published ? 'success' : 'neutral'}>
                        {report.published ? 'Publicado' : 'Rascunho'}
                      </Badge>
                      <Badge variant={isInactive ? 'neutral' : 'success'}>
                        {isInactive ? 'Inativo' : 'Ativo'}
                      </Badge>
                    </div>
                    <div className="text-xs text-dark/50">
                      {formatDate(report.period_start)} — {formatDate(report.period_end)}
                    </div>
                    <div className="text-xs text-dark/35 mt-1">Criado em {formatDate(report.created_at)}</div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setPreviewReport(report)}>
                      <Eye size={14} />
                      Ver
                    </Button>
                    <Link to={`/reports/${client.id}/edit/${report.id}`}>
                      <Button variant="ghost" size="sm">
                        <Pencil size={14} />
                        Editar
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={togglingReportId === report.id}
                      onClick={() => handleToggleActive(report)}
                    >
                      {isInactive ? <ToggleLeft size={14} /> : <ToggleRight size={14} className="text-emerald-500" />}
                      {isInactive ? 'Ativar' : 'Desativar'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteReport(report)}>
                      <Trash2 size={14} className="text-red-400" />
                      Excluir
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        title="Exportar CSV"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-dark/60">
            Selecione uma semana de respostas do diário emocional para exportar.
          </p>

          {csvLoading ? (
            <div className="text-sm text-dark/40 py-4">Carregando semanas disponíveis...</div>
          ) : weekOptions.length === 0 ? (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {csvMessage || 'Nenhuma semana disponível para exportação.'}
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {weekOptions.map((week) => (
                <label
                  key={week.weekNumber}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${selectedWeekNumber === week.weekNumber ? 'border-petrol-400 bg-petrol-50' : 'border-beige-300 bg-white hover:bg-beige-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="csv-week"
                      checked={selectedWeekNumber === week.weekNumber}
                      onChange={() => setSelectedWeekNumber(week.weekNumber)}
                      className="h-4 w-4 border-beige-300 text-petrol-700 focus:ring-petrol-400"
                    />
                    <div>
                      <div className="text-sm font-medium text-dark">
                        Semana {week.weekNumber} — {formatShortDate(week.startDate)} a {formatShortDate(week.endDate)}
                      </div>
                      <div className="text-xs text-dark/40">
                        {week.entryCount} registro{week.entryCount !== 1 ? 's' : ''} no período
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {selectedWeek && selectedWeek.entryCount === 0 && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Não há dados nesta semana. O CSV será exportado apenas com o cabeçalho.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleExportCsv}
              loading={csvExporting}
              disabled={!selectedWeek || csvLoading}
              className="flex-1"
            >
              <Download size={16} />
              Exportar
            </Button>
            <Button type="button" variant="ghost" onClick={() => setCsvModalOpen(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={monthlyModalOpen}
        onClose={() => setMonthlyModalOpen(false)}
        title="Gerar Fechamento com IA"
        size="md"
      >
        <div className="space-y-4">
          {monthlyLoading ? (
            <div className="text-sm text-dark/40 py-4">Carregando sessões...</div>
          ) : sessionsByMonth.size === 0 ? (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Este cliente não tem nenhuma sessão revisada ou publicada ainda. Revise ao menos uma sessão em Relatórios de Sessão antes de gerar o fechamento.
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-dark/80 mb-1.5 block">Mês</label>
                <select
                  value={selectedMonthKey ?? ''}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-beige-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-petrol-400 text-dark"
                >
                  {Array.from(sessionsByMonth.keys()).map((key) => (
                    <option key={key} value={key}>{monthYearLabel(key)}</option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-sm text-dark/60 mb-2">
                  Escolha quais sessões entram no fechamento — todas do mês vêm marcadas por padrão.
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {(sessionsByMonth.get(selectedMonthKey ?? '') ?? []).map((session) => (
                    <label
                      key={session.id}
                      className="flex items-center gap-3 rounded-lg border border-beige-300 bg-white px-3 py-2.5 cursor-pointer hover:bg-beige-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checkedSessionIds.has(session.id)}
                        onChange={() => toggleSessionChecked(session.id)}
                        className="h-4 w-4 rounded border-beige-300 text-petrol-700 focus:ring-petrol-400"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-dark">{formatDate(session.session_date)}</div>
                        {session.title && session.title !== formatDate(session.session_date) && (
                          <div className="text-xs text-dark/40 truncate">{session.title}</div>
                        )}
                      </div>
                      <Badge variant={session.status === 'publicado' ? 'success' : 'warning'}>
                        {session.status === 'publicado' ? 'Publicado' : 'Revisado'}
                      </Badge>
                    </label>
                  ))}
                </div>
              </div>

              {schemaReportAvailable && (
                <label className="flex items-center gap-3 rounded-lg border border-beige-300 bg-white px-3 py-2.5 cursor-pointer hover:bg-beige-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeSchemaReport}
                    onChange={(e) => setIncludeSchemaReport(e.target.checked)}
                    className="h-4 w-4 rounded border-beige-300 text-petrol-700 focus:ring-petrol-400"
                  />
                  <div>
                    <div className="text-sm font-medium text-dark">Incluir devolutiva de esquemas</div>
                    <div className="text-xs text-dark/40">Usa o relatório técnico do Inventário de Esquemas como contexto extra — sem citar jargão no texto final</div>
                  </div>
                </label>
              )}
            </>
          )}

          {monthlyError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {monthlyError}
            </div>
          )}

          {sessionsByMonth.size > 0 && (
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleGenerateMonthlyReport}
                loading={generating}
                disabled={monthlyLoading || checkedSessionIds.size === 0}
                className="flex-1"
              >
                <Sparkles size={16} />
                Gerar ({checkedSessionIds.size} sessão{checkedSessionIds.size !== 1 ? 'ões' : ''})
              </Button>
              <Button type="button" variant="ghost" onClick={() => setMonthlyModalOpen(false)}>Cancelar</Button>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={!!previewReport}
        onClose={() => setPreviewReport(null)}
        title={previewReport ? getReportTitle(previewReport.content_text) : 'Relatório'}
        size="lg"
      >
        <div className="mb-4 flex items-center gap-2 flex-wrap text-xs text-dark/40">
          <span>{previewReport ? formatDate(previewReport.period_start) : ''} — {previewReport ? formatDate(previewReport.period_end) : ''}</span>
          {previewReport && <Badge variant={previewReport.published ? 'success' : 'neutral'}>{previewReport.published ? 'Publicado' : 'Rascunho'}</Badge>}
        </div>
        <div
          className="text-dark/80 leading-relaxed text-sm space-y-3"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewReport?.content_text ?? '') }}
        />
      </Modal>

      <Modal open={!!deleteReport} onClose={() => setDeleteReport(null)} title="Excluir Relatório" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-dark/70">Tem certeza? Esta ação não pode ser desfeita.</p>
          <div className="flex gap-3">
            <Button variant="danger" loading={deleteLoading} onClick={handleDelete} className="flex-1">
              Excluir
            </Button>
            <Button variant="ghost" onClick={() => setDeleteReport(null)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
