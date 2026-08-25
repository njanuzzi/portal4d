import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';

interface DrawerItem {
  label: string;
  to: string;
}

interface DrawerGroup {
  title: string;
  items: DrawerItem[];
}

const groups: DrawerGroup[] = [
  {
    title: 'Home',
    items: [
      { label: 'Início', to: '/' },
      { label: 'Quem sou eu', to: '/#sobre' },
      { label: 'Missão e visão', to: '/#missao' },
    ],
  },
  {
    title: 'Produtos e Serviços',
    items: [
      { label: 'Sessão de Avaliação', to: '/produtos#sessao-avaliacao' },
      { label: 'Protocolo 4D', to: '/protocolo4d' },
      { label: 'Atendimento Individual (como funciona)', to: '/atendimento' },
    ],
  },
  // Desativado até a Núbia criar um Substack direcionado ao Protocolo 4D.
  // {
  //   title: 'Conteúdo',
  //   items: [{ label: 'Blog', to: '/blog' }],
  // },
];

interface MarketingDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MarketingDrawer({ open, onClose }: MarketingDrawerProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <nav
        aria-label="Navegação"
        className="absolute right-0 top-0 h-full w-full max-w-xs bg-white shadow-xl overflow-y-auto animate-in slide-in-from-right"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-beige-300">
          <span className="font-serif text-petrol-800">Navegação</span>
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="text-dark/50 hover:text-dark transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        <div className="px-5 py-6 flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="text-gold-700 text-xs font-semibold tracking-widest uppercase mb-2">
                {group.title}
              </p>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      onClick={onClose}
                      className="block py-1.5 text-sm text-petrol-900 hover:text-petrol-600 transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <Link to="/areamembros" onClick={onClose}>
            <Button variant="secondary" size="md" className="w-full">
              Área de Membros
            </Button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
