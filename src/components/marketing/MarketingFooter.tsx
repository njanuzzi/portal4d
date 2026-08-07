import { Link } from 'react-router-dom';

export function MarketingFooter() {
  return (
    <footer className="max-w-5xl mx-auto px-4 py-8 flex flex-wrap items-center justify-between gap-3 text-xs text-petrol-800/60">
      <span>© {new Date().getFullYear()} Núbia Januzzi</span>
      <div className="flex gap-4">
        <Link to="/privacy" className="hover:text-petrol-800">Privacidade</Link>
        <Link to="/areamembros" className="hover:text-petrol-800">Área de Membros</Link>
      </div>
    </footer>
  );
}
