import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, ExternalLink } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabase';
import { getInstrument } from '../../lib/instruments';

interface ClientOption {
  id: string;
  name: string;
}

type Mode = 'individual' | 'generic';

export function InstrumentInvite() {
  const { key } = useParams<{ key: string }>();
  const instrument = key ? getInstrument(key) : undefined;

  const [mode, setMode] = useState<Mode>('individual');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState('');

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'client')
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        const list = (data ?? []) as ClientOption[];
        setClients(list);
        setSelectedClientId(list[0]?.id ?? '');
        setLoading(false);
      });
  }, []);

  const handleGenerate = async () => {
    if (!instrument || !selectedClientId) return;
    setGenerating(true);
    setError('');
    setLink('');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: insertError } = await (supabase.from('instrument_invites') as any)
      .insert({ client_id: selectedClientId, instrument: instrument.key })
      .select('token')
      .single();

    if (insertError || !data?.token) {
      setError('Não foi possível gerar o link agora. Tente novamente.');
      setGenerating(false);
      return;
    }

    setLink(`${window.location.origin}${instrument.path}?token=${data.token}`);
    setGenerating(false);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setLink(next === 'generic' && instrument ? `${window.location.origin}${instrument.path}` : '');
  };

  if (!instrument) {
    return (
      <div className="p-6">
        <p className="text-dark/50">Instrumento não encontrado.</p>
        <Link to="/instrumentos" className="text-sm text-petrol-600 hover:underline mt-2 inline-block">
          Voltar
        </Link>
      </div>
    );
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link to="/instrumentos" className="inline-flex items-center gap-1.5 text-sm text-dark/50 hover:text-dark mb-4">
        <ArrowLeft size={15} />
        Instrumentos
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-dark font-serif">{instrument.label}</h1>
        <p className="text-dark/50 text-sm mt-1">{instrument.description}</p>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => switchMode('individual')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
            mode === 'individual'
              ? 'bg-petrol-700 text-white border-petrol-700'
              : 'bg-white text-dark/60 border-beige-300 hover:border-petrol-300'
          }`}
        >
          Link individual
        </button>
        <button
          type="button"
          onClick={() => switchMode('generic')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
            mode === 'generic'
              ? 'bg-petrol-700 text-white border-petrol-700'
              : 'bg-white text-dark/60 border-beige-300 hover:border-petrol-300'
          }`}
        >
          Link genérico (com cadastro)
        </button>
      </div>

      {mode === 'individual' ? (
        <Card>
          <CardBody className="space-y-4">
            <p className="text-xs text-dark/40">
              O cliente escolhido já cai direto no questionário, sem precisar se identificar.
            </p>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-dark">Cliente</label>
              {clients.length === 0 ? (
                <p className="text-sm text-dark/40">Nenhum cliente ativo cadastrado.</p>
              ) : (
                <select
                  value={selectedClientId}
                  onChange={(e) => { setSelectedClientId(e.target.value); setLink(''); }}
                  className="w-full px-3 py-2.5 rounded-lg border border-beige-300 text-dark text-sm bg-white focus:outline-none focus:ring-2 focus:ring-petrol-400 focus:border-transparent transition-colors"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
            )}

            <Button onClick={handleGenerate} loading={generating} disabled={!selectedClientId}>
              Gerar link
            </Button>

            {link && <LinkBox link={link} footer="Válido por 30 dias." />}
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="space-y-4">
            <p className="text-xs text-dark/40">
              Link único e permanente para este instrumento — quem abrir preenche o próprio nome, e-mail e
              WhatsApp antes de começar. Útil para divulgação avulsa, quando ainda não se sabe quem vai responder.
            </p>
            <LinkBox link={link} footer="Sempre disponível — não expira." />
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function LinkBox({ link, footer }: { link: string; footer: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs bg-white border border-emerald-200 rounded px-2 py-1.5 text-dark/70 truncate">
          {link}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-300 rounded px-2 py-1.5 transition-colors"
        >
          {copied ? <><Check size={13} className="text-emerald-600" /> Copiado!</> : <><Copy size={13} /> Copiar</>}
        </button>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-emerald-600 hover:text-emerald-800"
          title="Abrir link"
        >
          <ExternalLink size={14} />
        </a>
      </div>
      <p className="text-xs text-emerald-700/70 mt-2">{footer}</p>
    </div>
  );
}
