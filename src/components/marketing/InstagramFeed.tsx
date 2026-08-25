import { useEffect } from 'react';
import { INSTAGRAM_POST_URLS, INSTAGRAM_PROFILE_URL } from '../../lib/instagramPosts';

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

export function InstagramFeed() {
  useEffect(() => {
    if (INSTAGRAM_POST_URLS.length === 0) return;

    const existingScript = document.getElementById('instagram-embed-script');
    if (existingScript) {
      window.instgrm?.Embeds.process();
      return;
    }

    const script = document.createElement('script');
    script.id = 'instagram-embed-script';
    script.src = '//www.instagram.com/embed.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  if (INSTAGRAM_POST_URLS.length === 0) {
    return (
      <a
        href={INSTAGRAM_PROFILE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-petrol-700 font-medium text-sm hover:text-petrol-800"
      >
        Seguir no Instagram
      </a>
    );
  }

  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {INSTAGRAM_POST_URLS.map((url) => (
        <blockquote key={url} className="instagram-media" data-instgrm-permalink={url} data-instgrm-version="14" />
      ))}
    </div>
  );
}
