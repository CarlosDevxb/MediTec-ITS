import React from 'react';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';
import type { TipoAviso } from './useAviso';

/* ============================================================
   AVISO · Toast en línea para confirmaciones y errores
   Uso:  const { aviso, tipo, mostrar, cerrar } = useAviso();
         {aviso && <Aviso mensaje={aviso} tipo={tipo} onCerrar={cerrar} />}

   El color nunca es la única señal: siempre hay icono y texto.
   ============================================================ */

export interface AvisoProps {
  mensaje: string;
  tipo?: TipoAviso;
  onCerrar: () => void;
}

const ESTILOS: Record<TipoAviso, { clases: string; Icono: typeof Info }> = {
  exito: {
    clases: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    Icono: CheckCircle2,
  },
  error: {
    clases: 'bg-red-50 border-red-200 text-red-900',
    Icono: CircleAlert,
  },
  info: {
    clases: 'bg-brand-50 border-brand-200 text-brand-800',
    Icono: Info,
  },
};

export default function Aviso({ mensaje, tipo = 'exito', onCerrar }: AvisoProps) {
  const { clases, Icono } = ESTILOS[tipo];

  return (
    <div
      role={tipo === 'error' ? 'alert' : 'status'}
      aria-live={tipo === 'error' ? 'assertive' : 'polite'}
      className={`mb-6 flex items-center justify-between gap-4 border text-base font-medium px-5 py-4 rounded-lg shadow-md ${clases}`}
    >
      <span className="flex items-center gap-2.5">
        <Icono size={20} className="shrink-0" aria-hidden="true" />
        {mensaje}
      </span>
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar aviso"
        className="opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 rounded"
      >
        <X size={18} />
      </button>
    </div>
  );
}
