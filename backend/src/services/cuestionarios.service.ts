import type { PoolConnection } from 'mysql2/promise';
import pool from '../db/pool';
import { errorValidacion } from '../utils/erroresHttp';
import { asegurarPacienteExiste, buscarPaciente, type ExpedientePaciente } from './pacientes.service';
import type { DatosCuestionario } from '../validaciones/cuestionario.validacion';

/**
 * Capa de datos del cuestionario de salud inicial
 * (tablas `cuestionario_salud`, `paciente_alergias`, `paciente_enfermedades`,
 * `cat_alergias` y `cat_enfermedades`).
 *
 * Reglas:
 * - El cuestionario es **único por paciente**: al guardar se crea o se
 *   actualiza la misma fila (nunca hay dos).
 * - Las alergias y las enfermedades crónicas que no existan en sus catálogos
 *   se dan de alta al terminar el cuestionario y se vinculan al paciente,
 *   para que aparezcan como alertas en el flujo de atención.
 * - El vínculo se sincroniza: los nombres capturados quedan asociados y los
 *   que ya no se mencionan se desvinculan (el catálogo nunca se borra).
 */

/** Especificación de una lista de conceptos (alergias o enfermedades) */
interface ConceptoCatalogo {
  /** Tabla puente del paciente */
  tablaPuente: string;
  /** Columna del paciente en la tabla puente */
  columnaPaciente: string;
  /** Columna del catálogo en la tabla puente */
  columnaCatalogo: string;
  /** Catálogo de origen */
  tablaCatalogo: string;
  /** Columna id del catálogo */
  columnaId: string;
}

const ALERGIAS: ConceptoCatalogo = {
  tablaPuente: 'paciente_alergias',
  columnaPaciente: 'pacientes_id_paciente',
  columnaCatalogo: 'cat_alergias_id_alergia',
  tablaCatalogo: 'cat_alergias',
  columnaId: 'id_alergia',
};

const ENFERMEDADES: ConceptoCatalogo = {
  tablaPuente: 'paciente_enfermedades',
  columnaPaciente: 'pacientes_id_paciente',
  columnaCatalogo: 'cat_enfermedades_id_enfermedad',
  tablaCatalogo: 'cat_enfermedades',
  columnaId: 'id_enfermedad',
};

/**
 * Devuelve el id de un concepto del catálogo, dándolo de alta si no existe.
 * Usa `INSERT IGNORE` porque `nombre` es único: si otra persona lo registró
 * al mismo tiempo, simplemente se recupera su id.
 */
async function idDeConcepto(
  conexion: PoolConnection,
  concepto: ConceptoCatalogo,
  nombre: string,
): Promise<number> {
  const buscar = async (): Promise<number | null> => {
    const [filas] = await conexion.query(
      `SELECT ${concepto.columnaId} AS id FROM ${concepto.tablaCatalogo} WHERE nombre = ? LIMIT 1`,
      [nombre],
    );
    const fila = (filas as Array<Record<string, unknown>>)[0];
    return fila ? Number(fila['id']) : null;
  };

  const existente = await buscar();
  if (existente !== null) return existente;

  await conexion.query(`INSERT IGNORE INTO ${concepto.tablaCatalogo} (nombre) VALUES (?)`, [
    nombre,
  ]);
  const creado = await buscar();
  if (creado === null) {
    throw errorValidacion(`No se pudo registrar "${nombre}" en el catálogo.`);
  }
  return creado;
}

/** Sincroniza los vínculos del paciente con los nombres capturados */
async function sincronizarVinculos(
  conexion: PoolConnection,
  concepto: ConceptoCatalogo,
  pacienteId: number,
  nombres: string[],
): Promise<void> {
  await conexion.query(
    `DELETE FROM ${concepto.tablaPuente} WHERE ${concepto.columnaPaciente} = ?`,
    [pacienteId],
  );

  // Se normalizan y evitan duplicados (sin distinguir mayúsculas)
  const unicos = [...new Map(nombres.map((n) => [n.trim().toLowerCase(), n.trim()])).values()];

  for (const nombre of unicos) {
    const id = await idDeConcepto(conexion, concepto, nombre);
    await conexion.query(
      `INSERT INTO ${concepto.tablaPuente} (${concepto.columnaPaciente}, ${concepto.columnaCatalogo})
       VALUES (?, ?)`,
      [pacienteId, id],
    );
  }
}

/**
 * Guarda el cuestionario de salud del paciente (creación o actualización)
 * y sincroniza sus alergias y enfermedades crónicas. Devuelve el expediente
 * actualizado, con el cuestionario y las alertas ya reflejadas.
 */
export async function guardarCuestionario(
  pacienteId: number,
  datos: DatosCuestionario,
): Promise<ExpedientePaciente> {
  await asegurarPacienteExiste(pacienteId);

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();

    /* ---- 1) Cuestionario único por paciente (crea o actualiza) ---- */
    await conexion.query(
      `INSERT INTO cuestionario_salud
         (pacientes_id_paciente, peso, talla, medicamentos_actuales, cirugias_previas,
          alergia_otra, enfermedad_otra, actividad_fisica, tabaco, alcohol, horas_sueno,
          sintomas_actuales, comentarios, fecha_llenado, estatus)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'Completado')
       ON DUPLICATE KEY UPDATE
         peso = VALUES(peso),
         talla = VALUES(talla),
         medicamentos_actuales = VALUES(medicamentos_actuales),
         cirugias_previas = VALUES(cirugias_previas),
         alergia_otra = VALUES(alergia_otra),
         enfermedad_otra = VALUES(enfermedad_otra),
         actividad_fisica = VALUES(actividad_fisica),
         tabaco = VALUES(tabaco),
         alcohol = VALUES(alcohol),
         horas_sueno = VALUES(horas_sueno),
         sintomas_actuales = VALUES(sintomas_actuales),
         comentarios = VALUES(comentarios),
         fecha_llenado = NOW(),
         estatus = 'Completado'`,
      [
        pacienteId,
        datos.peso,
        datos.talla,
        datos.medicamentosActuales?.trim() || null,
        datos.cirugiasPrevias?.trim() || null,
        datos.alergiaOtra?.trim() || null,
        datos.enfermedadOtra?.trim() || null,
        datos.actividadFisica,
        datos.tabaco,
        datos.alcohol,
        datos.horasSueno ?? null,
        datos.sintomasActuales?.trim() || null,
        datos.comentarios?.trim() || null,
      ],
    );

    /* ---- 1b) Tipo de sangre: vive en el expediente (tabla `pacientes`) ----
       Solo se actualiza si se indicó: dejarlo "Sin registrar" conserva el
       valor que ya tenga el expediente. */
    if (datos.tipoSangre?.trim()) {
      await conexion.query('UPDATE pacientes SET tipo_sangre = ? WHERE id_paciente = ?', [
        datos.tipoSangre.trim(),
        pacienteId,
      ]);
    }

    /* ---- 2) Alergias y enfermedades: catálogos + vínculos del paciente ---- */
    await sincronizarVinculos(conexion, ALERGIAS, pacienteId, datos.alergias ?? []);
    await sincronizarVinculos(conexion, ENFERMEDADES, pacienteId, datos.enfermedades ?? []);

    await conexion.commit();
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }

  const expediente = await buscarPaciente(pacienteId);
  if (!expediente) throw errorValidacion('El expediente del paciente no existe.');
  return expediente;
}
