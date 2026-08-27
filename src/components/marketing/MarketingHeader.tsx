import { Link, NavLink } from 'react-router-dom';
import { ArrowUpRight, Menu } from 'lucide-react';

interface MarketingHeaderProps {
  onOpenMenu: () => void;
}

export function MarketingHeader({ onOpenMenu }: MarketingHeaderProps) {
  return (
    <header className="atlas-header">
      <div className="atlas-frame atlas-header__inner">
        <Link to="/" className="atlas-brand"><span className="atlas-brand__mark"><img src="/logosistema.png" alt="Símbolo Núbia Januzzi" /></span><span><strong>Núbia Januzzi</strong><small>PROTOCOLO 4D</small></span></Link>
        <nav className="atlas-nav" aria-label="Navegação principal"><NavLink to="/protocolo4d"><span>01</span>O método</NavLink><NavLink to="/atendimento"><span>02</span>Atendimento</NavLink><NavLink to="/conteudos"><span>03</span>Conteúdos</NavLink><NavLink to="/sobre"><span>04</span>Sobre a Núbia</NavLink></nav>
        <div className="atlas-header__actions"><Link to="/areamembros" className="atlas-member-link">Área de membros <ArrowUpRight size={13} className="inline" /></Link><Link to="/sessao-avaliacao" className="atlas-button">Sessão de avaliação <ArrowUpRight size={14} /></Link><button onClick={onOpenMenu} className="atlas-menu-button" aria-label="Abrir menu"><Menu size={23} /></button></div>
      </div>
    </header>
  );
}
