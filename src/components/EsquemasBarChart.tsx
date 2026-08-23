interface EsquemaBarItem {
  name: string;
  percentual: number;
}

interface EsquemasBarChartProps {
  items: EsquemaBarItem[];
}

// Barra horizontal ordenada — mais legível que radar pra 16 categorias com
// nomes longos. Magnitude codificada só pelo comprimento da barra (um hue),
// sem necessidade de paleta categórica.
export function EsquemasBarChart({ items }: EsquemasBarChartProps) {
  const sorted = [...items].sort((a, b) => b.percentual - a.percentual);

  return (
    <div className="space-y-2.5">
      {sorted.map((item, i) => (
        <div key={i}>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <span className="text-xs text-dark/70 leading-snug">{item.name}</span>
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
        </div>
      ))}
    </div>
  );
}
