/** Biblioteca 4D — editor protegido com requisitos editoriais explícitos e mensagens sem jargão técnico. */
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ImagePlus, Save } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { RichTextEditor } from '../../components/content/RichTextEditor';
import { useAuth } from '../../contexts/AuthContext';
import { getTherapistArticle, makeSlug, plainText, saveArticle, triggerContentBuild, uploadContentImage, type ArticleStatus } from '../../lib/content';

const excerptMinLength = 20;
const excerptMaxLength = 360;
const seoDescriptionMaxLength = 170;
const emptyForm = { title: '', slug: '', excerpt: '', content_html: '<p></p>', category: '', tags: '', cover_image_url: '', cover_image_alt: '', seo_title: '', seo_description: '', status: 'draft' as ArticleStatus };

function friendlySaveError(message?: string) {
  const detail = message ?? '';
  if (detail.includes('content_articles_excerpt_check')) return `O resumo precisa ter entre ${excerptMinLength} e ${excerptMaxLength} caracteres.`;
  if (detail.includes('content_articles_title_check')) return 'O título precisa ter entre 4 e 180 caracteres.';
  if (detail.includes('content_articles_category_check')) return 'A categoria precisa ter entre 2 e 80 caracteres.';
  if (detail.includes('content_articles_slug_key') || detail.includes('duplicate key')) return 'Já existe um artigo com este endereço. Ajuste o slug para continuar.';
  if (detail.includes('row-level security') || detail.includes('permission denied')) return 'Sua sessão não tem permissão para salvar este artigo. Entre novamente como terapeuta.';
  return 'Não foi possível salvar agora. Confira os campos destacados e tente novamente.';
}

