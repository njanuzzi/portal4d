import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SupabaseClient } from '@supabase/supabase-js';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { sortByModeOrder } from '../lib/smiModeOrder';

// validate_instrument_invite não está nos tipos gerados do Supabase — mesmo
// padrão do untypedSupabase usado em LeadForm/QuizInstagram/Inscricao pra
// chamar RPCs fora do schema tipado.
const untypedSupabase = supabase as unknown as SupabaseClient;

const fieldClass =
  'w-full px-3.5 py-2.5 rounded-lg border border-petrol-600 bg-petrol-800 text-white text-sm placeholder:text-petrol-300 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent transition-colors';

const STORAGE_KEY = 'portal_smi_draft';

// Escala de 6 pontos do SMI (Inventário de Modos Esquemáticos) — de
// frequência, diferente da escala de veracidade do Mapeamento de Padrões
// (YSQ). Não varia por pergunta, então fica fixa aqui em vez de vir do banco.
const SCALE = [
  { value: 1, label: 'Nunca ou quase nunca' },
  { value: 2, label: 'Raramente' },
  { value: 3, label: 'Ocasionalmente' },
  { value: 4, label: 'Frequentemente' },
  { value: 5, label: 'Na maior parte do tempo' },
  { value: 6, label: 'O tempo todo' },
];

interface Mode {
  id: string;
  code: string;
  name: string;
  question_count: number;
}

interface Question {
  id: string;
  mode_id: string;
  question_number: number;
  question_text: string;
}

type Step = 'loading' | 'identity' | 'welcome' | 'modes' | 'done';

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

