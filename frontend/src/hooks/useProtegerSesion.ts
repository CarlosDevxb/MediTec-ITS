import { useEffect } from 'react';
import { obtenerSesion, rutaSegunRol } from '../services/sesion';

/**
 * Protege una vista (capa de experiencia; el control de acceso real está en
 * la API, que valida el rol en cada endpoint):
 *
 * - Sin sesión iniciada → redirige al login.
 * - Con sesión → comprueba que el usuario esté en SU panel (el que le
 *   corresponde por rol y especialidad); si entra por URL a un panel que no
 *   le toca (p. ej. una enfermera en /admin), se le redirige a casa.
 *
 * Se ejecuta solo en el navegador (tras la hidratación de React), por lo que
 * no interfiere con el prerender de Astro.
 */
export function useProtegerSesion(): void {
  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion) {
      window.location.replace('/login');
      return;
    }

    const hogar = rutaSegunRol(sesion.usuario.rol, sesion.usuario.especialidad);
    if (!window.location.pathname.startsWith(hogar)) {
      window.location.replace(hogar);
    }
  }, []);
}
