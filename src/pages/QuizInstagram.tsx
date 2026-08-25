import { FormEvent, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SupabaseClient } from '@supabase/supabase-js';
import { ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardBody } from '../components/ui/Card';
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
  computeDominantStage,
} from '../lib/quizProtocolo4d';

// submit_lead isn't declared in the (stale) generated database.types.ts —
// same untyped-client pattern used in LeadForm.tsx and ClientAccess.tsx.
const untypedSupabase = supabase as unknown as SupabaseClient;

type Step = 'consent' | number | 'capture' | 'result';

export function QuizInstagram() {
  const [searchParams] = useSearchParams();
  const prefillName = searchParams.get('nome') ?? '';
  const prefillWhatsapp = searchParams.get('wa') ?? '';

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
    <div className="min-h-screen bg-beige-100 text-dark font-sans flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <p className="text-gold-700 text-xs font-semibold tracking-widest uppercase mb-1">
            Protocolo 4D
          </p>
          <h1 className="font-serif text-2xl text-petrol-900">Mini Quiz de Triagem Simbólica</h1>
        </div>

        <Card>
          <CardBody className="p-6 md:p-8">
            {step === 'consent' && (
              <div className="space-y-6">
                <p className="text-petrol-800/80 leading-relaxed text-sm">{CONSENT_TEXT}</p>
                <Button variant="primary" size="lg" className="w-full" onClick={() => setStep(0)}>
                  Começar
                </Button>
              </div>
            )}

            {typeof step === 'number' && currentQuestion && (
              <div className="space-y-6">
                <p className="text-petrol-400 text-xs uppercase tracking-wide">
                  Pergunta {questionIndex + 1} de {QUIZ_QUESTIONS.length}
                </p>
                <h2 className="font-serif text-lg text-petrol-900 leading-snug">
                  {currentQuestion.question}
                </h2>
                <div className="flex flex-col gap-3">
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option.label}
                      onClick={() => handleAnswer(option.stage)}
                      className="text-left text-sm text-petrol-800 bg-beige-100 border border-beige-300 rounded-lg px-4 py-3 hover:border-petrol-400 hover:bg-white transition-colors"
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
                  <h2 className="font-serif text-lg text-petrol-900 mb-1">Seu retrato está pronto</h2>
                  <p className="text-petrol-800/70 text-sm">
                    Me diga pra onde enviar o resultado.
                  </p>
                </div>

                {!prefillName && (
                  <Input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} required />
                )}
                <Input
                  type="email"
                  placeholder="Seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {!prefillWhatsapp && (
                  <Input
                    type="tel"
                    placeholder="WhatsApp (opcional)"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                  />
                )}

                <Button type="submit" variant="primary" size="lg" className="w-full" loading={status === 'loading'}>
                  Quero meu resultado
                </Button>
                {status === 'error' && (
                  <p className="text-xs text-red-500">Não deu certo, tenta de novo em instantes.</p>
                )}
              </form>
            )}

            {step === 'result' && dominantStage && (
              <div className="space-y-5">
                <p className="text-petrol-800/60 text-xs italic">{DISCLAIMER_TEXT}</p>

                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = PILARES[STAGES.indexOf(dominantStage)].icon;
                    return (
                      <span className="bg-petrol-700 text-white rounded-full p-2.5 shrink-0">
                        <Icon size={20} />
                      </span>
                    );
                  })()}
                  <h2 className="font-serif text-xl text-petrol-900">
                    Seu retrato agora: {PILARES[STAGES.indexOf(dominantStage)].titulo}
                  </h2>
                </div>

                <p className="text-petrol-800/80 leading-relaxed text-sm">
                  {PARECERES[dominantStage].intro}
                </p>
                <p className="text-petrol-800/80 leading-relaxed text-sm">
                  <strong className="text-petrol-900">Hipótese:</strong> {PARECERES[dominantStage].hipotese}
                </p>
                <p className="text-petrol-800/80 leading-relaxed text-sm">
                  <strong className="text-petrol-900">Risco de seguir sem isso:</strong>{' '}
                  {PARECERES[dominantStage].risco}
                </p>
                <p className="text-petrol-800/80 leading-relaxed text-sm">
                  <strong className="text-petrol-900">Prática desta semana:</strong>{' '}
                  {PARECERES[dominantStage].pratica}
                </p>

                <div className="pt-2 border-t border-beige-300 space-y-4">
                  <p className="text-petrol-800/80 leading-relaxed text-sm">{FECHAMENTO_TEXT}</p>
                  <a href="/produtos#sessao-avaliacao">
                    <Button variant="secondary" size="lg" className="w-full">
                      Quero minha Sessão de Avaliação
                      <ArrowRight size={16} />
                    </Button>
                  </a>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <p className="text-center text-petrol-800/40 text-xs mt-6">
          Este quiz não substitui avaliação psicológica ou psiquiátrica profissional.
        </p>
      </div>
    </div>
  );
}
