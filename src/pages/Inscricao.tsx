import { FormEvent, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { Check } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { supabase } from '../lib/supabase';

// submit_lead isn't declared in the (stale) generated database.types.ts — same
// untyped-client pattern used in LeadForm.tsx and QuizInstagram.tsx.
const untypedSupabase = supabase as unknown as SupabaseClient;

const IDADE_OPCOES = ['Até 24', '25–34', '35–44', '45–54', '55 ou mais'];
const SEXO_OPCOES = ['Feminino', 'Masculino', 'Prefiro não informar'];
const ESTADO_CIVIL_OPCOES = ['Solteiro(a)', 'Namorando', 'Casado(a) ou união estável', 'Divorciado(a)', 'Viúvo(a)'];
const COMO_CONHECEU_OPCOES = ['Instagram', 'Indicação de alguém', 'Google', 'YouTube', 'TikTok', 'Outro'];
const JA_FEZ_TERAPIA_OPCOES = ['Sim, atualmente', 'Sim, no passado', 'Não, nunca'];
const TRAVAMENTO_AREAS = ['Relacionamentos afetivos', 'Vida profissional', 'Corpo e autocuidado', 'Família', 'Outra'];

function Select({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-dark/80">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2.5 rounded-lg border border-beige-300 text-dark text-sm bg-white focus:outline-none focus:ring-2 focus:ring-petrol-400 focus:border-transparent transition-colors"
      >
        <option value="" disabled>Selecione</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function TogglePills({
  value,
  onToggle,
  options,
}: {
  value: string[];
  onToggle: (option: string) => void;
  options: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`px-3.5 py-2 rounded-full text-sm border transition-colors ${
              active
                ? 'bg-petrol-700 text-white border-petrol-700'
                : 'bg-white text-dark/70 border-beige-300 hover:border-petrol-300'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function Inscricao() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [idade, setIdade] = useState('');
  const [sexo, setSexo] = useState('');
  const [estadoCivil, setEstadoCivil] = useState('');
  const [profissao, setProfissao] = useState('');
  const [comoConheceu, setComoConheceu] = useState('');
  const [jaFezTerapia, setJaFezTerapia] = useState('');
  const [oQueFezParar, setOQueFezParar] = useState('');
  const [motivo, setMotivo] = useState('');
  const [travamentoAreas, setTravamentoAreas] = useState<string[]>([]);
  const [travamentoDetalhe, setTravamentoDetalhe] = useState('');
  const [autoavaliacao, setAutoavaliacao] = useState('');
  const [triagemClinica, setTriagemClinica] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  function toggleTravamentoArea(area: string) {
    setTravamentoAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('loading');

    const answers = {
      idade,
      sexo,
      estado_civil: estadoCivil,
      profissao,
      como_conheceu: comoConheceu,
      ja_fez_terapia: jaFezTerapia,
      o_que_fez_parar: oQueFezParar || null,
      motivo,
      travamento_areas: travamentoAreas,
      travamento_detalhe: travamentoDetalhe || null,
      autoavaliacao,
      triagem_clinica: triagemClinica,
    };

    const { error } = await untypedSupabase.rpc('submit_lead', {
      p_name: name,
      p_email: email,
      p_whatsapp: whatsapp,
      p_source: 'sessao_avaliacao',
      p_status: 'selecao',
      p_answers: answers,
    });

    if (error) {
      setStatus('error');
      return;
    }

    setStatus('done');

    fetch('/api/inscricao-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, whatsapp, answers }),
    }).catch(() => {
      // Envio do e-mail é best-effort — a inscrição já foi registrada.
    });
  }

  if (status === 'done') {
    return (
      <MarketingLayout>
        <section className="max-w-2xl mx-auto px-4 py-24 text-center">
          <div className="w-14 h-14 rounded-full bg-petrol-700 text-gold-300 flex items-center justify-center mx-auto mb-6">
            <Check size={24} />
          </div>
          <h1 className="font-serif text-3xl mb-4 text-balance">Inscrição recebida.</h1>
          <p className="text-petrol-800/80 leading-relaxed">
            Vou analisar suas respostas com calma e te chamo no WhatsApp em breve pra confirmar os
            próximos passos — seja o agendamento da sessão de avaliação, seja outra indicação, se fizer
            mais sentido para o seu momento.
          </p>
        </section>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <section className="bg-petrol-700 text-white">
        <div className="max-w-2xl mx-auto px-4 py-16 md:py-20">
          <p className="text-gold-300 text-xs font-semibold tracking-widest uppercase mb-4">
            Sessão de Avaliação · Inscrição
          </p>
          <h1 className="font-serif text-3xl md:text-4xl leading-tight text-balance mb-6">
            Antes de agendar, preciso te conhecer um pouco.
          </h1>
          <p className="text-petrol-100 text-base leading-relaxed">
            Essas respostas me ajudam a confirmar se o Protocolo 4D faz sentido para o seu caso antes
            de você agendar e pagar a sessão de avaliação. Leva alguns minutos — responda com
            honestidade, não tem resposta certa ou errada.
          </p>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-4 py-16">
        <form onSubmit={handleSubmit} className="space-y-12">
          <div className="space-y-4">
            <h2 className="font-serif text-xl mb-2">Dados pessoais</h2>
            <Input label="Nome completo" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="WhatsApp" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required />
            <Select label="Idade" value={idade} onChange={setIdade} options={IDADE_OPCOES} required />
            <Select label="Sexo" value={sexo} onChange={setSexo} options={SEXO_OPCOES} required />
            <Select label="Estado civil" value={estadoCivil} onChange={setEstadoCivil} options={ESTADO_CIVIL_OPCOES} required />
            <Input label="Profissão / área de atuação" value={profissao} onChange={(e) => setProfissao(e.target.value)} required />
            <Select label="Como você conheceu a Núbia?" value={comoConheceu} onChange={setComoConheceu} options={COMO_CONHECEU_OPCOES} required />
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-xl mb-2">Contexto</h2>
            <Select label="Você já fez terapia antes?" value={jaFezTerapia} onChange={setJaFezTerapia} options={JA_FEZ_TERAPIA_OPCOES} required />
            {jaFezTerapia && jaFezTerapia !== 'Não, nunca' && (
              <Textarea
                label="O que te fez parar, ou o que sentiu que faltou? (opcional)"
                rows={3}
                value={oQueFezParar}
                onChange={(e) => setOQueFezParar(e.target.value)}
              />
            )}
            <Textarea
              label="Conte um pouco sobre o que te trouxe até aqui — por que está buscando isso agora?"
              rows={4}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
            />
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-dark/80">
                Onde esse travamento aparece mais forte? (pode marcar mais de uma)
              </label>
              <TogglePills value={travamentoAreas} onToggle={toggleTravamentoArea} options={TRAVAMENTO_AREAS} />
            </div>
            <Textarea
              label="Conte um pouco mais sobre isso (opcional)"
              rows={3}
              value={travamentoDetalhe}
              onChange={(e) => setTravamentoDetalhe(e.target.value)}
            />
            <Textarea
              label="Por que você acha que o Protocolo 4D é pra você?"
              rows={4}
              value={autoavaliacao}
              onChange={(e) => setAutoavaliacao(e.target.value)}
              required
            />
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-xl mb-2">Triagem</h2>
            <Select
              label="Você está em acompanhamento psiquiátrico ou em tratamento por um quadro clínico diagnosticado (crise, risco, medicação) no momento?"
              value={triagemClinica}
              onChange={setTriagemClinica}
              options={['Sim', 'Não']}
              required
            />
          </div>

          <div>
            <Button type="submit" variant="primary" size="lg" loading={status === 'loading'} className="w-full">
              Enviar inscrição
            </Button>
            {status === 'error' && (
              <p className="text-sm text-red-500 mt-2">Não deu certo, tenta de novo em instantes.</p>
            )}
            <p className="text-xs text-petrol-800/50 mt-4">
              Ao enviar, você concorda em receber mensagens da Núbia Januzzi sobre sua inscrição. Suas
              respostas são confidenciais e usadas apenas para essa avaliação.
            </p>
          </div>
        </form>
      </section>
    </MarketingLayout>
  );
}
