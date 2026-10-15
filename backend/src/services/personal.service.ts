import pool from '../db/pool';
import { errorNoEncontrado, errorValidacion } from '../utils/erroresHttp';

/**
 * Capa de datos del personal con ficha clínica (tabla `personal_medico`).
 *
 * Solo existen fichas para los roles con cédula (`Personal médico` y
 * `Enfermería`, ver `config/roles.ts`): se crean solas al dar de alta esas
 * cuentas desde la sección Usuarios. Aquí solo se consultan; nunca se
 * insertan a mano.
 */

export interface PersonalMedico {
  /** id_personal_medico: es el que referencian los horarios */
  id: number;
  nombre: string;
  especialidad: string;
  cedula: string;
}

/** Lista el personal activo (cuentas habilitadas) ordenado por nombre */
export async function listarPersonal(): Promise<PersonalMedico[]> {
  const [filas] = await pool.query(
    `SELECT pm.id_personal_medico AS id,
            u.nombre             AS nombre,
            pm.especialidad      AS especialidad,
            pm.cedula            AS cedula
       FROM personal_medico pm
       JOIN usuarios u ON u.id_usuarios = pm.usuarios_id_usuarios
      WHERE u.estatus = 1
      ORDER BY u.nombre ASC`,
  );

  return (filas as Array<Record<string, unknown>>).map((fila) => ({
    id: Number(fila['id']),
    nombre: String(fila['nombre'] ?? ''),
    especialidad: String(fila['especialidad'] ?? ''),
    cedula: String(fila['cedula'] ?? ''),
  }));
}

/** Comprueba que la ficha de personal exista y pertenezca a una cuenta activa */
export async function asegurarPersonalActivo(personalMedicoId: number): Promise<void> {
  const [filas] = await pool.query(
    `SELECT pm.id_personal_medico
       FROM personal_medico pm
       JOIN usuarios u ON u.id_usuarios = pm.usuarios_id_usuarios
      WHERE pm.id_personal_medico = ? AND u.estatus = 1
      LIMIT 1`,
    [personalMedicoId],
  );
  if (!(filas as Array<Record<string, unknown>>)[0]) {
    throw errorValidacion('Ese miembro del personal no existe o su cuenta está deshabilitada.', [
      { campo: 'personalMedicoId', mensaje: 'Selecciona a alguien del personal activo.' },
    ]);
  }
}

/** Busca una ficha de personal por id (para armar respuestas y mensajes) */
export async function buscarPersonal(personalMedicoId: number): Promise<PersonalMedico> {
  const [filas] = await pool.query(
    `SELECT pm.id_personal_medico AS id,
            u.nombre             AS nombre,
            pm.especialidad      AS especialidad,
            pm.cedula            AS cedula
       FROM personal_medico pm
       JOIN usuarios u ON u.id_usuarios = pm.usuarios_id_usuarios
      WHERE pm.id_personal_medico = ?
      LIMIT 1`,
    [personalMedicoId],
  );
  const fila = (filas as Array<Record<string, unknown>>)[0];
  if (!fila) throw errorNoEncontrado('El miembro del personal no existe.');
  return {
    id: Number(fila['id']),
    nombre: String(fila['nombre'] ?? ''),
    especialidad: String(fila['especialidad'] ?? ''),
    cedula: String(fila['cedula'] ?? ''),
  };
}
