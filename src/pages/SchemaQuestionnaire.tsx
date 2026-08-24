import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';

const fieldClass =
  'w-full px-3.5 py-2.5 rounded-lg border border-petrol-600 bg-petrol-800 text-white text-sm placeholder:text-petrol-300 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent transition-colors';

const STORAGE_KEY = 'portal_schema_draft';

// Escala padrão de 6 pontos do Inventário de Esquemas de Young — não varia
// por pergunta, então fica fixa aqui em vez de vir do banco.
const SCALE = [
  { value: 1, label: 'Completamente falsa' },
  { value: 2, label: 'A maior parte é falsa' },
  { value: 3, label: 'Mais verdadeira que falsa' },
  { value: 4, label: 'Moderadamente verdadeira' },
  { value: 5, label: 'Maior parte do tempo verdadeira' },
  { value: 6, label: 'Descreve-me perfeitamente' },
];

interface Domain {
  id: string;
  friendly_name: string;
  question_count: number;
}

interface Question {
  id: string;
  domain_id: string;
  question_number: number;
  question_text: string;
}

type Step = 'loading' | 'identity' | 'domains' | 'done';

function loadDraft(): { assessment_id: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDraft(assessmentId: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ assessment_id: assessmentId }));
  } catch { /* ignore */ }
}

function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