export function ContentEditor() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const excerptLength = useMemo(() => form.excerpt.trim().length, [form.excerpt]);
  const seoDescriptionLength = useMemo(() => form.seo_description.trim().length, [form.seo_description]);

  useEffect(() => {
    if (!id) return;
    getTherapistArticle(id).then(({ data, error: loadError }) => {
      if (loadError || !data) setError(loadError ? friendlySaveError(loadError.message) : 'Artigo não encontrado.');
      if (data) setForm({ title: data.title, slug: data.slug, excerpt: data.excerpt, content_html: data.content_html, category: data.category, tags: data.tags.join(', '), cover_image_url: data.cover_image_url || '', cover_image_alt: data.cover_image_alt || '', seo_title: data.seo_title || '', seo_description: data.seo_description || '', status: data.status });
      setLoading(false);
    });
  }, [id]);

  const update = (name: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
    if (error) setError('');
  };

  const handleUpload = async (file: File) => {
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!supportedTypes.includes(file.type)) { setError('Envie uma imagem JPG, PNG ou WebP.'); return null; }
    if (file.size > 5 * 1024 * 1024) { setError('A imagem precisa ter no máximo 5 MB.'); return null; }
    setNotice('Enviando imagem…');
    const { url, error: uploadError } = await uploadContentImage(file);
    if (uploadError) { setError('Não foi possível enviar a imagem. Verifique o arquivo e tente novamente.'); setNotice(''); return null; }
    setNotice('Imagem enviada.');
    return url;
  };

  const uploadCover = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = await handleUpload(file);
    if (url) update('cover_image_url', url);
    event.target.value = '';
  };

  const validate = (status: ArticleStatus) => {
    const titleLength = form.title.trim().length;
    const categoryLength = form.category.trim().length;
    if (titleLength < 4 || titleLength > 180) return 'O título precisa ter entre 4 e 180 caracteres.';
    if (excerptLength < excerptMinLength || excerptLength > excerptMaxLength) return `O resumo precisa ter entre ${excerptMinLength} e ${excerptMaxLength} caracteres. Faltam ${Math.max(0, excerptMinLength - excerptLength)} caracteres.`;
    if (!plainText(form.content_html)) return 'Escreva o conteúdo do artigo antes de salvar.';
    if (categoryLength < 2 || categoryLength > 80) return 'Informe uma categoria entre 2 e 80 caracteres.';
    if (status === 'published' && !form.cover_image_url) return 'Para publicar, envie ou informe uma imagem de capa.';
    if (status === 'published' && !form.cover_image_alt.trim()) return 'Para publicar, descreva a imagem de capa no texto alternativo.';
    if (status === 'published' && !form.seo_description.trim()) return 'Para publicar, escreva a descrição de busca.';
    return '';
  };

  const submit = async (status: ArticleStatus) => {
    setError('');
    setNotice('');
    if (!profile) return;
    const validationError = validate(status);
    if (validationError) { setError(validationError); return; }
    setSaving(true);
    const { data, error: saveError } = await saveArticle({ slug: form.slug || makeSlug(form.title), title: form.title, excerpt: form.excerpt, content_html: form.content_html, category: form.category, tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean), cover_image_url: form.cover_image_url || null, cover_image_alt: form.cover_image_alt || null, seo_title: form.seo_title || null, seo_description: form.seo_description || null, faq: null, status }, profile.id, id);
    if (saveError || !data) { setError(friendlySaveError(saveError?.message)); setSaving(false); return; }
    if (status === 'published') {
      const build = await triggerContentBuild();
      if (!build.ok) { setError('Artigo publicado, mas a atualização da Biblioteca não foi iniciada. Tente publicar novamente ou confira a configuração do deploy.'); setSaving(false); return; }
      setNotice(build.reason || 'Artigo publicado. A Biblioteca está sendo atualizada.');
    }
    setSaving(false);
    navigate('/gestao-conteudos');
  };

  const excerptHelp = excerptLength < excerptMinLength
    ? `Escreva pelo menos ${excerptMinLength} caracteres. Faltam ${excerptMinLength - excerptLength}.`
    : `${excerptLength}/${excerptMaxLength} caracteres — resumo pronto para salvar.`;

  if (loading) return <div className="content-editor-page"><p>Carregando artigo…</p></div>;

  return (
    <div className="content-editor-page">
      <div className="content-editor-page__head"><Link to="/gestao-conteudos"><ArrowLeft size={16} /> Biblioteca 4D</Link><h1 className="font-serif">{id ? 'Editar artigo' : 'Novo artigo'}</h1></div>
      {error && <div className="content-editor-page__error" role="alert">{error}</div>}
      {notice && <p className="content-editor-page__notice" aria-live="polite">{notice}</p>}
      <div className="content-editor-page__grid">
        <section className="content-editor-page__main">
          <label>Título<input value={form.title} onChange={(event) => { update('title', event.target.value); if (!form.slug) update('slug', makeSlug(event.target.value)); }} placeholder="Título do artigo" minLength={4} maxLength={180} /></label>
          <label>Resumo<input value={form.excerpt} onChange={(event) => update('excerpt', event.target.value)} placeholder="O que a pessoa vai encontrar nesta leitura?" minLength={excerptMinLength} maxLength={excerptMaxLength} aria-describedby="excerpt-help" /><span id="excerpt-help" className={`content-field-help ${excerptLength > 0 && excerptLength < excerptMinLength ? 'content-field-help--attention' : ''}`}>{excerptHelp}</span></label>
          <label>Conteúdo<RichTextEditor content={form.content_html} onChange={(contentHtml) => update('content_html', contentHtml)} onUploadImage={handleUpload} /></label>
        </section>
        <aside className="content-editor-page__aside">
          <label>Slug<input value={form.slug} onChange={(event) => update('slug', makeSlug(event.target.value))} placeholder="url-do-artigo" maxLength={96} /><span className="content-field-help">Endereço criado a partir do título. Você pode ajustá-lo antes de publicar.</span></label>
          <label>Categoria<input value={form.category} onChange={(event) => update('category', event.target.value)} placeholder="Ex.: Travamento" minLength={2} maxLength={80} /></label>
          <label>Tags<input value={form.tags} onChange={(event) => update('tags', event.target.value)} placeholder="Separe por vírgulas" /></label>
          <label>Imagem de capa<input value={form.cover_image_url} onChange={(event) => update('cover_image_url', event.target.value)} placeholder="Enviada ou URL" /><span className="mt-2 flex"><Button type="button" variant="ghost" size="sm" onClick={() => document.getElementById('content-cover-upload')?.click()}><ImagePlus size={14} /> Enviar capa</Button></span><input id="content-cover-upload" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={uploadCover} />{form.cover_image_url && <img className="content-cover-preview" src={form.cover_image_url} alt="Prévia da capa" />}</label>
          <label>Texto alternativo da capa<input value={form.cover_image_alt} onChange={(event) => update('cover_image_alt', event.target.value)} placeholder="Descreva a imagem para quem não pode vê-la" /><span className="content-field-help">Obrigatório para publicar. Descreva o que a imagem mostra.</span></label>
          <label>SEO title<input value={form.seo_title} onChange={(event) => update('seo_title', event.target.value)} placeholder="Opcional; padrão é o título" maxLength={70} /></label>
          <label>Descrição de busca<textarea value={form.seo_description} onChange={(event) => update('seo_description', event.target.value)} placeholder="Escreva uma síntese clara para a busca" maxLength={seoDescriptionMaxLength} /><span className="content-field-help">{seoDescriptionLength}/{seoDescriptionMaxLength} caracteres. Obrigatória para publicar.</span></label>
          <div className="content-editor-page__actions"><Button type="button" variant="ghost" disabled={saving} onClick={() => submit('draft')}><Save size={15} /> Salvar rascunho</Button><Button type="button" variant="primary" disabled={saving} onClick={() => submit('published')}>Publicar</Button></div>
        </aside>
      </div>
    </div>
  );
}
