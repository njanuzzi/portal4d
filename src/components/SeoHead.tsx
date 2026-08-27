/** Atlas de Padrões — metadados consistentes para rotas públicas da Biblioteca 4D. */
import { useEffect } from 'react';

interface SeoHeadProps {
  title: string;
  description: string;
  image?: string | null;
  canonicalPath?: string;
  type?: 'website' | 'article';
}

function upsertMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function SeoHead({ title, description, image, canonicalPath, type = 'website' }: SeoHeadProps) {
  useEffect(() => {
    const fullTitle = title.includes('Núbia Januzzi') ? title : `${title} | Núbia Januzzi`;
    const canonicalUrl = canonicalPath ? `https://www.nubiajanuzzi.com${canonicalPath}` : window.location.href;
    document.title = fullTitle;
    upsertMeta('meta[name="description"]', 'name', 'description', description);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', type);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    if (image) upsertMeta('meta[property="og:image"]', 'property', 'og:image', image);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
  }, [title, description, image, canonicalPath, type]);

  return null;
}
