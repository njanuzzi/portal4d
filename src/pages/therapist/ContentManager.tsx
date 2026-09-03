/** Biblioteca 4D — lista privada de artigos, disponível somente dentro do layout da terapeuta. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, Plus, Trash2, Wand2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { deleteArticle, getTherapistArticles, saveArticle, triggerContentBuild, type ContentArticle } from '../../lib/content';

function toInput(article: ContentArticle, status: 'draft' | 'published') {
  return { slug: article.slug, title: article.title, excerpt: article.excerpt, content_html: article.content_html, category: article.category, tags: article.tags, cover_image_url: article.cover_image_url, cover_image_alt: article.cover_image_alt, seo_title: article.seo_title, seo_description: article.seo_description, faq: article.faq, status };
}

export function ContentManager() {
  const { profile } = useAuth();
  const [articles, setArticles] = useState<ContentArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = async () => { setLoading(true); const { data, error } = await getTherapistArticles(); setArticles(data); setMessage(error ? 'A Biblioteca ainda não foi configurada. Aplique a migration de conteúdo no Supabase para começar.' : ''); setLoading(false); };
  useEffect(() => { load(); }, []);

  const changeStatus = async (article: ContentArticle) => {
    if (!profile) return;
    const status = article.status === 'published' ? 'draft' : 'published';
    const { error } = await saveArticle(toInput(article, status), profile.id, article.id);
    if (error) { setMessage(error.message); return; }
    const build = await triggerContentBuild();
    setMessage(build.reason || (status === 'published' ? 'Artigo publicado.' : 'Artigo removido da publicação.'));
    await load();
  };

  const remove = async (article: ContentArticle) => {
    if (!window.confirm(`Excluir “${article.title}”? Esta ação não pode ser desfeita.`)) return;
    const { error } = await deleteArticle(article.id);
    if (error) { setMessage(error.message); return; }
    await load();
  };

  return <div className="content-manager"><div className="content-manager__head"><div><h1 className="font-serif">Biblioteca 4D</h1><p>Rascunhos ficam privados. Apenas artigos publicados aparecem no site público.</p></div><div className="flex items-center gap-2"><Link to="/roteiros"><Button variant="ghost"><Wand2 size={16} /> Oficina de Roteiro</Button></Link><Link to="/gestao-conteudos/novo"><Button variant="primary"><Plus size={16} /> Novo artigo</Button></Link></div></div>{message && <div className="content-editor-page__error">{message}</div>}{loading ? <p className="text-sm text-dark/60">Carregando artigos…</p> : <div className="content-manager__table"><table><thead><tr><th>Artigo</th><th>Categoria</th><th>Estado</th><th>Atualizado</th><th aria-label="Ações" /></tr></thead><tbody>{articles.length ? articles.map((article) => <tr key={article.id}><td><strong>{article.title}</strong><br /><span className="text-xs text-dark/50">/conteudos/{article.slug}</span></td><td>{article.category}</td><td><button type="button" onClick={() => changeStatus(article)} className={`content-status content-status--${article.status}`}>{article.status === 'published' ? 'Publicado' : 'Rascunho'}</button></td><td>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(article.updated_at))}</td><td><div className="flex items-center gap-2"><Link to={`/gestao-conteudos/${article.id}`} aria-label={`Editar ${article.title}`}><Edit3 size={17} /></Link><button type="button" onClick={() => remove(article)} aria-label={`Excluir ${article.title}`} className="text-red-500"><Trash2 size={17} /></button></div></td></tr>) : <tr><td colSpan={5} className="text-center text-dark/55 py-12">Ainda não há artigos. Crie o primeiro rascunho para começar a Biblioteca.</td></tr>}</tbody></table></div>}</div>;
}
