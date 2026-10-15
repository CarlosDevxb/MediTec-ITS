import { apiFetch } from './api';

/* ============================================================
   ADMINISTRACIÓN · Cliente de la API para roles, usuarios y
   catálogos. Todas las funciones devuelven datos tipados y
   lanzan errores con mensaje en español (ver `api.ts`).
   ============================================================ */

/* ---------------- Roles ---------------- */

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  /** Cuántas cuentas de usuario tienen este rol */
  usuarios: number;
}

export function listarRoles(): Promise<Rol[]> {
  return apiFetch<{ datos: Rol[] }>('/roles').then((r) => r.datos);
}

export function crearRol(datos: { nombre: string; descripcion: string }): Promise<Rol> {
  return apiFetch<{ datos: Rol }>('/roles', {
    method: 'POST',
    body: JSON.stringify(datos),
  }).then((r) => r.datos);
}

export function actualizarRol(
  id: number,
  datos: { nombre: string; descripcion: string },
): Promise<Rol> {
  return apiFetch<{ datos: Rol }>(`/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }).then((r) => r.datos);
}

export function eliminarRol(id: number): Promise<void> {
  return apiFetch<unknown>(`/roles/${id}`, { method: 'DELETE' }).then(() => undefined);
}

/* ---------------- Usuarios ---------------- */

export interface Usuario {
  id: number;
  rolId: number;
  rol: string;
  numeroControl: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  /** Fecha en formato AAAA-MM-DD */
  fechaNacimiento: string;
  genero: 'Masculino' | 'Femenino' | 'Otro';
  estatus: 'Activo' | 'Inactivo';
  /** Solo presente cuando el rol requiere cédula */
  cedula?: string;
  especialidad?: string;
  /* Expediente de paciente (tabla `pacientes`) */
  pacienteId?: number;
  tipoPacienteId?: number;
  tipoPaciente?: string;
  carreraId?: number;
  carrera?: string;
}

export interface DatosUsuario {
  nombre: string;
  numeroControl: string;
  correo: string;
  telefono?: string;
  fechaNacimiento: string;
  genero: 'Masculino' | 'Femenino' | 'Otro';
  rolId: number;
  estatus?: boolean;
  cedula?: string;
  especialidad?: string;
  /** Obligatorios cuando el rol es Paciente; la carrera solo en tipos que la exigen */
  tipoPacienteId?: number;
  carreraId?: number;
  /** Obligatoria solo al dar de alta */
  contrasena?: string;
}

export function listarUsuarios(): Promise<Usuario[]> {
  return apiFetch<{ datos: Usuario[] }>('/usuarios').then((r) => r.datos);
}

export function obtenerUsuario(id: number): Promise<Usuario> {
  return apiFetch<{ datos: Usuario }>(`/usuarios/${id}`).then((r) => r.datos);
}

export function crearUsuario(datos: DatosUsuario): Promise<Usuario> {
  return apiFetch<{ datos: Usuario }>('/usuarios', {
    method: 'POST',
    body: JSON.stringify(datos),
  }).then((r) => r.datos);
}

export function actualizarUsuario(id: number, datos: DatosUsuario): Promise<Usuario> {
  return apiFetch<{ datos: Usuario }>(`/usuarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }).then((r) => r.datos);
}

/** Habilita o deshabilita una cuenta (baja lógica) */
export function cambiarEstatusUsuario(id: number, activo: boolean): Promise<Usuario> {
  return apiFetch<{ datos: Usuario }>(`/usuarios/${id}/estatus`, {
    method: 'PATCH',
    body: JSON.stringify({ estatus: activo }),
  }).then((r) => r.datos);
}

export function eliminarUsuario(id: number): Promise<void> {
  return apiFetch<unknown>(`/usuarios/${id}`, { method: 'DELETE' }).then(() => undefined);
}

/* ---------------- Catálogos ---------------- */

export interface CampoCandidato {
  columna: string;
  etiqueta: string;
  placeholder: string;
  maximo: number;
  hint?: string;
}

export interface Catalogo {
  id: string;
  titulo: string;
  descripcion: string;
  singular: string;
  articulo: 'el' | 'la';
  campos: CampoCandidato[];
  total: number;
}

export interface ValorCatalogo {
  id: number;
  nombre: string;
  abreviatura?: string;
}

export function listarCatalogos(): Promise<Catalogo[]> {
  return apiFetch<{ datos: Catalogo[] }>('/catalogos').then((r) => r.datos);
}

export function listarValoresCatalogo(catalogoId: string): Promise<ValorCatalogo[]> {
  return apiFetch<{ datos: ValorCatalogo[] }>(`/catalogos/${catalogoId}`).then((r) => r.datos);
}

/** Tipos de paciente: se piden al dar de alta una cuenta con rol Paciente */
export function listarTiposPaciente(): Promise<ValorCatalogo[]> {
  return listarValoresCatalogo('tipo_paciente');
}

/** Carreras: se asignan a los pacientes cuyo tipo lo requiere (Alumno) */
export function listarCarreras(): Promise<ValorCatalogo[]> {
  return listarValoresCatalogo('carreras');
}

export function crearValorCatalogo(
  catalogoId: string,
  datos: Record<string, string>,
): Promise<ValorCatalogo> {
  return apiFetch<{ datos: ValorCatalogo }>(`/catalogos/${catalogoId}`, {
    method: 'POST',
    body: JSON.stringify(datos),
  }).then((r) => r.datos);
}

export function actualizarValorCatalogo(
  catalogoId: string,
  id: number,
  datos: Record<string, string>,
): Promise<ValorCatalogo> {
  return apiFetch<{ datos: ValorCatalogo }>(`/catalogos/${catalogoId}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }).then((r) => r.datos);
}

export function eliminarValorCatalogo(catalogoId: string, id: number): Promise<void> {
  return apiFetch<unknown>(`/catalogos/${catalogoId}/${id}`, {
    method: 'DELETE',
  }).then(() => undefined);
}
