import { ReactNode, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  LogOut,
  Menu,
  ChevronRight,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { to: '/clients', label: 'Clientes', icon: <Users size={18} /> },
  { to: '/diaries', label: 'Diários', icon: <BookOpen size={18} /> },
  { to: '/reports', label: 'Relatórios', icon: <FileText size={18} /> },
  { to: '/scheduling', label: 'Agendamento', icon: <CalendarDays size={18} /> },
];

export function TherapistLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex flex-col h-full ${mobile ? '' : 'w-64'}`}>
      {/* Logo */}
      <div className="px-6 py-6 border-b border-petrol-600">
        <div className="flex items-center gap-3">
          <img src="/logosistema.png" alt="Logo" className="w-9 h-9 rounded-lg object-cover shrink-0" />
          <div>
            <div className="text-white font-semibold text-sm font-serif leading-tight">Desbloqueio Comportamental</div>
            <div className="text-petrol-200 text-xs">Protocolo NJ</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
                isActive
                  ? 'bg-petrol-600 text-white'
                  : 'text-petrol-100 hover:bg-petrol-600/50 hover:text-white'
              }`
            }
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
            <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-60 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-petrol-600">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center">
            <span className="text-gold-300 text-xs font-medium">
              {profile?.name?.charAt(0)?.toUpperCase() || 'T'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">{profile?.name || 'Terapeuta'}</div>
            <div className="text-petrol-300 text-xs truncate">{profile?.email}</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-petrol-200 hover:bg-petrol-600/50 hover:text-white transition-all"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-beige-200 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-petrol-700 shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 h-full bg-petrol-700 z-50">
            <Sidebar mobile />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-beige-300">
          <button onClick={() => setSidebarOpen(true)} className="text-dark/60 hover:text-dark">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logosistema.png" alt="Logo" className="w-6 h-6 rounded object-cover" />
            <span className="font-semibold text-petrol-700 font-serif text-sm">Desbloqueio Comportamental</span>
          </div>
          <div className="w-6" />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
