import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface EsquemaBarItem {
  name: string;
  percentual: number;
  description?: string;
}

interface EsquemasBarChartProps {
  items: EsquemaBarItem[];
}

// Barra horizontal ordenada — mais legível que radar pra 16 categorias com
// nomes longos. Magnitude codificada só pelo comprimento da barra (um hue),
// sem necessidade de paleta categórica. Clicar num item expande a explicação
// ali mesmo, em vez de duplicar tudo numa lista separada embaixo.
export function EsquemasBarChart({ items }: EsquemasBarChartProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const sorted = [...items].sort((a, b) => b.percentual - a.percentual);

  return (
    <div className="space-y-2.5">
      {sorted.map((item, i) => {
        const isOpen = expanded === i;
        const clickable = !!item.description;
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => clickable && setExpanded(isOpen ? null : i)}
              className={`w-full text-left ${clickable ? 'cursor-pointer group' : 'cursor-default'}`}
              disabled={!clickable}
            >
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className={`text-xs leading-snug flex items-center gap-1 ${clickable ? 'text-dark/70 group-hover:text-petrol-700' : 'text-dark/70'}`}>
                  {clickable && (
                    <ChevronDown size={11} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  )}
                  {item.name}
                </span>
                <span className="text-xs font-medium text-gold-700 shrink-0 tabular-nums">
                  {item.percentual.toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-2 bg-beige-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, item.percentual))}%` }}
                />
              </div>
            </button>
            {isOpen && item.description && (
              <p className="text-xs text-dark/60 leading-relaxed mt-1.5 pl-4">{item.description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
