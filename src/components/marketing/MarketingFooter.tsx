/** Atlas de Padrões — rodapé autoral: Núbia Januzzi é a marca e o Protocolo 4D é seu produto. */
import { Link } from 'react-router-dom';
import { Instagram, Youtube } from 'lucide-react';
import { SOCIAL_LINKS } from '../../lib/social';

export function MarketingFooter() {
  return <footer className="atlas-footer"><div className="atlas-frame atlas-footer__inner"><div><Link to="/" className="atlas-brand"><span className="atlas-brand__mark"><img src="/logosistema.png" alt="Símbolo Núbia Januzzi" /></span><span><strong>Núbia Januzzi</strong><small>ESPECIALISTA EM DESBLOQUEIO COMPORTAMENTAL</small></span></Link><p>O Protocolo 4D é o produto autoral de Núbia Januzzi para quem reconhece um padrão e quer encontrar uma resposta possível no cotidiano.</p></div><div><h3>Explorar</h3><Link to="/protocolo4d">Protocolo 4D</Link><Link to="/atendimento">Como eu trabalho</Link><Link to="/conteudos">Biblioteca 4D</Link><Link to="/sobre">Sobre a Núbia</Link></div><div><h3>Acompanhar</h3><a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer"><Instagram size={15} className="inline mr-2" />Instagram @nubiajanuzzi</a><a href={SOCIAL_LINKS.youtube} target="_blank" rel="noopener noreferrer"><Youtube size={15} className="inline mr-2" />YouTube</a><Link to="/sessao-avaliacao">Sessão de avaliação</Link><Link to="/areamembros">Área de membros</Link></div></div><div className="atlas-frame atlas-footer__legal"><span>© {new Date().getFullYear()} Núbia Januzzi · autora do Protocolo 4D</span><span><Link to="/privacy">Privacidade</Link></span></div></footer>;
}
