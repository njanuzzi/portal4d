import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import type { Diary } from '../../lib/database.types';

const ACTIVE_DIARY_MESSAGE = 'Nenhum diário ativo. Ative um diário antes de cadastrar clientes.';

export function NewClient() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [diaryId, setDiaryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasActiveDiary = diaries.length > 0;

  useEffect(() => {
    let isMounted = true;

    const loadActiveDiaries = async () => {
      const { data } = await supabase
        .from('diaries')
        .select('id, name, is_active, created_at, updated_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

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

    const refreshActiveDiaries = () => {
      void loadActiveDiaries();
    };

    const refreshWhenVisible = () => {
      if (!document.hidden) refreshActiveDiaries();
    };

    refreshActiveDiaries();
    window.addEventListener('focus', refreshActiveDiaries);
    window.addEventListener('pageshow', refreshActiveDiaries);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    const intervalId = window.setInterval(refreshActiveDiaries, 10000);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', refreshActiveDiaries);
      window.removeEventListener('pageshow', refreshActiveDiaries);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
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
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
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
      }

      navigate('/clients');
    } catch {
      setError('Erro inesperado. Tente novamente.');
      setLoading(false);
    }
  };

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

            {/* Diary dropdown */}
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
