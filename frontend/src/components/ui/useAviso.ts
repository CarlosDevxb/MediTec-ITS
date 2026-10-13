import { useEffect, useState } from 'react';

/* ============================================================
   useAviso · Hook de confirmaciones con auto-cierre
   devuelve { aviso, mostrar(mensaje), cerrar() }
   ============================================================ */

export function useAviso(duracion = 4000) {
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    if (!aviso) return;
    const timer = setTimeout(() => setAviso(''), duracion);
    return () => clearTimeout(timer);
  }, [aviso, duracion]);

  return { aviso, mostrar: setAviso, cerrar: () => setAviso('') };
}
