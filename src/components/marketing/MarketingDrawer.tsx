/** Atlas de Padrões — menu móvel autoral, refletindo Núbia como marca e Protocolo 4D como produto. */
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, X } from 'lucide-react';

const links = [
  { number: '01', label: 'Protocolo 4D', to: '/protocolo4d' },
  { number: '02', label: 'Como eu trabalho', to: '/atendimento' },
  { number: '03', label: 'Biblioteca', to: '/conteudos' },
  { number: '04', label: 'Sobre a Núbia', to: '/sobre' },
];

interface MarketingDrawerProps { open: boolean; onClose: () => void; }

export function MarketingDrawer({ open, onClose }: MarketingDrawerProps) {
  useEffect(() => { const handler = (event: KeyboardEvent) => event.key === 'Escape' && onClose(); document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler); }, [onClose]);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);
  if (!open) return null;
  return <div className="atlas-drawer"><button className="atlas-drawer__backdrop" aria-label="Fechar menu" onClick={onClose} /><nav className="atlas-drawer__panel" aria-label="Navegação móvel"><div className="atlas-drawer__top"><span className="atlas-label">NÚBIA JANUZZI · ÍNDICE</span><button type="button" className="text-white" aria-label="Fechar menu" onClick={onClose}><X size={24} /></button></div><div className="atlas-drawer__links">{links.map((link) => <Link key={link.to} to={link.to} onClick={onClose}><span>{link.number}</span>{link.label}</Link>)}</div><div className="mt-auto pt-8"><Link to="/sessao-avaliacao" onClick={onClose} className="atlas-button w-full">Sessão de avaliação <ArrowUpRight size={16} /></Link><Link to="/areamembros" onClick={onClose} className="mt-5 block text-center text-xs text-gold-200">Área de membros</Link></div></nav></div>;
}
