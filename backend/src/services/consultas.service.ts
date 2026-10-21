import pool from '../db/pool';
import {
  errorConflicto,
  errorNoEncontrado,
  errorProhibido,
  errorValidacion,
} from '../utils/erroresHttp';
import { fechaHoraTexto, fechaISO, horaCorta } from '../utils/fechas';
import { buscarPersonalPorUsuario } from './personal.service';
import { buscarUsuario } from './usuarios.service';
import { asegurarPacienteExiste } from './pacientes.service';
import { buscarCitaParaAtencion, insertarCita } from './citas.service';
import { buscarPlan, insertarPlanEn, type PlanAlimenticio } from './planes.service';
import type {
  DatosCrearConsulta,
  DatosSignosVitales,
} from '../validaciones/consultas.validacion';

/**
 * Capa de datos de consultas clínicas (tablas `consulta`, `signos_vitales`
 * y `consulta_insumo`).
 *
 * Regla central: **toda consulta deriva de una cita** (la columna
 * `cita_id_cita` es única y obligatoria). Al atender sin cita previa —el caso
 * del doctor y de la enfermería— el sistema crea primero la cita con tipo
 * 'Atención directa' y enseguida la consulta, todo dentro de una misma
 * transacción: o se registra la atención completa o no se registra nada.
 *
 * El **tipo de consulta lo determinan el rol y la especialidad** de quien atiende:
 * - Personal médico: captura diagnóstico y tratamiento (puede usar todo el
 *   inventario como insumo).
 * - Enfermería: captura su intervención de enfermería y solo descuenta
 *   insumos del inventario (categorías 'Insumo' y 'Medicamento común');
 *   no suministra medicamentos especiales.
 * - Nutrición: como el personal médico, pero **siempre con cita agendada**
 *   (igual que odontología): no hay atención de llegada para sus consultas.
 *
 * Los insumos se descuentan del inventario en esa misma transacción; los
 * medicamentos agotados (stock 0) no se pueden usar en consultas.
 */

export interface SignosVitales {
  ta: string;
  fc: number | null;
  fr: number | null;
  temp: number | null;
  peso: number | null;
  talla: number | null;
}

export interface InsumoConsulta {
  medicamentoId: number;
  nombre: string;
  unidad: string;
  abreviatura: string;
  cantidad: number;
}

export interface ConsultaResumen {
  id: number;
  /** AAAA-MM-DD HH:mm */
  fechaHora: string;
  /** 'Médica' (diagnóstico y tratamiento) o 'Enfermería' (intervención) */
  tipo: string;
  sintomas: string;
  diagnostico: string;
  tratamiento: string;
  /** Solo en consultas de enfermería */
  intervencionEnfermeria: string;
  cita: {
    id: number;
    fecha: string;
    hora: string;
    motivo: string;
    tipo: string;
    estatus: string;
  };
  paciente: { id: number; nombre: string; numeroControl: string };
  personal: { id: number; nombre: string; especialidad: string };
}

export interface ConsultaDetalle extends ConsultaResumen {
  exploracion: string;
  signosVitales: SignosVitales | null;
  insumos: InsumoConsulta[];
  /** Plan alimenticio registrado con la sesión de nutrición */
  planAlimenticio?: PlanAlimenticio | null;
}

/** SELECT común: la consulta con su cita, su paciente y su personal */
const COLUMNAS = `
  SELECT co.id_consulta        AS id,
         co.fecha_hora         AS fechaHora,
         co.tipo_consulta      AS tipo,
         co.sintomas           AS sintomas,
         co.exploracion        AS exploracion,
         co.diagnostico        AS diagnostico,
         co.tratamiento        AS tratamiento,
         co.intervencion_enfermeria AS intervencionEnfermeria,
         c.id_cita             AS citaId,
         c.fecha               AS citaFecha,
         c.hora                AS citaHora,
         c.motivo              AS citaMotivo,
         c.tipo_cita           AS citaTipo,
         c.estatus             AS citaEstatus,
         p.id_paciente         AS pacienteId,
         u_pac.nombre          AS paciente,
         u_pac.numero_control  AS numeroControl,
         pm.id_personal_medico AS personalId,
         u_per.nombre          AS personal,
         pm.especialidad       AS especialidad
    FROM consulta co
    JOIN cita c ON c.id_cita = co.cita_id_cita
    JOIN pacientes p ON p.id_paciente = c.pacientes_id_paciente
    JOIN usuarios u_pac ON u_pac.id_usuarios = p.usuarios_id_usuarios
    JOIN personal_medico pm ON pm.id_personal_medico = c.personal_medico_id_personal_medico
    JOIN usuarios u_per ON u_per.id_usuarios = pm.usuarios_id_usuarios`;

