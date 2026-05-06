import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, Mail, Calendar, ToggleLeft, ToggleRight, Send, Clock, CheckCircle, LogIn, Phone, Pencil, X, Check } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDate } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { Profile, Diary, DiaryEntry } from '../../lib/database.types';

type ClientProfile = Profile & { diary_id?: string | null };

interface ClientInvite {
  id: string;
  email: string;
  sent_at: string;
}

function lastSevenDaysStartISO() {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return date.toISOString().split('T')[0];
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [linkedDiary, setLinkedDiary] = useState<Diary | null>(null);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [last7Count, setLast7Count] = useState(0);
  const [invites, setInvites] = useState<ClientInvite[]>([]);
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [editingWhatsapp, setEditingWhatsapp] = useState(false);
  const [whatsappDraft, setWhatsappDraft] = useState('');
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchClientDetail = async () => {
      if (!id) { setClient(null); setLoading(false); return; }

      setLoading(true);
      setError('');
      setActionError('');
      setLinkedDiary(null);
      setEntries([]);
      setLast7Count(0);
      setInvites([]);
      setLastLogin(null);

      const { data: profile, error: profileError } = await supabase
        .from('profiles').select('*').eq('id', id).eq('role', 'client').maybeSingle();

      if (cancelled) return;

      if (profileError || !profile) {
        setClient(null);
        if (profileError) setError(profileError.message);
        setLoading(false);
        return;
      }

      const loadedClient = profile as ClientProfile;
      setClient(loadedClient);

      const [
        { data: entryRows, error: entriesError },
        { count, error: countError },
        { data: inviteRows },
        { data: lastLoginData },
      ] = await Promise.all([
        supabase.from('diary_entries').select('id, user_id, diary_id, date, created_at')
          .eq('user_id', id).order('date', { ascending: false }).limit(10),
        supabase.from('diary_entries').select('id', { count: 'exact', head: true })
          .eq('user_id', id).gte('date', lastSevenDaysStartISO()),
        supabase.from('client_invites').select('id, email, sent_at')
          .eq('client_id', id).order('sent_at', { ascending: false }),
        supabase.rpc('get_client_last_login', { p_client_id: id }),
      ]);

      let diaryRow: Diary | null = null;
      if (loadedClient.diary_id) {
        const { data: diary } = await supabase
          .from('diaries').select('id, name, is_active, created_at').eq('id', loadedClient.diary_id).maybeSingle();
        diaryRow = diary;
      }

      if (cancelled) return;

      setEntries((entryRows ?? []) as DiaryEntry[]);
      setLast7Count(count ?? 0);
      setLinkedDiary(diaryRow);
      setInvites((inviteRows ?? []) as ClientInvite[]);
      setLastLogin((lastLoginData as string | null) ?? null);

      const loadError = entriesError?.message || countError?.message;
      if (loadError) setError(loadError);
      setLoading(false);
    };

    fetchClientDetail();
    return () => { cancelled = true; };
  }, [id]);

  const whatsappLink = (phone: string) => {
    const raw = phone.trim();
    const digits = raw.replace(/\D/g, '');
    // If typed with + prefix or more than 11 digits → already has country code
    const number = (raw.startsWith('+') || digits.length > 11) ? digits : `55${digits}`;
    const msg = encodeURIComponent(`Olá, ${client?.name.split(' ')[0]}! Lembrete para preencher o diário de hoje no portal. 😊`);
    return `https://wa.me/${number}?text=${msg}`;
  };

  const saveWhatsapp = async () => {
    if (!client) return;
    setSavingWhatsapp(true);
    const { data: updated, error: updateError } = await supabase
      .from('profiles').update({ whatsapp: whatsappDraft || null }).eq('id', client.id).select().single();
    if (!updateError && updated) {
      setClient(updated as ClientProfile);
    }
    setSavingWhatsapp(false);
    setEditingWhatsapp(false);
  };

  const toggleActive = async () => {
    if (!client) return;
    setActionError('');
    setToggling(true);
    const { data: updatedClient, error: updateError } = await supabase
      .from('profiles').update({ active: !client.active }).eq('id', client.id).select().single();
    if (updateError || !updatedClient) {
      setActionError(updateError?.message ?? 'Não foi possível atualizar o status.');
      setToggling(false);
      return;
    }
    setClient(updatedClient as ClientProfile);
    setToggling(false);
  };

  const handleSendInvite = async () => {
    if (!client) return;
    setSendingInvite(true);
    setInviteError('');
    setInviteSent(false);

    const { error: emailError } = await supabase.auth.resetPasswordForEmail(client.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (emailError) {
      // 429 = rate limit
      if (emailError.status === 429) {
        setInviteError('Limite de envio atingido. Aguarde alguns minutos e tente novamente.');
      } else {
        setInviteError(emailError.message);
      }
      setSendingInvite(false);
      return;
    }

    // Record in history
    const { data: newInvite } = await supabase
      .from('client_invites')
      .insert({ client_id: client.id, email: client.email })
      .select('id, email, sent_at')
      .single();

    if (newInvite) {
      setInvites(prev => [newInvite as ClientInvite, ...prev]);
    }

    setInviteSent(true);
    setSendingInvite(false);
    setTimeout(() => setInviteSent(false), 4000);
  };

  if (loading) return <PageSpinner />;
  if (!client) return (
    <div className="p-6">
      <p className="text-dark/50">Cliente não encontrado.</p>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      <Link to="/clients" className="text-petrol-700 hover:underline text-sm">Voltar</Link>
    </div>
  );

  const diaryName = client.diary_id ? linkedDiary?.name ?? 'Diário não encontrado' : 'Não vinculado';

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
          <Button variant="ghost" size="sm" loading={toggling} onClick={toggleActive} className="shrink-0">
            {client.active ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} />}
            {client.active ? 'Desativar' : 'Ativar'}
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{actionError}</div>
      )}
      {error && (
        <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{error}</div>
      )}

      {/* Info */}
      <Card className="mb-4">
        <CardBody className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail size={16} className="text-dark/30 shrink-0" />
            <span className="text-dark/70">{client.email}</span>
          </div>

          {/* WhatsApp — editable */}
          <div className="flex items-center gap-3 text-sm">
            <Phone size={16} className="text-dark/30 shrink-0" />
            {editingWhatsapp ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={whatsappDraft}
                  onChange={e => setWhatsappDraft(e.target.value)}
                  placeholder="+52 618 230 0413 ou (11) 99999-9999"
                  className="flex-1 text-sm border border-beige-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-petrol-400"
                  autoFocus
                />
                <button onClick={saveWhatsapp} disabled={savingWhatsapp} className="text-emerald-600 hover:text-emerald-800">
                  <Check size={15} />
                </button>
                <button onClick={() => setEditingWhatsapp(false)} className="text-dark/40 hover:text-dark">
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                {client.whatsapp ? (
                  <a href={whatsappLink(client.whatsapp)} target="_blank" rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline">
                    {client.whatsapp}
                  </a>
                ) : (
                  <span className="text-dark/40 italic">Não informado</span>
                )}
                <button
                  onClick={() => { setWhatsappDraft(client.whatsapp ?? ''); setEditingWhatsapp(true); }}
                  className="text-dark/30 hover:text-petrol-600 transition-colors"
                  title="Editar WhatsApp"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm">
            <BookOpen size={16} className="text-dark/30 shrink-0" />
            <span className="text-dark/70">Diário vinculado: {diaryName}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar size={16} className="text-dark/30 shrink-0" />
            <span className="text-dark/70">Cadastrado em {formatDate(client.created_at)}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <LogIn size={16} className="text-dark/30 shrink-0" />
            <span className="text-dark/70">
              {lastLogin
                ? `Último acesso em ${formatDateTime(lastLogin)}`
                : 'Nunca acessou o sistema'}
            </span>
          </div>
        </CardBody>
      </Card>

      {/* Invite section */}
      <Card className="mb-4">
        <CardBody>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-semibold text-dark font-serif text-base">Convite de acesso</h2>
              <p className="text-xs text-dark/40 mt-0.5">
                Envia um link para o cliente criar ou redefinir a senha
              </p>
            </div>
            <Button
              size="sm"
              variant={inviteSent ? 'ghost' : 'primary'}
              loading={sendingInvite}
              onClick={handleSendInvite}
              className="shrink-0"
            >
              {inviteSent
                ? <><CheckCircle size={14} className="text-emerald-500" /> Enviado!</>
                : <><Send size={14} /> {invites.length > 0 ? 'Reenviar' : 'Enviar convite'}</>
              }
            </Button>
          </div>

          {inviteError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
              {inviteError}
            </div>
          )}

          {invites.length === 0 ? (
            <div className="text-sm text-dark/35 border border-dashed border-beige-300 rounded-lg px-4 py-4 text-center">
              Nenhum convite enviado ainda
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-dark/40 mb-1">Histórico de convites</p>
              {invites.map((invite, idx) => (
                <div key={invite.id} className="flex items-center gap-3 py-2 border-b border-beige-100 last:border-0">
                  <Clock size={13} className="text-dark/25 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-dark/60">{invite.email}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {idx === 0 && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">último</span>
                    )}
                    <span className="text-xs text-dark/40">{formatDateTime(invite.sent_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Diary timeline */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="font-semibold text-dark font-serif">Timeline do diário</h2>
              <p className="text-xs text-dark/40 mt-1">Últimas entradas registradas</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-semibold text-petrol-700">{last7Count}</div>
              <div className="text-xs text-dark/40">Últimos 7 dias</div>
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
