import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '../ui/Button';

const navItems = [
  { to: '/', label: 'Início', end: true },
  { to: '/protocolo4d', label: 'Protocolo 4D', end: true },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-petrol-700 text-white">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <img src="/logosistema.png" alt="Logo" className="w-9 h-9 rounded-lg object-cover shrink-0" />
          <div>
            <div className="font-serif text-sm leading-tight">Núbia Januzzi</div>
            <div className="text-petrol-200 text-xs">Psicoterapeuta</div>
          </div>
        </Link>

        <nav className="hidden sm:flex items-center gap-6">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `text-sm transition-colors ${isActive ? 'text-gold-300' : 'text-petrol-100 hover:text-white'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <Link to="/areamembros">
            <Button variant="secondary" size="sm">Área de Membros</Button>
          </Link>
        </nav>

        <button
          onClick={() => setOpen((v) => !v)}
          className="sm:hidden text-white"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <nav className="sm:hidden border-t border-petrol-600 px-4 py-3 flex flex-col gap-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `text-sm ${isActive ? 'text-gold-300' : 'text-petrol-100'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <Link to="/areamembros" onClick={() => setOpen(false)}>
            <Button variant="secondary" size="sm" className="w-full">Área de Membros</Button>
          </Link>
        </nav>
      )}
    </header>
  );
}
