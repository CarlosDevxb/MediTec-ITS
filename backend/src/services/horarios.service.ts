import pool from '../db/pool';
import { errorConflicto, errorNoEncontrado } from '../utils/erroresHttp';
import { NOMBRES_DIA, type DatosHorarios, type DatosHorario } from '../validaciones/horarios.validacion';
import { asegurarPersonalActivo } from './personal.service';

/**
 * Capa de datos de los horarios del personal (tabla `horarios`).
 *
 * Reglas de negocio del módulo Operación:
 * - La clínica solo opera de lunes a viernes (días 1 a 5 del esquema).
 * - Un turno es **duplicado exacto** cuando coincide personal, día y rango de
 *   horas con uno ya existente; ese caso se rechaza con 409. Distintas personas
 *   pueden compartir el mismo tramo (turnos simultáneos) y una misma persona
 *   puede tener tramos distintos el mismo día: solo lo exactamente igual se
 *   bloquea.
 * - El alta es múltiple: se recibe la lista de días y se crea un turno por día
 *   dentro de una transacción, de modo que o se crean todos o no se crean.
 *
 * SQL parametrizado: ningún valor de la petición se interpoliza en la consulta.
 */

export interface Horario {
  id: number;
  personalMedicoId: number;
  /** Nombre de la cuenta (tabla `usuarios`) */
  personal: string;
  especialidad: string;
  /** 1=Lunes … 5=Viernes */
  diaSemana: number;
  /** Formato HH:mm */
  horaInicio: string;
  /** Formato HH:mm */
  horaFin: string;
}

/** SELECT común: trae el turno con el personal al que pertenece */
const COLUMNAS = `
  SELECT h.id_horario                       AS id,
         h.personal_medico_id_personal_medico AS personalMedicoId,
         u.nombre                          AS personal,
         pm.especialidad                   AS especialidad,
         h.dia_semana                      AS diaSemana,
         h.hora_inicio                     AS horaInicio,
         h.hora_fin                        AS horaFin
    FROM horarios h
    JOIN personal_medico pm ON pm.id_personal_medico = h.personal_medico_id_personal_medico
    JOIN usuarios u ON u.id_usuarios = pm.usuarios_id_usuarios`;

/**
 * Normaliza un valor TIME de MySQL al formato HH:mm.
 * mysql2 devuelve TIME como cadena ('08:00:00'), pero se cubre también el caso
 * de Date por si el conector cambia de comportamiento.
 */
function aHora(valor: unknown): string {
  if (valor instanceof Date) {
    return `${String(valor.getHours()).padStart(2, '0')}:${String(valor.getMinutes()).padStart(2, '0')}`;
  }
  return String(valor ?? '').slice(0, 5);
}

/** Convierte una fila de MySQL al modelo de la API */
function aHorario(fila: Record<string, unknown>): Horario {
  return {
    id: Number(fila['id']),
    personalMedicoId: Number(fila['personalMedicoId']),
    personal: String(fila['personal'] ?? ''),
    especialidad: String(fila['especialidad'] ?? ''),
    diaSemana: Number(fila['diaSemana']),
    horaInicio: aHora(fila['horaInicio']),
    horaFin: aHora(fila['horaFin']),
  };
}

/** Lista todos los turnos ordenados por día y hora de inicio */
export async function listarHorarios(): Promise<Horario[]> {
  const [filas] = await pool.query(
    `${COLUMNAS} ORDER BY h.dia_semana ASC, h.hora_inicio ASC, u.nombre ASC`,
  );
  return (filas as Array<Record<string, unknown>>).map(aHorario);
}

/** Busca un turno por id (o null si no existe) */
export async function buscarHorario(id: number): Promise<Horario | null> {
  const [filas] = await pool.query(`${COLUMNAS} WHERE h.id_horario = ? LIMIT 1`, [id]);
  const fila = (filas as Array<Record<string, unknown>>)[0];
  return fila ? aHorario(fila) : null;
}

