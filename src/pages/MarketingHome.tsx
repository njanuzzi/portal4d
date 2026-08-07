import { Link } from 'react-router-dom';
import { Instagram, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { MarketingHeader } from '../components/marketing/MarketingHeader';
import { MarketingFooter } from '../components/marketing/MarketingFooter';
import { PILARES } from '../lib/protocolo4d';

// TODO: substituir pelo @ real antes de publicar
const INSTAGRAM_URL = 'https://instagram.com/';

export function MarketingHome() {
  return (
    <div className="min-h-screen bg-beige-100 text-dark font-sans">
      <MarketingHeader />

      {/* Hero */}
      <section className="bg-petrol-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-20 md:py-28">
          <p className="text-gold-300 text-xs font-semibold tracking-widest uppercase mb-4">
            Psicoterapeuta · Criadora do Protocolo 4D
          </p>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight max-w-2xl text-balance mb-6">
            O que se repete em você não é falta de esforço. É um padrão que ainda não foi nomeado.
          </h1>
          <p className="text-petrol-100 text-base md:text-lg max-w-xl mb-10 leading-relaxed">
            Trabalho com o Protocolo 4D — um método próprio para ir à raiz do que se repete no trabalho,
            nas relações e no corpo, e mudar o rumo a partir daí. Atendimento 100% online, através do
            Portal 4D.
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
      </section>

      {/* Protocolo 4D — teaser */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <p className="text-gold-700 text-xs font-semibold tracking-widest uppercase mb-3">O método</p>
        <h2 className="font-serif text-3xl mb-4 text-balance">Isso tem um nome: Protocolo 4D</h2>
        <p className="text-petrol-800/80 max-w-2xl mb-10 leading-relaxed">
          Não é rótulo, não é fórmula pronta — é uma direção. Quatro etapas que se repetem em cada
          questão que aparece na terapia, até virarem um jeito de olhar para a própria vida.
        </p>
        <div className="grid sm:grid-cols-4 gap-4 mb-8">
          {PILARES.map((p, i) => (
            <div key={p.titulo} className="bg-white border border-beige-300 rounded-xl p-4">
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
      </section>

      {/* Sobre */}
      <section className="bg-white border-y border-beige-300">
        <div className="max-w-5xl mx-auto px-4 py-20 grid md:grid-cols-[220px_1fr] gap-10 items-start">
          <div>
            <p className="text-gold-700 text-xs font-semibold tracking-widest uppercase mb-3">Sobre</p>
            <h2 className="font-serif text-3xl text-balance">Núbia Januzzi</h2>
          </div>
          <div>
            {/* TODO: revisar bio e credenciais reais com a Núbia antes de publicar */}
            <p className="text-petrol-800/80 leading-relaxed mb-4">
              Psicoterapeuta especialista em Desbloqueio Comportamental, com foco em neurociência
              comportamental. Criou o Protocolo 4D a partir de anos de escuta clínica — um método para
              transformar padrões que se repetem em direção e clareza.
            </p>
            <p className="text-petrol-800/80 leading-relaxed">
              Atendimento 100% online, individual, com acompanhamento estruturado através do Portal 4D —
              o mesmo espaço onde cada cliente preenche o diário e acompanha os relatórios da sua jornada.
            </p>
          </div>
        </div>
      </section>

      {/* Conteúdo */}
      <section id="conteudo" className="max-w-5xl mx-auto px-4 py-20">
        <p className="text-gold-700 text-xs font-semibold tracking-widest uppercase mb-3">Conteúdo</p>
        <h2 className="font-serif text-3xl mb-4 text-balance">Reflexões sobre padrões, corpo e comportamento</h2>
        <p className="text-petrol-800/80 max-w-xl mb-8 leading-relaxed">
          Por enquanto, o conteúdo vive no Instagram — em breve esse espaço ganha artigos próprios.
        </p>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-petrol-700 text-white px-5 py-3 rounded-lg text-sm font-medium hover:bg-petrol-800 transition-colors"
        >
          <Instagram size={16} />
          Seguir no Instagram
        </a>
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

      <MarketingFooter />
    </div>
  );
}
