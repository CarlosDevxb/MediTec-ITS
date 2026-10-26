/**
 * Constantes de negocio sobre los roles.
 *
 * Se comparten entre el seeder (`crearAdmin`) y el módulo administrativo, de
 * modo que agregar un rol base o cambiar qué personal necesita cédula se hace
 * en un solo lugar.
 */

/** Roles que el sistema necesita para funcionar */
export const ROLES_BASE = [
  { nombre: 'Administrador', descripcion: 'Acceso total a la configuración del sistema' },
  { nombre: 'Personal médico', descripcion: 'Registra consultas, diagnósticos y recetas' },
  { nombre: 'Enfermería', descripcion: 'Captura signos vitales y apoya la atención' },
  { nombre: 'Paciente', descripcion: 'Consulta su información y gestiona sus citas' },
] as const;

/** Roles cuyo personal requiere ficha en `personal_medico` (cédula y
 * especialidad). Si se agrega una especialidad nueva que también la necesite,
 * se registra aquí. */
export const ROLES_CON_CEDULA: readonly string[] = ['Personal médico', 'Enfermería'];

/** Rol cuya cuenta debe tener además un expediente en la tabla `pacientes` */
export const ROL_PACIENTE = 'Paciente';

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

/** ¿El nombre de rol dado exige cédula profesional? */
export function requiereCedula(nombreRol: string): boolean {
  return ROLES_CON_CEDULA.includes(nombreRol);
}

/** ¿El rol dado es el de paciente? */
export function esRolPaciente(nombreRol: string): boolean {
  return nombreRol === ROL_PACIENTE;
}

/** ¿El tipo de paciente dado requiere carrera? */
export function requiereCarrera(nombreTipo: string): boolean {
  return TIPOS_CON_CARRERA.includes(nombreTipo);
}
