import { FormEvent, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SupabaseClient } from '@supabase/supabase-js';
import { ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { PILARES } from '../lib/protocolo4d';
import {
  STAGES,
  Stage4D,
  QUIZ_QUESTIONS,
  PARECERES,
  CONSENT_TEXT,
  DISCLAIMER_TEXT,
  FECHAMENTO_TEXT,
  SESSAO_AVALIACAO_WHATSAPP_LINK,
  computeDominantStage,
} from '../lib/quizProtocolo4d';

// submit_lead isn't declared in the (stale) generated database.types.ts —
// same untyped-client pattern used in LeadForm.tsx and ClientAccess.tsx.
const untypedSupabase = supabase as unknown as SupabaseClient;

type Step = 'consent' | number | 'capture' | 'result';

// Mesmo padrão visual (capa + logo + campos escuros) do /cadastrocliente e
// do /questionario-esquemas — mantém as três páginas de captação consistentes.
const fieldClass =
  'w-full px-3.5 py-2.5 rounded-lg border border-petrol-600 bg-petrol-800 text-white text-sm placeholder:text-petrol-300 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent transition-colors';

// Só usa o valor da URL se vier preenchido de verdade — ferramentas como o
// Growth Tool de boas-vindas do ManyChat podem passar a tag literal
// ("{{first_name}}") sem resolver, em vez de omitir o parâmetro.
function cleanParam(value: string | null): string {
  return value && !value.includes('{{') ? value : '';
}

export function QuizInstagram() {
  const [searchParams] = useSearchParams();
  const prefillName = cleanParam(searchParams.get('nome'));
  const prefillWhatsapp = cleanParam(searchParams.get('wa'));

  const [step, setStep] = useState<Step>('consent');
  const [answers, setAnswers] = useState<Stage4D[]>([]);
  const [name, setName] = useState(prefillName);
  const [whatsapp, setWhatsapp] = useState(prefillWhatsapp);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const questionIndex = typeof step === 'number' ? step : 0;
  const currentQuestion = QUIZ_QUESTIONS[questionIndex];

  function handleAnswer(stage: Stage4D) {
    const next = [...answers, stage];
    setAnswers(next);
    setStep(questionIndex + 1 < QUIZ_QUESTIONS.length ? questionIndex + 1 : 'capture');
  }

  const dominantStage = answers.length === QUIZ_QUESTIONS.length ? computeDominantStage(answers) : null;

  async function handleCaptureSubmit(e: FormEvent) {
    e.preventDefault();
    if (!dominantStage) return;

    setStatus('loading');

    const { error } = await untypedSupabase.rpc('submit_lead', {
      p_name: name || null,
      p_email: email,
      p_whatsapp: whatsapp || null,
      p_source: `quiz_instagram_${dominantStage}`,
    });

    if (error) {
      setStatus('error');
      return;
    }

    setStatus('idle');
    setStep('result');

    fetch('/api/quiz-result-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, stage: dominantStage }),
    }).catch(() => {
      // Envio do e-mail é best-effort — o resultado já foi mostrado na tela.
    });
  }

  return (
    <div className="min-h-screen bg-[#032a3c] text-white font-sans">
      <div className="h-40 sm:h-52 w-full">
        <img src="/cadastro-cover.jpg" alt="" className="w-full h-full object-cover" />
      </div>

      <div className="max-w-md mx-auto px-6 py-10">
        <div className="flex justify-center -mt-16 mb-6">
          <img
            src="/logosistema.png"
            alt="Núbia Januzzi"
            className="w-20 h-20 rounded-full object-cover border-4 border-petrol-800 shadow-lg"
          />
        </div>

        <div className="text-center mb-6">
          <p className="text-gold-400 text-xs font-semibold tracking-widest uppercase mb-1">Protocolo 4D</p>
          <h1 className="font-serif text-2xl text-balance">Mini Quiz de Triagem Simbólica</h1>
        </div>

        {step === 'consent' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <img
                src="/nubia-foto-questionario.jpg"
                alt="Núbia Januzzi"
                className="w-16 h-16 rounded-full object-cover border-2 border-petrol-600 shrink-0"
              />
              <p className="font-serif text-lg leading-snug text-balance">Oi! Que bom te ver por aqui.</p>
            </div>
            <p className="text-petrol-100/80 leading-relaxed text-sm">{CONSENT_TEXT}</p>
            <Button variant="secondary" size="lg" className="w-full" onClick={() => setStep(0)}>
              Começar
            </Button>
          </div>
        )}

        {typeof step === 'number' && currentQuestion && (
          <div className="space-y-6">
            <p className="text-petrol-300 text-xs uppercase tracking-wide">
              Pergunta {questionIndex + 1} de {QUIZ_QUESTIONS.length}
            </p>
            <h2 className="font-serif text-lg leading-snug text-balance">{currentQuestion.question}</h2>
            <div className="flex flex-col gap-3">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.label}
                  onClick={() => handleAnswer(option.stage)}
                  className="text-left text-sm text-white bg-petrol-800 border border-petrol-600 rounded-lg px-4 py-3 hover:border-gold-400 hover:bg-petrol-700 transition-colors"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'capture' && (
          <form onSubmit={handleCaptureSubmit} className="space-y-4">
            <div>
              <h2 className="font-serif text-lg mb-1">Seu retrato está pronto</h2>
              <p className="text-petrol-100/70 text-sm">Me diga pra onde enviar o resultado.</p>
            </div>

            <input
              className={fieldClass}
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="email"
              className={fieldClass}
              placeholder="Seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="tel"
              className={fieldClass}
              placeholder="Seu WhatsApp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              required
            />

            <Button type="submit" variant="secondary" size="lg" className="w-full" loading={status === 'loading'}>
              Quero meu resultado
            </Button>
            {status === 'error' && <p className="text-xs text-red-400">Não deu certo, tenta de novo em instantes.</p>}
          </form>
        )}

        {step === 'result' && dominantStage && (
          <div className="space-y-5">
            <p className="text-petrol-200/70 text-xs italic">{DISCLAIMER_TEXT}</p>

            <div className="flex items-center gap-3">
              {(() => {
                const Icon = PILARES[STAGES.indexOf(dominantStage)].icon;
                return (
                  <span className="bg-gold-500 text-petrol-900 rounded-full p-2.5 shrink-0">
                    <Icon size={20} />
                  </span>
                );
              })()}
              <h2 className="font-serif text-xl">Seu retrato agora: {PILARES[STAGES.indexOf(dominantStage)].titulo}</h2>
            </div>

            <p className="text-petrol-100/85 leading-relaxed text-sm">{PARECERES[dominantStage].intro}</p>
            <p className="text-petrol-100/85 leading-relaxed text-sm">
              <strong className="text-white">Hipótese:</strong> {PARECERES[dominantStage].hipotese}
            </p>
            <p className="text-petrol-100/85 leading-relaxed text-sm">
              <strong className="text-white">Risco de seguir sem isso:</strong> {PARECERES[dominantStage].risco}
            </p>
            <p className="text-petrol-100/85 leading-relaxed text-sm">
              <strong className="text-white">Prática desta semana:</strong> {PARECERES[dominantStage].pratica}
            </p>

            <div className="pt-2 border-t border-petrol-700 space-y-4">
              <p className="text-petrol-100/85 leading-relaxed text-sm">{FECHAMENTO_TEXT}</p>
              <a href={SESSAO_AVALIACAO_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="lg" className="w-full">
                  Quero minha Sessão de Avaliação
                  <ArrowRight size={16} />
                </Button>
              </a>
            </div>
          </div>
        )}

        <p className="text-center text-petrol-300/50 text-xs mt-8">
          Este quiz não substitui avaliação psicológica ou psiquiátrica profissional.
        </p>
      </div>
    </div>
  );
}
