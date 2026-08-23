import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';

const fieldClass =
  'w-full px-3.5 py-2.5 rounded-lg border border-petrol-600 bg-petrol-800 text-white text-sm placeholder:text-petrol-300 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent transition-colors';

export function ClientSignup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [feedback, setFeedback] = useState('');
  const [hp, setHp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [coverBroken, setCoverBroken] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !whatsapp.trim()) return;

    setSubmitting(true);
    setError('');

    const { error: fnError } = await supabase.functions.invoke('client-self-signup', {
      body: { name: name.trim(), email: email.trim(), whatsapp: whatsapp.trim(), feedback: feedback.trim(), hp },
    });

    if (fnError) {
      setError('Não foi possível enviar seu cadastro agora. Tente novamente em alguns minutos.');
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#032a3c] text-white font-sans">
      {/* Cover */}
      <div
        className={`h-56 sm:h-72 w-full ${coverBroken ? 'bg-gradient-to-br from-petrol-700 via-petrol-800 to-[#032a3c]' : 'bg-petrol-800'}`}
      >
        {!coverBroken && (
          <img
            src="/cadastro-cover.jpg"
            alt=""
            className="w-full h-full object-cover"
            onError={() => setCoverBroken(true)}
          />
        )}
      </div>

      <div className="max-w-md mx-auto px-6">
        {/* Logo sobreposto à cover */}
        <div className="flex justify-center -mt-14 mb-4">
          <img
            src="/logosistema.png"
            alt="Núbia Januzzi"
            className="w-28 h-28 rounded-full object-cover border-4 border-[#032a3c] shadow-lg"
          />
        </div>

        {submitted ? (
          <div className="text-center py-10">
            <CheckCircle2 size={40} className="text-gold-400 mx-auto mb-4" />
            <h1 className="font-serif text-2xl mb-2 text-balance">Cadastro recebido!</h1>
            <p className="text-petrol-100/80 text-sm leading-relaxed">
              Você vai receber um e-mail em instantes para definir sua senha e acessar o Portal Núbia Januzzi.
            </p>
            <Link to="/areamembros" className="inline-block mt-6 text-gold-300 text-sm hover:text-gold-200">
              Já tenho senha — ir para o login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-2xl text-center mb-3 text-balance">
              Cadastro para o Portal Núbia Januzzi
            </h1>
            <p className="text-petrol-100/70 text-sm text-center leading-relaxed mb-8">
              Nesse portal você terá um diário para acompanhar seus objetivos, relatórios terapêuticos do seu
              processo e avaliações. Preencha seus dados para receber o acesso.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 pb-16">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-petrol-100">Qual seu nome completo</label>
                <input
                  className={fieldClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-petrol-100">Qual seu melhor e-mail</label>
                <input
                  type="email"
                  className={fieldClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-petrol-100">Qual seu número de WhatsApp</label>
                <input
                  className={fieldClass}
                  placeholder="+55 11 99999-9999"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-petrol-100">
                  Qual sua opinião em ter um aplicativo personalizado do seu processo?
                </label>
                <textarea
                  className={fieldClass}
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>

              {/* Honeypot — invisível pra gente, bots de formulário costumam preencher */}
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <label htmlFor="website">Não preencha este campo</label>
                <input
                  id="website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={hp}
                  onChange={(e) => setHp(e.target.value)}
                />
              </div>

              {error && (
                <div className="text-sm text-red-300 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <Button type="submit" variant="secondary" className="w-full" loading={submitting}>
                Enviar cadastro
              </Button>

              <p className="text-xs text-petrol-100/50 text-center">
                Após enviar suas informações, seu cadastro será feito no portal.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