function aResumen(fila: Record<string, unknown>): ConsultaResumen {
  return {
    id: Number(fila['id']),
    fechaHora: fechaHoraTexto(fila['fechaHora']),
    tipo: String(fila['tipo'] ?? 'Médica'),
    sintomas: String(fila['sintomas'] ?? ''),
    diagnostico: String(fila['diagnostico'] ?? ''),
    tratamiento: String(fila['tratamiento'] ?? ''),
    intervencionEnfermeria: String(fila['intervencionEnfermeria'] ?? ''),
    cita: {
      id: Number(fila['citaId']),
      fecha: fechaISO(fila['citaFecha']),
      hora: horaCorta(fila['citaHora']),
      motivo: String(fila['citaMotivo'] ?? ''),
      tipo: String(fila['citaTipo'] ?? ''),
      estatus: String(fila['citaEstatus'] ?? ''),
    },
    paciente: {
      id: Number(fila['pacienteId']),
      nombre: String(fila['paciente'] ?? ''),
      numeroControl: String(fila['numeroControl'] ?? ''),
    },
    personal: {
      id: Number(fila['personalId']),
      nombre: String(fila['personal'] ?? ''),
      especialidad: String(fila['especialidad'] ?? ''),
    },
  };
}

/** ¿Tiene al menos un valor capturado? */
function signosConDatos(signos: DatosSignosVitales | undefined): boolean {
  if (!signos) return false;
  return Object.values(signos).some(
    (valor) => valor !== undefined && valor !== null && valor !== '',
  );
}

/**
 * Registra una atención completa: primero la cita (auto-cita 'Atención
 * directa' o la cita agendada que se indique), después la consulta, sus
 * signos vitales y los insumos con su descuento de stock. Todo en una
 * transacción.
 */