/**
 * Crea un turno por cada día indicado (alta múltiple).
 * Todos los días se validan antes de escribir y la inserción es transaccional.
 */
export async function crearHorarios(datos: DatosHorarios): Promise<Horario[]> {
  await asegurarPersonalActivo(datos.personalMedicoId);

  // Se valida todo antes de tocar la base: si un día ya tiene ese turno,
  // no se crea ninguno (ni siquiera parcialmente)
  for (const dia of datos.dias) {
    await asegurarTurnoLibre(datos.personalMedicoId, dia, datos.horaInicio, datos.horaFin);
  }

  const conexion = await pool.getConnection();
  const ids: number[] = [];
  try {
    await conexion.beginTransaction();
    for (const dia of datos.dias) {
      const [resultado] = await conexion.query(
        'INSERT INTO horarios (personal_medico_id_personal_medico, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)',
        [datos.personalMedicoId, dia, datos.horaInicio, datos.horaFin],
      );
      ids.push(Number((resultado as { insertId: number }).insertId));
    }
    await conexion.commit();
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }

  // Se devuelven ya con el personal resuelto, como en el resto del módulo
  const creados: Horario[] = [];
  for (const id of ids) {
    const turno = await buscarHorario(id);
    if (turno) creados.push(turno);
  }
  return creados;
}

/** Actualiza un turno existente (personal, día u horas) */
export async function actualizarHorario(id: number, datos: DatosHorario): Promise<Horario> {
  const actual = await buscarHorario(id);
  if (!actual) throw errorNoEncontrado('El turno no existe.');

  await asegurarPersonalActivo(datos.personalMedicoId);
  await asegurarTurnoLibre(
    datos.personalMedicoId,
    datos.diaSemana,
    datos.horaInicio,
    datos.horaFin,
    id,
  );

  await pool.query(
    'UPDATE horarios SET personal_medico_id_personal_medico = ?, dia_semana = ?, hora_inicio = ?, hora_fin = ? WHERE id_horario = ?',
    [datos.personalMedicoId, datos.diaSemana, datos.horaInicio, datos.horaFin, id],
  );

  const actualizado = await buscarHorario(id);
  if (!actualizado) throw errorNoEncontrado('El turno no existe.');
  return actualizado;
}

/** Elimina un turno del calendario */
export async function eliminarHorario(id: number): Promise<Horario> {
  const actual = await buscarHorario(id);
  if (!actual) throw errorNoEncontrado('El turno no existe.');

  await pool.query('DELETE FROM horarios WHERE id_horario = ?', [id]);
  return actual;
}

/**
 * Rechaza los duplicados exactos: mismo personal, mismo día y mismo rango de
 * horas. `excluirId` evita que un turno se confirme consigo mismo al editar.
 */
async function asegurarTurnoLibre(
  personalMedicoId: number,
  diaSemana: number,
  horaInicio: string,
  horaFin: string,
  excluirId?: number,
): Promise<void> {
  const [filas] = await pool.query(
    excluirId
      ? `SELECT id_horario FROM horarios
          WHERE personal_medico_id_personal_medico = ? AND dia_semana = ?
            AND hora_inicio = ? AND hora_fin = ?
            AND id_horario <> ?
          LIMIT 1`
      : `SELECT id_horario FROM horarios
          WHERE personal_medico_id_personal_medico = ? AND dia_semana = ?
            AND hora_inicio = ? AND hora_fin = ?
          LIMIT 1`,
    excluirId
      ? [personalMedicoId, diaSemana, horaInicio, horaFin, excluirId]
      : [personalMedicoId, diaSemana, horaInicio, horaFin],
  );

  if ((filas as Array<Record<string, unknown>>)[0]) {
    const diaTexto = NOMBRES_DIA[diaSemana - 1] ?? `día ${diaSemana}`;
    throw errorConflicto(
      `Ese turno ya existe el ${diaTexto.toLowerCase()} de ${horaInicio} a ${horaFin}. Quita ese día o cambia el horario.`,
    );
  }
}
