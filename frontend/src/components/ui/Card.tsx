import React from 'react';
import type { LucideIcon } from 'lucide-react';

/* ============================================================
   CARD · Contenedor de panel (hairline, sin sombra)
   - title/icon:  encabezado opcional
   - action:      elemento a la derecha del encabezado
   - divided:     línea separadora bajo el encabezado (listas)
   ============================================================ */

export interface CardProps {
  title?: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  action?: React.ReactNode;
  divided?: boolean;
  bodyClassName?: string;
  className?: string;
  children: React.ReactNode;
}

export default function Card({
  title,
  description,
  icon: Icon,
  action,
  divided = false,
  bodyClassName = '',
  className = '',
  children,
}: CardProps) {
  const hasHeader = Boolean(title || action);

  return (
    <div
      className={[
        'bg-white rounded-2xl border border-gray-200 overflow-hidden',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {hasHeader && (
        <div
          className={[
            'flex items-start justify-between gap-4 px-7',
            divided ? 'p-7 border-b border-gray-100' : 'pt-7 pb-5',
          ].join(' ')}
        >
          <div>
            <div className="flex items-center gap-2 text-gray-900 font-semibold text-xl tracking-tight">
              {Icon && <Icon size={22} className="text-brand-600" />}
              {title}
            </div>
            {description && (
              <p className="text-base text-gray-500 mt-1.5">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}

      <div
        className={
          bodyClassName ||
          (hasHeader
            ? divided
              ? 'p-7'
              : 'px-7 pb-7'
            : 'p-7')
        }
      >
        {children}
      </div>
    </div>
  );
}
