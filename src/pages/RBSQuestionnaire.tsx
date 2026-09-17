import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SupabaseClient } from '@supabase/supabase-js';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';

// validate_instrument_invite não está nos tipos gerados do Supabase — mesmo
// padrão do untypedSupabase usado em LeadForm/QuizInstagram/Inscricao pra
// chamar RPCs fora do schema tipado.
const untypedSupabase = supabase as unknown as SupabaseClient;

const fieldClass =
  'w-full px-3.5 py-2.5 rounded-lg border border-petrol-600 bg-petrol-800 text-white text-sm placeholder:text-petrol-300 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent transition-colors';

const STORAGE_KEY = 'portal_rbs_draft';

const SCALE = [
  { value: 1, label: 'Discordo fortemente' },
  { value: 2, label: 'Discordo' },
  { value: 3, label: 'Discordo um pouco' },
  { value: 4, label: 'Nem concordo, nem discordo' },
  { value: 5, label: 'Concordo um pouco' },
  { value: 6, label: 'Concordo' },
  { value: 7, label: 'Concordo fortemente' },
];

interface Question {
  id: string;
  question_number: number;
  question_text: string;
}

type Step = 'loading' | 'identity' | 'welcome' | 'quiz' | 'done';

function loadDraft(): { assessment_id: string; edit_token: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDraft(assessmentId: string, editToken: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ assessment_id: assessmentId, edit_token: editToken }));
  } catch { /* ignore */ }
}

function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

