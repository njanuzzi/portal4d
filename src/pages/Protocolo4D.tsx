import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Briefcase, Activity, Check, X, Play } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { PILARES } from '../lib/protocolo4d';

const DOMINIOS = [
  {
    icon: Heart,
    foto: '/protocolo4d-relacionamentos.jpg',
    titulo: 'Nos relacionamentos',
    texto:
      'Você sente que precisa controlar todos os detalhes pra manter a relação em pé — e quanto mais controla, mais o outro se afasta, e quanto mais ele se afasta, mais você controla. Não é um defeito seu: é um ciclo que os dois alimentam, cada um no seu papel.',
  },
  {
    icon: Briefcase,
    foto: '/protocolo4d-profissional.jpg',
    titulo: 'Na vida profissional',
    texto:
      'Você virou a pessoa que segura tudo — quem resolve, quem não erra, quem não pode parar. Foi um papel que você aprendeu a ocupar, e o sistema ao redor se acostumou a contar com isso. Parar parece impossível, porque tudo em volta se reorganizaria.',
  },
  {
    icon: Activity,
    foto: '/protocolo4d-corpo.jpg',
    titulo: 'No emagrecimento e no corpo',
    texto:
      'Você começa, sustenta por um tempo, e o corpo "sabota" bem quando as coisas começam a mudar de verdade. Comer ou não comer deixou de ser só sobre comida — virou a forma que o corpo encontrou de dizer algo que ainda não foi dito em palavras.',
  },
] as const;

const PARA_QUEM_E = [
  'Já entende o próprio padrão, mas ele se sustenta quando entra em contato com outras pessoas — parceiro, família, trabalho',
  'Percebe que "sozinho(a) até consegue", mas no convívio o padrão volta',
  'Quer entender que função aquele comportamento cumpre nas suas relações, não só aliviar o sintoma da vez',
  'Está disposto(a) a observar não só a si mesmo, mas os ciclos que se repetem com quem está por perto',
];

const PARA_QUEM_NAO_E = [
  'Busca uma técnica isolada, sem querer entender o mecanismo por trás',
  'Quer resolver só o sintoma pontual, sem olhar pra origem',
  'Não está disposto(a) a rever sua própria parte no ciclo — não é sobre culpar o outro',
  'Não está em um momento de sustentar um processo de 6 meses',
];

const DEPOIMENTOS = [
  { id: 'asdGPw6QF_4', titulo: 'Depoimento — Emerson' },
  { id: '0Qdw0ZrRVkY', titulo: 'Depoimento' },
  { id: 'GMpeDVIxSy4', titulo: 'Depoimento — Aluno #010' },
  { id: 'hxTkYHigCek', titulo: 'Depoimento' },
] as const;

function DomainPhoto({ src, alt, icon: Icon }: { src: string; alt: string; icon: typeof Heart }) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-petrol-700 to-petrol-900 flex items-center justify-center">
        <Icon size={32} className="text-gold-300" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setBroken(true)}
      className="aspect-[4/3] w-full rounded-xl object-cover"
    />
  );
}

function YoutubeCard({ id, titulo }: { id: string; titulo: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="aspect-video rounded-xl overflow-hidden bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${id}?autoplay=1`}
          title={titulo}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setPlaying(true)}
      className="relative aspect-video w-full rounded-xl overflow-hidden group"
      aria-label={`Assistir: ${titulo}`}
    >
      <img
        src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
        alt={titulo}
        className="w-full h-full object-cover"
      />
      <span className="absolute inset-0 bg-petrol-900/30 group-hover:bg-petrol-900/40 transition-colors flex items-center justify-center">
        <span className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
          <Play size={22} className="text-petrol-700 ml-0.5" fill="currentColor" />
        </span>
      </span>
    </button>
  );
}

