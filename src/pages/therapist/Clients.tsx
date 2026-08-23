import { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Search, ChevronRight, User, Pencil, Trash2, ToggleLeft, ToggleRight, Send } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { formatDate } from '../../lib/format';
import { supabase, resetPasswordUrl } from '../../lib/supabase';
import type { Profile, Diary } from '../../lib/database.types';

type ClientProfile = Profile & { diary_id?: string | null };

const ACTIVE_DIARY_MESSAGE = 'Nenhum diário ativo. Ative um diário antes de cadastrar clientes.';

export function Clients() {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [togglingClientId, setTogglingClientId] = useState<string | null>(null);
  const [invitingClientId, setInvitingClientId] = useState<string | null>(null);

  // Edit modal state
  const [editClient, setEditClient] = useState<ClientProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDiaryId, setEditDiaryId] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [diaries, setDiaries] = useState<Diary[]>([]);

  // Delete modal state
  const [deleteClient, setDeleteClient] = useState<ClientProfile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const hasActiveDiary = diaries.length > 0;

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setClients((data ?? []) as ClientProfile[]);
        setLoading(false);
      });

    supabase
      .from('diaries')
      .select('id, name, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => setDiaries(data ?? []));
  }, []);

  const openEdit = (client: ClientProfile) => {
    const selectedDiaryId =
      client.diary_id && diaries.some((d) => d.id === client.diary_id)
        ? client.diary_id
        : diaries[0]?.id ?? '';

    setEditClient(client);
    setEditName(client.name);
    setEditEmail(client.email);
    setEditWhatsapp(client.whatsapp ?? '');
    setEditAddress(client.address ?? '');
    setEditDiaryId(selectedDiaryId);
    setEditError('');
  };

  const handleEditSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editClient) return;
    setEditError('');

    if (!editDiaryId) {
      setEditError(ACTIVE_DIARY_MESSAGE);
      return;
    }

    setEditLoading(true);

    const { error: rpcError } = await supabase.rpc('update_client_profile', {
      p_client_id: editClient.id,
      p_name:      editName.trim(),
      p_email:     editEmail.trim(),
      p_whatsapp:  editWhatsapp || null,
      p_address:   editAddress || null,
      p_diary_id:  editDiaryId,
    });

    if (rpcError) {
      setEditError(rpcError.message ?? 'Não foi possível atualizar o cliente.');
      setEditLoading(false);
      return;
    }

    // Busca o perfil atualizado para refletir na lista
    const { data: updatedClient } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', editClient.id)
      .single();

    if (updatedClient) {
      setClients((prev) =>
        prev.map((c) => c.id === editClient.id ? (updatedClient as ClientProfile) : c)
      );
    }

    setEditClient(null);
    setEditLoading(false);
  };

  const handleSendInvite = async (client: ClientProfile) => {
    setActionError('');
    setActionSuccess('');

    if (!client.active) {
      setActionError('Ative o cliente antes de enviar um convite.');
      return;
    }

    setInvitingClientId(client.id);

    const { error } = await supabase.auth.resetPasswordForEmail(client.email, {
      redirectTo: resetPasswordUrl,
    });

    if (error) {
      setActionError(error.message ?? 'Não foi possível enviar o e-mail de acesso.');
      setInvitingClientId(null);
      return;
    }

    // Registra no histórico (mesma tabela que a tela de detalhe do cliente lê)
    await supabase.from('client_invites').insert({ client_id: client.id, email: client.email });

    setActionSuccess(`E-mail de acesso enviado para ${client.email}`);
    setInvitingClientId(null);
  };

  const toggleClientActive = async (client: ClientProfile) => {
    setActionError('');
    setActionSuccess('');
    setTogglingClientId(client.id);

    const { data: updatedClient, error } = await supabase
      .from('profiles')
      .update({ active: !client.active })
      .eq('id', client.id)
      .select()
      .single();

    if (error || !updatedClient) {
      setActionError(error?.message ?? 'Não foi possível atualizar o status do cliente.');
      setTogglingClientId(null);
      return;
    }

    setClients((prev) =>
      prev.map((c) => c.id === client.id ? (updatedClient as ClientProfile) : c)
    );
    setTogglingClientId(null);
  };

  const openDelete = (client: ClientProfile) => {
    setDeleteClient(client);
    setDeleteError('');
  };

  const handleDelete = async () => {
    if (!deleteClient) return;
    setDeleteLoading(true);
    setDeleteError('');

    const { error } = await supabase.rpc('delete_client', { client_id: deleteClient.id });

    if (error) {
      setDeleteError(error.message);
      setDeleteLoading(false);
      return;
    }

    const deletedId = deleteClient.id;
    setDeleteClient(null);
    setDeleteLoading(false);
    setClients((prev) => prev.filter((c) => c.id !== deletedId));
  };

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-dark font-serif">Clientes</h1>
          <p className="text-dark/50 text-sm mt-1">{clients.length} cliente{clients.length !== 1 ? 's' : ''} cadastrado{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/clients/new">
          <Button>
            <UserPlus size={16} />
            Novo Cliente
          </Button>
        </Link>
      </div>

      {clients.length > 0 && (
        <div className="mb-4 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-beige-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-petrol-400 text-dark placeholder:text-dark/30"
          />
        </div>
      )}

      {actionError && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {actionSuccess}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<User size={40} />}
          title={search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          description={search ? 'Tente um termo diferente' : 'Cadastre o primeiro cliente para começar'}
          action={
            !search ? (
              <Link to="/clients/new">
                <Button><UserPlus size={16} />Cadastrar Cliente</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <div className="divide-y divide-beige-200">
            {filtered.map((client) => {
              const isInactive = !client.active;

              return (
                <div
                  key={client.id}
                  className={`flex items-center gap-4 px-6 py-4 hover:bg-beige-50 transition-colors group ${isInactive ? 'bg-beige-50 opacity-70' : ''}`}
                >
                  <Link to={`/clients/${client.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isInactive ? 'bg-beige-200' : 'bg-petrol-100'}`}>
                      <span className={`font-medium text-sm ${isInactive ? 'text-dark/40' : 'text-petrol-700'}`}>
                        {client.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm ${isInactive ? 'text-dark/50' : 'text-dark'}`}>{client.name}</div>
                      <div className="text-dark/40 text-xs truncate">{client.email}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:block text-xs text-dark/30">{formatDate(client.created_at)}</div>
                      <Badge variant={client.active ? 'success' : 'neutral'}>
                        {client.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <ChevronRight size={16} className="text-dark/20 group-hover:text-dark/50 transition-colors" />
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={invitingClientId === client.id}
                      onClick={() => handleSendInvite(client)}
                    >
                      <Send size={14} />
                      <span className="hidden md:inline">Enviar Convite</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={togglingClientId === client.id}
                      onClick={() => toggleClientActive(client)}
                    >
                      {client.active ? <ToggleRight size={14} className="text-emerald-500" /> : <ToggleLeft size={14} />}
                      <span className="hidden sm:inline">{client.active ? 'Desativar' : 'Ativar'}</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(client)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openDelete(client)}>
                      <Trash2 size={14} className="text-red-400" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Edit Modal */}
      <Modal open={!!editClient} onClose={() => setEditClient(null)} title="Editar Cliente" size="md">
        <form onSubmit={handleEditSave} className="space-y-4">
          {!hasActiveDiary && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {ACTIVE_DIARY_MESSAGE}
            </div>
          )}
          <Input
            label="Nome completo"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Email"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            required
          />
          <Input
            label="WhatsApp"
            type="text"
            placeholder="(00) 00000-0000"
            value={editWhatsapp}
            onChange={(e) => setEditWhatsapp(e.target.value)}
          />
          <Input
            label="Endereço"
            type="text"
            placeholder="Rua, número, cidade"
            value={editAddress}
            onChange={(e) => setEditAddress(e.target.value)}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-dark/80">Diário vinculado</label>
            {!hasActiveDiary ? (
              <div className="w-full px-3 py-2.5 rounded-lg border border-beige-300 bg-beige-50 text-sm text-dark/40">
                Nenhum diário ativo
              </div>
            ) : (
              <select
                value={editDiaryId}
                onChange={(e) => setEditDiaryId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-beige-300 text-dark text-sm bg-white focus:outline-none focus:ring-2 focus:ring-petrol-400 focus:border-transparent transition-colors"
              >
                {diaries.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {editError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {editError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={editLoading} disabled={!hasActiveDiary || !editDiaryId} className="flex-1">
              Salvar
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditClient(null)}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteClient} onClose={() => setDeleteClient(null)} title="Excluir Cliente" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-dark/70">
            Tem certeza? Esta ação não pode ser desfeita.
          </p>
          {deleteError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {deleteError}
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="danger" loading={deleteLoading} onClick={handleDelete} className="flex-1">
              Excluir
            </Button>
            <Button variant="ghost" onClick={() => setDeleteClient(null)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
