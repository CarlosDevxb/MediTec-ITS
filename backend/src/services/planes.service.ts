import type { PoolConnection } from 'mysql2/promise';
import pool from '../db/pool';
import { errorNoEncontrado, errorValidacion } from '../utils/erroresHttp';
import { fechaISO, hoyISO } from '../utils/fechas';
import { asegurarPacienteExiste } from './pacientes.service';
import type {
  DatosCrearPlan,
  DatosActualizarPlan,
  DatosEstatusPlan,
} from '../validaciones/planes.validacion';

/**
 * Capa de datos de los planes alimenticios (tabla `plan_alimenticio`).
 *
 * El plan lo crea el personal de nutrición para un paciente y registra la
 * dieta, las calorías diarias y su periodo. El estatus inicial se calcula
 * con las fechas ('Por iniciar' o 'Vigente') y luego avanza a 'Finalizado' o
 * 'Cancelado' por decisión del personal.
 *
 * SQL parametrizado: ningún valor de la petición se interpoliza en la consulta.
 */

export interface PlanAlimenticio {
  id: number;
  personalMedicoId: number;
  /** Nombre de quien lleva el plan */
  personal: string;
  pacienteId: number;
  paciente: string;
  numeroControl: string;
  /** AAAA-MM-DD */
  fechaInicio: string;
  /** AAAA-MM-DD */
  fechaFin: string;
  descripcionDieta: string;
  caloriasDiarias: number;
  /** 'Por iniciar' | 'Vigente' | 'Finalizado' | 'Cancelado' */
  estatus: string;
}

const COLUMNAS = `
  SELECT pa.id_plan                            AS id,
         pa.personal_medico_id_personal_medico AS personalMedicoId,
         u_per.nombre                          AS personal,
         pa.pacientes_id_paciente              AS pacienteId,
         u_pac.nombre                          AS paciente,
         u_pac.numero_control                  AS numeroControl,
         pa.fecha_inicio                       AS fechaInicio,
         pa.fecha_fin                          AS fechaFin,
         pa.descripcion_dieta                  AS descripcionDieta,
         pa.calorias_diarias                   AS caloriasDiarias,
         pa.estatus                            AS estatus
    FROM plan_alimenticio pa
    JOIN personal_medico pm ON pm.id_personal_medico = pa.personal_medico_id_personal_medico
    JOIN usuarios u_per ON u_per.id_usuarios = pm.usuarios_id_usuarios
    JOIN pacientes p ON p.id_paciente = pa.pacientes_id_paciente
    JOIN usuarios u_pac ON u_pac.id_usuarios = p.usuarios_id_usuarios`;

function aPlan(fila: Record<string, unknown>): PlanAlimenticio {
  return {
    id: Number(fila['id']),
    personalMedicoId: Number(fila['personalMedicoId']),
    personal: String(fila['personal'] ?? ''),
    pacienteId: Number(fila['pacienteId']),
    paciente: String(fila['paciente'] ?? ''),
    numeroControl: String(fila['numeroControl'] ?? ''),
    fechaInicio: fechaISO(fila['fechaInicio']),
    fechaFin: fechaISO(fila['fechaFin']),
    descripcionDieta: String(fila['descripcionDieta'] ?? ''),
    caloriasDiarias: Number(fila['caloriasDiarias']),
    estatus: String(fila['estatus'] ?? ''),
  };
}

export interface FiltroPlanes {
  pacienteId?: number;
  personalMedicoId?: number;
}

/** Lista los planes (opcionalmente los de un paciente o de un profesional) */
export async function listarPlanes(filtro: FiltroPlanes = {}): Promise<PlanAlimenticio[]> {
  const condiciones: string[] = [];
  const parametros: unknown[] = [];
  if (filtro.pacienteId) {
    condiciones.push('pa.pacientes_id_paciente = ?');
    parametros.push(filtro.pacienteId);
  }
  if (filtro.personalMedicoId) {
    condiciones.push('pa.personal_medico_id_personal_medico = ?');
    parametros.push(filtro.personalMedicoId);
  }
  const where = condiciones.length > 0 ? ` WHERE ${condiciones.join(' AND ')}` : '';

  const [filas] = await pool.query(
    `${COLUMNAS}${where} ORDER BY pa.fecha_inicio DESC, pa.id_plan DESC`,
    parametros,
  );
  return (filas as Array<Record<string, unknown>>).map(aPlan);
}