export async function crearConsulta(
  usuarioId: number,
  datos: DatosCrearConsulta,
): Promise<ConsultaDetalle> {
  // Quien atiende debe tener ficha de personal clínico
  const personal = await buscarPersonalPorUsuario(usuarioId);
  if (!personal) {
    throw errorProhibido(
      'Tu cuenta no tiene ficha de personal clínico, así que no puede registrar consultas.',
    );
  }
  await asegurarPacienteExiste(datos.pacienteId);

  /* ---- El tipo de consulta lo determinan el rol y la especialidad ---- */
  const cuenta = await buscarUsuario(usuarioId);
  const especialidad = personal.especialidad
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const esNutricion = especialidad.includes('nutri');
  const esOdontologia = especialidad.includes('odontolog');
  const tipoConsulta =
    cuenta?.rol === 'Enfermería' ? 'Enfermería' : esNutricion ? 'Nutrición' : 'Médica';

  // Nutrición y odontología atienden únicamente con cita agendada:
  // no existe la atención de llegada para sus consultas
  if ((esNutricion || esOdontologia) && !datos.citaId) {
    throw errorValidacion('Las consultas de nutrición y odontología requieren una cita agendada.', [
      { campo: 'citaId', mensaje: 'Selecciona una cita de la agenda para registrar la consulta.' },
    ]);
  }

  if (tipoConsulta === 'Enfermería') {
    // Enfermería registra su intervención: no diagnostica ni prescribe
    const faltantes: Array<{ campo: string; mensaje: string }> = [];
    if (!datos.intervencionEnfermeria?.trim()) {
      faltantes.push({ campo: 'intervencionEnfermeria', mensaje: 'Este campo es obligatorio.' });
    }
    if (!datos.sintomas?.trim()) {
      faltantes.push({ campo: 'sintomas', mensaje: 'Describe los síntomas.' });
    }
    if (faltantes.length > 0) {
      throw errorValidacion('La consulta de enfermería está incompleta.', faltantes);
    }
  } else if (tipoConsulta === 'Nutrición') {
    // La sesión de nutrición registra diagnóstico, indicaciones y su plan
    // alimenticio; no captura síntomas, exploración ni insumos
    const faltantes: Array<{ campo: string; mensaje: string }> = [];
    if (!datos.diagnostico?.trim()) {
      faltantes.push({ campo: 'diagnostico', mensaje: 'El diagnóstico nutricional es obligatorio.' });
    }
    if (!datos.tratamiento?.trim()) {
      faltantes.push({ campo: 'tratamiento', mensaje: 'Las indicaciones son obligatorias.' });
    }
    if (!datos.planAlimenticio) {
      faltantes.push({
        campo: 'planAlimenticio',
        mensaje: 'El plan alimenticio se registra junto con la sesión.',
      });
    }
    if (faltantes.length > 0) {
      throw errorValidacion('La sesión de nutrición está incompleta.', faltantes);
    }
    if (datos.insumos && datos.insumos.length > 0) {
      throw errorValidacion('Las sesiones de nutrición no registran insumos.', [
        { campo: 'insumos', mensaje: 'Los insumos solo aplican en consultas médicas.' },
      ]);
    }
  } else {
    const faltantes: Array<{ campo: string; mensaje: string }> = [];
    if (!datos.sintomas?.trim()) {
      faltantes.push({ campo: 'sintomas', mensaje: 'Describe los síntomas.' });
    }
    if (!datos.diagnostico?.trim()) {
      faltantes.push({ campo: 'diagnostico', mensaje: 'El diagnóstico es obligatorio.' });
    }
    if (!datos.tratamiento?.trim()) {
      faltantes.push({ campo: 'tratamiento', mensaje: 'El tratamiento es obligatorio.' });
    }
    if (faltantes.length > 0) {
      throw errorValidacion('La consulta está incompleta.', faltantes);
    }
  }

  const conexion = await pool.getConnection();
  let consultaId = 0;
  let planId: number | null = null;
  try {
    await conexion.beginTransaction();

    /* ---- 1) La cita primero: sin cita no hay consulta ---- */
    let citaId: number;
    if (datos.citaId) {
      const cita = await buscarCitaParaAtencion(conexion, datos.citaId);
      if (!cita) throw errorNoEncontrado('La cita no existe.');
      if (cita.pacienteId !== datos.pacienteId) {
        throw errorValidacion('La cita seleccionada no pertenece al paciente de la atención.', [
          { campo: 'citaId', mensaje: 'Selecciona una cita de este paciente.' },
        ]);
      }
      if (cita.tieneConsulta) {
        throw errorConflicto('Esa cita ya tiene una consulta registrada. Cada cita admite una sola consulta.');
      }
      citaId = cita.id;
    } else {
      // Atención de llegada (doctor y enfermería): el sistema crea la cita
      // con el momento de la atención y la da por completada
      citaId = await insertarCita(conexion, {
        personalMedicoId: personal.id,
        pacienteId: datos.pacienteId,
        motivo: (datos.motivo ?? '').trim(),
        tipo: 'Atención directa',
        estatus: 'Completada',
      });
    }

    /* ---- 2) La consulta (una por cita, por la restricción del esquema) ---- */
    const [resultado] = await conexion.query(
      `INSERT INTO consulta
         (cita_id_cita, tipo_consulta, sintomas, exploracion, diagnostico, tratamiento, intervencion_enfermeria)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        citaId,
        tipoConsulta,
        datos.sintomas?.trim() || null,
        datos.exploracion?.trim() || null,
        datos.diagnostico?.trim() || null,
        datos.tratamiento?.trim() || null,
        datos.intervencionEnfermeria?.trim() || null,
      ],
    );
    consultaId = Number((resultado as { insertId: number }).insertId);

    /* ---- 3) Signos vitales (opcionales, un solo registro por consulta) ---- */
    if (signosConDatos(datos.signosVitales)) {
      const s = datos.signosVitales ?? {};
      await conexion.query(
        `INSERT INTO signos_vitales (consulta_id_consulta, ta, fc, fr, temp, peso, talla)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          consultaId,
          s.ta?.trim() || null,
          s.fc ?? null,
          s.fr ?? null,
          s.temp ?? null,
          s.peso ?? null,
          s.talla ?? null,
        ],
      );
    }

    /* ---- 3b) Plan alimenticio: se registra junto con la sesión de nutrición ---- */
    if (datos.planAlimenticio) {
      planId = await insertarPlanEn(conexion, personal.id, {
        ...datos.planAlimenticio,
        pacienteId: datos.pacienteId,
      });
    }

    /* ---- 4) Insumos: stock verificado y descontado en la misma transacción ---- */
    for (const insumo of datos.insumos ?? []) {
      const [filas] = await conexion.query(
        'SELECT nombre, stock, categoria FROM medicamentos WHERE id_medicamento = ? FOR UPDATE',
        [insumo.medicamentoId],
      );
      const medicamento = (filas as Array<Record<string, unknown>>)[0];
      if (!medicamento) {
        throw errorValidacion('Un medicamento de los insumos no existe.', [
          { campo: 'insumos', mensaje: 'Selecciona medicamentos del inventario.' },
        ]);
      }
      const stock = Number(medicamento['stock']);
      const nombre = String(medicamento['nombre'] ?? '');
      const categoria = String(medicamento['categoria'] ?? '');

      // Enfermería solo descuenta insumos y medicamentos comunes:
      // los medicamentos especiales son del personal médico
      if (tipoConsulta === 'Enfermería' && categoria === 'Medicamento especial') {
        throw errorConflicto(
          `"${nombre}" es un medicamento especial: no se puede usar en consultas de enfermería.`,
        );
      }
      if (stock <= 0) {
        throw errorConflicto(
          `"${nombre}" está agotado y no está disponible para consultas.`,
        );
      }
      if (insumo.cantidad > stock) {
        throw errorConflicto(
          `Stock insuficiente de "${nombre}": solo quedan ${stock} unidades.`,
        );
      }
      await conexion.query(
        'UPDATE medicamentos SET stock = stock - ? WHERE id_medicamento = ?',
        [insumo.cantidad, insumo.medicamentoId],
      );
      await conexion.query(
        `INSERT INTO consulta_insumo (consulta_id_consulta, medicamentos_id_medicamento, cantidad_usada)
         VALUES (?, ?, ?)`,
        [consultaId, insumo.medicamentoId, insumo.cantidad],
      );
    }

    await conexion.commit();
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }

  const creada = await buscarConsulta(consultaId);
  if (!creada) throw errorNoEncontrado('No se pudo recuperar la consulta recién creada.');
  // La sesión de nutrición devuelve también el plan que acaba de registrar
  creada.planAlimenticio = planId ? await buscarPlan(planId) : null;
  return creada;
}

