import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, BookOpen, CheckCircle, FileText, KeyRound, Mail, User } from 'lucide-react';
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

type RpcError = {
  code?: string;
  message?: string;
  details?: string;
};

type ValidationResult = {
  data: AccessClient | null;
  error: RpcError | null;
};

const CLIENT_ACCESS_KEY = 'portal_client_access';
const VALIDATE_CLIENT_TOKEN_RPC = 'validate_client_token';
const validationRequests = new Map<string, Promise<ValidationResult>>();

function normalizeToken(rawToken: string) {
  return decodeURIComponent(rawToken).trim();
}

function firstRpcRow<T>(data: T[] | T | null) {
  return Array.isArray(data) ? data[0] ?? null : data;
}

async function requestClientTokenValidation(normalizedToken: string): Promise<ValidationResult> {
  const { data, error } = await (supabase as any)
    .rpc(VALIDATE_CLIENT_TOKEN_RPC, { p_token: normalizedToken });

  return {
    data: error ? null : firstRpcRow<AccessClient>(data),
    error: error ?? null,
  };
}

function validateClientToken(rawToken: string) {
  const normalizedToken = normalizeToken(rawToken);
  const cachedRequest = validationRequests.get(normalizedToken);

  if (cachedRequest) {
    return cachedRequest;
  }

  const request = requestClientTokenValidation(normalizedToken);
  validationRequests.set(normalizedToken, request);
  return request;
}

export function ClientAccess() {
  const { token } = useParams<{ token: string }>();
  const [client, setClient] = useState<AccessClient | null>(null);
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

      const { data, error: tokenError } = await validateClientToken(token);

      if (cancelled) return;

      if (tokenError || !data) {
        setClient(null);
        setError('Link de acesso inválido ou expirado. Solicite um novo convite.');
        setLoading(false);
        return;
      }

      const validatedClient = data as AccessClient;
      localStorage.setItem(
        CLIENT_ACCESS_KEY,
        JSON.stringify({
          token: normalizeToken(token),
          client_id: validatedClient.client_id,
          expires_at: validatedClient.expires_at,
        })
      );
      setClient(validatedClient);
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

        <Card className="mb-6">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardBody className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-petrol-50 flex items-center justify-center">
                <BookOpen size={18} className="text-petrol-700" />
              </div>
              <div>
                <div className="font-medium text-dark text-sm">Diário</div>
                <div className="text-xs text-dark/40">Área básica liberada por convite</div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold-50 flex items-center justify-center">
                <FileText size={18} className="text-gold-600" />
              </div>
              <div>
                <div className="font-medium text-dark text-sm">Relatórios</div>
                <div className="text-xs text-dark/40">Acesso sem senha confirmado</div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
