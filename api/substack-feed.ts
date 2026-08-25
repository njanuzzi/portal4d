import { XMLParser } from 'fast-xml-parser';

export const config = { runtime: 'nodejs' };

// TODO: substituir pela URL real do Substack da Núbia antes de publicar
const SUBSTACK_FEED_URL = process.env.SUBSTACK_FEED_URL || 'https://nubiajanuzzi.substack.com/feed';

interface SubstackItem {
  title?: string;
  link?: string;
  description?: string;
  'content:encoded'?: string;
  pubDate?: string;
  enclosure?: { '@_url'?: string };
}

interface SubstackFeed {
  rss?: {
    channel?: {
      item?: SubstackItem | SubstackItem[];
    };
  };
}

interface BlogPost {
  title: string;
  url: string;
  excerpt: string;
  publishedAt: string;
  coverImage?: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toExcerpt(text: string, maxLength = 180): string {
  const clean = stripHtml(text);
  return clean.length > maxLength ? `${clean.slice(0, maxLength).trim()}…` : clean;
}

export async function GET(): Promise<Response> {
  try {
    const feedRes = await fetch(SUBSTACK_FEED_URL);
    if (!feedRes.ok) {
      return new Response('Failed to fetch feed', { status: 502 });
    }
    const xml = await feedRes.text();

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsed = parser.parse(xml) as SubstackFeed;

    const rawItems = parsed.rss?.channel?.item ?? [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];

    const posts: BlogPost[] = items
      .filter((item): item is SubstackItem & { title: string; link: string } => Boolean(item.title && item.link))
      .map((item) => ({
        title: item.title,
        url: item.link,
        excerpt: toExcerpt(item.description ?? item['content:encoded'] ?? ''),
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        coverImage: item.enclosure?.['@_url'],
      }));

    return new Response(JSON.stringify(posts), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch {
    return new Response('Failed to load blog posts', { status: 500 });
  }
}
