import type { PoolConnection } from 'mysql2/promise';
import pool from '../db/pool';
import { errorConflicto, errorNoEncontrado, errorProhibido, errorValidacion } from '../utils/erroresHttp';
import { fechaISO, horaCorta } from '../utils/fechas';
import { NOMBRES_DIA } from '../validaciones/horarios.validacion';
import { asegurarPacienteExiste } from './pacientes.service';
import { asegurarPersonalActivo, buscarPersonal, buscarPersonalPorUsuario } from './personal.service';
import type { DatosCrearCita, DatosEstatusCita } from '../validaciones/citas.validacion';

/**
 * Capa de datos de citas (tabla `cita`).
 *
 * Reglas de la agenda:
 * - Las citas programadas solo se agendan con el personal de **Odontología o
 *   Nutrición** (el doctor y la enfermería atienden sin cita previa, con la
 *   auto-cita 'Atención directa' que crea la consulta).
 * - La cita debe caer dentro del **horario registrado** del personal
 *   (tabla `horarios`, de lunes a viernes) y el turno debe estar libre.
 *
 * Toda consulta clínica deriva de una cita: cuando el doctor o la enfermería
 * atienden sin cita previa, el registro de la consulta **crea primero** la
 * cita con tipo 'Atención directa' (ver `consultas.service.ts`, que usa
 * `insertarCita` dentro de su transacción).
 *
 * SQL parametrizado: ningún valor de la petición se interpoliza en la consulta.
 */

/** Especialidades que se agendan desde la agenda de citas */
const ESPECIALIDADES_CON_CITA = ['odontolog', 'nutriolog', 'nutricion'];

/** Duración de una cita y el respiro mínimo entre citas (minutos) */
const DURACION_CITA = 30;
const SEPARACION_MINIMA = 60; // 30 de sesión + 30 de respiro

export interface Cita {
  id: number;
  personalMedicoId: number;
  /** Nombre de quien atiende (tabla `usuarios`) */
  personal: string;
  especialidad: string;
  pacienteId: number;
  paciente: string;
  numeroControl: string;
  /** Fecha en formato AAAA-MM-DD */
  fecha: string;
  /** Formato HH:mm */
  hora: string;
  motivo: string;
  /** 'Programada' | 'Emergencia' | 'Atención directa' */
  tipo: string;
  /** 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Completada' */
  estatus: string;
}

/** SELECT común: la cita con su personal y su paciente */
const COLUMNAS = `
  SELECT c.id_cita                              AS id,
         c.personal_medico_id_personal_medico   AS personalMedicoId,
         u_per.nombre                           AS personal,
         pm.especialidad                        AS especialidad,
         c.pacientes_id_paciente                AS pacienteId,
         u_pac.nombre                           AS paciente,
         u_pac.numero_control                   AS numeroControl,
         c.fecha                                AS fecha,
         c.hora                                 AS hora,
         c.motivo                               AS motivo,
         c.tipo_cita                            AS tipo,
         c.estatus                              AS estatus
    FROM cita c
    JOIN personal_medico pm ON pm.id_personal_medico = c.personal_medico_id_personal_medico
    JOIN usuarios u_per ON u_per.id_usuarios = pm.usuarios_id_usuarios
    JOIN pacientes p ON p.id_paciente = c.pacientes_id_paciente
    JOIN usuarios u_pac ON u_pac.id_usuarios = p.usuarios_id_usuarios`;

/** Convierte una fila de MySQL al modelo de la API */
function aCita(fila: Record<string, unknown>): Cita {
  return {
    id: Number(fila['id']),
    personalMedicoId: Number(fila['personalMedicoId']),
    personal: String(fila['personal'] ?? ''),
    especialidad: String(fila['especialidad'] ?? ''),
    pacienteId: Number(fila['pacienteId']),
    paciente: String(fila['paciente'] ?? ''),
    numeroControl: String(fila['numeroControl'] ?? ''),
    fecha: fechaISO(fila['fecha']),
    hora: horaCorta(fila['hora']),
    motivo: String(fila['motivo'] ?? ''),
    tipo: String(fila['tipo'] ?? ''),
    estatus: String(fila['estatus'] ?? ''),
  };
}

