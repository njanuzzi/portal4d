import { Eye, EyeOff } from 'lucide-react';
import { Badge } from './ui/Badge';
import { formatDate } from '../lib/format';

interface ReadStatusBadgeProps {
  firstViewedAt?: string | null;
}

// Marcação automática de leitura — aparece em qualquer relatório (sessão,
// fechamento de ciclo ou esquemas) assim que o cliente abre pra ler, sem
// depender de nenhuma opção ligada/desligada.
export function ReadStatusBadge({ firstViewedAt }: ReadStatusBadgeProps) {
  if (firstViewedAt) {
    return (
      <span title={`Lido em ${formatDate(firstViewedAt)}`}>
        <Badge variant="info" className="gap-1">
          <Eye size={11} />
          Lido
        </Badge>
      </span>
    );
  }
  return (
    <Badge variant="neutral" className="gap-1">
      <EyeOff size={11} />
      Não lido
    </Badge>
  );
}
