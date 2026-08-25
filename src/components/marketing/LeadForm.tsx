import { FormEvent, useState } from 'react';
import { Check } from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';

// submit_lead isn't declared in the (stale) generated database.types.ts, so the
// call is made through an untyped client — same pattern used for other RPCs
// missing from the generated types (see src/pages/client/ClientAccess.tsx).
const untypedSupabase = supabase as unknown as SupabaseClient;

interface LeadFormProps {
  source: string;
  title?: string;
  description?: string;
}

export function LeadForm({
  source,
  title = 'Receba novidades e conteúdos',
  description = 'Textos sobre padrões, comportamento e o Protocolo 4D, direto no seu e-mail.',
}: LeadFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('loading');

    const { error } = await untypedSupabase.rpc('submit_lead', {
      p_name: name,
      p_email: email,
      p_whatsapp: whatsapp || null,
      p_source: source,
    });

    setStatus(error ? 'error' : 'done');
  }

  if (status === 'done') {
    return (
      <div className="flex items-center gap-2 text-petrol-700">
        <Check size={18} />
        <span className="text-sm">Recebido! Obrigada por se inscrever.</span>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <h3 className="font-serif text-xl mb-1">{title}</h3>
      <p className="text-petrol-800/70 text-sm mb-4">{description}</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input
          type="email"
          placeholder="Seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="tel"
          placeholder="WhatsApp (opcional)"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
        />
        <Button type="submit" variant="primary" loading={status === 'loading'}>
          Quero receber
        </Button>
        {status === 'error' && (
          <span className="text-xs text-red-500">Não deu certo, tenta de novo em instantes.</span>
        )}
        <p className="text-xs text-petrol-800/50">
          Ao enviar, você concorda em receber e-mails e mensagens da Núbia Januzzi. Seus dados não são
          compartilhados com terceiros.
        </p>
      </form>
    </div>
  );
}
