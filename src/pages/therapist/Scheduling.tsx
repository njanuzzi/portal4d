import { useState, useEffect, useRef, FormEvent } from 'react';
import { MessageCircle, Plus, Trash2, Phone, Check } from 'lucide-react';
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
    setDeleteContact(null);
    setDeleteLoading(false);
  };

  const openWhatsApp = (contact: Contact) => {
    const text = buildMessage(message, contact.name);
    const phone = formatPhone(contact.phone);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-dark font-serif">Agendamento via WhatsApp</h1>
          <p className="text-dark/50 text-sm mt-1">Envie o link de agendamento para seus contatos</p>
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
            Use <code className="bg-beige-100 px-1 rounded">[nome]</code> para o primeiro nome do contato e <code className="bg-beige-100 px-1 rounded">[link]</code> para o link de agendamento. A mensagem é salva automaticamente.
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
          description="Adicione contatos para enviar o link de agendamento"
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus size={16} />
              Adicionar Contato
            </Button>
          }
        />
      ) : (
        <Card>
          <div className="divide-y divide-beige-200">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center gap-4 px-6 py-4 hover:bg-beige-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-petrol-100 flex items-center justify-center shrink-0">
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteContact(contact)}
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

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
            <Button type="submit" loading={addLoading} className="flex-1">
              Salvar
            </Button>
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
            <Button variant="danger" loading={deleteLoading} onClick={handleDelete} className="flex-1">
              Remover
            </Button>
            <Button variant="ghost" onClick={() => setDeleteContact(null)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
