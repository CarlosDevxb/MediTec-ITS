import React from 'react';
import type { LucideIcon } from 'lucide-react';

/* ============================================================
   EMPTY STATE · Estado vacío / vista por construir
   ============================================================ */

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={[
        'p-12 flex flex-col items-center justify-center h-full text-gray-400',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {Icon && <Icon size={48} className="mb-4 opacity-50" />}
      <h2 className="text-2xl font-semibold text-gray-700">{title}</h2>
      {description && <p className="mt-2 text-center">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
