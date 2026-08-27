/** Atlas de Padrões — índice público da Biblioteca 4D, alimentado somente por artigos publicados. */
import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { SeoHead } from '../components/SeoHead';
import { getPublicArticles, type ContentArticle } from '../lib/content';

export function Contents() {
  const [articles, setArticles] = useState<ContentArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getPublicArticles().then(({ data }) => { setArticles(data); setLoading(false); }); }, []);

  return <MarketingLayout><SeoHead title="Biblioteca 4D" description="Leituras sobre padrões, comportamento, travamento e decisões que precisam ganhar forma na vida real." canonicalPath="/conteudos" /><section className="atlas-content-hero"><div className="atlas-frame"><span className="atlas-eyebrow text-gold-200">06 · BIBLIOTECA 4D</span><h1>Para quando a pergunta ainda não virou uma decisão.</h1><p>Textos para aprofundar dúvidas reais, sem transformar leitura em diagnóstico e sem repetir o conteúdo das redes.</p></div></section><main className="atlas-content-page"><div className="atlas-frame">{loading ? <div className="atlas-empty"><h2>Carregando a Biblioteca…</h2></div> : articles.length ? <div className="atlas-content-grid">{articles.map((article) => <Link className="atlas-content-card" key={article.id} to={`/conteudos/${article.slug}`}>{article.cover_image_url && <div className="atlas-content-card__image"><img src={article.cover_image_url} alt={article.cover_image_alt || ''} /></div>}<div className="atlas-content-card__body"><span className="atlas-content-card__meta">{article.category}</span><h2>{article.title}</h2><p>{article.excerpt}</p><span className="atlas-content-card__read">Ler artigo <ArrowUpRight className="inline" size={14} /></span></div></Link>)}</div> : <div className="atlas-empty"><h2>A Biblioteca está começando.</h2><p>Os primeiros artigos serão publicados em breve.</p></div>}</div></main></MarketingLayout>;
}
