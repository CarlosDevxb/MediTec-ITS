import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';

/* ============================================================
   MODAL · Diálogo de confirmación (accesible)

   - Se renderiza en el `body` (portal): así el fondo siempre
     cubre toda la página, sin importar los contenedores,
     animaciones o transforms de los ancestros (que convertirían
     al `position: fixed` en absoluto).
   - Cierra con la tecla Escape, con clic en el fondo o con el
     botón de cerrar de la cabecera
   - role="dialog" + aria-modal + título asociado
   - El foco entra al panel y vuelve al elemento que lo abrió

   Uso:
     <Modal
       titulo="¿Eliminar el registro?"
       descripcion="..."
       onCerrar={...}
       acciones={<>
         <Button variant="secondary" onClick={...}>Cancelar</Button>
         <Button variant="danger" onClick={...}>Eliminar</Button>
       </>}
     />
   ============================================================ */

export interface ModalProps {
  titulo: string;
  descripcion?: React.ReactNode;
  icono?: LucideIcon;
  onCerrar: () => void;
  /** Botones del pie (cancelar a la izquierda, acción a la derecha) */
  acciones?: React.ReactNode;
  children?: React.ReactNode;
}

export default function Modal({
  titulo,
  descripcion,
  icono: Icono,
  onCerrar,
  acciones,
  children,
}: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const abridor = useRef<Element | null>(null);

  // Al abrir: recuerda quién tenía el foco y llévalo al diálogo
  useEffect(() => {
    abridor.current = document.activeElement;
    panel.current?.focus();
    return () => {
      // Al cerrar, devuelve el foco a donde estaba
      (abridor.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [onCerrar]);

  // En el renderizado estático (prerender) aún no hay documento
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40"
      onClick={onCerrar}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="entrada-modal w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-xl focus-visible:outline-none"
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-4 px-7 pt-7 pb-5">
          <div className="flex items-start gap-3">
            {Icono && (
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <Icono size={20} />
              </span>
            )}
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-gray-900">{titulo}</h3>
              {descripcion && (
                <p className="mt-2 text-base text-gray-500">{descripcion}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar diálogo"
            title="Cerrar diálogo"
            className="shrink-0 text-gray-400 hover:text-brand-800 hover:bg-brand-50 rounded-lg p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido opcional */}
        {children && <div className="px-7 pb-2 text-base text-gray-700">{children}</div>}

        {/* Pie con acciones */}
        {acciones && (
          <div className="flex justify-end gap-3 px-7 pb-7 pt-4">
            {acciones}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
