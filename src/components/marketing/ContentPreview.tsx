/** Atlas de Padrões — prévia pública que mostra somente artigos efetivamente publicados. */
import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPublicArticles, type ContentArticle } from '../../lib/content';

export function ContentPreview() {
  const [articles, setArticles] = useState<ContentArticle[]>([]);

  useEffect(() => {
    getPublicArticles().then(({ data }) => setArticles(data.slice(0, 3)));
  }, []);

  if (!articles.length) {
    return <div className="atlas-article-card"><span className="atlas-article-card__meta">BIBLIOTECA EM PREPARAÇÃO</span><h3>Os primeiros textos serão publicados aqui.</h3><p>Quando houver artigos publicados, esta área mostrará as leituras mais recentes da Biblioteca 4D.</p></div>;
  }

  return <div className="atlas-article-list">{articles.map((article, index) => <Link className="atlas-article-card" to={`/conteudos/${article.slug}`} key={article.id}><span className="atlas-article-card__meta">{article.category}</span><h3>{article.title}</h3><p>{article.excerpt}</p><span className="atlas-article-card__index">0{index + 1}</span><span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold">Ler artigo <ArrowUpRight size={14} /></span></Link>)}</div>;
}
