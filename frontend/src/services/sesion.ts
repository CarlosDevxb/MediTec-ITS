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
  /** Especialidad del personal médico (decide su portal) */
  especialidad?: string;
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

/** Panel al que entra cada rol (y especialidad) tras iniciar sesión */
export function rutaSegunRol(rol: string, especialidad?: string): string {
  switch (rol) {
    case 'Administrador':
      return '/admin';
    case 'Paciente':
      return '/paciente';
    case 'Personal médico': {
      // Dentro del personal médico, cada especialidad tiene su portal
      const esp = (especialidad ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      if (esp.includes('nutri')) return '/nutricion';
      if (esp.includes('odontolog')) return '/odontologia';
      return '/doctor';
    }
    case 'Enfermería':
      return '/enfermeria';
    // Recepción opera de momento el panel de enfermería (altas y agenda);
    // tendrá su propio panel cuando exista la agenda pública
    default:
      return '/enfermeria';
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
