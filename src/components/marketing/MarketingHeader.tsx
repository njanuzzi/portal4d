import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '../ui/Button';

interface MarketingHeaderProps {
  onOpenMenu: () => void;
}

export function MarketingHeader({ onOpenMenu }: MarketingHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-petrol-700 text-white">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logosistema.png" alt="Logo" className="w-10 h-10 rounded-full object-cover shrink-0" />
          <div className="font-serif text-sm leading-tight">Núbia Januzzi</div>
        </Link>

        <div className="flex items-center gap-3">
          <Link to="/areamembros" className="hidden sm:block">
            <Button variant="secondary" size="sm">Área de Membros</Button>
          </Link>
          <button
            onClick={onOpenMenu}
            className="text-white"
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}
