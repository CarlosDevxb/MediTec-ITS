import React from 'react';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

/* ============================================================
   MODAL DE RESULTADO · Confirmación visible de que una acción
   ya se hizo (usuario deshabilitado, rol eliminado…).

   Se muestra después de ejecutar la acción, sobre el modal de
   confirmación previo: así el resultado nunca pasa inadvertido.

   Uso:
     {resultado && (
       <ModalResultado
         titulo="Rol eliminado"
         mensaje='El rol "Recepción" se eliminó del sistema.'
         onCerrar={() => setResultado(null)}
       />
     )}
   ============================================================ */

export interface ModalResultadoProps {
  titulo: string;
  mensaje: string;
  /** Por defecto es de éxito; 'error' para resultados fallidos */
  tipo?: 'exito' | 'error';
  onCerrar: () => void;
}

export default function ModalResultado({
  titulo,
  mensaje,
  tipo = 'exito',
  onCerrar,
}: ModalResultadoProps) {
  const Icono = tipo === 'exito' ? CheckCircle2 : CircleAlert;

  return (
    <Modal
      titulo={titulo}
      icono={Icono}
      onCerrar={onCerrar}
      acciones={
        <Button variant="primary" icon={CheckCircle2} onClick={onCerrar} autoFocus>
          Entendido
        </Button>
      }
    >
      <p
        className={
          tipo === 'exito'
            ? 'rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-900'
            : 'rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-900'
        }
      >
        {mensaje}
      </p>
    </Modal>
  );
}
