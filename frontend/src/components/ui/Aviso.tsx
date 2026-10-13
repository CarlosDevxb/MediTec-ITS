import React from 'react';
import { X } from 'lucide-react';

/* ============================================================
   AVISO · Confirmación de acción (toast en línea)
   Uso:  const { aviso, mostrar, cerrar } = useAviso();
        {aviso && <Aviso mensaje={aviso} onCerrar={cerrar} />}
   ============================================================ */

export interface AvisoProps {
  mensaje: string;
  onCerrar: () => void;
}

export default function Aviso({ mensaje, onCerrar }: AvisoProps) {
  return (
    <div
      role="status"
      className="mb-6 flex items-center justify-between gap-4 bg-brand-50 border border-brand-200 text-brand-800 text-base px-4 py-3.5 rounded-lg"
    >
      <span>{mensaje}</span>
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar aviso"
        className="text-brand-600 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 rounded"
      >
        <X size={18} />
      </button>
    </div>
  );
}