export interface FiltroCitas {
  /** Fecha exacta en AAAA-MM-DD (agenda de un día) */
  fecha?: string;
  pacienteId?: number;
}

/** Lista las citas (agenda), ordenadas por fecha y hora */
export async function listarCitas(filtro: FiltroCitas = {}): Promise<Cita[]> {
  const condiciones: string[] = [];
  const parametros: unknown[] = [];

  if (filtro.fecha) {
    condiciones.push('c.fecha = ?');
    parametros.push(filtro.fecha);
  }
  if (filtro.pacienteId) {
    condiciones.push('c.pacientes_id_paciente = ?');
    parametros.push(filtro.pacienteId);
  }

  const where = condiciones.length > 0 ? ` WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(
    `${COLUMNAS}${where} ORDER BY c.fecha ASC, c.hora ASC`,
    parametros,
  );
  return (filas as Array<Record<string, unknown>>).map(aCita);
}

/** Busca una cita por id (o null si no existe) */
export async function buscarCita(id: number): Promise<Cita | null> {
  const [filas] = await pool.query(`${COLUMNAS} WHERE c.id_cita = ? LIMIT 1`, [id]);
  const fila = (filas as Array<Record<string, unknown>>)[0];
  return fila ? aCita(fila) : null;
}

/**
 * Da de alta una cita capturada por interfaz (agenda del propio especialista o
 * de enfermería). Las citas de tipo 'Atención directa' no se capturan: las
 * crea el sistema.
 *
 * El estatus inicial depende de quién la registre: si la agenda el propio
 * especialista, la cita queda **Confirmada**; si la registra otra persona
 * (p. ej. enfermería), queda **Pendiente** hasta que el especialista la
 * confirme.
 */
export async function crearCita(datos: DatosCrearCita, usuarioId: number): Promise<Cita> {
  await asegurarPacienteExiste(datos.pacienteId);
  await asegurarPersonalActivo(datos.personalMedicoId);
  await asegurarEspecialidadParaCita(datos.personalMedicoId);
  await asegurarHorarioDisponible(datos.personalMedicoId, datos.fecha, datos.hora);
  await asegurarDisponibilidad(datos.personalMedicoId, datos.fecha, datos.hora);
  await asegurarCitaLibre(datos.pacienteId, datos.fecha, datos.hora);

  // ¿La agenda el propio especialista? Entonces la cita queda confirmada
  const creador = await buscarPersonalPorUsuario(usuarioId);
  const esDelPropio = creador?.id === datos.personalMedicoId;

  const id = await insertarCita(pool, {
    personalMedicoId: datos.personalMedicoId,
    pacienteId: datos.pacienteId,
    motivo: datos.motivo,
    tipo: datos.tipo,
    estatus: esDelPropio ? 'Confirmada' : 'Pendiente',
    fecha: datos.fecha,
    hora: datos.hora,
  });

  const cita = await buscarCita(id);
  if (!cita) throw errorNoEncontrado('No se pudo recuperar la cita recién creada.');
  return cita;
}

/** Día de la semana de una fecha AAAA-MM-DD (1=Lunes … 7=Domingo) */
function diaDeSemana(fecha: string): number {
  const partes = fecha.split('-').map(Number);
  const anio = partes[0] ?? 1970;
  const mes = partes[1] ?? 1;
  const dia = partes[2] ?? 1;
  return ((new Date(anio, mes - 1, dia).getDay() + 6) % 7) + 1;
}

/** La agenda de citas es solo para el personal de Odontología o Nutrición */
async function asegurarEspecialidadParaCita(personalMedicoId: number): Promise<void> {
  const persona = await buscarPersonal(personalMedicoId);
  const especialidad = persona.especialidad
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (!ESPECIALIDADES_CON_CITA.some((clave) => especialidad.includes(clave))) {
    throw errorValidacion(
      'La agenda de citas es solo para el personal de Odontología o Nutrición.',
      [
        {
          campo: 'personalMedicoId',
          mensaje: 'Selecciona a un especialista en Odontología o Nutrición.',
        },
      ],
    );
  }
}

/** "08:30" → 510 */
const aMinutos = (hora: string): number => {
  const [h, m] = hora.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** La cita (30 min de sesión) debe caber dentro del horario registrado */
async function asegurarHorarioDisponible(
  personalMedicoId: number,
  fecha: string,
  hora: string,
): Promise<void> {
  const dia = diaDeSemana(fecha);
  const [filas] = await pool.query(
    `SELECT hora_inicio, hora_fin
       FROM horarios
      WHERE personal_medico_id_personal_medico = ? AND dia_semana = ?
      ORDER BY hora_inicio ASC`,
    [personalMedicoId, dia],
  );
  const rangos = (filas as Array<Record<string, unknown>>).map((fila) => ({
    inicio: horaCorta(fila['hora_inicio']),
    fin: horaCorta(fila['hora_fin']),
  }));

  const diaTexto = NOMBRES_DIA[dia - 1] ?? `día ${dia}`;
  if (rangos.length === 0) {
    throw errorValidacion(
      `El personal no tiene horario registrado el ${diaTexto.toLowerCase()}. Elige otro día.`,
      [{ campo: 'hora', mensaje: 'Selecciona un día en el que atienda el personal.' }],
    );
  }

  const inicio = aMinutos(hora);
  const dentro = rangos.some(
    (rango) => inicio >= aMinutos(rango.inicio) && inicio + DURACION_CITA <= aMinutos(rango.fin),
  );
  if (!dentro) {
    const horarioTexto = rangos.map((rango) => `de ${rango.inicio} a ${rango.fin}`).join(' y ');
    throw errorValidacion(
      `Las citas de ${DURACION_CITA} minutos no caben a las ${hora} el ${diaTexto.toLowerCase()}; el horario es ${horarioTexto}.`,
      [{ campo: 'hora', mensaje: 'Selecciona una hora dentro del horario de atención.' }],
    );
  }
}

/**
 * La agenda del personal debe quedar espaciada: cada cita dura
 * `DURACION_CITA` minutos y después hay `RESPIRO` libre, así que ninguna otra
 * cita puede empezar dentro de la hora siguiente ni dentro de la anterior
 * (sin juntarse ni empalmarse).
 */
async function asegurarDisponibilidad(
  personalMedicoId: number,
  fecha: string,
  hora: string,
): Promise<void> {
  const [filas] = await pool.query(
    `SELECT hora FROM cita
      WHERE personal_medico_id_personal_medico = ? AND fecha = ? AND estatus <> 'Cancelada'`,
    [personalMedicoId, fecha],
  );
  const inicio = aMinutos(hora);
  const choque = (filas as Array<Record<string, unknown>>).find(
    (fila) => Math.abs(aMinutos(horaCorta(fila['hora'])) - inicio) < SEPARACION_MINIMA,
  );
  if (choque) {
    const horaChoque = horaCorta(choque['hora']);
    throw errorConflicto(
      `Ya hay una cita a las ${horaChoque}. Las citas duran ${DURACION_CITA} minutos y deben ` +
        `dejarse ${SEPARACION_MINIMA - DURACION_CITA} minutos libres entre cada una: la siguiente ` +
        `disponible desde esa sería las ${hhmm(aMinutos(horaChoque) + SEPARACION_MINIMA)}.`,
    );
  }
}

/** HH:mm a partir de minutos desde medianoche */
function hhmm(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}

/**
 * Cambia el estatus de una cita (confirmar, cancelar, completar).
 * Solo puede hacerlo el dueño de la cita o quien gestiona la agenda
 * (Administrador y Enfermería): nadie marca las citas de otro especialista.
 */
export async function cambiarEstatusCita(
  id: number,
  datos: DatosEstatusCita,
  usuario: { id: number; rol: string },
): Promise<Cita> {
  const cita = await buscarCita(id);
  if (!cita) throw errorNoEncontrado('La cita no existe.');

  if (cita.tipo === 'Atención directa') {
    throw errorConflicto(
      'Las citas de atención directa se registran como completadas y no cambian de estatus.',
    );
  }

  const gestionaAgenda = usuario.rol === 'Administrador' || usuario.rol === 'Enfermería';
  if (!gestionaAgenda) {
    const propio = await buscarPersonalPorUsuario(usuario.id);
    if (!propio || propio.id !== cita.personalMedicoId) {
      throw errorProhibido('Solo puedes modificar tus propias citas.');
    }
  }

  await pool.query('UPDATE cita SET estatus = ? WHERE id_cita = ?', [datos.estatus, id]);
  const actualizada = await buscarCita(id);
  if (!actualizada) throw errorNoEncontrado('La cita no existe.');
  return actualizada;
}

/**
 * Inserta una cita en la conexión indicada (para usar dentro de una
 * transacción, como hace el alta de consultas) y devuelve su id.
 *
 * Si no se indican fecha y hora, se toman del momento actual con las
 * funciones de MySQL (sin depender de la zona horaria del servidor de
 * aplicaciones).
 */
export async function insertarCita(
  conexion: PoolConnection | typeof pool,
  datos: {
    personalMedicoId: number;
    pacienteId: number;
    motivo: string;
    /** 'Programada' | 'Emergencia' | 'Atención directa' */
    tipo: string;
    /** 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Completada' */
    estatus: string;
    fecha?: string;
    hora?: string;
  },
): Promise<number> {
  const conFecha = datos.fecha && datos.hora;
  const [resultado] = await conexion.query(
    conFecha
      ? `INSERT INTO cita
           (personal_medico_id_personal_medico, pacientes_id_paciente, fecha, hora, motivo, tipo_cita, estatus)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      : `INSERT INTO cita
           (personal_medico_id_personal_medico, pacientes_id_paciente, fecha, hora, motivo, tipo_cita, estatus)
         VALUES (?, ?, CURDATE(), CURTIME(), ?, ?, ?)`,
    conFecha
      ? [datos.personalMedicoId, datos.pacienteId, datos.fecha, datos.hora, datos.motivo, datos.tipo, datos.estatus]
      : [datos.personalMedicoId, datos.pacienteId, datos.motivo, datos.tipo, datos.estatus],
  );
  return Number((resultado as { insertId: number }).insertId);
}

