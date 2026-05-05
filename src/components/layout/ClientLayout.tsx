import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Clock, FileText, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/home', label: 'Início', icon: <Home size={18} />, end: true },
  { to: '/diary', label: 'Diário', icon: <BookOpen size={18} />, end: true },
  { to: '/diary/history', label: 'Histórico', icon: <Clock size={18} />, end: false },
  { to: '/reports', label: 'Relatórios', icon: <FileText size={18} />, end: false },
];

export function ClientLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-beige-200 flex flex-col">
      {/* Header */}
      <header className="bg-petrol-700 text-white">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gold-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm font-serif">NJ</span>
              </div>
              <div>
                <div className="text-white font-semibold text-sm font-serif">Sistema Núbia Januzzi</div>
                <div className="text-petrol-200 text-xs">Olá, {profile?.name?.split(' ')[0] || 'Cliente'}</div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-petrol-200 hover:text-white transition-colors text-sm"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>

          {/* Nav tabs */}
          <nav className="flex border-t border-petrol-600">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-3 text-sm transition-colors border-b-2 ${
                    isActive
                      ? 'text-gold-300 border-gold-400'
                      : 'text-petrol-200 border-transparent hover:text-white'
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
