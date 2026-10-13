import React from 'react';

/* ============================================================
   BADGE · Estatus con punto + texto (nunca solo color)
   Pendiente · Confirmada · Cancelada · Completada · Programada
   ============================================================ */

export type BadgeStatus =
  | 'pending' // Pendiente
  | 'confirmed' // Confirmada
  | 'scheduled' // Programada
  | 'cancelled' // Cancelada
  | 'completed' // Completada
  | 'neutral';

export interface BadgeProps {
  status?: BadgeStatus;
  /** Sobrescribe el texto por defecto del estatus */
  children?: React.ReactNode;
  className?: string;
}

const STATUSES: Record<BadgeStatus, { label: string; classes: string; dot: string }> = {
  pending: {
    label: 'Pendiente',
    classes: 'bg-amber-50 text-amber-800 border border-amber-200',
    dot: 'bg-amber-500',
  },
  confirmed: {
    label: 'Confirmada',
    classes: 'bg-green-50 text-green-800 border border-green-200',
    dot: 'bg-green-600',
  },
  scheduled: {
    label: 'Programada',
    classes: 'bg-gray-100 text-gray-700 border border-gray-200',
    dot: 'bg-gray-400',
  },
  cancelled: {
    label: 'Cancelada',
    classes: 'bg-red-50 text-red-800 border border-red-200',
    dot: 'bg-red-500',
  },
  completed: {
    label: 'Completada',
    classes: 'bg-brand-50 text-brand-800 border border-brand-200',
    dot: 'bg-brand-600',
  },
  neutral: {
    label: '',
    classes: 'bg-gray-100 text-gray-700 border border-gray-200',
    dot: 'bg-gray-400',
  },
};

export default function Badge({ status = 'neutral', children, className = '' }: BadgeProps) {
  const { label, classes, dot } = STATUSES[status];

  return (
    <span
      className={[
        'inline-flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full',
        classes,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {children ?? label}
    </span>
  );
}