/**
 * Cita dentro de una transacción (bloqueada con FOR UPDATE) con el dato que
 * necesita la consulta: si ya tiene una consulta registrada.
 */
export async function buscarCitaParaAtencion(
  conexion: PoolConnection,
  citaId: number,
): Promise<{ id: number; pacienteId: number; tieneConsulta: boolean } | null> {
  const [filas] = await conexion.query(
    `SELECT c.id_cita                       AS id,
            c.pacientes_id_paciente          AS pacienteId,
            EXISTS(SELECT 1 FROM consulta WHERE cita_id_cita = c.id_cita) AS tieneConsulta
       FROM cita c
      WHERE c.id_cita = ?
      FOR UPDATE`,
    [citaId],
  );
  const fila = (filas as Array<Record<string, unknown>>)[0];
  if (!fila) return null;
  return {
    id: Number(fila['id']),
    pacienteId: Number(fila['pacienteId']),
    tieneConsulta: Number(fila['tieneConsulta']) === 1,
  };
}

/** Rechaza citas exactamente repetidas (mismo paciente, fecha y hora) */
async function asegurarCitaLibre(
  pacienteId: number,
  fecha: string,
  hora: string,
): Promise<void> {
  const [filas] = await pool.query(
    `SELECT id_cita FROM cita
      WHERE pacientes_id_paciente = ? AND fecha = ? AND hora = ?
      LIMIT 1`,
    [pacienteId, fecha, hora],
  );
  if ((filas as Array<Record<string, unknown>>)[0]) {
    throw errorConflicto(
      `Ese paciente ya tiene una cita el ${fecha} a las ${hora}. Revisa su agenda.`,
    );
  }
}
