import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, Mail, Calendar, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDate } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { Profile, Diary, DiaryEntry } from '../../lib/database.types';

type ClientProfile = Profile & { diary_id?: string | null };

function lastSevenDaysStartISO() {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return date.toISOString().split('T')[0];
}

export function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [linkedDiary, setLinkedDiary] = useState<Diary | null>(null);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [last7Count, setLast7Count] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchClientDetail = async () => {
      if (!id) {
        setClient(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      setActionError('');
      setLinkedDiary(null);
      setEntries([]);
      setLast7Count(0);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .eq('role', 'client')
        .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        setClient(null);
        setError(profileError.message);
        setLoading(false);
        return;
      }

      if (!profile) {
        setClient(null);
        setLoading(false);
        return;
      }

      const loadedClient = profile as ClientProfile;
      setClient(loadedClient);

      const { data: entryRows, error: entriesError } = await supabase
        .from('diary_entries')
        .select('id, user_id, diary_id, date, created_at')
        .eq('user_id', id)
        .order('date', { ascending: false })
        .limit(10);

      const { count, error: countError } = await supabase
        .from('diary_entries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', id)
        .gte('date', lastSevenDaysStartISO());

      let diaryRow: Diary | null = null;
      let diaryErrorMessage = '';

      if (loadedClient.diary_id) {
        const { data: diary, error: diaryError } = await supabase
          .from('diaries')
          .select('id, name, is_active, created_at')
          .eq('id', loadedClient.diary_id)
          .maybeSingle();

        diaryRow = diary;
        diaryErrorMessage = diaryError?.message ?? '';
      }

      if (cancelled) return;

      setEntries((entryRows ?? []) as DiaryEntry[]);
      setLast7Count(count ?? 0);
      setLinkedDiary(diaryRow);

      const loadError = entriesError?.message || countError?.message || diaryErrorMessage;
      if (loadError) setError(loadError);
      setLoading(false);
    };

    fetchClientDetail();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const toggleActive = async () => {
    if (!client) return;

    setActionError('');
    setToggling(true);

    const { data: updatedClient, error: updateError } = await supabase
      .from('profiles')
      .update({ active: !client.active })
      .eq('id', client.id)
      .select()
      .single();

    if (updateError || !updatedClient) {
      setActionError(updateError?.message ?? 'Não foi possível atualizar o status do cliente.');
      setToggling(false);
      return;
    }

    setClient(updatedClient as ClientProfile);
    setToggling(false);
  };

  if (loading) return <PageSpinner />;
  if (!client) return (
    <div className="p-6">
      <p className="text-dark/50">Cliente não encontrado.</p>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      <Link to="/clients" className="text-petrol-700 hover:underline text-sm">Voltar</Link>
    </div>
  );

  const diaryName = client.diary_id
    ? linkedDiary?.name ?? 'Diário não encontrado'
    : 'Não vinculado';

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to="/clients" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Clientes
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${client.active ? 'bg-petrol-100' : 'bg-beige-200 opacity-70'}`}>
              <span className={`font-semibold text-xl ${client.active ? 'text-petrol-700' : 'text-dark/40'}`}>
                {client.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <div>
              <h1 className={`text-2xl font-semibold font-serif ${client.active ? 'text-dark' : 'text-dark/50'}`}>{client.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={client.active ? 'success' : 'neutral'}>
                  {client.active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            loading={toggling}
            onClick={toggleActive}
            className="shrink-0"
          >
            {client.active ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} />}
            {client.active ? 'Desativar' : 'Ativar'}
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {actionError}
        </div>
      )}

      {error && (
        <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <CardBody className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail size={16} className="text-dark/30 shrink-0" />
            <span className="text-dark/70">{client.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <BookOpen size={16} className="text-dark/30 shrink-0" />
            <span className="text-dark/70">Diário vinculado: {diaryName}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar size={16} className="text-dark/30 shrink-0" />
            <span className="text-dark/70">Cadastrado em {formatDate(client.created_at)}</span>
          </div>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="font-semibold text-dark font-serif">Timeline do diário</h2>
              <p className="text-xs text-dark/40 mt-1">Últimas entradas registradas</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-semibold text-petrol-700">{last7Count}</div>
              <div className="text-xs text-dark/40">Últimos 7 dias: {last7Count} entrada{last7Count !== 1 ? 's' : ''}</div>
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="text-sm text-dark/40 border border-dashed border-beige-300 rounded-lg px-4 py-6 text-center">
              Nenhuma entrada de diário registrada ainda.
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-gold-500 mt-1" />
                    <div className="w-px flex-1 bg-beige-200 mt-2" />
                  </div>
                  <div className="pb-3 flex-1 min-w-0">
                    <div className="text-sm font-medium text-dark">{formatDate(entry.date)}</div>
                    <div className="text-xs text-dark/40 mt-0.5">Registrado em {formatDate(entry.created_at)}</div>
                    <div className="text-xs text-dark/40 mt-1 truncate">
                      Diário: {linkedDiary?.id === entry.diary_id ? linkedDiary.name : entry.diary_id}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link to={`/clients/${id}/entries`}>
          <Card className="hover:border-petrol-300 transition-colors cursor-pointer">
            <CardBody className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-petrol-50 flex items-center justify-center">
                <BookOpen size={18} className="text-petrol-700" />
              </div>
              <div>
                <div className="font-medium text-dark text-sm">Ver Registros</div>
                <div className="text-xs text-dark/40">Respostas do diário</div>
              </div>
            </CardBody>
          </Card>
        </Link>
        <Link to={`/clients/${id}/reports`}>
          <Card className="hover:border-petrol-300 transition-colors cursor-pointer">
            <CardBody className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold-50 flex items-center justify-center">
                <FileText size={18} className="text-gold-600" />
              </div>
              <div>
                <div className="font-medium text-dark text-sm">Relatórios</div>
                <div className="text-xs text-dark/40">Ver e criar relatórios</div>
              </div>
            </CardBody>
          </Card>
        </Link>
      </div>
    </div>
  );
}
