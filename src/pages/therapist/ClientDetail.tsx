import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, Mail, Calendar, ToggleLeft, ToggleRight, Send, Clock, CheckCircle, LogIn, Phone, Pencil, X, Check, Target, MessageCircle, Copy, ExternalLink, Brain, Bell, BellOff } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDate } from '../../lib/format';
import { supabase, resetPasswordUrl } from '../../lib/supabase';
import type { Profile, Diary, DiaryEntry } from '../../lib/database.types';

type ClientProfile = Profile & { diary_id?: string | null };

interface ClientInvite {
  id: string;
  email: string;
  sent_at: string;
}

interface ClientGoal {
  id: string;
  goal_text: string;
  created_at: string;
  entry_count_at_creation: number;
  closed_at: string | null;
  closing_notes: string | null;
}

interface WaSession {
  id: string;
  status: 'pending' | 'active' | 'paused';
  opted_in_at: string | null;
  last_reminder_at: string | null;
  invite_sent_at: string | null;
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
  const [goals, setGoals] = useState<ClientGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [editingWhatsapp, setEditingWhatsapp] = useState(false);
  const [whatsappDraft, setWhatsappDraft] = useState('');
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [waSession, setWaSession] = useState<WaSession | null>(null);
  const [sendingWaInvite, setSendingWaInvite] = useState(false);
  const [waInviteSent, setWaInviteSent] = useState(false);
  const [waInviteError, setWaInviteError] = useState('');
  const [waActivationLink, setWaActivationLink] = useState<string | null>(null);
  const [waCopied, setWaCopied] = useState(false);
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
      setGoals([]);
      setWaSession(null);
      setWaActivationLink(null);

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
        { data: goalRows },
        { data: waSessionRow },
      ] = await Promise.all([
        supabase.from('diary_entries').select('id, user_id, diary_id, date, created_at')
          .eq('user_id', id).order('date', { ascending: false }).limit(10),
        supabase.from('diary_entries').select('id', { count: 'exact', head: true })
          .eq('user_id', id).gte('date', lastSevenDaysStartISO()),
        supabase.from('client_invites').select('id, email, sent_at')
          .eq('client_id', id).order('sent_at', { ascending: false }),
        supabase.rpc('get_client_last_login', { p_client_id: id }),
        supabase.from('client_goals')
          .select('id, goal_text, created_at, entry_count_at_creation, closed_at, closing_notes')
          .eq('user_id', id)
          .order('created_at', { ascending: false }),
        supabase.from('whatsapp_sessions')
          .select('id, status, opted_in_at, last_reminder_at, invite_sent_at')
          .eq('client_id', id)
          .order('invite_sent_at', { ascending: false })
          .limit(1),
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
      setGoals((goalRows ?? []) as ClientGoal[]);
      const waRows = (waSessionRow as WaSession[] | null) ?? [];
      setWaSession(waRows.length > 0 ? waRows[0] : null);

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
      redirectTo: resetPasswordUrl,
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

  const handleSendWhatsappInvite = async () => {
    if (!client) return;
    setSendingWaInvite(true);
    setWaInviteError('');
    setWaInviteSent(false);
    setWaActivationLink(null);

    const { data, error: fnError } = await supabase.functions.invoke('whatsapp-send-invite', {
      body: { client_id: client.id },
    });

    if (fnError) {
      setWaInviteError(fnError.message || 'Erro ao gerar link de ativação.');
      setSendingWaInvite(false);
      return;
    }

    setWaActivationLink(data?.link ?? null);
    setWaSession(prev => ({
      id: prev?.id ?? '',
      status: 'pending',
      opted_in_at: prev?.opted_in_at ?? null,
      last_reminder_at: prev?.last_reminder_at ?? null,
      invite_sent_at: new Date().toISOString(),
    }));
    setWaInviteSent(true);
    setSendingWaInvite(false);
  };

  const copyWaLink = async () => {
    if (!waActivationLink) return;
    await navigator.clipboard.writeText(waActivationLink);
    setWaCopied(true);
    setTimeout(() => setWaCopied(false), 2500);
  };

  const waStatusLabel: Record<string, string> = {
    pending: 'Pendente',
    active: 'Ativo',
    paused: 'Pausado',
  };
  const waStatusVariant: Record<string, 'warning' | 'success' | 'error' | 'neutral'> = {
    pending: 'warning',
    active: 'success',
    paused: 'error',
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
  const reminderInfo = client as unknown as { diary_reminder_preference: 'enabled' | 'declined' | null; diary_reminder_next_at: string | null };
  const reminderPreference = reminderInfo.diary_reminder_preference;
  const reminderSnoozedUntil = !reminderPreference && reminderInfo.diary_reminder_next_at && new Date(reminderInfo.diary_reminder_next_at) > new Date()
    ? reminderInfo.diary_reminder_next_at
    : null;

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
          <div className="flex items-center gap-3 text-sm">
            {reminderPreference === 'enabled' ? (
              <Bell size={16} className="text-emerald-500 shrink-0" />
            ) : (
              <BellOff size={16} className="text-dark/30 shrink-0" />
            )}
            <span className="text-dark/70">Lembrete de diário:</span>
            <Badge variant={reminderPreference === 'enabled' ? 'success' : reminderPreference === 'declined' ? 'neutral' : 'warning'}>
              {reminderPreference === 'enabled' ? 'Ativado' : reminderPreference === 'declined' ? 'Desativado' : 'Ainda não decidiu'}
            </Badge>
            {reminderSnoozedUntil && (
              <span className="text-xs text-dark/40">
                (pediu para lembrar mais tarde — próximo aviso em {formatDateTime(reminderSnoozedUntil)})
              </span>
            )}
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

      {/* WhatsApp activation */}
      <Card className="mb-4">
        <CardBody>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <MessageCircle size={15} className="text-emerald-600" />
                <h2 className="font-semibold text-dark font-serif text-base">Ativação WhatsApp</h2>
                {waSession && (
                  <Badge variant={waStatusVariant[waSession.status] ?? 'neutral'}>
                    {waStatusLabel[waSession.status] ?? waSession.status}
                  </Badge>
                )}
                {!waSession && (
                  <Badge variant="neutral">Não ativado</Badge>
                )}
              </div>
              <p className="text-xs text-dark/40 mt-0.5">
                Gera o link de ativação para você enviar ao cliente pelo WhatsApp
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              loading={sendingWaInvite}
              disabled={!client.whatsapp || waSession?.status === 'active'}
              onClick={handleSendWhatsappInvite}
              className="shrink-0"
            >
              <MessageCircle size={14} />
              {waSession ? 'Gerar novo link' : 'Gerar link'}
            </Button>
          </div>

          {!client.whatsapp && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Cadastre o número WhatsApp do cliente acima para habilitar esta ação.
            </p>
          )}

          {waInviteError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {waInviteError}
            </div>
          )}

          {/* Link gerado — copiar e enviar ao cliente */}
          {waActivationLink && (
            <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-xs font-medium text-emerald-800 mb-2">
                ✅ Link gerado! Copie e envie ao cliente pelo seu WhatsApp pessoal:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white border border-emerald-200 rounded px-2 py-1.5 text-dark/70 truncate">
                  {waActivationLink}
                </code>
                <button
                  onClick={copyWaLink}
                  className="shrink-0 flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-300 rounded px-2 py-1.5 transition-colors"
                >
                  {waCopied
                    ? <><Check size={13} className="text-emerald-600" /> Copiado!</>
                    : <><Copy size={13} /> Copiar</>
                  }
                </button>
                <a
                  href={waActivationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-emerald-600 hover:text-emerald-800"
                  title="Abrir link"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
              <p className="text-xs text-emerald-700/70 mt-2">
                Quando o cliente clicar e enviar "Iniciar", a conversa será ativada automaticamente.
              </p>
            </div>
          )}

          {waSession && !waActivationLink && (
            <div className="space-y-1 text-xs text-dark/50 mt-2">
              {waSession.invite_sent_at && (
                <p>Link gerado em: {formatDateTime(waSession.invite_sent_at)}</p>
              )}
              {waSession.opted_in_at && (
                <p>✅ Ativado em: {formatDateTime(waSession.opted_in_at)}</p>
              )}
              {waSession.last_reminder_at && (
                <p>Último lembrete: {formatDateTime(waSession.last_reminder_at)}</p>
              )}
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

      {/* Goals history */}
      <Card className="mb-4">
        <CardBody>
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-gold-600" />
            <h2 className="font-semibold text-dark font-serif text-base">Metas de Desbloqueio</h2>
          </div>

          {goals.length === 0 ? (
            <div className="text-sm text-dark/40 border border-dashed border-beige-300 rounded-lg px-4 py-4 text-center">
              Nenhuma meta definida ainda
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((goal, idx) => (
                <div key={goal.id} className={`rounded-lg p-3 border ${idx === 0 && !goal.closed_at ? 'bg-gold-50 border-gold-200' : 'bg-beige-50 border-beige-200'}`}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    {idx === 0 && !goal.closed_at && (
                      <span className="text-[10px] font-medium bg-gold-200 text-gold-800 px-1.5 py-0.5 rounded-full">atual</span>
                    )}
                    {goal.closed_at && (
                      <span className="text-[10px] font-medium bg-beige-200 text-dark/50 px-1.5 py-0.5 rounded-full">
                        encerrada em {formatDateTime(goal.closed_at)}
                      </span>
                    )}
                    <span className="text-xs text-dark/40 ml-auto">{formatDateTime(goal.created_at)}</span>
                  </div>
                  <p className="text-sm text-dark/80 leading-snug">{goal.goal_text}</p>
                  <p className="text-xs text-dark/30 mt-1.5">Ao completar {goal.entry_count_at_creation} registros</p>
                  {goal.closing_notes && (
                    <div className="mt-2 pt-2 border-t border-beige-200">
                      <p className="text-[10px] font-medium text-dark/30 mb-0.5">Observações de encerramento</p>
                      <p className="text-xs text-dark/60 leading-snug">{goal.closing_notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link to={`/clients/${id}/schema-analysis`}>
          <Card className="hover:border-petrol-300 transition-colors cursor-pointer">
            <CardBody className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-petrol-50 flex items-center justify-center">
                <Brain size={18} className="text-petrol-700" />
              </div>
              <div>
                <div className="font-medium text-dark text-sm">Análise de Esquemas</div>
                <div className="text-xs text-dark/40">Inventário e relatório técnico</div>
              </div>
            </CardBody>
          </Card>
        </Link>
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