export function SchemaQuestionnaire() {
  const [step, setStep] = useState<Step>('loading');
  const [domains, setDomains] = useState<Domain[]>([]);
  const [questionsByDomain, setQuestionsByDomain] = useState<Map<string, Question[]>>(new Map());
  const [totalQuestions, setTotalQuestions] = useState(0);

  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [hp, setHp] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Carrega domínios + perguntas (público, sem login) e tenta retomar um
  // rascunho salvo no localStorage — igual o acesso sem login do diário.
  useEffect(() => {
    const load = async () => {
      const [{ data: domainRows }, { data: questionRows }] = await Promise.all([
        supabase.from('schema_domains').select('id, friendly_name, question_count').order('code'),
        supabase.from('schema_questions').select('id, domain_id, question_number, question_text').order('question_number'),
      ]);

      const loadedDomains = (domainRows ?? []) as Domain[];
      setDomains(loadedDomains);
      setTotalQuestions((questionRows ?? []).length);

      const byDomain = new Map<string, Question[]>();
      for (const q of (questionRows ?? []) as Question[]) {
        const list = byDomain.get(q.domain_id) ?? [];
        list.push(q);
        byDomain.set(q.domain_id, list);
      }
      setQuestionsByDomain(byDomain);

      const draft = loadDraft();
      if (draft?.assessment_id) {
        const { data, error: fnError } = await supabase.functions.invoke('schema-assessment-start', {
          body: { resume_assessment_id: draft.assessment_id },
        });
        if (!fnError && data?.assessment_id) {
          setAssessmentId(data.assessment_id);
          const resumedAnswers = (data.raw_answers ?? {}) as Record<string, number>;
          const numericAnswers: Record<number, number> = {};
          for (const [key, value] of Object.entries(resumedAnswers)) numericAnswers[Number(key)] = value;
          setAnswers(numericAnswers);

          // Retoma no primeiro domínio que ainda tem pergunta sem resposta
          let resumeIndex = 0;
          for (let i = 0; i < loadedDomains.length; i++) {
            const domainQuestions = byDomain.get(loadedDomains[i].id) ?? [];
            const allAnswered = domainQuestions.every((q) => numericAnswers[q.question_number] != null);
            if (!allAnswered) { resumeIndex = i; break; }
            resumeIndex = i;
          }
          setCurrentDomainIndex(resumeIndex);
          setStep('domains');
          return;
        }
        clearDraft();
      }

      setStep('identity');
    };
    load();
  }, []);

  const handleIdentitySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSubmitting(true);
    setError('');

    const { data, error: fnError } = await supabase.functions.invoke('schema-assessment-start', {
      body: { name: name.trim(), email: email.trim(), whatsapp: whatsapp.trim(), hp },
    });

    if (fnError || !data?.assessment_id) {
      setError('Não foi possível iniciar o questionário agora. Tente novamente em alguns minutos.');
      setSubmitting(false);
      return;
    }

    saveDraft(data.assessment_id);
    setAssessmentId(data.assessment_id);
    setCurrentDomainIndex(0);
    setStep('domains');
    setSubmitting(false);
  };

  const currentDomain = domains[currentDomainIndex];
  const currentQuestions = currentDomain ? questionsByDomain.get(currentDomain.id) ?? [] : [];
  const currentDomainAnswered = currentQuestions.every((q) => answers[q.question_number] != null);
  const answeredCount = Object.keys(answers).length;
  const isLastDomain = currentDomainIndex === domains.length - 1;

  const setAnswer = (questionNumber: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionNumber]: value }));
  };

  const handleNext = async () => {
    if (!assessmentId || !currentDomain || !currentDomainAnswered) return;
    setSubmitting(true);
    setError('');

    const domainAnswers: Record<string, number> = {};
    for (const q of currentQuestions) domainAnswers[String(q.question_number)] = answers[q.question_number];

    const { data, error: fnError } = await supabase.functions.invoke('schema-assessment-save', {
      body: { assessment_id: assessmentId, answers: domainAnswers, finish: isLastDomain },
    });

    if (fnError || data?.error) {
      setError('Não foi possível salvar suas respostas agora. Tente novamente.');
      setSubmitting(false);
      return;
    }

    if (isLastDomain) {
      clearDraft();
      setStep('done');
      setSubmitting(false);
      return;
    }

    setCurrentDomainIndex((i) => i + 1);
    setSubmitting(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrev = () => {
    if (currentDomainIndex === 0) return;
    setCurrentDomainIndex((i) => i - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#032a3c] text-white font-sans">
      <div className="max-w-md mx-auto px-6 py-10">
        <div className="flex justify-center mb-6">
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
            <h1 className="font-serif text-2xl text-center mb-3 text-balance">Inventário de Esquemas</h1>
            <p className="text-petrol-100/70 text-sm text-center leading-relaxed mb-8">
              Esse inventário tem 205 perguntas, divididas por tema. Você pode fechar e voltar depois — suas
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

              {error && (
                <div className="text-sm text-red-300 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">{error}</div>
              )}

              <Button type="submit" variant="secondary" className="w-full" loading={submitting}>
                Começar
              </Button>
            </form>
          </>
        )}

        {step === 'domains' && currentDomain && (
          <>
            {/* Barra de progresso */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs text-petrol-100/60 mb-1.5">
                <span>Domínio {currentDomainIndex + 1} de {domains.length}</span>
                <span>{answeredCount} de {totalQuestions} respondidas</span>
              </div>
              <div className="h-1.5 bg-petrol-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold-400 rounded-full transition-all"
                  style={{ width: `${totalQuestions ? (answeredCount / totalQuestions) * 100 : 0}%` }}
                />
              </div>
            </div>

            <h1 className="font-serif text-xl leading-snug mb-6 text-balance">{currentDomain.friendly_name}</h1>

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
              1 = completamente falsa · 2 = a maior parte é falsa · 3 = mais verdadeira que falsa · 4 = moderadamente
              verdadeira · 5 = maior parte do tempo verdadeira · 6 = descreve-me perfeitamente
            </p>

            {error && (
              <div className="text-sm text-red-300 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2 mb-4">{error}</div>
            )}

            <div className="flex gap-3">
              {currentDomainIndex > 0 && (
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
                disabled={!currentDomainAnswered}
                onClick={handleNext}
              >
                {isLastDomain ? 'Concluir' : 'Próximo'}
                {!isLastDomain && <ChevronRight size={16} />}
              </Button>
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="text-center py-10">
            <CheckCircle2 size={40} className="text-gold-400 mx-auto mb-4" />
            <h1 className="font-serif text-2xl mb-2 text-balance">Respostas enviadas!</h1>
            <p className="text-petrol-100/80 text-sm leading-relaxed">
              Obrigada por preencher o inventário. Sua terapeuta vai analisar suas respostas.
            </p>
            <Link to="/areamembros" className="inline-block mt-6 text-gold-300 text-sm hover:text-gold-200">
              Ir para o login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
