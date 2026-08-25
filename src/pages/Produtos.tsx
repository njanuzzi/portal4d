import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { PRODUTOS } from '../lib/produtos';

export function Produtos() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    el?.scrollIntoView({ behavior: 'smooth' });
  }, [location.hash]);

  return (
    <MarketingLayout>
      <section className="bg-petrol-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
          <p className="text-gold-300 text-xs font-semibold tracking-widest uppercase mb-4">
            Produtos e Serviços
          </p>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight text-balance">
            Produtos e Serviços
          </h1>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16">
        {PRODUTOS.length === 0 ? (
          <p className="text-petrol-800/70">Em breve, novos produtos por aqui.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {PRODUTOS.map((produto) => {
              const isInternal = produto.link.startsWith('/');
              const cardClassName =
                'bg-white border border-beige-300 rounded-xl p-6 hover:border-petrol-300 transition-colors scroll-mt-24';
              const content = (
                <>
                  <h2 className="font-serif text-xl mb-2">{produto.nome}</h2>
                  <p className="text-petrol-800/70 text-sm leading-relaxed">{produto.descricao}</p>
                </>
              );

              return isInternal ? (
                <Link key={produto.nome} id={produto.slug} to={produto.link} className={cardClassName}>
                  {content}
                </Link>
              ) : (
                <a
                  key={produto.nome}
                  id={produto.slug}
                  href={produto.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cardClassName}
                >
                  {content}
                </a>
              );
            })}
          </div>
        )}
      </section>
    </MarketingLayout>
  );
}
