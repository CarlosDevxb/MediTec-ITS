/* ============================================================
   SESIÓN · Almacenamiento del token y del usuario autenticado
   (localStorage) + utilidades de cierre y redirección por rol.
   ============================================================ */

const CLAVE_TOKEN = 'meditec:token';
const CLAVE_USUARIO = 'meditec:usuario';

/** Acceso a localStorage solo en navegador (Astro prerenderiza en servidor) */
const enNavegador = () => typeof window !== 'undefined';

export interface UsuarioSesion {
  id: number;
  numeroControl: string;
  nombre: string;
  rol: string;
}

export interface Sesion {
  token: string;
  usuario: UsuarioSesion;
}

export function guardarSesion(token: string, usuario: UsuarioSesion): void {
  if (!enNavegador()) return;
  localStorage.setItem(CLAVE_TOKEN, token);
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
}

export function obtenerSesion(): Sesion | null {
  if (!enNavegador()) return null;
  try {
    const token = localStorage.getItem(CLAVE_TOKEN);
    const usuario = localStorage.getItem(CLAVE_USUARIO);
    if (!token || !usuario) return null;
    return { token, usuario: JSON.parse(usuario) as UsuarioSesion };
  } catch {
    return null;
  }
}

export function obtenerToken(): string | null {
  return enNavegador() ? localStorage.getItem(CLAVE_TOKEN) : null;
}

/** Cierra la sesión y vuelve al login */
export function cerrarSesion(): void {
  if (!enNavegador()) return;
  localStorage.removeItem(CLAVE_TOKEN);
  localStorage.removeItem(CLAVE_USUARIO);
  window.location.href = '/login';
}

/** Panel al que entra cada rol tras iniciar sesión */
export function rutaSegunRol(rol: string): string {
  switch (rol) {
    case 'Administrador':
      return '/admin';
    case 'Paciente':
      return '/paciente';
    // Personal médico, Enfermería y Recepción operan el panel clínico
    default:
      return '/';
  }
}

/** Iniciales para el avatar del perfil */
export function inicialesDe(nombre: string): string {
  return (
    nombre
      .split(' ')
      .filter((parte) => parte.length > 2)
      .map((parte) => parte[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || nombre.slice(0, 2).toUpperCase()
  );
}
