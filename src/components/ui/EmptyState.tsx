import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="mb-4 text-beige-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-dark/70 mb-1">{title}</h3>
      {description && <p className="text-sm text-dark/40 mb-6 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}
