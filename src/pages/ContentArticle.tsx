/** Atlas de Padrões — leitura pública de artigo com HTML sanitizado e metadados por conteúdo. */
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { SeoHead } from '../components/SeoHead';
import { getPublicArticleBySlug, sanitizeArticleHtml, type ContentArticle } from '../lib/content';

export function ContentArticlePage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<ContentArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getPublicArticleBySlug(slug).then(({ data }) => { setArticle(data); setLoading(false); }); }, [slug]);
  if (loading) return <MarketingLayout><main className="atlas-content-page"><div className="atlas-frame atlas-empty"><h2>Carregando artigo…</h2></div></main></MarketingLayout>;
  if (!article) return <MarketingLayout><main className="atlas-content-page"><div className="atlas-frame atlas-empty"><h2>Este artigo não está disponível.</h2><p>Ele pode ainda não ter sido publicado ou o endereço pode ter mudado.</p><Link to="/conteudos" className="atlas-link mt-5">Voltar para a Biblioteca</Link></div></main></MarketingLayout>;

  const description = article.seo_description || article.excerpt;
  return <MarketingLayout><SeoHead title={article.seo_title || article.title} description={description} image={article.cover_image_url} canonicalPath={`/conteudos/${article.slug}`} type="article" /><section className="atlas-article-hero"><div className="atlas-frame"><div className="atlas-article__meta"><span>{article.category}</span>{article.published_at && <span>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(article.published_at))}</span>}</div><h1>{article.title}</h1><p>{article.excerpt}</p></div></section>{article.cover_image_url && <div className="atlas-article__cover"><img src={article.cover_image_url} alt={article.cover_image_alt || ''} /></div>}<main className="atlas-article"><Link to="/conteudos" className="atlas-article__back"><ArrowLeft size={15} /> Biblioteca 4D</Link><article className="atlas-article__body" dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(article.content_html) }} /></main></MarketingLayout>;
}
