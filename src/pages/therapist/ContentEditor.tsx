/** Biblioteca 4D — formulário da terapeuta com Tiptap, upload e requisitos editoriais mínimos. */
import { useEffect, useState } from 'react';
import { ArrowLeft, ImagePlus, Save } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { RichTextEditor } from '../../components/content/RichTextEditor';
import { useAuth } from '../../contexts/AuthContext';
import { getTherapistArticle, makeSlug, saveArticle, triggerContentBuild, uploadContentImage, type ArticleStatus, type ContentArticle } from '../../lib/content';

const emptyForm = { title: '', slug: '', excerpt: '', content_html: '<p></p>', category: '', tags: '', cover_image_url: '', cover_image_alt: '', seo_title: '', seo_description: '', status: 'draft' as ArticleStatus };

export function ContentEditor() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!id) return;
    getTherapistArticle(id).then(({ data, error: loadError }) => {
      if (loadError || !data) setError(loadError?.message || 'Artigo não encontrado.');
      if (data) setForm({ title: data.title, slug: data.slug, excerpt: data.excerpt, content_html: data.content_html, category: data.category, tags: data.tags.join(', '), cover_image_url: data.cover_image_url || '', cover_image_alt: data.cover_image_alt || '', seo_title: data.seo_title || '', seo_description: data.seo_description || '', status: data.status });
      setLoading(false);
    });
  }, [id]);

  const update = (name: keyof typeof form, value: string) => setForm((current) => ({ ...current, [name]: value }));
  const handleUpload = async (file: File) => { setNotice('Enviando imagem…'); const { url, error: uploadError } = await uploadContentImage(file); if (uploadError) { setError(uploadError.message); setNotice(''); return null; } setNotice('Imagem enviada.'); return url; };
  const uploadCover = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const url = await handleUpload(file); if (url) update('cover_image_url', url); event.target.value = ''; };

  const submit = async (status: ArticleStatus) => {
    setError(''); setNotice('');
    if (!profile) return;
    if (!form.title.trim() || !form.excerpt.trim() || !form.content_html.replace(/<[^>]*>/g, '').trim() || !form.category.trim()) { setError('Título, resumo, categoria e conteúdo são obrigatórios.'); return; }
    if (status === 'published' && (!form.cover_image_url || !form.cover_image_alt.trim() || !form.seo_description.trim())) { setError('Para publicar, inclua imagem de capa, texto alternativo e descrição de busca.'); return; }
    setSaving(true);
    const { data, error: saveError } = await saveArticle({ slug: form.slug || makeSlug(form.title), title: form.title, excerpt: form.excerpt, content_html: form.content_html, category: form.category, tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean), cover_image_url: form.cover_image_url || null, cover_image_alt: form.cover_image_alt || null, seo_title: form.seo_title || null, seo_description: form.seo_description || null, faq: null, status }, profile.id, id);
    if (saveError || !data) { setError(saveError?.message || 'Não foi possível salvar o artigo.'); setSaving(false); return; }
    if (status === 'published') { const build = await triggerContentBuild(); setNotice(build.reason || 'Artigo publicado.'); }
    setSaving(false); navigate('/gestao-conteudos');
  };

  if (loading) return <div className="content-editor-page"><p>Carregando artigo…</p></div>;
  return <div className="content-editor-page"><div className="content-editor-page__head"><Link to="/gestao-conteudos"><ArrowLeft size={16} /> Biblioteca 4D</Link><h1 className="font-serif">{id ? 'Editar artigo' : 'Novo artigo'}</h1></div>{error && <div className="content-editor-page__error">{error}</div>}{notice && <p className="mb-4 text-sm text-petrol-700">{notice}</p>}<div className="content-editor-page__grid"><section className="content-editor-page__main"><label>Título<input value={form.title} onChange={(event) => { update('title', event.target.value); if (!form.slug) update('slug', makeSlug(event.target.value)); }} placeholder="Título do artigo" /></label><label>Resumo<input value={form.excerpt} onChange={(event) => update('excerpt', event.target.value)} placeholder="O que a pessoa vai encontrar nesta leitura?" /></label><label>Conteúdo<RichTextEditor content={form.content_html} onChange={(content_html) => update('content_html', content_html)} onUploadImage={handleUpload} /></label></section><aside className="content-editor-page__aside"><label>Slug<input value={form.slug} onChange={(event) => update('slug', makeSlug(event.target.value))} placeholder="url-do-artigo" /></label><label>Categoria<input value={form.category} onChange={(event) => update('category', event.target.value)} placeholder="Ex.: Travamento" /></label><label>Tags<input value={form.tags} onChange={(event) => update('tags', event.target.value)} placeholder="Separe por vírgulas" /></label><label>Imagem de capa<input value={form.cover_image_url} onChange={(event) => update('cover_image_url', event.target.value)} placeholder="Enviada ou URL" /><span className="mt-2 flex"><Button type="button" variant="ghost" size="sm" onClick={() => document.getElementById('content-cover-upload')?.click()}><ImagePlus size={14} /> Enviar capa</Button></span><input id="content-cover-upload" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={uploadCover} />{form.cover_image_url && <img className="content-cover-preview" src={form.cover_image_url} alt="Prévia da capa" />}</label><label>Texto alternativo da capa<input value={form.cover_image_alt} onChange={(event) => update('cover_image_alt', event.target.value)} placeholder="Descreva a imagem" /></label><label>SEO title<input value={form.seo_title} onChange={(event) => update('seo_title', event.target.value)} placeholder="Opcional; padrão é o título" maxLength={70} /></label><label>Descrição de busca<textarea value={form.seo_description} onChange={(event) => update('seo_description', event.target.value)} placeholder="Até 170 caracteres" maxLength={170} /></label><div className="content-editor-page__actions"><Button type="button" variant="ghost" disabled={saving} onClick={() => submit('draft')}><Save size={15} /> Salvar rascunho</Button><Button type="button" variant="primary" disabled={saving} onClick={() => submit('published')}>Publicar</Button></div></aside></div></div>;
}
