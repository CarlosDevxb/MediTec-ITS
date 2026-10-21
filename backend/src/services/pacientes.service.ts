import pool from '../db/pool';
import { errorNoEncontrado, errorValidacion } from '../utils/erroresHttp';
import { fechaISO, fechaHoraTexto } from '../utils/fechas';
import { generarContrasenaTemporal } from '../utils/contrasenas';
import { ROL_PACIENTE } from '../config/roles';
import { listarRoles } from './roles.service';
import { crearUsuario, type Usuario } from './usuarios.service';
import type {
  DatosCrearPaciente,
  DatosActualizarExpediente,
} from '../validaciones/pacientes.validacion';

/**
 * Capa de datos de pacientes (tablas `pacientes`, `paciente_alergias`,
 * `paciente_enfermedades` y `cuestionario_salud`).
 *
 * Es la información de contexto que el personal clínico necesita al atender:
 * por eso el expediente incluye alergias y enfermedades crónicas, que deben
 * mostrarse siempre en el flujo de atención.
 *
 * SQL parametrizado: ningún valor de la petición se interpoliza en la consulta.
 */

export interface PacienteResumen {
  id: number;
  nombre: string;
  numeroControl: string;
  telefono: string;
  /** Fecha en formato AAAA-MM-DD */
  fechaNacimiento: string;
  tipoPaciente: string;
  carrera: string;
  /** Puede venir vacío si el paciente no lo ha registrado */
  tipoSangre: string;
}

export interface CuestionarioSalud {
  peso: number | null;
  talla: number | null;
  medicamentosActuales: string;
  cirugiasPrevias: string;
  alergiaOtra: string;
  enfermedadOtra: string;
  actividadFisica: string;
  tabaco: string;
  alcohol: string;
  horasSueno: number | null;
  sintomasActuales: string;
  comentarios: string;
  /** Fecha en formato AAAA-MM-DD HH:mm */
  fechaLlenado: string;
  estatus: string;
}

export interface ExpedientePaciente extends PacienteResumen {
  antecedentes: string;
  /** Fecha de apertura del expediente, AAAA-MM-DD HH:mm */
  aperturaExpediente: string;
  alergias: string[];
  enfermedades: string[];
  cuestionario: CuestionarioSalud | null;
}

/** Proyección común: paciente con su usuario y sus catálogos */
const COLUMNAS_PACIENTE = `
  SELECT p.id_paciente                 AS id,
         u.nombre                      AS nombre,
         u.numero_control              AS numeroControl,
         u.telefono                    AS telefono,
         u.fecha_nacimiento            AS fechaNacimiento,
         t.nombre                      AS tipoPaciente,
         c.nombre                      AS carrera,
         p.tipo_sangre                 AS tipoSangre,
         p.antecedentes                AS antecedentes,
         p.apertura_expediente         AS aperturaExpediente
    FROM pacientes p
    JOIN usuarios u ON u.id_usuarios = p.usuarios_id_usuarios
    JOIN cat_tipo_paciente t ON t.id_tipo = p.cat_tipo_paciente_id_tipo
    LEFT JOIN cat_carreras c ON c.id_carrera = p.cat_carreras_id_carrera`;

function aResumen(fila: Record<string, unknown>): PacienteResumen {
  return {
    id: Number(fila['id']),
    nombre: String(fila['nombre'] ?? ''),
    numeroControl: String(fila['numeroControl'] ?? ''),
    telefono: String(fila['telefono'] ?? ''),
    fechaNacimiento: fechaISO(fila['fechaNacimiento']),
    tipoPaciente: String(fila['tipoPaciente'] ?? ''),
    carrera: String(fila['carrera'] ?? ''),
    tipoSangre: String(fila['tipoSangre'] ?? ''),
  };
}

/** Lista los pacientes con cuenta activa (para el buscador de atención) */
export async function listarPacientes(): Promise<PacienteResumen[]> {
  const [filas] = await pool.query(
    `${COLUMNAS_PACIENTE} WHERE u.estatus = 1 ORDER BY u.nombre ASC`,
  );
  return (filas as Array<Record<string, unknown>>).map(aResumen);
}

/** Nombres de las alergias registradas del paciente */
async function alergiasDe(pacienteId: number): Promise<string[]> {
  const [filas] = await pool.query(
    `SELECT a.nombre AS nombre
       FROM paciente_alergias pa
       JOIN cat_alergias a ON a.id_alergia = pa.cat_alergias_id_alergia
      WHERE pa.pacientes_id_paciente = ?
      ORDER BY a.nombre ASC`,
    [pacienteId],
  );
  return (filas as Array<Record<string, unknown>>).map((fila) => String(fila['nombre'] ?? ''));
}

