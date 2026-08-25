import { Link } from 'react-router-dom';
import { Instagram, Youtube } from 'lucide-react';
import { SOCIAL_LINKS } from '../../lib/social';

// lucide-react não tem ícone de TikTok — desenho próprio no mesmo estilo
// (stroke, 24x24) dos ícones do lucide usados ao lado.
function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

export function MarketingFooter() {
  return (
    <footer className="max-w-5xl mx-auto px-4 py-8 flex flex-wrap items-center justify-between gap-4 text-xs text-petrol-800/60">
      <span>© {new Date().getFullYear()} Núbia Januzzi</span>
      <div className="flex items-center gap-4">
        <a
          href={SOCIAL_LINKS.instagram}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className="hover:text-petrol-800"
        >
          <Instagram size={18} />
        </a>
        <a
          href={SOCIAL_LINKS.youtube}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="YouTube"
          className="hover:text-petrol-800"
        >
          <Youtube size={18} />
        </a>
        <a
          href={SOCIAL_LINKS.tiktok}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="TikTok"
          className="hover:text-petrol-800"
        >
          <TikTokIcon />
        </a>
      </div>
      <div className="flex gap-4">
        <Link to="/privacy" className="hover:text-petrol-800">Privacidade</Link>
        <Link to="/areamembros" className="hover:text-petrol-800">Área de Membros</Link>
      </div>
    </footer>
  );
}
