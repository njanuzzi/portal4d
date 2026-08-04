import { useState, useEffect, useRef, FormEvent } from 'react';
import { MessageCircle, Plus, Trash2, Phone, Check, CheckSquare, Square, Copy, Users, X } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type Contact = {
  id: string;
  name: string;
  phone: string;
  created_at: string;
};

const STORAGE_KEY = 'scheduling_message_template';

const DEFAULT_MESSAGE =
  'Olá, [nome]! 👋\n\nEstou enviando o link de agendamento do mês! Se possível já deixe seu horário reservado.\n\nCaso não tenha o horário disponível que melhor te atenda, me chama que conversamos.\n\nObs.: Se o seu horário já está reservado, pode ignorar a mensagem!\n\n[link]\n\nQualquer dúvida, é só me chamar! 😊';

function loadSavedMessage(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_MESSAGE;
  } catch {
    return DEFAULT_MESSAGE;
  }
}

function buildMessage(template: string, name: string) {
  return template.replace('[nome]', name.split(' ')[0]);
}

function formatPhone(raw: string) {
  return raw.replace(/\D/g, '');
}

export function Scheduling() {
  const { profile } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(loadSavedMessage);
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [copiedNumbers, setCopiedNumbers] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from('scheduling_contacts')
      .select('*')
      .eq('therapist_id', profile.id)
      .order('name', { ascending: true })
      .then(({ data }) => {
        setContacts((data ?? []) as Contact[]);
        setLoading(false);
      });
  }, [profile?.id]);

  const handleMessageChange = (value: string) => {
    setMessage(value);
    setSaved(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, value);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch { /* ignore */ }
    }, 800);
  };

  const handleResetMessage = () => {
    setMessage(DEFAULT_MESSAGE);
    try { localStorage.setItem(STORAGE_KEY, DEFAULT_MESSAGE); } catch { /* ignore */ }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === contacts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(contacts.map(c => c.id)));
    }
  };

  const selectedContacts = contacts.filter(c => selected.has(c.id));

  const handleCopyNumbers = async () => {
    const numbers = selectedContacts.map(c => formatPhone(c.phone)).join('\n');
    await navigator.clipboard.writeText(numbers);
    setCopiedNumbers(true);
    setTimeout(() => setCopiedNumbers(false), 2000);
  };

  const handleCopyMessage = async () => {
    await navigator.clipboard.writeText(message.replace('[nome]', 'você'));
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    setAddError('');
    setAddLoading(true);

    const { data, error } = await supabase
      .from('scheduling_contacts')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ therapist_id: profile.id, name: addName.trim(), phone: addPhone.trim() } as any)
      .select()
      .single();

    if (error || !data) {
      setAddError(error?.message ?? 'Erro ao salvar contato.');
      setAddLoading(false);
      return;
    }

    setContacts((prev) => [...prev, data as Contact].sort((a, b) => a.name.localeCompare(b.name)));
    setAddName('');
    setAddPhone('');
    setAddOpen(false);
    setAddLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteContact) return;
    setDeleteLoading(true);
    await supabase.from('scheduling_contacts').delete().eq('id', deleteContact.id);
    setContacts((prev) => prev.filter((c) => c.id !== deleteContact.id));
    setSelected(prev => { const next = new Set(prev); next.delete(deleteContact.id); return next; });
    setDeleteContact(null);
    setDeleteLoading(false);
  };

  const openWhatsApp = (contact: Contact) => {
    const text = buildMessage(message, contact.name);
    const phone = formatPhone(contact.phone);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) return <PageSpinner />;

  const allSelected = contacts.length > 0 && selected.size === contacts.length;
  const someSelected = selected.size > 0;

  return (
    <div className="p-6 max-w-4xl mx-auto pb-32">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-dark font-serif">Agendamento via WhatsApp</h1>
          <p className="text-dark/50 text-sm mt-1">Envie mensagens para seus contatos</p>
        </div>
        <Button onClick={() => { setAddOpen(true); setAddError(''); }}>
          <Plus size={16} />
          Novo Contato
        </Button>
      </div>

      {/* Message template */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-dark/40 uppercase tracking-wide">Mensagem</p>
            <div className="flex items-center gap-3">
              {saved && (
                <span className="flex items-center gap-1 text-xs text-emerald-600">
                  <Check size={12} />
                  Salvo
                </span>
              )}
              <button
                type="button"
                onClick={handleResetMessage}
                className="text-xs text-dark/40 hover:text-petrol-700 transition-colors"
              >
                Restaurar padrão
              </button>
            </div>
          </div>
          <p className="text-xs text-dark/40 mb-2 leading-relaxed">
            Use <code className="bg-beige-100 px-1 rounded">[nome]</code> para o primeiro nome do contato e <code className="bg-beige-100 px-1 rounded">[link]</code> para o link. A mensagem é salva automaticamente.
          </p>
          <textarea
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            rows={9}
            className="w-full px-3 py-2.5 rounded-lg border border-beige-300 text-sm text-dark bg-white focus:outline-none focus:ring-2 focus:ring-petrol-400 resize-none leading-relaxed"
          />
        </CardBody>
      </Card>

      {/* Contacts */}
      {contacts.length === 0 ? (
        <EmptyState
          icon={<Phone size={40} />}
          title="Nenhum contato cadastrado"
          description="Adicione contatos para enviar mensagens"
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus size={16} />
              Adicionar Contato
            </Button>
          }
        />
      ) : (
        <Card>
          {/* Select all header */}
          <div className="flex items-center gap-3 px-6 py-3 border-b border-beige-200 bg-beige-50">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm text-dark/60 hover:text-petrol-700 transition-colors"
            >
              {allSelected
                ? <CheckSquare size={16} className="text-petrol-600" />
                : <Square size={16} />}
              {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
            {someSelected && (
              <span className="text-xs text-petrol-600 font-medium ml-auto">
                {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="divide-y divide-beige-200">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className={`flex items-center gap-4 px-6 py-4 transition-colors ${selected.has(contact.id) ? 'bg-petrol-50' : 'hover:bg-beige-50'}`}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleSelect(contact.id)}
                  className="shrink-0 text-dark/30 hover:text-petrol-600 transition-colors"
                >
                  {selected.has(contact.id)
                    ? <CheckSquare size={18} className="text-petrol-600" />
                    : <Square size={18} />}
                </button>

                <div className="w-9 h-9 rounded-full bg-petrol-100 flex items-center justify-center shrink-0">
                  <span className="font-medium text-sm text-petrol-700">
                    {contact.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-dark">{contact.name}</div>
                  <div className="text-dark/40 text-xs">{contact.phone}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => openWhatsApp(contact)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                  >
                    <MessageCircle size={14} />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteContact(contact)}>
                    <Trash2 size={14} className="text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sticky bar when contacts selected */}
      {someSelected && (
        <div className="fixed bottom-0 left-0 right-0 z-30 md:left-64">
          <div className="bg-petrol-700 text-white px-6 py-4 flex items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-petrol-200" />
              <span className="text-sm font-medium">
                {selected.size} contato{selected.size !== 1 ? 's' : ''} selecionado{selected.size !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-petrol-300 hover:text-white transition-colors text-sm flex items-center gap-1"
              >
                <X size={14} />
                Limpar
              </button>
              <Button
                onClick={() => setBroadcastOpen(true)}
                className="bg-gold-500 hover:bg-gold-600 text-dark border-0 text-sm"
              >
                <Users size={14} />
                Envio em massa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast modal */}
      <Modal open={broadcastOpen} onClose={() => setBroadcastOpen(false)} title="Envio em massa" size="md">
        <div className="space-y-5">
          <p className="text-sm text-dark/60 leading-relaxed">
            Siga os passos abaixo para enviar a mensagem para os <strong>{selected.size} contatos</strong> selecionados via lista de transmissão do WhatsApp.
          </p>

          {/* Step 1 — numbers */}
          <div>
            <p className="text-xs font-semibold text-dark/40 uppercase tracking-wide mb-2">
              Passo 1 — Copie os números
            </p>
            <div className="bg-beige-50 border border-beige-200 rounded-lg px-3 py-2.5 font-mono text-xs text-dark/70 leading-relaxed mb-2 max-h-32 overflow-y-auto">
              {selectedContacts.map(c => formatPhone(c.phone)).join('\n')}
            </div>
            <button
              type="button"
              onClick={handleCopyNumbers}
              className="flex items-center gap-1.5 text-xs text-petrol-700 border border-petrol-200 rounded-lg px-3 py-1.5 hover:bg-petrol-50 transition-colors"
            >
              {copiedNumbers ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              {copiedNumbers ? 'Copiado!' : 'Copiar números'}
            </button>
          </div>

          {/* Step 2 — message */}
          <div>
            <p className="text-xs font-semibold text-dark/40 uppercase tracking-wide mb-2">
              Passo 2 — Copie a mensagem
            </p>
            <div className="bg-beige-50 border border-beige-200 rounded-lg px-3 py-2.5 text-xs text-dark/70 whitespace-pre-wrap leading-relaxed mb-2 max-h-40 overflow-y-auto">
              {message.replace('[nome]', 'você')}
            </div>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="flex items-center gap-1.5 text-xs text-petrol-700 border border-petrol-200 rounded-lg px-3 py-1.5 hover:bg-petrol-50 transition-colors"
            >
              {copiedMessage ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              {copiedMessage ? 'Copiado!' : 'Copiar mensagem'}
            </button>
          </div>

          {/* Step 3 — instructions */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-amber-800 mb-2">Passo 3 — Crie a lista de transmissão no WhatsApp</p>
            <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside leading-relaxed">
              <li>Abra o WhatsApp no celular</li>
              <li>Toque em <strong>Nova transmissão</strong> (ícone de megafone ou menu)</li>
              <li>Adicione os contatos pelo número copiado</li>
              <li>Cole a mensagem e envie</li>
            </ol>
            <p className="text-xs text-amber-600 mt-2">
              Os contatos precisam ter o seu número salvo no celular para receber a mensagem.
            </p>
          </div>
        </div>
      </Modal>

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Novo Contato" size="sm">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Nome"
            placeholder="Maria Silva"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="WhatsApp"
            placeholder="+55 11 99999-9999"
            value={addPhone}
            onChange={(e) => setAddPhone(e.target.value)}
            required
            hint="Inclua o código do país (+55 para Brasil)"
          />
          {addError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>
          )}
          <div className="flex gap-3 pt-1">
            <Button type="submit" loading={addLoading} className="flex-1">Salvar</Button>
            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      {/* Delete modal */}
      <Modal open={!!deleteContact} onClose={() => setDeleteContact(null)} title="Remover Contato" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-dark/70">
            Remover <strong>{deleteContact?.name}</strong> da lista?
          </p>
          <div className="flex gap-3">
            <Button variant="danger" loading={deleteLoading} onClick={handleDelete} className="flex-1">Remover</Button>
            <Button variant="ghost" onClick={() => setDeleteContact(null)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
