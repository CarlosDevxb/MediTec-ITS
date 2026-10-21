import { useEffect } from 'react';
import { obtenerSesion, rutaSegunRol } from '../services/sesion';

/**
 * Protege una vista (capa de experiencia; el control de acceso real está en
 * la API, que valida el rol en cada endpoint):
 *
 * - Sin sesión iniciada → redirige al login.
 * - Con `rolEsperado` → comprueba que el rol de la sesión corresponda al
 *   panel; si alguien entra por URL a un panel que no le toca (p. ej. una
 *   enfermera en /admin), se le redirige a su propio panel.
 *
 * Se ejecuta solo en el navegador (tras la hidratación de React), por lo que
 * no interfiere con el prerender de Astro.
 */
export function useProtegerSesion(rolEsperado?: string | string[]): void {
  // Los roles esperados de cada panel son fijos: la protección se evalúa una vez
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion) {
      window.location.replace('/login');
      return;
    }

    if (rolEsperado) {
      const permitidos = Array.isArray(rolEsperado) ? rolEsperado : [rolEsperado];
      if (!permitidos.includes(sesion.usuario.rol)) {
        // Cada rol solo puede estar en su propio panel
        window.location.replace(rutaSegunRol(sesion.usuario.rol));
      }
    }
  }, []);
}
