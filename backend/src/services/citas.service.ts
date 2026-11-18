import type { PoolConnection } from 'mysql2/promise';
import pool from '../db/pool';
import { errorConflicto, errorNoEncontrado, errorProhibido, errorValidacion } from '../utils/erroresHttp';
import { fechaISO, horaCorta, hoyISO } from '../utils/fechas';
import { NOMBRES_DIA } from '../validaciones/horarios.validacion';
import { asegurarPacienteExiste, buscarPacientePorUsuario } from './pacientes.service';
import { asegurarPersonalActivo, buscarPersonal, buscarPersonalPorUsuario } from './personal.service';
import type { DatosCrearCita, DatosEstatusCita, DatosReagendarCita } from '../validaciones/citas.validacion';

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
  /**
   * Aviso que ve el paciente cuando el sistema movió su cita por un cambio
   * de horario del especialista. Vacío si la cita no se ha movido.
   */
  observacionCambio?: string;
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
         c.estatus                              AS estatus,
         c.observacion_cambio                   AS observacionCambio
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
    ...(fila['observacionCambio'] ? { observacionCambio: String(fila['observacionCambio']) } : {}),
  };
}

export interface FiltroCitas {
  /** Fecha exacta en AAAA-MM-DD (agenda de un día) */
  fecha?: string;
  pacienteId?: number;
}