/** Nombres de las enfermedades crónicas registradas del paciente */
async function enfermedadesDe(pacienteId: number): Promise<string[]> {
  const [filas] = await pool.query(
    `SELECT e.nombre AS nombre
       FROM paciente_enfermedades pe
       JOIN cat_enfermedades e ON e.id_enfermedad = pe.cat_enfermedades_id_enfermedad
      WHERE pe.pacientes_id_paciente = ?
      ORDER BY e.nombre ASC`,
    [pacienteId],
  );
  return (filas as Array<Record<string, unknown>>).map((fila) => String(fila['nombre'] ?? ''));
}

/** Cuestionario de salud del paciente (puede no existir todavía) */
async function cuestionarioDe(pacienteId: number): Promise<CuestionarioSalud | null> {
  const [filas] = await pool.query(
    `SELECT peso, talla, medicamentos_actuales AS medicamentosActuales,
            cirugias_previas AS cirugiasPrevias, alergia_otra AS alergiaOtra,
            enfermedad_otra AS enfermedadOtra, actividad_fisica AS actividadFisica,
            tabaco, alcohol, horas_sueno AS horasSueno,
            sintomas_actuales AS sintomasActuales, comentarios,
            fecha_llenado AS fechaLlenado, estatus
       FROM cuestionario_salud
      WHERE pacientes_id_paciente = ?
      LIMIT 1`,
    [pacienteId],
  );
  const fila = (filas as Array<Record<string, unknown>>)[0];
  if (!fila) return null;

  return {
    peso: fila['peso'] != null ? Number(fila['peso']) : null,
    talla: fila['talla'] != null ? Number(fila['talla']) : null,
    medicamentosActuales: String(fila['medicamentosActuales'] ?? ''),
    cirugiasPrevias: String(fila['cirugiasPrevias'] ?? ''),
    alergiaOtra: String(fila['alergiaOtra'] ?? ''),
    enfermedadOtra: String(fila['enfermedadOtra'] ?? ''),
    actividadFisica: String(fila['actividadFisica'] ?? ''),
    tabaco: String(fila['tabaco'] ?? ''),
    alcohol: String(fila['alcohol'] ?? ''),
    horasSueno: fila['horasSueno'] != null ? Number(fila['horasSueno']) : null,
    sintomasActuales: String(fila['sintomasActuales'] ?? ''),
    comentarios: String(fila['comentarios'] ?? ''),
    fechaLlenado: fechaHoraTexto(fila['fechaLlenado']),
    estatus: String(fila['estatus'] ?? ''),
  };
}

/**
 * Expediente clínico completo: datos del paciente con sus alergias,
 * enfermedades crónicas y cuestionario de salud (contexto de atención).
 */
export async function buscarPaciente(id: number): Promise<ExpedientePaciente | null> {
  const [filas] = await pool.query(`${COLUMNAS_PACIENTE} WHERE p.id_paciente = ? LIMIT 1`, [id]);
  const fila = (filas as Array<Record<string, unknown>>)[0];
  if (!fila) return null;

  const [alergias, enfermedades, cuestionario] = await Promise.all([
    alergiasDe(id),
    enfermedadesDe(id),
    cuestionarioDe(id),
  ]);

  return {
    ...aResumen(fila),
    antecedentes: String(fila['antecedentes'] ?? ''),
    aperturaExpediente: fechaHoraTexto(fila['aperturaExpediente']),
    alergias,
    enfermedades,
    cuestionario,
  };
}

/** Comprueba que el expediente exista (para altas de citas y consultas) */
export async function asegurarPacienteExiste(pacienteId: number): Promise<void> {
  const [filas] = await pool.query(
    'SELECT id_paciente FROM pacientes WHERE id_paciente = ? LIMIT 1',
    [pacienteId],
  );
  if (!(filas as Array<Record<string, unknown>>)[0]) {
    throw errorValidacion('El paciente no existe.', [
      { campo: 'pacienteId', mensaje: 'Selecciona un paciente registrado.' },
    ]);
  }
}

/**
 * Expediente de una cuenta con rol Paciente (para que cada paciente solo
 * opere sobre su propia información desde su portal).
 */
export async function buscarPacientePorUsuario(usuarioId: number): Promise<number | null> {
  const [filas] = await pool.query(
    'SELECT id_paciente FROM pacientes WHERE usuarios_id_usuarios = ? LIMIT 1',
    [usuarioId],
  );
  const fila = (filas as Array<Record<string, unknown>>)[0];
  return fila ? Number(fila['id_paciente']) : null;
}

