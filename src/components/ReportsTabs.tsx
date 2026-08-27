import { Link } from 'react-router-dom';

type ReportsTabKey = 'sessions' | 'fechamento' | 'esquemas';

interface ReportsTabsProps {
  clientId: string;
  active: ReportsTabKey;
}

const TABS: { key: ReportsTabKey; label: string; to: (clientId: string) => string }[] = [
  { key: 'sessions', label: 'Sessões', to: (id) => `/reports/${id}/sessions` },
  { key: 'fechamento', label: 'Fechamento do Ciclo', to: (id) => `/reports/${id}` },
  { key: 'esquemas', label: 'Esquemas', to: (id) => `/clients/${id}/schema-analysis` },
];

// Navegação compartilhada entre as três telas de relatório de um cliente
// (Sessões, Fechamento do Ciclo, Esquemas) — cada uma continua sendo sua
// própria rota/página, só a barra de abas é a mesma nas três.
export function ReportsTabs({ clientId, active }: ReportsTabsProps) {
  return (
    <div className="flex gap-1 border-b border-beige-300 mb-6 -mt-2">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          to={tab.to(clientId)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            active === tab.key
              ? 'border-petrol-700 text-petrol-700'
              : 'border-transparent text-dark/50 hover:text-dark/80'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
