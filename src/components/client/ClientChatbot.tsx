import { useState, useRef, useEffect, FormEvent } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function ClientChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      headers: async (): Promise<Record<string, string>> => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
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
        </div>
      )}
    </>
  );
}
