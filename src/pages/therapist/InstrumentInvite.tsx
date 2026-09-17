import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, ExternalLink } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
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

      {instrument.documentation && (
        <>
          <Card className="mb-4">
            <CardBody className="space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                {instrument.documentation.tags.map((tag) => (
                  <span key={tag} className="text-xs font-medium text-petrol-700 bg-petrol-50 px-2.5 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
                {instrument.documentation.badge && <Badge variant="success">{instrument.documentation.badge}</Badge>}
              </div>

              <div>
                <h2 className="text-sm font-semibold text-dark font-serif mb-2">Descrição</h2>
                <p className="text-sm text-dark/70 leading-relaxed">{instrument.documentation.overview}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {instrument.documentation.applicationTime && (
                  <div>
                    <p className="text-xs font-semibold text-dark/50">Tempo médio de aplicação</p>
                    <p className="text-sm text-dark/80 mt-0.5">{instrument.documentation.applicationTime}</p>
                  </div>
                )}
                {instrument.documentation.targetPopulation && (
                  <div>
                    <p className="text-xs font-semibold text-dark/50">População-alvo</p>
                    <p className="text-sm text-dark/80 mt-0.5">{instrument.documentation.targetPopulation}</p>
                  </div>
                )}
              </div>

              {instrument.documentation.recommendedUses && (
                <div>
                  <p className="text-xs font-semibold text-dark/50 mb-1.5">Usos recomendados</p>
                  <ul className="list-disc list-inside space-y-1">
                    {instrument.documentation.recommendedUses.map((use, i) => (
                      <li key={i} className="text-sm text-dark/70">{use}</li>
                    ))}
                  </ul>
                </div>
              )}

              {instrument.documentation.interpretation && (
                <details>
                  <summary className="text-xs font-semibold text-dark/50 cursor-pointer select-none">
                    Interpretação clínica (clique para expandir)
                  </summary>
                  <p className="text-sm text-dark/70 leading-relaxed whitespace-pre-wrap mt-2">
                    {instrument.documentation.interpretation}
                  </p>
                </details>
              )}

              {instrument.documentation.patientInstructions && (
                <div>
                  <p className="text-xs font-semibold text-dark/50 mb-1">Instruções do paciente</p>
                  <p className="text-sm text-dark/70 leading-relaxed italic">"{instrument.documentation.patientInstructions}"</p>
                </div>
              )}

              {(instrument.documentation.developers || instrument.documentation.references) && (
                <div className="text-xs text-dark/40 space-y-1 pt-3 border-t border-beige-200">
                  {instrument.documentation.developers && (
                    <p><span className="font-semibold">Desenvolvedores:</span> {instrument.documentation.developers}</p>
                  )}
                  {instrument.documentation.references && (
                    <p><span className="font-semibold">Referências:</span> {instrument.documentation.references}</p>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {instrument.documentation.scales.length > 0 && (
            <Card className="mb-4">
              <CardBody className="space-y-4">
                <h2 className="text-sm font-semibold text-dark font-serif">Escalas</h2>
                {instrument.documentation.scales.map((scale, i) => (
                  <div key={scale.label} className={i > 0 ? 'border-t border-beige-100 pt-4' : ''}>
                    <p className="text-sm font-medium text-dark">{scale.label}</p>
                    <p className="text-sm text-dark/60 mt-1">{scale.formula}</p>
                    {!scale.hasCutoffs && (
                      <div className="mt-2 bg-beige-50 border border-beige-200 rounded-lg px-3 py-2">
                        <p className="text-xs font-medium text-dark/60">Não foram cadastrados pontos de corte</p>
                        <p className="text-xs text-dark/40 mt-0.5">
                          É possível que não existam pontos de corte validados para a população brasileira para este instrumento.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </>
      )}

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
