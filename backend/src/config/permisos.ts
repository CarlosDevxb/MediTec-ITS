/**
 * Permisos del sistema por panel de rol.
 *
 * Un rol declara un **perfil base** (Administrador, Personal médico,
 * Enfermería o Paciente) que define su panel y su identidad clínica, y
 * elige de forma **explícita** las acciones que SÍ puede realizar (tabla
 * `rol_permisos`): no hay herencia. Un rol sin permisos no puede hacer nada
 * fuera de su cuenta (inicio y configuración propia).
 *
 * Cada acción pertenece a uno o varios perfiles: eso indica en qué panel
 * vive su interfaz y valida que el rol no tenga permisos sin pantalla donde
 * ejercerlos. Esta lista es la fuente de verdad: el servidor exige cada
 * acción en sus endpoints sensibles (middleware `requerirAccion`) y la
 * interfaz solo monta las secciones concedidas.
 */

/** Perfiles base: definen el panel, la identidad clínica y el alcance de las acciones */
export const PERFILES = [
  'Administrador',
  'Personal médico',
  'Enfermería',
  'Paciente',
] as const;

export type Perfil = (typeof PERFILES)[number];

/** Acción con permiso propio: una capacidad concreta del sistema */
export interface AccionPermiso {
  /** Clave que se guarda en `rol_permisos.accion` */
  id: string;
  /** Nombre mostrado en la interfaz */
  etiqueta: string;
  /** Qué permite hacer al rol */
  descripcion: string;
  /** Perfiles en cuyos paneles vive esta acción */
  perfiles: readonly Perfil[];
}

/** Catálogo de acciones con permiso propio (agrupadas por perfil en la interfaz) */
export const ACCIONES: readonly AccionPermiso[] = [
  /* ---- Perfil Administrador ---- */
  {
    id: 'usuarios',
    etiqueta: 'Gestión de usuarios',
    descripcion: 'Dar de alta, editar, habilitar o deshabilitar cuentas.',
    perfiles: ['Administrador'],
  },
  {
    id: 'restablecer_contrasenas',
    etiqueta: 'Restablecer contraseñas',
    descripcion: 'Generar contraseñas temporales para las cuentas.',
    perfiles: ['Administrador'],
  },
  {
    id: 'roles',
    etiqueta: 'Gestión de roles',
    descripcion: 'Crear, editar y eliminar roles del sistema.',
    perfiles: ['Administrador'],
  },
  {
    id: 'catalogos',
    etiqueta: 'Gestión de catálogos',
    descripcion: 'Administrar alergias, enfermedades, unidades, tipos y carreras.',
    perfiles: ['Administrador'],
  },
  {
    id: 'horarios',
    etiqueta: 'Gestión de horarios',
    descripcion: 'Crear y editar los turnos del personal.',
    perfiles: ['Administrador'],
  },
  {
    id: 'eliminar_horarios',
    etiqueta: 'Eliminar turnos',
    descripcion: 'Dar de baja turnos del calendario del personal.',
    perfiles: ['Administrador'],
  },
  {
    id: 'medicamentos',
    etiqueta: 'Inventario de medicamentos',
    descripcion: 'Administrar el inventario y su importación desde Excel.',
    perfiles: ['Administrador'],
  },
  {
    id: 'reportes',
    etiqueta: 'Reportes',
    descripcion: 'Consultar y descargar los reportes del sistema.',
    perfiles: ['Administrador'],
  },

  /* ---- Perfiles de atención ---- */
  {
    id: 'consultas',
    etiqueta: 'Registrar consultas',
    descripcion: 'Atender consultas directas o por cita agendada.',
    perfiles: ['Personal médico', 'Enfermería'],
  },
  {
    id: 'historial',
    etiqueta: 'Historial de consultas',
    descripcion: 'Consultar el historial de atenciones propias.',
    perfiles: ['Personal médico'],
  },
  {
    id: 'pacientes',
    etiqueta: 'Pacientes y expedientes',
    descripcion: 'Dar de alta pacientes y consultar sus expedientes.',
    perfiles: ['Personal médico', 'Enfermería'],
  },
  {
    id: 'citas',
    etiqueta: 'Agenda de citas',
    descripcion: 'Agendar, reagendar, confirmar o cancelar citas.',
    perfiles: ['Personal médico', 'Enfermería', 'Paciente'],
  },
  {
    id: 'planes',
    etiqueta: 'Planes alimenticios',
    descripcion: 'Crear y actualizar planes de nutrición.',
    perfiles: ['Personal médico'],
  },
];

/** ¿El valor es un perfil base del sistema? */
export function esPerfil(valor: string): valor is Perfil {
  return (PERFILES as readonly string[]).includes(valor);
}

/** Acciones disponibles en un perfil (las que el rol puede tener) */
export function accionesDe(perfil: Perfil): AccionPermiso[] {
  return ACCIONES.filter((accion) => accion.perfiles.includes(perfil));
}

/** ¿El perfil puede ejercer esta acción? */
export function elPerfilTieneAccion(perfil: string, accion: string): boolean {
  return esPerfil(perfil) && accionesDe(perfil).some((a) => a.id === accion);
}

/** Etiqueta de una acción (para mensajes de error) */
export function etiquetaDeAccion(accion: string): string {
  return ACCIONES.find((a) => a.id === accion)?.etiqueta ?? accion;
}
