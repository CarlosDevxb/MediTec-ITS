import { useEffect, useState } from 'react';

/* ============================================================
   useAviso · Confirmaciones y errores con auto-cierre
   devuelve { aviso, tipo, mostrar(mensaje, tipo?), cerrar() }

   tipo: 'exito' | 'error' | 'info'
   ============================================================ */

export type TipoAviso = 'exito' | 'error' | 'info';

export function useAviso(duracion = 7000) {
  const [aviso, setAviso] = useState('');
  const [tipo, setTipo] = useState<TipoAviso>('exito');

  useEffect(() => {
    if (!aviso) return;
    const timer = setTimeout(() => setAviso(''), duracion);
    return () => clearTimeout(timer);
  }, [aviso, duracion]);

  return {
    aviso,
    tipo,
    /** Muestra el aviso; por defecto es de éxito */
    mostrar: (mensaje: string, nuevoTipo: TipoAviso = 'exito') => {
      setTipo(nuevoTipo);
      setAviso(mensaje);
    },
    cerrar: () => setAviso(''),
  };
}