/** Lista las citas (agenda), ordenadas por fecha y hora */
export async function listarCitas(filtro: FiltroCitas = {}): Promise<Cita[]> {
  // Al cambiar de día, las citas que no se atendieron quedan canceladas
  await cancelarCitasVencidas();

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
 * Da de alta una cita capturada por interfaz (agenda del propio especialista,
 * de enfermería o del paciente). Las citas de tipo 'Atención directa' no se
 * capturan: las crea el sistema.
 *
 * El estatus inicial depende de quién la registre: si la agenda el propio
 * especialista, la cita queda **Confirmada**; si la registra otra persona
 * (enfermería o el propio paciente), queda **Pendiente** hasta que el
 * especialista la confirme. Un paciente solo puede agendar para sí mismo.
 */
export async function crearCita(
  datos: DatosCrearCita,
  usuario: { id: number; rol: string },
): Promise<Cita> {
  await cancelarCitasVencidas();

  // El paciente solo agenda citas para sí mismo
  if (usuario.rol === 'Paciente') {
    const propio = await buscarPacientePorUsuario(usuario.id);
    if (!propio || propio !== datos.pacienteId) {
      throw errorProhibido('Solo puedes agendar citas para ti.');
    }
  }

  await asegurarPacienteExiste(datos.pacienteId);
  await asegurarPersonalActivo(datos.personalMedicoId);
  await asegurarEspecialidadParaCita(datos.personalMedicoId);
  await asegurarFechaFutura(datos.fecha, datos.hora);
  await asegurarHorarioDisponible(datos.personalMedicoId, datos.fecha, datos.hora);
  await asegurarDisponibilidad(datos.personalMedicoId, datos.fecha, datos.hora);
  await asegurarCitaLibre(datos.pacienteId, datos.fecha, datos.hora);

  // ¿La agenda el propio especialista? Entonces la cita queda confirmada
  const creador = await buscarPersonalPorUsuario(usuario.id);
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

/**
 * Al cambiar de día, las citas que no se atendieron (siguen Pendientes o
 * Confirmadas de días anteriores) se marcan como Canceladas: no pueden
 * quedar citas del pasado sin atender.
 */
async function cancelarCitasVencidas(): Promise<void> {
  await pool.query(
    `UPDATE cita SET estatus = 'Cancelada'
      WHERE fecha < CURDATE() AND estatus IN ('Pendiente', 'Confirmada')`,
  );
}

/** La cita no puede agendarse en el pasado (ni el día, ni la hora de hoy) */
async function asegurarFechaFutura(fecha: string, hora: string): Promise<void> {
  const hoy = hoyISO();
  if (fecha < hoy) {
    throw errorValidacion('La fecha no puede ser pasada.', [
      { campo: 'fechaCita', mensaje: 'Elige hoy o una fecha futura.' },
    ]);
  }
  const minutosAhora = new Date().getHours() * 60 + new Date().getMinutes();
  if (fecha === hoy && aMinutos(hora) <= minutosAhora) {
    throw errorValidacion(
      `La hora ${hora} ya pasó: elige una hora posterior a la actual.`,
      [{ campo: 'hora', mensaje: 'Elige una hora futura.' }],
    );
  }
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
  excluirId?: number,
): Promise<void> {
  const [filas] = await pool.query(
    `SELECT id_cita, hora FROM cita
      WHERE personal_medico_id_personal_medico = ? AND fecha = ? AND estatus <> 'Cancelada'`,
    [personalMedicoId, fecha],
  );
  const inicio = aMinutos(hora);
  const choque = (filas as Array<Record<string, unknown>>).find(
    (fila) =>
      // Al reagendar, la propia cita no se considera ocupación
      (!excluirId || Number(fila['id_cita']) !== excluirId) &&
      Math.abs(aMinutos(horaCorta(fila['hora'])) - inicio) < SEPARACION_MINIMA,
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

  // El paciente solo puede cancelar sus propias citas
  if (usuario.rol === 'Paciente') {
    const propio = await buscarPacientePorUsuario(usuario.id);
    if (!propio || propio !== cita.pacienteId) {
      throw errorProhibido('Solo puedes modificar tus propias citas.');
    }
    if (datos.estatus !== 'Cancelada') {
      throw errorProhibido('Solo puedes cancelar tus citas.');
    }
    // Al cancelar se retira el aviso de cambio: ya no tiene sentido mostrarlo
    await pool.query(
      'UPDATE cita SET estatus = ?, observacion_cambio = NULL WHERE id_cita = ?',
      ['Cancelada', id],
    );
    const cancelada = await buscarCita(id);
    if (!cancelada) throw errorNoEncontrado('La cita no existe.');
    return cancelada;
  }

  const gestionaAgenda = usuario.rol === 'Administrador' || usuario.rol === 'Enfermería';
  if (!gestionaAgenda) {
    const propio = await buscarPersonalPorUsuario(usuario.id);
    if (!propio || propio.id !== cita.personalMedicoId) {
      throw errorProhibido('Solo puedes modificar tus propias citas.');
    }
  }

  // El aviso de reagendamiento solo se conserva mientras la cita siga
  // pendiente: al confirmarla o cancelarla deja de ser relevante
  await pool.query(
    'UPDATE cita SET estatus = ?, observacion_cambio = ? WHERE id_cita = ?',
    [datos.estatus, datos.estatus === 'Pendiente' ? (cita.observacionCambio ?? null) : null, id],
  );
  const actualizada = await buscarCita(id);
  if (!actualizada) throw errorNoEncontrado('La cita no existe.');
  return actualizada;
}

/**
 * Reagenda una cita: cambia su fecha y su hora respetando las mismas reglas
 * de la agenda (día con horario de atención, hora futura, sin empalmes y con
 * 30 minutos de respiro). Solo las citas Pendientes o Confirmadas se pueden
 * reagendar (las de atención directa no aplican).
 *
 * Quien reagenda sin ser el propio especialista deja la cita en **Pendiente**:
 * el nuevo horario tiene que ser confirmado de nuevo.
 */
export async function reagendarCita(
  id: number,
  datos: DatosReagendarCita,
  usuario: { id: number; rol: string },
): Promise<Cita> {
  await cancelarCitasVencidas();

  const cita = await buscarCita(id);
  if (!cita) throw errorNoEncontrado('La cita no existe.');
  if (cita.tipo === 'Atención directa') {
    throw errorConflicto('Las citas de atención directa no se pueden reagendar.');
  }
  if (cita.estatus !== 'Pendiente' && cita.estatus !== 'Confirmada') {
    throw errorConflicto('Solo se pueden reagendar citas pendientes o confirmadas.');
  }

  // Puede reagendar: quien gestiona la agenda, el propio especialista
  // (su cita) o el propio paciente (su cita)
  const gestionaAgenda = usuario.rol === 'Administrador' || usuario.rol === 'Enfermería';
  if (!gestionaAgenda) {
    const esPropia =
      usuario.rol === 'Paciente'
        ? (await buscarPacientePorUsuario(usuario.id)) === cita.pacienteId
        : (await buscarPersonalPorUsuario(usuario.id))?.id === cita.personalMedicoId;
    if (!esPropia) throw errorProhibido('Solo puedes reagendar tus propias citas.');
  }

  await asegurarFechaFutura(datos.fecha, datos.hora);
  await asegurarHorarioDisponible(cita.personalMedicoId, datos.fecha, datos.hora);
  await asegurarDisponibilidad(cita.personalMedicoId, datos.fecha, datos.hora, id);
  await asegurarCitaLibre(cita.pacienteId, datos.fecha, datos.hora, id);

  const creador = await buscarPersonalPorUsuario(usuario.id);
  const esDelEspecialista = creador?.id === cita.personalMedicoId;

  await pool.query('UPDATE cita SET fecha = ?, hora = ?, estatus = ? WHERE id_cita = ?', [
    datos.fecha,
    datos.hora,
    esDelEspecialista ? 'Confirmada' : 'Pendiente',
    id,
  ]);

  const actualizada = await buscarCita(id);
  if (!actualizada) throw errorNoEncontrado('La cita no existe.');
  return actualizada;
}

/**
 * Horas ocupadas del personal en una fecha (citas no canceladas), para que la
 * interfaz ofrezca solo los horarios libres. No incluye datos de pacientes.
 *
 * `excluirCitaId` sirve al reagendar: la cita que se está moviendo no debe
 * bloquear su propia hora ni su propio día.
 */
export async function horasOcupadasDe(
  personalMedicoId: number,
  fecha: string,
  excluirCitaId?: number,
): Promise<string[]> {
  await cancelarCitasVencidas();
  const [filas] = await pool.query(
    `SELECT hora FROM cita
      WHERE personal_medico_id_personal_medico = ? AND fecha = ? AND estatus <> 'Cancelada'
        AND id_cita <> ?`,
    [personalMedicoId, fecha, excluirCitaId ?? 0],
  );
  return (filas as Array<Record<string, unknown>>).map((fila) => horaCorta(fila['hora']));
}

/* ============================================================
   DISPONIBILIDAD · generación de las horas que se pueden elegir

   Aquí vive la única versión de las reglas de la agenda (sesión de
   30 min con 30 de respiro, dentro del turno y sin pasadas). La
   interfaz solo pinta lo que devuelve este servicio: no recalcula.
   ============================================================ */

/** Un hueco de la rejilla del día */
export interface SlotDisponibilidad {
  /** Inicio del hueco, 'HH:mm' */
  hora: string;
  /** Si se puede elegir para una cita */
  disponible: boolean;
  /** Por qué no se puede elegir, o 'libre' */
  motivo: 'libre' | 'ocupada' | 'pasada';
}

export interface DisponibilidadDia {
  fecha: string;
  personalMedicoId: number;
  /** `false` cuando el personal no tiene turno ese día */
  tieneHorario: boolean;
  /**
   * Rejilla del día: un hueco por cada ${DURACION_CITA} minutos dentro de los
   * turnos del personal. Vacía si no hay turno.
   */
  slots: SlotDisponibilidad[];
  /** Horas con cita no cancelada (compatibilidad; sin datos de pacientes) */
  horasOcupadas: string[];
}

export interface DiaDisponible {
  fecha: string;
  /** Cuántos huecos libres quedan ese día (mínimo 1: solo entran días útiles) */
  horasLibres: number;
}

/**
 * Rango máximo que se puede consultar de una vez (3 meses).
 *
 * El cliente pide un poco menos (`DIAS_CONSULTA` en la interfaz) para que una
 * consulta normal nunca toque este tope.
 */
const MAXIMO_DIAS_CONSULTA = 92;

/** Turnos del personal en un día de la semana (1=Lunes … 7=Domingo) */
async function turnosDeDia(
  personalMedicoId: number,
  dia: number,
  conexion: PoolConnection | typeof pool = pool,
) {
  const [filas] = await conexion.query(
    `SELECT hora_inicio, hora_fin
       FROM horarios
      WHERE personal_medico_id_personal_medico = ? AND dia_semana = ?
      ORDER BY hora_inicio ASC`,
    [personalMedicoId, dia],
  );
  return (filas as Array<Record<string, unknown>>).map((fila) => ({
    inicio: horaCorta(fila['hora_inicio']),
    fin: horaCorta(fila['hora_fin']),
  }));
}

/**
 * Genera la rejilla de huecos de un día y marca cuáles se pueden elegir.
 *
 * Un hueco es elegible si cabe la sesión completa dentro del turno, si no hay
 * ninguna cita a menos de `SEPARACION_MINIMA` minutos (la regla simétrica: la
 * sesión y su respiro) y si todavía no pasó.
 */
function generarSlots(
  turnos: Array<{ inicio: string; fin: string }>,
  horasOcupadas: string[],
  fecha: string,
): SlotDisponibilidad[] {
  const slots: SlotDisponibilidad[] = [];
  const ahora = new Date();
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const esHoy = fecha === hoyISO();
  const vistos = new Set<string>();

  for (const turno of turnos) {
    const fin = aMinutos(turno.fin);
    // El hueco se ancla al inicio del turno y avanza en pasos de una sesión
    for (let minuto = aMinutos(turno.inicio); minuto + DURACION_CITA <= fin; minuto += SEPARACION_MINIMA) {
      const hora = hhmm(minuto);
      if (vistos.has(hora)) continue;
      vistos.add(hora);

      const choca = horasOcupadas.some(
        (ocupada) => Math.abs(aMinutos(ocupada) - minuto) < SEPARACION_MINIMA,
      );
      const paso = esHoy && minuto <= minutosAhora;

      slots.push({
        hora,
        disponible: !choca && !paso,
        motivo: choca ? 'ocupada' : paso ? 'pasada' : 'libre',
      });
    }
  }

  return slots.sort((a, b) => a.hora.localeCompare(b.hora));
}

/**
 * Disponibilidad de un día: los huecos que se pueden elegir, con el motivo de
 * los que no. Es lo que dibuja el selector de día y hora de toda la aplicación.
 */
export async function disponibilidadDe(
  personalMedicoId: number,
  fecha: string,
  excluirCitaId?: number,
): Promise<DisponibilidadDia> {
  await cancelarCitasVencidas();

  const turnos = await turnosDeDia(personalMedicoId, diaDeSemana(fecha));
  const horasOcupadas = await horasOcupadasDe(personalMedicoId, fecha, excluirCitaId);

  return {
    fecha,
    personalMedicoId,
    tieneHorario: turnos.length > 0,
    slots: generarSlots(turnos, horasOcupadas, fecha),
    horasOcupadas,
  };
}

/**
 * Días útiles del personal dentro de un rango: solo los que tienen horario y
 * al menos un hueco libre. Es la fuente del selector de días.
 */
export async function diasDisponibles(
  personalMedicoId: number,
  desde: string,
  hasta: string,
  excluirCitaId?: number,
): Promise<DiaDisponible[]> {
  const dias: DiaDisponible[] = [];

  for (let dia = new Date(`${desde}T12:00:00`); ; dia.setDate(dia.getDate() + 1)) {
    const fecha = fechaISO(dia);
    if (fecha > hasta) break;

    const disponibilidad = await disponibilidadDe(personalMedicoId, fecha, excluirCitaId);
    const horasLibres = disponibilidad.slots.filter((slot) => slot.disponible).length;
    if (horasLibres > 0) {
      dias.push({ fecha, horasLibres });
    }
  }

  return dias;
}

/**
 * Valida el rango de consulta de los días disponibles.
 * Se hace aquí y no en Zod porque la regla de tope es de negocio.
 */
export function asegurarRangoConsultable(desde: string, hasta: string): void {
  if (desde > hasta) {
    throw errorValidacion('El rango de fechas no es válido.', [
      { campo: 'hasta', mensaje: 'La fecha final debe ser igual o posterior a la inicial.' },
    ]);
  }

  const inicio = new Date(`${desde}T12:00:00`).getTime();
  const fin = new Date(`${hasta}T12:00:00`).getTime();
  const dias = Math.round((fin - inicio) / 86400000) + 1;
  if (dias > MAXIMO_DIAS_CONSULTA) {
    throw errorValidacion(
      `El rango de consulta es demasiado amplio (${dias} días de ${desde} a ${hasta}). Consulta como máximo ${MAXIMO_DIAS_CONSULTA} días por vez.`,
      [{ campo: 'hasta', mensaje: `Reduce el rango a ${MAXIMO_DIAS_CONSULTA} días o menos.` }],
    );
  }
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
): Promise<{ id: number; pacienteId: number; fecha: string; tieneConsulta: boolean } | null> {
  const [filas] = await conexion.query(
    `SELECT c.id_cita                       AS id,
            c.pacientes_id_paciente          AS pacienteId,
            c.fecha                          AS fecha,
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
    fecha: fechaISO(fila['fecha']),
    tieneConsulta: Number(fila['tieneConsulta']) === 1,
  };
}

/** Rechaza citas exactamente repetidas (mismo paciente, fecha y hora) */
async function asegurarCitaLibre(
  pacienteId: number,
  fecha: string,
  hora: string,
  excluirId?: number,
): Promise<void> {
  const [filas] = await pool.query(
    `SELECT id_cita FROM cita
      WHERE pacientes_id_paciente = ? AND fecha = ? AND hora = ?
      LIMIT 1`,
    [pacienteId, fecha, hora],
  );
  const encontrada = (filas as Array<Record<string, unknown>>)[0];
  if (encontrada && (!excluirId || Number(encontrada['id_cita']) !== excluirId)) {
    throw errorConflicto(
      `Ese paciente ya tiene una cita el ${fecha} a las ${hora}. Revisa su agenda.`,
    );
  }
}

/* ============================================================
   REAGENDAMIENTO AUTOMÁTICO · cuando cambia un horario

   Al borrar o editar un turno, las citas futuras que quedan fuera
   del horario resultante se reubican en el primer hueco libre del
   mismo especialista. Si alguna no tiene a dónde ir, el cambio no
   se aplica (se revierte la transacción) y se explica por qué.

   Las citas que se mueven quedan en **Pendiente**: moverlas es una
   propuesta del sistema, no una decisión del especialista, y así el
   paciente puede aceptarlas, cambiarlas o cancelarlas.
   ============================================================ */

export interface MovimientoCita {
  citaId: number;
  paciente: string;
  numeroControl: string;
  motivo: string;
  fechaAnterior: string;
  horaAnterior: string;
  fechaNueva: string;
  horaNueva: string;
}

export interface CitaSinHueco {
  citaId: number;
  paciente: string;
  numeroControl: string;
  motivo: string;
  fecha: string;
  hora: string;
}

export interface PlanReagendamiento {
  /** Citas que el sistema mueve (en este mismo orden se aplican) */
  movimientos: MovimientoCita[];
  /** Citas que quedaron sin hueco: si hay alguna, el cambio no se aplica */
  sinHueco: CitaSinHueco[];
}

/** Máximo de días hacia adelante donde se busca un hueco alternativo */
const DIAS_PARA_REUBICAR = 90;

interface CitaReagendable {
  id: number;
  paciente: string;
  numeroControl: string;
  motivo: string;
  fecha: string;
  hora: string;
  pacienteId: number;
}

/** Horas ocupadas de un día (todas las citas no canceladas del personal) */
async function ocupadasDeDia(
  conexion: PoolConnection | typeof pool,
  personalMedicoId: number,
  fecha: string,
): Promise<Set<string>> {
  const [filas] = await conexion.query(
    `SELECT hora FROM cita
      WHERE personal_medico_id_personal_medico = ? AND fecha = ? AND estatus <> 'Cancelada'`,
    [personalMedicoId, fecha],
  );
  return new Set((filas as Array<Record<string, unknown>>).map((fila) => horaCorta(fila['hora'])));
}

/** Horas en las que el paciente ya tiene cita (con cualquier especialista) */
async function ocupadasDelPaciente(
  conexion: PoolConnection | typeof pool,
  pacienteId: number,
  fecha: string,
): Promise<Set<string>> {
  const [filas] = await conexion.query(
    `SELECT hora FROM cita
      WHERE pacientes_id_paciente = ? AND fecha = ? AND estatus <> 'Cancelada'`,
    [pacienteId, fecha],
  );
  return new Set((filas as Array<Record<string, unknown>>).map((fila) => horaCorta(fila['hora'])));
}

/** Rejilla del día para un conjunto de horas ocupadas ya conocido */
async function slotsCon(
  conexion: PoolConnection | typeof pool,
  personalMedicoId: number,
  fecha: string,
  horasOcupadas: string[],
): Promise<SlotDisponibilidad[]> {
  const turnos = await turnosDeDia(personalMedicoId, diaDeSemana(fecha), conexion);
  return generarSlots(turnos, horasOcupadas, fecha);
}

/**
 * ¿La cita todavía cabe en el hueco donde está? Se comprueba contra el
 * horario resultante del cambio, sin contar la propia cita como ocupación.
 */
async function cabeDondeEsta(
  conexion: PoolConnection | typeof pool,
  personalMedicoId: number,
  cita: CitaReagendable,
  ocupadasPorDia: Map<string, Set<string>>,
): Promise<boolean> {
  const delDia = [...(ocupadasPorDia.get(cita.fecha) ?? [])].filter((hora) => hora !== cita.hora);
  const slots = await slotsCon(conexion, personalMedicoId, cita.fecha, delDia);
  return slots.some((slot) => slot.hora === cita.hora && slot.disponible);
}

/**
 * Primer hueco libre del especialista para la cita, empezando por su fecha y
 * hora actuales (nunca se mueve hacia atrás). Evita las horas ya ocupadas
 * por otras citas y las del propio paciente.
 */
async function buscarHueco(
  conexion: PoolConnection | typeof pool,
  personalMedicoId: number,
  cita: CitaReagendable,
  ocupadasPorDia: Map<string, Set<string>>,
): Promise<{ fecha: string; hora: string } | null> {
  const inicio = new Date(`${cita.fecha}T12:00:00`);

  for (let paso = 0; paso <= DIAS_PARA_REUBICAR; paso++) {
    const dia = new Date(inicio);
    dia.setDate(dia.getDate() + paso);
    const fecha = fechaISO(dia);

    const horas = new Set([
      ...(ocupadasPorDia.get(fecha) ?? []),
      ...(await ocupadasDelPaciente(conexion, cita.pacienteId, fecha)),
    ]);
    const slots = await slotsCon(conexion, personalMedicoId, fecha, [...horas]);

    const disponible = slots.find(
      (slot) => slot.disponible && (paso > 0 || slot.hora > cita.hora),
    );
    if (disponible) return { fecha, hora: disponible.hora };
  }

  return null;
}

/**
 * Reubica las citas futuras que quedaron fuera del horario.
 *
 * Se ejecuta **dentro de la transacción que cambió el horario**, de modo que
 * el cálculo se hace contra el resultado real del cambio. Si alguna cita no
 * encuentra hueco se lanza un 409 con el detalle y quien llamó revierte todo:
 * nunca se pierde una cita porque alguien haya tocado un turno.
 */
export async function reagendarHuerfanas(
  conexion: PoolConnection | typeof pool,
  personalMedicoId: number,
): Promise<PlanReagendamiento> {
  const hoy = hoyISO();

  // Todas las citas futuras no canceladas del personal: las que se pueden
  // mover y las que ya están atendidas (que también ocupan su hueco)
  const [filas] = await conexion.query(
    `SELECT c.id_cita AS id, c.fecha, c.hora, c.motivo, c.tipo_cita AS tipo,
            c.estatus, p.id_paciente AS pacienteId, u_pac.nombre AS paciente,
            u_pac.numero_control AS numeroControl
       FROM cita c
       JOIN pacientes p ON p.id_paciente = c.pacientes_id_paciente
       JOIN usuarios u_pac ON u_pac.id_usuarios = p.usuarios_id_usuarios
      WHERE c.personal_medico_id_personal_medico = ?
        AND c.fecha >= ?
        AND c.estatus <> 'Cancelada'
      ORDER BY c.fecha ASC, c.hora ASC`,
    [personalMedicoId, hoy],
  );

  const todas = (filas as Array<Record<string, unknown>>).map((fila) => ({
    id: Number(fila['id']),
    paciente: String(fila['paciente']),
    numeroControl: String(fila['numeroControl']),
    motivo: String(fila['motivo']),
    fecha: fechaISO(fila['fecha']),
    hora: horaCorta(fila['hora']),
    pacienteId: Number(fila['pacienteId']),
    tipo: String(fila['tipo']),
    estatus: String(fila['estatus']),
  }));

  // Las ocupaciones de cada día, para no juntar citas al reubicar
  const ocupadasPorDia = new Map<string, Set<string>>();
  for (const cita of todas) {
    if (!ocupadasPorDia.has(cita.fecha)) ocupadasPorDia.set(cita.fecha, new Set());
    ocupadasPorDia.get(cita.fecha)?.add(cita.hora);
  }

  // Solo se mueven las citas que aún no se atendieron y las que no son de
  // llegada (la atención directa se registra cuando el paciente está presente)
  const reagendables = todas.filter(
    (cita) => cita.tipo !== 'Atención directa' && cita.estatus !== 'Completada',
  );

  const movimientos: MovimientoCita[] = [];
  const sinHueco: CitaSinHueco[] = [];

  for (const cita of reagendables) {
    if (await cabeDondeEsta(conexion, personalMedicoId, cita, ocupadasPorDia)) continue;

    const hueco = await buscarHueco(conexion, personalMedicoId, cita, ocupadasPorDia);
    const resumen = {
      citaId: cita.id,
      paciente: cita.paciente,
      numeroControl: cita.numeroControl,
      motivo: cita.motivo,
    };

    if (!hueco) {
      sinHueco.push({ ...resumen, fecha: cita.fecha, hora: cita.hora });
      continue;
    }

    // El hueco anterior queda libre y el nuevo queda ocupado
    ocupadasPorDia.get(cita.fecha)?.delete(cita.hora);
    if (!ocupadasPorDia.has(hueco.fecha)) ocupadasPorDia.set(hueco.fecha, new Set());
    ocupadasPorDia.get(hueco.fecha)?.add(hueco.hora);

    movimientos.push({
      ...resumen,
      fechaAnterior: cita.fecha,
      horaAnterior: cita.hora,
      fechaNueva: hueco.fecha,
      horaNueva: hueco.hora,
    });
  }

  // Sin hueco para todas: no se toca nada (quien llamó revierte la transacción)
  if (sinHueco.length > 0) {
    const detalle = sinHueco
      .map((cita) => `${fechaCortaTexto(cita.fecha)} a las ${cita.hora} (${cita.paciente})`)
      .join(' · ');
    throw errorConflicto(
      `No se puede cambiar el horario: ${sinHueco.length} cita(s) quedarían sin día disponible. ` +
        `Reagenda o cancela estas citas antes: ${detalle}.`,
    );
  }

  // Se aplican los movimientos y queda el aviso que verá el paciente
  for (const movimiento of movimientos) {
    await conexion.query(
      `UPDATE cita
          SET fecha = ?, hora = ?, estatus = 'Pendiente', observacion_cambio = ?
        WHERE id_cita = ?`,
      [
        movimiento.fechaNueva,
        movimiento.horaNueva,
        `Movida automáticamente por cambio de horario (antes el ${fechaCortaTexto(
          movimiento.fechaAnterior,
        )} a las ${movimiento.horaAnterior}).`,
        movimiento.citaId,
      ],
    );
  }

  return { movimientos, sinHueco };
}

/** "2026-11-20" → "20 nov 2026", para los mensajes del plan */
function fechaCortaTexto(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(anio ?? 1970, (mes ?? 1) - 1, dia ?? 1).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
