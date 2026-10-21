import { apiFetch } from './api';
import { guardarSesion, type UsuarioSesion } from './sesion';
import type { Usuario } from './administracion.service';

/* ============================================================
   SERVICIO DE AUTENTICACIÓN · login y perfil propio
   (POST /api/auth/login · GET/PATCH /api/auth/perfil)
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
  const datos = await apiFetch<RespuestaLogin>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ numeroControl, contrasena }),
  });

  guardarSesion(datos.token, datos.usuario);
  return datos;
}

/** Datos completos de la cuenta en sesión (incluye especialidad del personal) */
export function obtenerPerfil(): Promise<Usuario> {
  return apiFetch<{ datos: Usuario }>('/auth/perfil').then((r) => r.datos);
}

/**
 * Actualiza el propio perfil: teléfono y contraseña.
 * El correo no se modifica desde aquí (es el identificador de la cuenta) y
 * para cambiar la contraseña se exige la contraseña actual.
 */
export function actualizarPerfil(datos: {
  telefono?: string;
  contrasenaActual?: string;
  contrasenaNueva?: string;
}): Promise<Usuario> {
  return apiFetch<{ datos: Usuario }>('/auth/perfil', {
    method: 'PATCH',
    body: JSON.stringify(datos),
  }).then((r) => r.datos);
}
