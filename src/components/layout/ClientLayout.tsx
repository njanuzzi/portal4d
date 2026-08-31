import { ReactNode, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Clock, FileText, Calendar, LogOut, KeyRound, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ClientChatbot } from '../client/ClientChatbot';

const navItems = [
  { to: '/home', label: 'Início', icon: Home, end: true },
  { to: '/diary', label: 'Diário', icon: BookOpen, end: true },
  { to: '/diary/history', label: 'Histórico', icon: Clock, end: false },
  { to: '/reports', label: 'Relatórios', icon: FileText, end: false },
  { to: '/scheduling', label: 'Agendar', icon: Calendar, end: false },
];

export function ClientLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const loginRecorded = useRef(false);

  // Record real client login once per session
  useEffect(() => {
    if (loginRecorded.current || !profile) return;
    loginRecorded.current = true;
    void supabase.rpc('record_client_login').then(() => {}, () => {});
  }, [profile]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/areamembros');
  };

  return (
    <div className="min-h-screen bg-beige-200 flex flex-col">
      {/* Header */}
      <header className="bg-petrol-700 text-white sticky top-0 z-40 safe-area-pt">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <img src="/logosistema.png" alt="Logo" className="w-9 h-9 rounded-lg object-cover shrink-0" />
              <div>
                <div className="text-white font-semibold text-sm font-serif leading-tight">Desbloqueio Comportamental</div>
                <div className="text-petrol-200 text-xs">Olá, {profile?.name?.split(' ')[0] || 'Cliente'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/notifications"
                className="flex items-center gap-1.5 text-petrol-200 hover:text-white transition-colors text-sm"
                title="Lembretes do diário"
              >
                <Bell size={16} />
                <span className="hidden sm:inline text-xs">Lembretes</span>
              </Link>
              <Link
                to="/change-password"
                className="flex items-center gap-1.5 text-petrol-200 hover:text-white transition-colors text-sm"
                title="Alterar senha"
              >
                <KeyRound size={16} />
                <span className="hidden sm:inline text-xs">Alterar senha</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-petrol-200 hover:text-white transition-colors"
                title="Sair"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline text-xs">Sair</span>
              </button>
            </div>
          </div>

          {/* Desktop top nav — hidden on mobile */}
          <nav className="hidden sm:flex border-t border-petrol-600">
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
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Content — extra bottom padding on mobile for the bottom nav */}
      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 py-6 pb-24 sm:pb-6">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav — hidden on desktop */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-petrol-700 border-t border-petrol-600 z-40 safe-area-pb">
        <div className="flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                  isActive ? 'text-gold-300' : 'text-petrol-300 hover:text-white'
                }`
              }
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <ClientChatbot />
    </div>
  );
}
