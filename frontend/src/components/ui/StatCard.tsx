import React from 'react';
import type { LucideIcon } from 'lucide-react';

/* ============================================================
   STAT CARD · Indicador (KPI)
   - 'card': tarjeta independiente
   - 'band': ítem dentro de un panel compartido (un solo borde,
             separado por hairlines en lugar de tarjetas gemelas)
   ============================================================ */

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  /** Línea secundaria bajo el valor (ej. "2 pendientes") */
  detail?: string;
  /** Resalta el detalle en azul marca en lugar de gris */
  highlight?: boolean;
  variant?: 'card' | 'band';
  className?: string;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  highlight = false,
  variant = 'card',
  className = '',
}: StatCardProps) {
  const base =
    variant === 'band' ? 'p-7' : 'bg-white p-7 rounded-2xl border border-gray-200';

  return (
    <div className={[base, className].filter(Boolean).join(' ')}>
      <div className="flex items-center gap-2 text-gray-500 text-base font-medium mb-3">
        <Icon size={20} className="text-brand-600" />
        {label}
      </div>
      <div className="text-5xl font-semibold tracking-tight text-gray-900 tabular-nums mb-1.5">
        {value}
      </div>
      {detail && (
        <p
          className={`text-base ${
            highlight ? 'text-brand-700 font-medium' : 'text-gray-500'
          }`}
        >
          {detail}
        </p>
      )}
    </div>
  );
}