export function Protocolo4D() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="bg-petrol-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-20 grid md:grid-cols-[1fr_240px] gap-12 items-center">
          <div>
            <p className="text-gold-300 text-xs font-semibold tracking-widest uppercase mb-4">
              O método
            </p>
            <h1 className="font-serif text-4xl md:text-5xl leading-tight text-balance mb-6">
              Protocolo 4D
            </h1>
            <p className="text-petrol-100 text-base md:text-lg leading-relaxed">
              Você já entende o padrão. Já fez terapia, já teve o insight, já leu sobre o assunto. E
              mesmo assim, na hora de agir, alguma coisa te puxa de volta pro automático. O Protocolo
              4D não é mais uma técnica de motivação — é o mapa de quatro etapas que uso pra ir na
              raiz de por que você trava, e sair do ciclo de entender e não conseguir fazer.
            </p>
          </div>
          <div className="max-w-[200px] md:max-w-none mx-auto">
            <img src="/protocolo4d-espiral.png" alt="" className="w-full rounded-2xl shadow-xl" />
          </div>
        </div>
      </section>

      {/* Isso te soa familiar? */}
      <section className="bg-white border-b border-beige-300">
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
          <p className="text-gold-700 text-xs font-semibold tracking-widest uppercase mb-3">
            Isso te soa familiar?
          </p>
          <h2 className="font-serif text-3xl mb-10 text-balance max-w-2xl">
            Não é falta de força de vontade. É um ciclo — e ciclos se sustentam entre você e quem
            está por perto.
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {DOMINIOS.map((d) => (
              <div key={d.titulo}>
                <DomainPhoto src={d.foto} alt={d.titulo} icon={d.icon} />
                <h3 className="font-serif text-lg mt-4 mb-2">{d.titulo}</h3>
                <p className="text-petrol-800/80 text-sm leading-relaxed">{d.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Etapas */}
      <section className="max-w-3xl mx-auto px-4 py-16 space-y-10">
        {PILARES.map((p, i) => (
          <div key={p.titulo} className="flex gap-5">
            <div className="shrink-0 flex flex-col items-center">
              <span className="w-10 h-10 rounded-full bg-petrol-700 text-gold-300 flex items-center justify-center">
                <p.icon size={18} />
              </span>
              {i < PILARES.length - 1 && <span className="w-px flex-1 bg-beige-300 mt-2" />}
            </div>
            <div className="pb-2">
              <span className="text-petrol-400 text-xs font-mono">0{i + 1}</span>
              <h2 className="font-serif text-2xl mb-2">{p.titulo}</h2>
              <p className="text-petrol-800/80 leading-relaxed mb-3">{p.detalhe}</p>
              <p className="text-petrol-700 text-sm leading-relaxed italic border-l-2 border-gold-400 pl-3">
                {p.exemplo}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* Para quem é / não é */}
      <section className="bg-white border-y border-beige-300">
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
          <p className="text-gold-700 text-xs font-semibold tracking-widest uppercase mb-8">
            Pra quem é — e pra quem não é
          </p>
          <div className="grid sm:grid-cols-2 gap-8">
            <div className="bg-beige-50 border border-beige-300 rounded-2xl p-8">
              <h3 className="font-serif text-xl mb-4">É pra você se</h3>
              <ul className="space-y-3">
                {PARA_QUEM_E.map((item) => (
                  <li key={item} className="flex gap-3 text-petrol-800/80 text-sm leading-relaxed">
                    <Check size={18} className="text-petrol-700 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-beige-50 border border-beige-300 rounded-2xl p-8">
              <h3 className="font-serif text-xl mb-4">Não é pra você se</h3>
              <ul className="space-y-3">
                {PARA_QUEM_NAO_E.map((item) => (
                  <li key={item} className="flex gap-3 text-petrol-800/80 text-sm leading-relaxed">
                    <X size={18} className="text-petrol-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="max-w-5xl mx-auto px-4 py-16 md:py-20">
        <p className="text-gold-700 text-xs font-semibold tracking-widest uppercase mb-3">
          Depoimentos
        </p>
        <h2 className="font-serif text-3xl mb-10 text-balance">Quem já passou pelo processo</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {DEPOIMENTOS.map((d) => (
            <YoutubeCard key={d.id} id={d.id} titulo={d.titulo} />
          ))}
        </div>
      </section>

      {/* CTA fechamento */}
      <section className="bg-petrol-700 text-white">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="font-serif text-3xl text-balance mb-4">
            Pronta para aplicar isso à sua própria vida?
          </h2>
          <p className="text-petrol-100 max-w-lg mx-auto mb-8">
            O Protocolo 4D é o método por trás do atendimento individual — seis etapas, 24 sessões e
            seis meses de acompanhamento. Conheça o processo e veja se faz sentido para o seu
            momento.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            <Link to="/produtos#sessao-avaliacao">
              <Button variant="secondary" size="lg">Agendar sessão de avaliação</Button>
            </Link>
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
          <Link to="/atendimento" className="text-petrol-200 text-sm underline hover:text-white">
            Ver como funciona na prática
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