/** Registro de peso y talla del seguimiento de un paciente */
export interface RegistroSeguimiento {
  /** AAAA-MM-DD HH:mm de la sesión de nutrición */
  fecha: string;
  peso: number | null;
  talla: number | null;
  /** Consulta de nutrición de la que proviene la medición */
  consultaId: number;
}

/**
 * Avance de peso y talla del paciente: **solo las mediciones de las sesiones
 * de nutrición** (los signos vitales de cada consulta de la nutrióloga).
 */
export async function listarSeguimiento(pacienteId: number): Promise<RegistroSeguimiento[]> {
  await asegurarPacienteExiste(pacienteId);

  const [filasSesiones] = await pool.query(
    `SELECT co.id_consulta AS consultaId, co.fecha_hora AS fecha, sv.peso, sv.talla
       FROM signos_vitales sv
       JOIN consulta co ON co.id_consulta = sv.consulta_id_consulta
       JOIN cita c ON c.id_cita = co.cita_id_cita
      WHERE c.pacientes_id_paciente = ?
        AND co.tipo_consulta = 'Nutrición'
        AND (sv.peso IS NOT NULL OR sv.talla IS NOT NULL)
      ORDER BY co.fecha_hora ASC`,
    [pacienteId],
  );

  return (filasSesiones as Array<Record<string, unknown>>).map((fila) => ({
    fecha: fechaHoraTexto(fila['fecha']),
    peso: fila['peso'] != null ? Number(fila['peso']) : null,
    talla: fila['talla'] != null ? Number(fila['talla']) : null,
    consultaId: Number(fila['consultaId']),
  }));
}

/** Mensaje estándar cuando se pide un expediente inexistente */
export function errorPacienteNoEncontrado(): Error {
  return errorNoEncontrado('El expediente del paciente no existe.');
}

/**
 * Da de alta un paciente: crea su cuenta con rol Paciente y su expediente.
 * Si no viene contraseña, se genera una temporal que se devuelve una sola vez
 * para entregársela a la persona.
 */
export async function crearPaciente(
  datos: DatosCrearPaciente,
): Promise<{ paciente: ExpedientePaciente; contrasenaTemporal?: string }> {
  // El rol es siempre Paciente: no se recibe del cliente
  const rolPaciente = (await listarRoles()).find((rol) => rol.nombre === ROL_PACIENTE);
  if (!rolPaciente) {
    throw errorValidacion('El sistema no tiene el rol Paciente registrado.');
  }

  const contrasenaPropia = datos.contrasena?.trim();
  const contrasena = contrasenaPropia || generarContrasenaTemporal();

  const usuario: Usuario = await crearUsuario(
    {
      nombre: datos.nombre,
      numeroControl: datos.numeroControl,
      correo: datos.correo,
      telefono: datos.telefono?.trim() || undefined,
      fechaNacimiento: datos.fechaNacimiento,
      genero: datos.genero,
      rolId: rolPaciente.id,
      tipoPacienteId: datos.tipoPacienteId,
      carreraId: datos.carreraId,
    },
    contrasena,
  );

  // Datos propios del expediente (tipo de sangre y antecedentes)
  if (datos.tipoSangre?.trim() || datos.antecedentes?.trim()) {
    await pool.query(
      'UPDATE pacientes SET tipo_sangre = ?, antecedentes = ? WHERE pacientes.id_paciente = ?',
      [datos.tipoSangre?.trim() || null, datos.antecedentes?.trim() || null, usuario.pacienteId],
    );
  }

  const paciente = await buscarPaciente(Number(usuario.pacienteId));
  if (!paciente) throw errorPacienteNoEncontrado();

  return {
    paciente,
    ...(contrasenaPropia ? {} : { contrasenaTemporal: contrasena }),
  };
}

/** Actualiza los datos propios del expediente (tipo de sangre y antecedentes) */
export async function actualizarExpediente(
  id: number,
  datos: DatosActualizarExpediente,
): Promise<ExpedientePaciente> {
  const actual = await buscarPaciente(id);
  if (!actual) throw errorPacienteNoEncontrado();

  await pool.query(
    'UPDATE pacientes SET tipo_sangre = ?, antecedentes = ? WHERE id_paciente = ?',
    [datos.tipoSangre?.trim() || null, datos.antecedentes?.trim() || null, id],
  );

  const actualizado = await buscarPaciente(id);
  if (!actualizado) throw errorPacienteNoEncontrado();
  return actualizado;
}
