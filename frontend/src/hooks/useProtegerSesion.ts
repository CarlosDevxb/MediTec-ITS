import { useEffect } from 'react';
import { obtenerSesion } from '../services/sesion';

/**
 * Protege una vista: si no hay sesión iniciada, redirige al login.
 * Se ejecuta solo en el navegador (tras la hidratación de React),
 * por lo que no interfiere con el prerender de Astro.
 */
export function useProtegerSesion(): void {
  useEffect(() => {
    if (!obtenerSesion()) {
      window.location.replace('/login');
    }
  }, []);
}