/** Historial de consultas (todas las del personal clínico) */
export async function listarConsultas(filtro: { pacienteId?: number } = {}): Promise<ConsultaResumen[]> {
  const parametros: unknown[] = [];
  let where = '';
  if (filtro.pacienteId) {
    where = ' WHERE p.id_paciente = ?';
    parametros.push(filtro.pacienteId);
  }

  const [filas] = await pool.query(
    `${COLUMNAS}${where} ORDER BY co.fecha_hora DESC`,
    parametros,
  );
  return (filas as Array<Record<string, unknown>>).map(aResumen);
}

/** Consulta completa: exploración, signos vitales e insumos usados */
export async function buscarConsulta(id: number): Promise<ConsultaDetalle | null> {
  const [filas] = await pool.query(`${COLUMNAS} WHERE co.id_consulta = ? LIMIT 1`, [id]);
  const fila = (filas as Array<Record<string, unknown>>)[0];
  if (!fila) return null;

  const [signos, insumos] = await Promise.all([
    pool.query('SELECT ta, fc, fr, temp, peso, talla FROM signos_vitales WHERE consulta_id_consulta = ? LIMIT 1', [id]),
    pool.query(
      `SELECT m.id_medicamento AS medicamentoId,
              m.nombre         AS nombre,
              u.nombre         AS unidad,
              u.abreviatura    AS abreviatura,
              ci.cantidad_usada AS cantidad
         FROM consulta_insumo ci
         JOIN medicamentos m ON m.id_medicamento = ci.medicamentos_id_medicamento
         JOIN cat_unidades_medida u ON u.id_unidad = m.cat_unidades_medida_id_unidad
        WHERE ci.consulta_id_consulta = ?
        ORDER BY m.nombre ASC`,
      [id],
    ),
  ]);

  const filaSignos = (signos[0] as Array<Record<string, unknown>>)[0];
  const signosVitales: SignosVitales | null = filaSignos
    ? {
        ta: String(filaSignos['ta'] ?? ''),
        fc: filaSignos['fc'] != null ? Number(filaSignos['fc']) : null,
        fr: filaSignos['fr'] != null ? Number(filaSignos['fr']) : null,
        temp: filaSignos['temp'] != null ? Number(filaSignos['temp']) : null,
        peso: filaSignos['peso'] != null ? Number(filaSignos['peso']) : null,
        talla: filaSignos['talla'] != null ? Number(filaSignos['talla']) : null,
      }
    : null;

  const insumosConsulta: InsumoConsulta[] = (insumos[0] as Array<Record<string, unknown>>).map(
    (filaInsumo) => ({
      medicamentoId: Number(filaInsumo['medicamentoId']),
      nombre: String(filaInsumo['nombre'] ?? ''),
      unidad: String(filaInsumo['unidad'] ?? ''),
      abreviatura: String(filaInsumo['abreviatura'] ?? ''),
      cantidad: Number(filaInsumo['cantidad']),
    }),
  );

  return {
    ...aResumen(fila),
    exploracion: String(fila['exploracion'] ?? ''),
    signosVitales,
    insumos: insumosConsulta,
  };
}
