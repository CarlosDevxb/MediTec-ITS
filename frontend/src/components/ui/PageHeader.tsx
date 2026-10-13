import React from 'react';

/* ============================================================
   PAGE HEADER · Cabecera estándar de cada vista
   título + subtítulo a la izquierda · meta/acciones a la derecha
   ============================================================ */

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Bloque derecho (fecha, filtros, botones de acción) */
  meta?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, meta }: PageHeaderProps) {
  return (
    <header className="mb-10 flex flex-wrap justify-between items-end gap-4">
      <div>
        <h2 className="text-4xl font-semibold tracking-tight text-gray-900">{title}</h2>
        {subtitle && (
          <p className="text-gray-500 mt-2 text-base font-medium">{subtitle}</p>
        )}
      </div>
      {meta && <div className="text-sm font-medium">{meta}</div>}
    </header>
  );
}
