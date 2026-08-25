import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Target, Eye } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { InstagramFeed } from '../components/marketing/InstagramFeed';
// Desativado até a Núbia criar um Substack direcionado ao Protocolo 4D (o atual é um espaço livre, fora do tom do site).
// import { BlogPreview } from '../components/marketing/BlogPreview';
import { LeadForm } from '../components/marketing/LeadForm';
import { PILARES } from '../lib/protocolo4d';

export function MarketingHome() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    el?.scrollIntoView({ behavior: 'smooth' });
  }, [location.hash]);

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="bg-petrol-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-20 md:py-28 grid md:grid-cols-[1fr_auto] gap-12 items-center">
          <div>
            <p className="text-gold-300 text-xs font-semibold tracking-widest uppercase mb-4">
              Especialista em Desbloqueio Comportamental · Criadora do Protocolo 4D
            </p>
            <h1 className="font-serif text-4xl md:text-5xl leading-tight max-w-2xl text-balance mb-6">
              Trabalho com pessoas que já entenderam o problema e continuam travadas.
            </h1>
            <p className="text-petrol-100 text-base md:text-lg max-w-xl mb-3 leading-relaxed">
              Não trabalho com motivação. Trabalho com o mecanismo que produz o travamento.
            </p>
            <p className="text-petrol-200 text-sm max-w-xl mb-10">
              Força de vontade não muda nada. Técnica muda tudo.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#contato">
                <Button variant="secondary" size="lg">Agendar uma conversa</Button>
              </a>
              <Link to="/areamembros">
                <Button
                  variant="ghost"
                  size="lg"
                  className="!border-petrol-300 !text-white hover:!bg-petrol-600"
                >
                  Já sou cliente
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative mx-auto md:mx-0 shrink-0">
            <div className="absolute -inset-3 rounded-full border border-gold-400/40" />
            <img
              src="/nubia-foto.jpg"
              alt="Núbia Januzzi"
              className="relative w-48 h-48 md:w-64 md:h-64 rounded-full object-cover border-4 border-gold-400 shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Quem sou eu */}
      <section id="sobre" className="bg-white border-y border-beige-300 scroll-mt-20">
        <div className="max-w-5xl mx-auto px-4 py-20 grid md:grid-cols-[300px_1fr] gap-12 items-start">
          <div>
            <div className="relative mb-6 max-w-[280px] mx-auto md:mx-0">
              <div className="absolute -inset-3 rounded-2xl border border-gold-400/40" />
              <img
                src="/nubia-foto.jpg"
                alt="Núbia Januzzi"
                className="relative w-full aspect-[4/5] object-cover rounded-2xl border-4 border-gold-400 shadow-xl"
              />
            </div>
            <p className="text-gold-700 text-xs font-semibold tracking-widest uppercase mb-3">Sobre</p>
            <h2 className="font-serif text-3xl text-balance">Núbia Januzzi</h2>
          </div>
          <div>
            <p className="text-petrol-800/80 leading-relaxed mb-4">
              Comecei a atender em 2018. Nos primeiros anos, o padrão que eu via se repetir era sempre o
              mesmo: a pessoa entendia o próprio funcionamento com clareza, saía da sessão organizada — e
              travava de novo três dias depois, na hora de fazer.
            </p>
            <p className="text-petrol-800/80 leading-relaxed mb-4">
              O problema não estava na sessão. Estava no que acontecia entre uma sessão e outra.
            </p>
            <p className="text-petrol-800/80 leading-relaxed mb-4">
              Foi aí que mudei o formato. Passei a acompanhar as pessoas fora da sessão — não para dar
              dicas ou motivar, mas para mostrar, no momento exato em que o travamento acontecia, o que
              estava acontecendo no funcionamento delas. Um GPS, não um manual.
            </p>
            <p className="text-petrol-800/80 leading-relaxed mb-4">
              A mudança foi imediata. E se manteve ao longo de mais de 3 mil horas de atendimento.
            </p>
            <p className="text-petrol-800/80 leading-relaxed mb-4">
              <strong className="text-petrol-900">
                O Protocolo 4D não foi criado para ser vendido. Foi nomeado depois de já estar
                funcionando.
              </strong>{' '}
              É a estruturação formal de um processo que se repetiu, se corrigiu e se estabilizou na
              prática — organizado em seis etapas, 24 sessões e seis meses.
            </p>
            <p className="text-petrol-800/80 leading-relaxed mb-8">
              Meu ponto de partida não foi a clínica. Foi o Direito — onde passei anos observando o que
              faz alguém decidir, adiar ou recuar sob pressão. Vim para o comportamento por essa porta, e
              nunca deixei de trabalhar com o que é observável.
            </p>

            <h3 className="font-serif text-lg mb-3">Formação</h3>
            <ul className="text-petrol-800/80 text-sm leading-relaxed space-y-1.5 mb-4">
              <li>Pós-graduação em Psicoterapia com ênfase em Abordagem Sistêmica Comportamental — 720h</li>
              <li>Pós-graduação em Neurociência do Comportamento Humano — PUCRS</li>
              <li>Formação em Psicoterapia — Instituto Saulo Veríssimo</li>
              <li>Bacharelado em Direito</li>
              <li>Pesquisa continuada em Terapia do Esquema e Logoterapia</li>
            </ul>
            <p className="text-petrol-900 text-sm font-medium">
              Mais de 3 mil horas de atendimento desde 2018.
            </p>
          </div>
        </div>
      </section>

      {/* Missão e visão */}
      <section id="missao" className="relative overflow-hidden scroll-mt-20">
        <div className="pointer-events-none absolute -right-28 -top-28 w-72 h-72 rounded-full border border-gold-400/30" />
        <div className="pointer-events-none absolute -left-24 bottom-0 w-56 h-56 rounded-full border border-petrol-300/40" />
        <div className="relative max-w-5xl mx-auto px-4 py-20">
          <p className="text-gold-700 text-xs font-semibold tracking-widest uppercase mb-3">
            Missão e visão
          </p>
          <div className="grid sm:grid-cols-2 gap-8">
            <div className="bg-white border border-beige-300 rounded-2xl shadow-sm p-8">
              <span className="w-12 h-12 rounded-full bg-petrol-700 text-gold-300 flex items-center justify-center mb-5">
                <Target size={20} />
              </span>
              <h3 className="font-serif text-xl mb-2">Missão</h3>
              <p className="text-petrol-800/80 leading-relaxed mb-3">
                Trabalhar com pessoas que já entenderam o próprio padrão e continuam travadas —
                reduzindo a distância entre saber o que precisa ser feito e conseguir fazer.
              </p>
              <p className="text-petrol-800/80 leading-relaxed">
                Não com motivação, disciplina ou produtividade. Com técnica aplicada ao mecanismo que
                produz o travamento: a origem do padrão, a resposta do corpo e a reconstrução do
                comportamento.
              </p>
            </div>
            <div className="bg-white border border-beige-300 rounded-2xl shadow-sm p-8">
              <span className="w-12 h-12 rounded-full bg-petrol-700 text-gold-300 flex items-center justify-center mb-5">
                <Eye size={20} />
              </span>
              <h3 className="font-serif text-xl mb-2">Visão</h3>
              <p className="text-petrol-800/80 leading-relaxed mb-3">
                Consolidar o Protocolo 4D como um método de referência para travamento comportamental —
                reconhecido pelo que entrega em comportamento observável, não pelo que promete.
              </p>
              <p className="text-petrol-800/80 leading-relaxed">
                E tornar esse trabalho disponível além do atendimento individual, sem diluir o que o
                faz funcionar: sequência definida, prazo fechado e acompanhamento entre as sessões.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Protocolo 4D — teaser */}
      <section className="bg-white border-y border-beige-300">
        <div className="max-w-5xl mx-auto px-4 py-20 grid md:grid-cols-[1fr_260px] gap-12 items-center">
          <div className="order-2 md:order-1">
            <p className="text-gold-700 text-xs font-semibold tracking-widest uppercase mb-3">O método</p>
            <h2 className="font-serif text-3xl mb-4 text-balance">Isso tem um nome: Protocolo 4D</h2>
            <p className="text-petrol-800/80 max-w-2xl mb-10 leading-relaxed">
              Não é rótulo, não é fórmula pronta — é uma direção. Quatro etapas que se repetem em cada
              questão que aparece na terapia, até virarem um jeito de olhar para a própria vida.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {PILARES.map((p, i) => (
                <div key={p.titulo} className="bg-beige-100 border border-beige-300 rounded-xl p-4">
                  <span className="text-petrol-400 text-xs font-mono">0{i + 1}</span>
                  <h3 className="font-serif text-lg mt-1">{p.titulo}</h3>
                </div>
              ))}
            </div>
            <Link
              to="/protocolo4d"
              className="inline-flex items-center gap-2 text-petrol-700 font-medium text-sm hover:text-petrol-800"
            >
              Entender o Protocolo 4D em detalhe
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="order-1 md:order-2 max-w-[220px] md:max-w-none mx-auto">
            <img
              src="/protocolo4d-espiral.png"
              alt="Espiral do Protocolo 4D: Detectar, Desacelerar, Decodificar, Direcionar"
              className="w-full rounded-2xl shadow-xl"
            />
          </div>
        </div>
      </section>

      {/* Instagram */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <p className="text-gold-700 text-xs font-semibold tracking-widest uppercase mb-3">Instagram</p>
        <h2 className="font-serif text-3xl mb-8 text-balance">O que ando compartilhando</h2>
        <InstagramFeed />
      </section>

      {/* Blog — desativado até a Núbia criar um Substack direcionado (ver import comentado acima)
      <section className="bg-white border-y border-beige-300">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <p className="text-gold-700 text-xs font-semibold tracking-widest uppercase mb-3">Conteúdo</p>
          <h2 className="font-serif text-3xl mb-8 text-balance">Reflexões sobre padrões, corpo e comportamento</h2>
          <BlogPreview />
        </div>
      </section>
      */}

      {/* Newsletter */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <LeadForm source="newsletter_home" />
      </section>

      {/* CTA fechamento */}
      <section id="contato" className="bg-petrol-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-20 text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-balance mb-4">
            Pronta para entender o que se repete em você?
          </h2>
          <p className="text-petrol-100 max-w-lg mx-auto mb-8">
            Fale comigo para conhecer o processo e ver se o Protocolo 4D faz sentido para o seu momento.
          </p>
          <a
            href="https://wa.me/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="secondary" size="lg">Agendar pelo WhatsApp</Button>
          </a>
        </div>
      </section>
    </MarketingLayout>
  );
}
