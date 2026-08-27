/**
 * Biblioteca 4D — acesso a artigos e higienização do HTML editorial.
 * Conteúdo público só é lido quando publicado; escrita ocorre no painel da terapeuta.
 */
import DOMPurify from 'dompurify';
import { supabase } from './supabase';

export type ArticleStatus = 'draft' | 'published';

export interface ContentArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_html: string;
  category: string;
  tags: string[];
  cover_image_url: string | null;
  cover_image_alt: string | null;
  author_id: string;
  status: ArticleStatus;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  faq: Array<{ question: string; answer: string }> | null;
  created_at: string;
  updated_at: string;
}

export type ContentArticleInput = Pick<
  ContentArticle,
  'slug' | 'title' | 'excerpt' | 'content_html' | 'category' | 'tags' | 'cover_image_url' | 'cover_image_alt' | 'seo_title' | 'seo_description' | 'faq'
> & { status: ArticleStatus };

const ARTICLE_FIELDS = 'id, slug, title, excerpt, content_html, category, tags, cover_image_url, cover_image_alt, author_id, status, published_at, seo_title, seo_description, faq, created_at, updated_at';

export function makeSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 96);
}

export function plainText(html: string) {
  const container = document.createElement('div');
  container.innerHTML = html;
  return (container.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function sanitizeArticleHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 's', 'u', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'hr'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title'],
    ALLOW_DATA_ATTR: false,
  });
}

function normalizeArticle(row: unknown) {
  return row as ContentArticle;
}

export async function getPublicArticles() {
  const { data, error } = await (supabase as any)
    .from('content_articles')
    .select(ARTICLE_FIELDS)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false });

  return { data: (data ?? []).map(normalizeArticle), error };
}

export async function getPublicArticleBySlug(slug: string) {
  const { data, error } = await (supabase as any)
    .from('content_articles')
    .select(ARTICLE_FIELDS)
    .eq('slug', slug)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .maybeSingle();

  return { data: data ? normalizeArticle(data) : null, error };
}

export async function getTherapistArticles() {
  const { data, error } = await (supabase as any)
    .from('content_articles')
    .select(ARTICLE_FIELDS)
    .order('updated_at', { ascending: false });

  return { data: (data ?? []).map(normalizeArticle), error };
}

export async function getTherapistArticle(id: string) {
  const { data, error } = await (supabase as any)
    .from('content_articles')
    .select(ARTICLE_FIELDS)
    .eq('id', id)
    .maybeSingle();

  return { data: data ? normalizeArticle(data) : null, error };
}

export async function saveArticle(input: ContentArticleInput, authorId: string, id?: string) {
  const cleanContent = sanitizeArticleHtml(input.content_html);
  const payload = {
    ...input,
    slug: makeSlug(input.slug),
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    content_html: cleanContent,
    category: input.category.trim(),
    tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
    cover_image_alt: input.cover_image_alt?.trim() || null,
    seo_title: input.seo_title?.trim() || null,
    seo_description: input.seo_description?.trim() || null,
    published_at: input.status === 'published' ? new Date().toISOString() : null,
  };

  if (id) {
    const { data, error } = await (supabase as any)
      .from('content_articles')
      .update(payload)
      .eq('id', id)
      .select(ARTICLE_FIELDS)
      .single();
    return { data: data ? normalizeArticle(data) : null, error };
  }

  const { data, error } = await (supabase as any)
    .from('content_articles')
    .insert({ ...payload, author_id: authorId })
    .select(ARTICLE_FIELDS)
    .single();
  return { data: data ? normalizeArticle(data) : null, error };
}

export async function deleteArticle(id: string) {
  return (supabase as any).from('content_articles').delete().eq('id', id);
}

export async function uploadContentImage(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeName = makeSlug(file.name.replace(/\.[^.]+$/, '')) || 'imagem';
  const path = `articles/${Date.now()}-${safeName}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('content-images')
    .upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type });

  if (uploadError) return { url: null, error: uploadError };
  const { data } = supabase.storage.from('content-images').getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

export async function triggerContentBuild() {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) return { ok: false, reason: 'Sessão expirada.' };

  const response = await fetch('/api/trigger-content-build', {
    method: 'POST',
    headers: { Authorization: `Bearer ${data.session.access_token}` },
  });

  const result = await response.json().catch(() => ({}));
  return { ok: response.ok, reason: result.message as string | undefined };
}
