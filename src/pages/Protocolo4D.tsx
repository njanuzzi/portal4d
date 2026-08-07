import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { MarketingHeader } from '../components/marketing/MarketingHeader';
import { MarketingFooter } from '../components/marketing/MarketingFooter';
import { PILARES } from '../lib/protocolo4d';

export function Protocolo4D() {
  return (
    <div className="min-h-screen bg-beige-100 text-dark font-sans">
      <MarketingHeader />

      {/* Hero */}
      <section className="bg-petrol-700 text-white">
        <div className="max-w-3xl mx-auto px-4 py-16 md:py-20">
          <p className="text-gold-300 text-xs font-semibold tracking-widest uppercase mb-4">
            O método
          </p>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight text-balance mb-6">
            Protocolo 4D
          </h1>
          <p className="text-petrol-100 text-base md:text-lg leading-relaxed">
            Um método criado por Núbia Januzzi para ir à raiz do que se repete no trabalho, nas
            relações e no corpo — não é rótulo, não é fórmula pronta, é uma direção. Quatro etapas
            que se repetem em cada questão que aparece na terapia, até virarem um jeito de olhar
            para a própria vida.
          </p>
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
              <p className="text-petrol-800/80 leading-relaxed">{p.detalhe}</p>
            </div>
          </div>
        ))}
      </section>

      {/* CTA fechamento */}
      <section className="bg-petrol-700 text-white">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="font-serif text-3xl text-balance mb-4">
            Pronta para aplicar isso à sua própria vida?
          </h2>
          <p className="text-petrol-100 max-w-lg mx-auto mb-8">
            O Protocolo 4D é o método por trás do acompanhamento clínico — conheça o processo e veja
            se faz sentido para o seu momento.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="https://wa.me/" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="lg">Agendar pelo WhatsApp</Button>
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

      <MarketingFooter />
    </div>
  );
}