/** Busca un plan por id (o null si no existe) */
export async function buscarPlan(id: number): Promise<PlanAlimenticio | null> {
  const [filas] = await pool.query(`${COLUMNAS} WHERE pa.id_plan = ? LIMIT 1`, [id]);
  const fila = (filas as Array<Record<string, unknown>>)[0];
  return fila ? aPlan(fila) : null;
}

/**
 * Crea un plan alimenticio para un paciente. El estatus inicial se decide
 * con el periodo: 'Vigente' si ya empezó, 'Por iniciar' en otro caso.
 */
export async function crearPlan(
  personalMedicoId: number,
  datos: DatosCrearPlan,
): Promise<PlanAlimenticio> {
  await asegurarPacienteExiste(datos.pacienteId);
  const id = await insertarPlanEn(pool, personalMedicoId, datos);

  const plan = await buscarPlan(id);
  if (!plan) throw errorNoEncontrado('No se pudo recuperar el plan recién creado.');
  return plan;
}

/**
 * Inserta un plan alimenticio en la conexión indicada (para usar dentro de la
 * transacción de una sesión de nutrición, que registra su plan junto con la
 * consulta) y devuelve su id.
 */
export async function insertarPlanEn(
  conexion: PoolConnection | typeof pool,
  personalMedicoId: number,
  datos: DatosCrearPlan,
): Promise<number> {
  const estatus = datos.fechaInicio <= hoyISO() ? 'Vigente' : 'Por iniciar';
  const [resultado] = await conexion.query(
    `INSERT INTO plan_alimenticio
       (personal_medico_id_personal_medico, pacientes_id_paciente, fecha_inicio, fecha_fin,
        descripcion_dieta, calorias_diarias, estatus)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      personalMedicoId,
      datos.pacienteId,
      datos.fechaInicio,
      datos.fechaFin,
      datos.descripcionDieta,
      datos.caloriasDiarias,
      estatus,
    ],
  );
  return Number((resultado as { insertId: number }).insertId);
}

/** Actualiza la dieta, las calorías o el periodo de un plan */
export async function actualizarPlan(
  id: number,
  datos: DatosActualizarPlan,
): Promise<PlanAlimenticio> {
  const actual = await buscarPlan(id);
  if (!actual) throw errorNoEncontrado('El plan alimenticio no existe.');

  await pool.query(
    `UPDATE plan_alimenticio
        SET fecha_inicio = ?, fecha_fin = ?, descripcion_dieta = ?, calorias_diarias = ?
      WHERE id_plan = ?`,
    [
      datos.fechaInicio,
      datos.fechaFin,
      datos.descripcionDieta,
      datos.caloriasDiarias,
      id,
    ],
  );

  const actualizado = await buscarPlan(id);
  if (!actualizado) throw errorNoEncontrado('El plan alimenticio no existe.');
  return actualizado;
}

/** Cambia el estatus del plan (vigente, finalizado o cancelado) */
export async function cambiarEstatusPlan(
  id: number,
  datos: DatosEstatusPlan,
): Promise<PlanAlimenticio> {
  const actual = await buscarPlan(id);
  if (!actual) throw errorNoEncontrado('El plan alimenticio no existe.');

  await pool.query('UPDATE plan_alimenticio SET estatus = ? WHERE id_plan = ?', [
    datos.estatus,
    id,
  ]);

  const actualizado = await buscarPlan(id);
  if (!actualizado) throw errorNoEncontrado('El plan alimenticio no existe.');
  return actualizado;
}

/** Mensaje estándar para planes inexistentes (uso en controladores) */
export function errorPlanNoEncontrado(): Error {
  return errorNoEncontrado('El plan alimenticio no existe.');
}

/** Evita que se cree un plan sin datos coherentes (uso defensivo) */
export function asegurarPeriodoCoherente(fechaInicio: string, fechaFin: string): void {
  if (fechaFin < fechaInicio) {
    throw errorValidacion('El periodo del plan no es coherente.', [
      { campo: 'fechaFin', mensaje: 'La fecha de fin no puede ser anterior a la de inicio.' },
    ]);
  }
}
