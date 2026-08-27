/** Prerender da Biblioteca 4D: cria HTML com metadados por artigo durante a build da Vercel. */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');
const siteUrl = (process.env.VITE_APP_URL || 'https://www.nubiajanuzzi.com').replace(/\/$/, '');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const escapeHtml = (value = '') => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
const textFromHtml = (value = '') => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

if (!supabaseUrl || !supabaseKey) {
  console.warn('[biblioteca] Variáveis do Supabase ausentes; páginas de artigos não foram pré-geradas nesta build.');
  process.exit(0);
}

const endpoint = `${supabaseUrl}/rest/v1/content_articles?select=slug,title,excerpt,content_html,seo_title,seo_description,cover_image_url,cover_image_alt,updated_at&status=eq.published&published_at=lte.${encodeURIComponent(new Date().toISOString())}`;
const response = await fetch(endpoint, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } });
if (!response.ok) {
  console.warn(`[biblioteca] Não foi possível pré-gerar artigos (${response.status}).`);
  process.exit(0);
}

const articles = await response.json();
const shell = await readFile(path.join(dist, 'index.html'), 'utf8');
for (const article of articles) {
  const title = article.seo_title || article.title;
  const description = article.seo_description || article.excerpt;
  const canonical = `${siteUrl}/conteudos/${article.slug}`;
  const meta = `<title>${escapeHtml(title)} | Núbia Januzzi</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="article"><meta property="og:title" content="${escapeHtml(title)} | Núbia Januzzi"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${canonical}">${article.cover_image_url ? `<meta property="og:image" content="${escapeHtml(article.cover_image_url)}">` : ''}`;
  const fallback = `<noscript><article><h1>${escapeHtml(article.title)}</h1><p>${escapeHtml(article.excerpt)}</p><div>${escapeHtml(textFromHtml(article.content_html))}</div></article></noscript>`;
  const html = shell.replace(/<title>[\s\S]*?<\/title>/, meta).replace('<div id="root"></div>', `<div id="root"></div>${fallback}`);
  const articleDirectory = path.join(dist, 'conteudos', article.slug);
  await mkdir(articleDirectory, { recursive: true });
  await writeFile(path.join(articleDirectory, 'index.html'), html);
}

console.log(`[biblioteca] ${articles.length} artigo(s) pré-gerado(s).`);
