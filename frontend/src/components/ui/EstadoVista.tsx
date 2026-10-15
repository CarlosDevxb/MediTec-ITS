import React from 'react';
import { CircleAlert, Loader2 } from 'lucide-react';
import EmptyState from './EmptyState';
import Button from './Button';

/* ============================================================
   ESTADO DE VISTA · Envuelve el contenido de una sección y
   muestra por sí solo el estado de carga o el de error.

   <EstadoVista cargando={cargando} error={error} onReintentar={cargar}>
     <DataTable ... />
   </EstadoVista>
   ============================================================ */

export interface EstadoVistaProps {
  cargando: boolean;
  /** Mensaje de error ya en español; `null` cuando todo va bien */
  error?: string | null;
  onReintentar?: () => void;
  children: React.ReactNode;
  textoCargando?: string;
}

export default function EstadoVista({
  cargando,
  error,
  onReintentar,
  children,
  textoCargando = 'Cargando información…',
}: EstadoVistaProps) {
  if (cargando) {
    return (
      <div
        role="status"
        className="flex flex-col items-center justify-center gap-3 py-20 text-gray-500"
      >
        <Loader2 size={32} className="animate-spin text-brand-600" aria-hidden="true" />
        <p className="text-base font-medium">{textoCargando}</p>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={CircleAlert}
        title="No se pudo cargar la información"
        description={error}
        action={
          onReintentar && (
            <Button variant="secondary" onClick={onReintentar}>
              Reintentar
            </Button>
          )
        }
      />
    );
  }

  return <>{children}</>;
}
