import React from 'react';
import type { LucideIcon } from 'lucide-react';

/* ============================================================
   ICON BUTTON · Acción rápida de tabla (solo icono)
   label: tooltip + nombre accesible (siempre obligatorio)
   ============================================================ */

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  /** Tooltip y aria-label de la acción */
  label: string;
  tone?: 'default' | 'danger';
}

export default function IconButton({
  icon: Icon,
  label,
  tone = 'default',
  className = '',
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={[
        'inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        tone === 'danger'
          ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
          : 'text-gray-400 hover:text-brand-800 hover:bg-brand-50',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      <Icon size={18} />
    </button>
  );
}
