import { obtenerToken } from './sesion';

/* ============================================================
   CLIENTE HTTP · Fetch con JSON, token automático y errores
   normalizados en español (la API responde { error }).
   ============================================================ */

const API_URL = (import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export interface ErrorApi {
  error: string;
  detalles?: Array<{ campo: string; mensaje: string }>;
}

export async function apiFetch<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const token = obtenerToken();

  const cabeceras: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((opciones.headers as Record<string, string>) ?? {}),
  };
  if (token) cabeceras['Authorization'] = `Bearer ${token}`;

  const respuesta = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers: cabeceras,
  });

  const datos = (await respuesta.json().catch(() => null)) as (T & ErrorApi) | null;

  if (!respuesta.ok) {
    const mensaje =
      datos?.error ??
      (respuesta.status === 404
        ? 'No se encontró el recurso solicitado.'
        : 'No se pudo conectar con el servidor. Intenta de nuevo.');
    throw new Error(mensaje);
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
