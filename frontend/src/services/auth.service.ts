import { apiFetch } from './api';
import { guardarSesion, type UsuarioSesion } from './sesion';

/* ============================================================
   SERVICIO DE AUTENTICACIÓN · login contra la API
   (POST /api/auth/login)
   ============================================================ */

export interface RespuestaLogin {
  mensaje: string;
  token: string;
  usuario: UsuarioSesion;
}

/**
 * Inicia sesión y guarda el token + usuario en localStorage.
 * Lanza `Error` con el mensaje de la API (credenenciales inválidas,
 * cuenta deshabilitada, etc.).
 */
export async function iniciarSesion(
  numeroControl: string,
  contrasena: string
): Promise<RespuestaLogin> {
  const datos = await apiFetch<RespuestaLogin>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ numeroControl, contrasena }),
  });

  guardarSesion(datos.token, datos.usuario);
  return datos;
}
