import { useState, useRef, useEffect, FormEvent } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type SubscriptionState = 'loading' | 'inactive' | 'active';

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function startCheckout(setRedirecting: (v: boolean) => void, setError: (v: string | null) => void) {
  setRedirecting(true);
  setError(null);
  try {
    const headers = await authHeaders();
    const res = await fetch('/api/create-checkout-session', { method: 'POST', headers });
    if (!res.ok) throw new Error(`Falha ao criar sessão de pagamento (${res.status})`);
    const { url } = (await res.json()) as { url: string };
    window.location.href = url;
  } catch (err) {
    console.error('[ClientChatbot] startCheckout falhou:', err);
    setError('Não consegui abrir o pagamento agora. Tenta de novo em instantes.');
    setRedirecting(false);
  }
}

function UpsellCard({
  onSubscribe,
  loading,
  error,
}: {
  onSubscribe: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-8 text-center bg-beige-100">
      <MessageCircle size={32} className="text-petrol-700" />
      <p className="text-dark font-serif text-base">Assine o assistente do Portal 4D</p>
      <p className="text-dark/60 text-sm leading-relaxed">
        Um espaço de apoio entre sessões, que te acompanha nos seus próprios termos — não substitui a
        terapia com a Núbia.
      </p>
      <button
        onClick={onSubscribe}
        disabled={loading}
        className="mt-2 px-5 py-2.5 rounded-lg bg-gold-500 text-white text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Redirecionando...' : 'Assinar assistente'}
      </button>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}

function ChatPanel({ initialMessages }: { initialMessages: UIMessage[] }) {
  const [input, setInput] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: '/api/chat', headers: authHeaders }),
    onError: (error) => {
      if (error.message.includes('subscription_required')) setBlocked(true);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status !== 'ready') return;
    sendMessage({ text: input });
    setInput('');
  };

  if (blocked) {
    return (
      <UpsellCard
        onSubscribe={() => startCheckout(setCheckoutLoading, setCheckoutError)}
        loading={checkoutLoading}
        error={checkoutError}
      />
    );
  }

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-beige-100">
        {messages.length === 0 && (
          <p className="text-petrol-800/60 text-sm text-center mt-8">
            Pergunte sobre sua entrada de diário de hoje, tire uma dúvida do portal, ou só desabafe um pouco.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
              message.role === 'user'
                ? 'ml-auto bg-petrol-700 text-white'
                : 'mr-auto bg-white border border-beige-300 text-dark'
            }`}
          >
            {message.parts.map((part, i) =>
              part.type === 'text' ? <span key={i}>{part.text}</span> : null
            )}
          </div>
        ))}
        {status === 'submitted' && (
          <div className="mr-auto flex items-center gap-2 text-petrol-800/50 text-sm">
            <Loader2 size={14} className="animate-spin" />
            Pensando...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-beige-300 p-3 flex gap-2 bg-white">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status !== 'ready'}
          placeholder="Escreva sua mensagem..."
          className="flex-1 text-sm px-3 py-2 rounded-lg border border-beige-300 bg-beige-50 outline-none focus:border-petrol-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status !== 'ready' || !input.trim()}
          className="w-9 h-9 shrink-0 rounded-lg bg-gold-500 text-white flex items-center justify-center hover:bg-gold-600 disabled:opacity-40 transition-colors"
        >
          <Send size={16} />
        </button>
      </form>
    </>
  );
}

export function ClientChatbot() {
  const [open, setOpen] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionState>('loading');
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const [{ data: sub }, { data: history }] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('bot_subscriptions') as any).select('status').eq('client_id', userData.user.id).maybeSingle(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('bot_messages') as any)
          .select('id, role, content, created_at')
          .eq('client_id', userData.user.id)
          .order('created_at', { ascending: true }),
      ]);

      setSubscription(sub?.status === 'active' ? 'active' : 'inactive');
      setInitialMessages(
        (history ?? []).map((row: { id: string; role: 'user' | 'assistant'; content: string }) => ({
          id: row.id,
          role: row.role,
          parts: [{ type: 'text', text: row.content }],
        }))
      );
    })();
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed z-50 right-4 bottom-20 sm:bottom-6 w-14 h-14 rounded-full bg-petrol-700 text-gold-300 shadow-lg flex items-center justify-center hover:bg-petrol-800 transition-colors"
        title={open ? 'Fechar assistente' : 'Abrir assistente'}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div className="fixed z-50 right-4 left-4 sm:left-auto bottom-36 sm:bottom-24 sm:w-96 h-[60vh] sm:h-[520px] bg-white rounded-xl shadow-2xl border border-beige-300 flex flex-col overflow-hidden">
          <div className="bg-petrol-700 text-white px-4 py-3">
            <div className="font-serif text-sm">Assistente do Portal 4D</div>
            <div className="text-petrol-200 text-[11px] leading-snug mt-0.5">
              Apoio entre sessões — não substitui o atendimento com a Núbia.
            </div>
          </div>

          {subscription === 'loading' || (subscription === 'active' && initialMessages === null) ? (
            <div className="flex-1 flex items-center justify-center bg-beige-100">
              <Loader2 size={20} className="animate-spin text-petrol-700/50" />
            </div>
          ) : subscription === 'inactive' ? (
            <UpsellCard
              onSubscribe={() => startCheckout(setCheckoutLoading, setCheckoutError)}
              loading={checkoutLoading}
              error={checkoutError}
            />
          ) : (
            <ChatPanel initialMessages={initialMessages ?? []} />
          )}
        </div>
      )}
    </>
  );
}
