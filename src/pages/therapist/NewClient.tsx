import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Copy, Check, UserCheck } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

// Isolated client for creating user accounts — session is never persisted,
// so it won't replace the therapist's active session.
const supabaseSignup = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

const ACTIVE_DIARY_MESSAGE = 'Nenhum diário ativo. Ative um diário antes de cadastrar clientes.';
const DEBUG_PREFIX = '[NewClient active diaries]';

type ActiveDiary = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

type CreatedClient = {
  name: string;
  email: string;
  tempPassword: string;
};

export function NewClient() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [diaries, setDiaries] = useState<ActiveDiary[]>([]);
  const [diaryId, setDiaryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdClient, setCreatedClient] = useState<CreatedClient | null>(null);
  const [copied, setCopied] = useState(false);

  const hasActiveDiary = diaries.length > 0;

  useEffect(() => {
    console.log(`${DEBUG_PREFIX} state updated`, {
      activeDiaryExists: hasActiveDiary,
      activeDiariesCount: diaries.length,
      selectedDiaryId: diaryId,
      activeDiaryIds: diaries.map((diary) => diary.id),
      activeDiaryNames: diaries.map((diary) => diary.name),
    });
  }, [diaries, diaryId, hasActiveDiary]);

  useEffect(() => {
    let isMounted = true;

    console.log(`${DEBUG_PREFIX} useEffect mounted: registering refresh listeners`);

    const loadActiveDiaries = async (source: string) => {
      console.log(`${DEBUG_PREFIX} fetch started`, { source });

      const { data, error: fetchError } = await supabase
        .from('diaries')
        .select('id, name, is_active, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error(`${DEBUG_PREFIX} fetch error`, { source, error: fetchError });
        return;
      }

      if (!isMounted) return;

      const activeDiaries = data ?? [];
      setDiaries(activeDiaries);
      setDiaryId((currentDiaryId) =>
        currentDiaryId && activeDiaries.some((diary) => diary.id === currentDiaryId)
          ? currentDiaryId
          : activeDiaries[0]?.id ?? ''
      );
      setError((currentError) =>
        currentError === ACTIVE_DIARY_MESSAGE && activeDiaries.length > 0 ? '' : currentError
      );
    };

    const refreshActiveDiaries = (source = 'manual') => {
      void loadActiveDiaries(source);
    };

    const handleFocus = () => refreshActiveDiaries('window.focus');
    const handlePageShow = () => refreshActiveDiaries('window.pageshow');
    const handleVisibilityChange = () => {
      if (!document.hidden) refreshActiveDiaries('document.visibilitychange');
    };

    refreshActiveDiaries('useEffect.mount');
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const intervalId = window.setInterval(() => refreshActiveDiaries('interval.10000ms'), 10000);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!diaryId) {
      setError(ACTIVE_DIARY_MESSAGE);
      return;
    }

    setLoading(true);

    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existing) {
        setError('Já existe um cliente com este e-mail.');
        setLoading(false);
        return;
      }

      const tempPassword = `PortalNJ@${Math.random().toString(36).slice(2, 10)}`;
      const { data: authData, error: signUpError } = await supabaseSignup.auth.signUp({
        email,
        password: tempPassword,
        options: { data: { name, role: 'client' } },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: authData.user.id,
          email,
          name,
          role: 'client',
          active: true,
          whatsapp: whatsapp || null,
          address: address || null,
          diary_id: diaryId,
        } as any);

        if (profileError) {
          setError(profileError.message);
          setLoading(false);
          return;
        }

        // Send first-access email so client can set their own password
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        // Register invite history
        await supabase.from('client_invites').insert({
          client_id: authData.user.id,
          email,
        });
      }

      setCreatedClient({ name, email, tempPassword });
    } catch {
      setError('Erro inesperado. Tente novamente.');
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!createdClient) return;
    await navigator.clipboard.writeText(createdClient.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (createdClient) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-dark font-serif">Cliente cadastrado</h1>
          <p className="text-dark/50 text-sm mt-1">Compartilhe as credenciais de acesso com o cliente.</p>
        </div>

        <Card>
          <CardBody className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <UserCheck size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-dark">{createdClient.name}</p>
                <p className="text-sm text-dark/50">{createdClient.email}</p>
              </div>
            </div>

            <div className="border-t border-beige-200 pt-4">
              <p className="text-xs font-medium text-dark/40 uppercase tracking-wide mb-3">
                Credenciais de acesso
              </p>

              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-dark/50">E-mail</span>
                  <span className="text-sm font-medium text-dark bg-beige-50 rounded-lg px-3 py-2 border border-beige-200">
                    {createdClient.email}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-xs text-dark/50">Senha temporária</span>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-sm font-mono font-medium text-dark bg-beige-50 rounded-lg px-3 py-2 border border-beige-200 tracking-wider">
                      {createdClient.tempPassword}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="shrink-0 w-9 h-9 rounded-lg border border-beige-300 flex items-center justify-center text-dark/50 hover:text-petrol-700 hover:border-petrol-300 transition-colors"
                    >
                      {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
              <p className="text-xs text-emerald-700 leading-relaxed">
                <strong>E-mail enviado!</strong> O cliente receberá um link para definir a própria senha.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <p className="text-xs text-amber-700 leading-relaxed">
                <strong>Atenção:</strong> A senha temporária acima é um backup caso o e-mail não chegue. Não será exibida novamente.
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <Button className="flex-1" onClick={() => navigate('/clients')}>
                Ir para Clientes
              </Button>
              <Button variant="ghost" onClick={() => {
                setCreatedClient(null);
                setName('');
                setEmail('');
                setWhatsapp('');
                setAddress('');
                setCopied(false);
              }}>
                Novo cliente
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="mb-6">
        <Link to="/clients" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Clientes
        </Link>
        <h1 className="text-2xl font-semibold text-dark font-serif">Novo Cliente</h1>
        <p className="text-dark/50 text-sm mt-1">Cadastre um novo cliente na plataforma</p>
      </div>

      <Card>
        <CardBody>
          {!hasActiveDiary && (
            <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {ACTIVE_DIARY_MESSAGE}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nome completo"
              type="text"
              placeholder="Maria Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
            <Input
              label="E-mail"
              type="email"
              placeholder="cliente@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="WhatsApp"
              type="text"
              placeholder="(00) 00000-0000"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
            <Input
              label="Endereço"
              type="text"
              placeholder="Rua, número, cidade"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-dark/80">Diário vinculado</label>
              {!hasActiveDiary ? (
                <div className="w-full px-3 py-2.5 rounded-lg border border-beige-300 bg-beige-50 text-sm text-dark/40">
                  Nenhum diário ativo
                </div>
              ) : (
                <select
                  value={diaryId}
                  onChange={(e) => setDiaryId(e.target.value)}
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

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={loading} disabled={!hasActiveDiary || !diaryId} className="flex-1">
                Cadastrar Cliente
              </Button>
              <Link to="/clients">
                <Button type="button" variant="ghost">Cancelar</Button>
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
