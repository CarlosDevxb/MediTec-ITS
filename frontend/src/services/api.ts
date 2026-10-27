import { obtenerToken, cerrarSesion } from './sesion';

/* ============================================================
   CLIENTE HTTP · Fetch con JSON, token automático y errores
   normalizados en español (la API responde { error, detalles? }).
   ============================================================ */

const API_URL = (import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/**
 * Prefijo de la API. Se define aquí y no en cada servicio para que ninguno
 * pueda olvidarlo (esa omisión provocaba peticiones a `/roles` en lugar de
 * `/api/roles` y la API respondía "Ruta no encontrada").
 */
const BASE_API = `${API_URL}/api`;

export interface ErrorApi {
  error: string;
  detalles?: Array<{ campo: string; mensaje: string }>;
}

/**
 * Error de la API con la información que necesitan los formularios:
 * el código HTTP y, cuando la validación falló, los errores por campo.
 */
export interface ErrorConDetalles extends Error {
  status?: number;
  detalles?: Array<{ campo: string; mensaje: string }>;
}

export async function apiFetch<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const token = obtenerToken();

  const cabeceras: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((opciones.headers as Record<string, string>) ?? {}),
  };
  if (token) cabeceras['Authorization'] = `Bearer ${token}`;

  const respuesta = await fetch(`${BASE_API}${ruta}`, {
    ...opciones,
    headers: cabeceras,
  });

  const datos = (await respuesta.json().catch(() => null)) as (T & ErrorApi) | null;

  if (!respuesta.ok) {
    // Sesión caducada o token inválido: se limpia y se vuelve al login
    // (solo si se envió token, para no interferir con el propio login)
    if (respuesta.status === 401 && token) {
      cerrarSesion();
      return undefined as T;
    }

    const mensaje =
      datos?.error ??
      (respuesta.status === 404
        ? 'No se encontró el recurso solicitado.'
        : 'No se pudo conectar con el servidor. Intenta de nuevo.');

    // Se conserva el código y los errores por campo para los formularios
    const error: ErrorConDetalles = new Error(mensaje);
    error.status = respuesta.status;
    if (datos?.detalles) error.detalles = datos.detalles;
    throw error;
  }

  return datos as T;
}

/** Mensaje de red amigable cuando la API no responde */
export function mensajeDeError(error: unknown): string {
  if (error instanceof TypeError) {
    return 'No se pudo conectar con el servidor. Verifica que la API esté en ejecución.';
  }
  return error instanceof Error ? error.message : 'Error inesperado. Intenta de nuevo.';
}

/** Errores de validación por campo que devolvió la API (400) */
export function detallesDe(error: unknown): Record<string, string> {
  const detalles = (error as ErrorConDetalles | null)?.detalles;
  if (!detalles) return {};

  return detalles.reduce<Record<string, string>>((acumulado, detalle) => {
    if (!detalle.campo) return acumulado;
    // Los errores de elementos de una lista ('alergias.0') se asignan al campo
    // de la lista ('alergias'): quien dibuja la lista es quien puede mostrarlos
    const campo = detalle.campo.replace(/\.\d+$/, '');
    acumulado[campo] = detalle.mensaje;
    return acumulado;
  }, {});
}
