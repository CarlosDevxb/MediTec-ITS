/**
 * Constantes de negocio sobre los roles.
 *
 * Se comparten entre el seeder (`crearAdmin`) y el módulo administrativo, de
 * modo que agregar un rol base o cambiar qué personal necesita cédula se hace
 * en un solo lugar.
 */

/** Roles que el sistema necesita para funcionar */
export const ROLES_BASE = [
  {
    nombre: 'Administrador',
    descripcion: 'Acceso total a la configuración del sistema',
    perfil: 'Administrador',
  },
  {
    nombre: 'Personal médico',
    descripcion: 'Registra consultas, diagnósticos y recetas',
    perfil: 'Personal médico',
  },
  {
    nombre: 'Enfermería',
    descripcion: 'Captura signos vitales y apoya la atención',
    perfil: 'Enfermería',
  },
  {
    nombre: 'Paciente',
    descripcion: 'Consulta su información y gestiona sus citas',
    perfil: 'Paciente',
  },
] as const;

/** Roles cuyo personal requiere ficha en `personal_medico` (cédula y
 * especialidad). Si se agrega una especialidad nueva que también la necesite,
 * se registra aquí. */
export const ROLES_CON_CEDULA: readonly string[] = ['Personal médico', 'Enfermería'];

/** Rol cuya cuenta debe tener además un expediente en la tabla `pacientes` */
export const ROL_PACIENTE = 'Paciente';

/** Rol del personal de enfermería */
export const ROL_ENFERMERIA = 'Enfermería';

/**
 * Especialidad fija del personal de enfermería.
 *
 * La enfermería es un **rol**, no una especialidad del personal médico: su
 * trabajo (intervención de enfermería) lo define el rol. Esta especialidad se
 * asigna sola al dar de alta a alguien con el rol Enfermería y no se ofrece
 * como opción al personal médico, para no duplicar identidades ni permisos.
 */
export const ESPECIALIDAD_ENFERMERIA = 'Enfermería';

/** ¿El rol dado es el de enfermería? */
export function esRolEnfermeria(nombreRol: string): boolean {
  return nombreRol === ROL_ENFERMERIA;
}

/**
 * ¿La cuenta trabaja como enfermería? Lo decide el rol o su perfil heredado:
 * un rol creado con perfil Enfermería (p. ej. "Recepción") también atiende.
 */
export function esDeEnfermeria(nombreRol: string, perfil = ''): boolean {
  return nombreRol === ROL_ENFERMERIA || perfil === ROL_ENFERMERIA;
}

/**
 * Tipos de paciente que requieren carrera.
 *
 * Convención basada en el nombre, igual que `ROLES_CON_CEDULA`: el esquema no
 * tiene una columna que lo indique (el comentario de `cat_tipo_paciente` dice
 * "solo se llena si el tipo de paciente es Alumno"). Si en el futuro se agrega
 * un campo `requiere_carrera` a la tabla, esta lista se sustituye por esa
 * consulta y el frontend deja de necesitarla.
 */
export const TIPOS_CON_CARRERA: readonly string[] = ['Alumno'];

/** ¿El personal necesita cédula profesional? El rol o su perfil heredado */
export function requiereCedula(nombreRol: string, perfil = ''): boolean {
  return ROLES_CON_CEDULA.includes(nombreRol) || ROLES_CON_CEDULA.includes(perfil);
}

/** ¿El rol (o su perfil heredado) abre expediente de paciente? */
export function esRolPaciente(nombreRol: string, perfil = ''): boolean {
  return nombreRol === ROL_PACIENTE || perfil === ROL_PACIENTE;
}

/** ¿El tipo de paciente dado requiere carrera? */
export function requiereCarrera(nombreTipo: string): boolean {
  return TIPOS_CON_CARRERA.includes(nombreTipo);
}
