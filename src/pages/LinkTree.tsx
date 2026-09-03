/** Página de links (estilo Linktree) para a bio do Instagram e TikTok — mobile-first. */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Compass, BookOpen, Youtube, MessageCircle } from 'lucide-react';
import { SeoHead } from '../components/SeoHead';
import { buildWhatsAppLink } from '../lib/whatsapp';

interface LinkItem {
  key: string;
  label: string;
  icon: ReactNode;
  href: string;
  external: boolean;
  newTab: boolean;
}

const links: LinkItem[] = [
  { key: 'portal', label: 'Portal', icon: <Compass size={20} />, href: 'https://www.nubiajanuzzi.com', external: true, newTab: false },
  { key: 'youtube', label: 'Canal do YouTube', icon: <Youtube size={20} />, href: 'https://www.youtube.com/@nubiajanuzzi', external: true, newTab: true },
  { key: 'blog', label: 'Blog', icon: <BookOpen size={20} />, href: '/conteudos', external: false, newTab: false },
  { key: 'protocolo4d', label: 'Protocolo 4D', icon: <Compass size={20} />, href: '/protocolo4d', external: false, newTab: false },
  { key: 'whatsapp', label: 'Fale com a gente', icon: <MessageCircle size={20} />, href: buildWhatsAppLink('Olá! Vim pelo link da bio.'), external: true, newTab: true },
];

function LinkButton({ item }: { item: LinkItem }) {
  const className = 'flex w-full items-center gap-3 rounded-full border-2 border-gold-400 bg-white px-5 py-4 font-sans font-medium text-dark shadow-sm transition active:scale-[0.98] active:bg-beige-100';
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-petrol-700 text-gold-400">{item.icon}</span>
      <span className="flex-1 text-center">{item.label}</span>
    </>
  );

  if (item.external) {
    return (
      <a href={item.href} {...(item.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link to={item.href} className={className}>
      {content}
    </Link>
  );
}

export function LinkTree() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-petrol-800 to-petrol-700 font-sans">
      <SeoHead title="Links" description="Todos os links de Núbia Januzzi: Portal, YouTube, Blog, Protocolo 4D e WhatsApp." canonicalPath="/tree" />
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center px-6 py-14">
        <img src="/logosistema.png" alt="Núbia Januzzi" className="h-20 w-20 rounded-full border-2 border-gold-400 bg-white object-contain p-1" />
        <h1 className="mt-4 text-center font-serif text-xl text-beige-50">Núbia Januzzi</h1>
        <p className="mt-1 text-center text-sm text-beige-200">Especialista em Desbloqueio Comportamental</p>

        <nav className="mt-8 flex w-full flex-col gap-3" aria-label="Links">
          {links.map((item) => (
            <LinkButton key={item.key} item={item} />
          ))}
        </nav>

        <p className="mt-10 text-center text-xs text-beige-200/70">© {new Date().getFullYear()} Núbia Januzzi</p>
      </div>
    </div>
  );
}