export function RBSQuestionnaire() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token') ?? '';

  const [step, setStep] = useState<Step>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [editToken, setEditToken] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const [inviteClientName, setInviteClientName] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [hp, setHp] = useState('');
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: questionRows } = await supabase
        .from('rbs_questions')
        .select('id, question_number, question_text')
        .order('question_number');
      setQuestions((questionRows ?? []) as Question[]);

      const draft = loadDraft();
      if (draft?.assessment_id && draft?.edit_token) {
        const { data, error: fnError } = await supabase.functions.invoke('rbs-assessment-start', {
          body: { resume_assessment_id: draft.assessment_id, resume_token: draft.edit_token },
        });
        if (!fnError && data?.assessment_id) {
          setAssessmentId(data.assessment_id);
          setEditToken(draft.edit_token);
          const resumedAnswers = (data.raw_answers ?? {}) as Record<string, number>;
          const numericAnswers: Record<number, number> = {};
          for (const [key, value] of Object.entries(resumedAnswers)) numericAnswers[Number(key)] = value;
          setAnswers(numericAnswers);
          setStep('quiz');
          return;
        }
        clearDraft();
      }

      if (inviteToken) {
        const { data: inviteRows } = await untypedSupabase.rpc('validate_instrument_invite', {
          p_token: inviteToken,
          p_instrument: 'rbs',
        });
        const invite = inviteRows?.[0];
        if (invite) {
          setInviteClientName(invite.name);
          setStep('welcome');
          return;
        }
      }

      setStep('identity');
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleIdentitySubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    if (hp.trim()) return;
    setStep('welcome');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWelcomeSubmit = async () => {
    if (!lgpdConsent) return;

    setSubmitting(true);
    setError('');

    const { data, error: fnError } = await supabase.functions.invoke('rbs-assessment-start', {
      body: inviteClientName
        ? {
            invite_token: inviteToken,
            lgpd_consent: lgpdConsent,
            wants_email_notification: notifyEmail,
            wants_whatsapp_notification: notifyWhatsapp,
          }
        : {
            name: name.trim(),
            email: email.trim(),
            whatsapp: whatsapp.trim(),
            hp,
            lgpd_consent: lgpdConsent,
            wants_email_notification: notifyEmail,
            wants_whatsapp_notification: notifyWhatsapp,
          },
    });

    if (fnError || !data?.assessment_id || !data?.edit_token) {
      setError('Não foi possível iniciar o questionário agora. Tente novamente em alguns minutos.');
      setSubmitting(false);
      return;
    }

    saveDraft(data.assessment_id, data.edit_token);
    setAssessmentId(data.assessment_id);
    setEditToken(data.edit_token);
    setStep('quiz');
    setSubmitting(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const answeredCount = Object.keys(answers).length;
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.question_number] != null);

  const setAnswer = (questionNumber: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionNumber]: value }));
  };

  const handleSubmit = async () => {
    if (!assessmentId || !editToken || !allAnswered) return;
    setSubmitting(true);
    setError('');

    const allAnswersByNumber: Record<string, number> = {};
    for (const q of questions) allAnswersByNumber[String(q.question_number)] = answers[q.question_number];

    const { data, error: fnError } = await supabase.functions.invoke('rbs-assessment-save', {
      body: { assessment_id: assessmentId, edit_token: editToken, answers: allAnswersByNumber, finish: true },
    });

    if (fnError || data?.error) {
      setError('Não foi possível salvar suas respostas agora. Tente novamente.');
      setSubmitting(false);
      return;
    }

    clearDraft();
    setStep('done');
    setSubmitting(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#032a3c] text-white font-sans">
      <div className="h-40 sm:h-52 w-full">
        <img src="/questionario-cover.jpg" alt="" className="w-full h-full object-cover" />
      </div>

      <div className="max-w-md mx-auto px-6 py-10">
        <div className="flex justify-center -mt-16 mb-6">
          <img
            src="/logosistema.png"
            alt="Núbia Januzzi"
            className="w-20 h-20 rounded-full object-cover border-4 border-petrol-800 shadow-lg"
          />
        </div>

        {step === 'loading' && (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {step === 'identity' && (
          <>
            <h1 className="font-serif text-2xl text-center mb-3 text-balance">Escala de Crenças Românticas</h1>
            <p className="text-petrol-100/70 text-sm text-center leading-relaxed mb-8">
              Esse questionário tem 13 perguntas e leva cerca de 5 minutos.
            </p>

            <form onSubmit={handleIdentitySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-petrol-100">Qual seu nome completo</label>
                <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-petrol-100">Qual seu melhor e-mail</label>
                <input type="email" className={fieldClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-petrol-100">Qual seu número de WhatsApp</label>
                <input
                  className={fieldClass}
                  placeholder="+55 11 99999-9999"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </div>

              <div className="absolute -left-[9999px]" aria-hidden="true">
                <label htmlFor="website">Não preencha este campo</label>
                <input id="website" name="website" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
              </div>

              <Button type="submit" variant="secondary" className="w-full">
                Continuar
              </Button>
            </form>
          </>
        )}

        {step === 'welcome' && (
          <>
            <div className="flex items-center gap-4 mb-6">
              <img
                src="/nubia-foto-questionario.jpg"
                alt="Núbia Januzzi"
                className="w-16 h-16 rounded-full object-cover border-2 border-petrol-600 shrink-0"
              />
              <h1 className="font-serif text-xl leading-snug text-balance">Bem-vindo(a)!</h1>
            </div>

            {inviteClientName && (
              <p className="text-xs text-gold-300 bg-petrol-800/60 border border-petrol-600 rounded-lg px-3 py-2 mb-6">
                Preenchendo para: <strong>{inviteClientName}</strong>
              </p>
            )}

            <div className="space-y-5 text-sm text-petrol-100/85 leading-relaxed mb-8">
              <p>A seguir, você encontrará uma série de afirmações. Por favor, indique o quanto você concorda ou discorda de cada uma delas.</p>
            </div>

            <div className="space-y-3 mb-6">
              <label className="flex items-start gap-2.5 text-sm text-petrol-100/85 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="mt-0.5 accent-gold-400 w-4 h-4"
                />
                Deseja receber notificação por e-mail?
              </label>
              <label className="flex items-start gap-2.5 text-sm text-petrol-100/85 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyWhatsapp}
                  onChange={(e) => setNotifyWhatsapp(e.target.checked)}
                  className="mt-0.5 accent-gold-400 w-4 h-4"
                />
                Deseja receber notificação por WhatsApp?
              </label>
            </div>

            <div className="bg-petrol-800/60 border border-petrol-600 rounded-lg px-4 py-4 mb-6">
              <p className="font-semibold text-petrol-50 text-sm mb-1.5">Termo de Consentimento — LGPD</p>
              <p className="text-xs text-petrol-100/70 leading-relaxed mb-3">
                Os dados fornecidos neste formulário serão utilizados exclusivamente para fins de análise e
                acompanhamento do seu processo terapêutico. Seus dados serão tratados com confidencialidade e
                segurança, conforme a Lei nº 13.709/2018 (LGPD). Ao prosseguir, você consente com o uso das
                informações fornecidas.
              </p>
              <label className="flex items-start gap-2.5 text-sm text-petrol-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lgpdConsent}
                  onChange={(e) => setLgpdConsent(e.target.checked)}
                  className="mt-0.5 accent-gold-400 w-4 h-4"
                />
                Li e concordo com o uso dos meus dados conforme descrito acima
              </label>
            </div>

            {error && (
              <div className="text-sm text-red-300 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2 mb-4">{error}</div>
            )}

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              loading={submitting}
              disabled={!lgpdConsent}
              onClick={handleWelcomeSubmit}
            >
              Iniciar
            </Button>
          </>
        )}

        {step === 'quiz' && (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs text-petrol-100/60 mb-1.5">
                <span>Escala de Crenças Românticas</span>
                <span>{answeredCount} de {questions.length} respondidas</span>
              </div>
              <div className="h-1.5 bg-petrol-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold-400 rounded-full transition-all"
                  style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-6 mb-6">
              {questions.map((q, idx) => (
                <div key={q.id}>
                  <p className="text-sm text-petrol-50 leading-relaxed mb-2.5">
                    {idx + 1}. {q.question_text}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {SCALE.map((opt) => {
                      const selected = answers[q.question_number] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAnswer(q.question_number, opt.value)}
                          className={`text-left px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all ${
                            selected
                              ? 'border-gold-400 bg-gold-400/20 text-gold-200'
                              : 'border-petrol-600 bg-petrol-800 text-petrol-200 hover:border-petrol-400'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="text-sm text-red-300 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2 mb-4">{error}</div>
            )}

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              loading={submitting}
              disabled={!allAnswered}
              onClick={handleSubmit}
            >
              Concluir
            </Button>
          </>
        )}

        {step === 'done' && (
          <div className="text-center py-10">
            <CheckCircle2 size={40} className="text-gold-400 mx-auto mb-4" />
            <h1 className="font-serif text-2xl mb-2 text-balance">Respostas enviadas!</h1>
            <p className="text-petrol-100/80 text-sm leading-relaxed">
              Obrigada por preencher o questionário. Em breve você receberá meu contato.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
