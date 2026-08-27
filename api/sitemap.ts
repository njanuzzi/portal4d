import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

const SITE_URL = (process.env.VITE_APP_URL || 'https://www.nubiajanuzzi.com').replace(/\/$/, '');
const STATIC_PATHS = ['/', '/protocolo4d', '/atendimento', '/sessao-avaliacao', '/produtos', '/sobre', '/conteudos', '/privacy'];

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character] || character);
}

export async function GET(): Promise<Response> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const rows: Array<{ slug: string; updated_at: string }> = [];

  if (url && key) {
    const supabase = createClient(url, key);
    const { data } = await (supabase as any)
      .from('content_articles')
      .select('slug, updated_at')
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString());
    rows.push(...(data ?? []));
  }

  const entries = [
    ...STATIC_PATHS.map((path) => `<url><loc>${SITE_URL}${path}</loc><changefreq>monthly</changefreq><priority>${path === '/' ? '1.0' : '0.7'}</priority></url>`),
    ...rows.map((article) => `<url><loc>${SITE_URL}/conteudos/${encodeURIComponent(article.slug)}</loc><lastmod>${new Date(article.updated_at).toISOString()}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`),
  ].join('');

  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
  });
}