export function SMIQuestionnaire() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token') ?? '';

  const [step, setStep] = useState<Step>('loading');
  const [modes, setModes] = useState<Mode[]>([]);
  const [questionsByMode, setQuestionsByMode] = useState<Map<string, Question[]>>(new Map());
  const [totalQuestions, setTotalQuestions] = useState(0);

  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [editToken, setEditToken] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentModeIndex, setCurrentModeIndex] = useState(0);

  // Preenchido quando o acesso veio de um link individual gerado pelo
  // terapeuta (ver src/pages/therapist/InstrumentInvite.tsx) — nesse caso
  // pulamos a etapa de identidade (nome/e-mail/whatsapp) porque já sabemos
  // quem é o cliente.
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

  // Carrega modos + perguntas (público, sem login) e tenta retomar um
  // rascunho salvo no localStorage — igual o acesso sem login do YSQ.
  useEffect(() => {
    const load = async () => {
      const [{ data: modeRows }, { data: questionRows }] = await Promise.all([
        supabase.from('smi_modes').select('id, code, name, question_count'),
        supabase.from('smi_questions').select('id, mode_id, question_number, question_text').order('question_number'),
      ]);

      const loadedModes = sortByModeOrder((modeRows ?? []) as Mode[]);
      setModes(loadedModes);
      setTotalQuestions((questionRows ?? []).length);

      const byMode = new Map<string, Question[]>();
      for (const q of (questionRows ?? []) as Question[]) {
        const list = byMode.get(q.mode_id) ?? [];
        list.push(q);
        byMode.set(q.mode_id, list);
      }
      setQuestionsByMode(byMode);

      const draft = loadDraft();
      if (draft?.assessment_id && draft?.edit_token) {
        const { data, error: fnError } = await supabase.functions.invoke('smi-assessment-start', {
          body: { resume_assessment_id: draft.assessment_id, resume_token: draft.edit_token },
        });
        if (!fnError && data?.assessment_id) {
          setAssessmentId(data.assessment_id);
          setEditToken(draft.edit_token);
          const resumedAnswers = (data.raw_answers ?? {}) as Record<string, number>;
          const numericAnswers: Record<number, number> = {};
          for (const [key, value] of Object.entries(resumedAnswers)) numericAnswers[Number(key)] = value;
          setAnswers(numericAnswers);

          // Retoma no primeiro modo que ainda tem pergunta sem resposta
          let resumeIndex = 0;
          for (let i = 0; i < loadedModes.length; i++) {
            const modeQuestions = byMode.get(loadedModes[i].id) ?? [];
            const allAnswered = modeQuestions.every((q) => numericAnswers[q.question_number] != null);
            if (!allAnswered) { resumeIndex = i; break; }
            resumeIndex = i;
          }
          setCurrentModeIndex(resumeIndex);
          setStep('modes');
          return;
        }
        clearDraft();
      }

      if (inviteToken) {
        const { data: inviteRows } = await untypedSupabase.rpc('validate_instrument_invite', {
          p_token: inviteToken,
          p_instrument: 'smi',
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
    if (hp.trim()) return; // honeypot preenchido — provável bot, não avança
    setStep('welcome');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWelcomeSubmit = async () => {
    if (!lgpdConsent) return;

    setSubmitting(true);
    setError('');

    const { data, error: fnError } = await supabase.functions.invoke('smi-assessment-start', {
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
    setCurrentModeIndex(0);
    setStep('modes');
    setSubmitting(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentMode = modes[currentModeIndex];
  const currentQuestions = currentMode ? questionsByMode.get(currentMode.id) ?? [] : [];
  const currentModeAnswered = currentQuestions.every((q) => answers[q.question_number] != null);
  const answeredCount = Object.keys(answers).length;
  const isLastMode = currentModeIndex === modes.length - 1;

  const setAnswer = (questionNumber: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionNumber]: value }));
  };

  const handleNext = async () => {
    if (!assessmentId || !editToken || !currentMode || !currentModeAnswered) return;
    setSubmitting(true);
    setError('');

    const modeAnswers: Record<string, number> = {};
    for (const q of currentQuestions) modeAnswers[String(q.question_number)] = answers[q.question_number];

    const { data, error: fnError } = await supabase.functions.invoke('smi-assessment-save', {
      body: { assessment_id: assessmentId, edit_token: editToken, answers: modeAnswers, finish: isLastMode },
    });

    if (fnError || data?.error) {
      setError('Não foi possível salvar suas respostas agora. Tente novamente.');
      setSubmitting(false);
      return;
    }

    if (isLastMode) {
      clearDraft();
      setStep('done');
      setSubmitting(false);
      return;
    }

    setCurrentModeIndex((i) => i + 1);
    setSubmitting(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrev = () => {
    if (currentModeIndex === 0) return;
    setCurrentModeIndex((i) => i - 1);
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
            <h1 className="font-serif text-2xl text-center mb-3 text-balance">Inventário de Modos Esquemáticos</h1>
            <p className="text-petrol-100/70 text-sm text-center leading-relaxed mb-8">
              Esse questionário tem 124 perguntas, divididas por tema. Você pode fechar e voltar depois — suas
              respostas ficam salvas automaticamente a cada etapa.
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

              {/* Honeypot — invisível pra gente, bots de formulário costumam preencher */}
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
              <p>
                Este questionário possui afirmações que as pessoas podem usar para descrever a si mesmas. Ele
                avalia com que frequência você percebe em si mesmo(a) certos estados emocionais, pensamentos e
                comportamentos — os chamados "modos", ativados em resposta a situações do dia a dia.
              </p>

              <div>
                <p className="font-semibold text-petrol-50 mb-1.5">Como responder?</p>
                <p className="mb-2">
                  Baseando-se na escala de frequência, avalie cada item escolhendo a opção que melhor descreve a
                  frequência com que você sente que cada afirmação se aplica a você.
                </p>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>Ao responder cada questão, pergunte a si mesmo: "Em geral, com que frequência esta frase se aplica a mim?"</li>
                  <li>Este não é um teste de "certo ou errado". Não existem respostas boas ou ruins.</li>
                  <li>O preenchimento costuma levar entre 20 a 30 minutos. Reserve um momento calmo, onde possa se concentrar em você.</li>
                </ol>
              </div>
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
              <ChevronRight size={16} />
            </Button>
          </>
        )}

        {step === 'modes' && currentMode && (
          <>
            {/* Barra de progresso */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs text-petrol-100/60 mb-1.5">
                <span>Bloco {currentModeIndex + 1} de {modes.length}</span>
                <span>{answeredCount} de {totalQuestions} respondidas</span>
              </div>
              <div className="h-1.5 bg-petrol-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold-400 rounded-full transition-all"
                  style={{ width: `${totalQuestions ? (answeredCount / totalQuestions) * 100 : 0}%` }}
                />
              </div>
            </div>

            <h1 className="font-serif text-xl leading-snug mb-6 text-balance">{currentMode.name}</h1>

            <div className="space-y-6 mb-6">
              {currentQuestions.map((q, idx) => (
                <div key={q.id}>
                  <p className="text-sm text-petrol-50 leading-relaxed mb-2.5">
                    {idx + 1}. {q.question_text}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SCALE.map((opt) => {
                      const selected = answers[q.question_number] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          title={opt.label}
                          onClick={() => setAnswer(q.question_number, opt.value)}
                          className={`flex flex-col items-center justify-center w-[15%] min-w-[44px] py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                            selected
                              ? 'border-gold-400 bg-gold-400/20 text-gold-200'
                              : 'border-petrol-600 bg-petrol-800 text-petrol-200 hover:border-petrol-400'
                          }`}
                        >
                          {opt.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-petrol-100/50 leading-relaxed mb-6">
              1 = nunca ou quase nunca · 2 = raramente · 3 = ocasionalmente · 4 = frequentemente · 5 = na maior
              parte do tempo · 6 = o tempo todo
            </p>

            {error && (
              <div className="text-sm text-red-300 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2 mb-4">{error}</div>
            )}

            <div className="flex gap-3">
              {currentModeIndex > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handlePrev}
                  disabled={submitting}
                  className="!text-petrol-100 !border-petrol-500 hover:!bg-petrol-800"
                >
                  <ChevronLeft size={16} />
                  Voltar
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                loading={submitting}
                disabled={!currentModeAnswered}
                onClick={handleNext}
              >
                {isLastMode ? 'Concluir' : 'Próximo'}
                {!isLastMode && <ChevronRight size={16} />}
              </Button>
            </div>
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
