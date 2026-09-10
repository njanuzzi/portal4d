import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, BookOpen, CheckCircle, KeyRound, Mail, User } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDate } from '../../lib/format';
import { supabase } from '../../lib/supabase';

interface AccessClient {
  client_id: string;
  email: string;
  name: string;
  active: boolean;
  expires_at: string;
}

const CLIENT_ACCESS_KEY = 'portal_client_access';

export function ClientAccess() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<AccessClient | null>(null);
  const [diaryName, setDiaryName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const validateToken = async () => {
      setLoading(true);
      setError('');

      if (!token) {
        setError('Link de acesso inválido.');
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().slice(0, 10);

      const [tokenResult, diaryResult] = await Promise.all([
        (supabase as any).rpc('validate_client_token', { p_token: token }).maybeSingle(),
        (supabase as any).rpc('get_client_diary_data', { p_token: token, p_date: today }),
      ]);

      if (cancelled) return;

      if (tokenResult.error || !tokenResult.data) {
        setClient(null);
        setError('Link de acesso inválido ou expirado. Solicite um novo convite.');
        setLoading(false);
        return;
      }

      const validatedClient = tokenResult.data as AccessClient;
      localStorage.setItem(
        CLIENT_ACCESS_KEY,
        JSON.stringify({
          token,
          client_id: validatedClient.client_id,
          expires_at: validatedClient.expires_at,
        })
      );
      setClient(validatedClient);

      if (!diaryResult.error && diaryResult.data && !diaryResult.data.error) {
        setDiaryName(diaryResult.data.diary?.name ?? null);
      }

      setLoading(false);
    };

    validateToken();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-beige-100 flex items-center justify-center p-6">
        <PageSpinner />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-beige-100 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardBody className="text-center py-10">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <h1 className="text-xl font-semibold text-dark font-serif mb-2">Acesso não autorizado</h1>
            <p className="text-sm text-dark/50 mb-6">{error}</p>
            <Link to="/login">
              <Button variant="ghost">Voltar ao login</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-beige-100 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 pt-4">
          <div className="flex items-center gap-2 text-petrol-700 text-sm mb-3">
            <KeyRound size={16} />
            Acesso por convite
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-dark font-serif">Portal do Cliente</h1>
              <p className="text-dark/50 text-sm mt-1">Olá, {client.name}. Seu acesso foi validado.</p>
            </div>
            <Badge variant="success">Autenticado</Badge>
          </div>
        </div>

        <Card className="mb-4">
          <CardBody className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <User size={16} className="text-dark/30 shrink-0" />
              <span className="text-dark/70">{client.name}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail size={16} className="text-dark/30 shrink-0" />
              <span className="text-dark/70">{client.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle size={16} className="text-emerald-500 shrink-0" />
              <span className="text-dark/70">Convite válido até {formatDate(client.expires_at)}</span>
            </div>
          </CardBody>
        </Card>

        {diaryName && (
          <Card className="mb-6 border border-petrol-200 bg-petrol-50/30">
            <CardBody className="flex items-center gap-3 py-3">
              <BookOpen size={16} className="text-petrol-600 shrink-0" />
              <div>
                <p className="text-xs text-dark/40 uppercase tracking-wide font-medium">Diário habilitado</p>
                <p className="text-sm font-medium text-dark">{diaryName}</p>
              </div>
            </CardBody>
          </Card>
        )}

        <Button
          size="lg"
          className="w-full"
          onClick={() => navigate(`/client/${token}/diary`)}
        >
          <BookOpen size={18} className="mr-2" />
          Preencher Diário de Hoje
        </Button>
      </div>
    </div>
  );
}
