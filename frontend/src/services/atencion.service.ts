import { apiFetch } from './api';
import type { Horario } from './operacion.service';

/* ============================================================
   ATENCIÓN · Cliente de la API clínica (expedientes, citas y
   consultas) para los paneles del doctor y de la enfermería.
   Todas las funciones devuelven datos tipados y lanzan errores
   con mensaje en español (ver `api.ts`).
   ============================================================ */

/* ---------------- Pacientes ---------------- */

/** Tipos de sangre del expediente (tabla `pacientes`) */
export const TIPOS_SANGRE = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const;

export interface PacienteResumen {
  id: number;
  nombre: string;
  numeroControl: string;
  telefono: string;
  /** Fecha en formato AAAA-MM-DD */
  fechaNacimiento: string;
  tipoPaciente: string;
  carrera: string;
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
  /** AAAA-MM-DD HH:mm */
  fechaLlenado: string;
  estatus: string;
}

export interface ExpedientePaciente extends PacienteResumen {
  antecedentes: string;
  /** AAAA-MM-DD HH:mm */
  aperturaExpediente: string;
  alergias: string[];
  enfermedades: string[];
  cuestionario: CuestionarioSalud | null;
}

export function listarPacientes(): Promise<PacienteResumen[]> {
  return apiFetch<{ datos: PacienteResumen[] }>('/pacientes').then((r) => r.datos);
}

export function obtenerExpediente(id: number): Promise<ExpedientePaciente> {
  return apiFetch<{ datos: ExpedientePaciente }>(`/pacientes/${id}`).then((r) => r.datos);
}

/** Datos del alta de paciente (cuenta con rol Paciente + expediente) */
export interface DatosPaciente {
  nombre: string;
  numeroControl: string;
  correo: string;
  telefono?: string;
  fechaNacimiento: string;
  genero: 'Masculino' | 'Femenino' | 'Otro';
  tipoPacienteId?: number;
  carreraId?: number;
  tipoSangre?: string;
  antecedentes?: string;
  /** Opcional: si falta, el sistema genera una temporal */
  contrasena?: string;
}

/** Alta de paciente (Enfermería y Administrador) */
export function crearPaciente(
  datos: DatosPaciente,
): Promise<{ paciente: ExpedientePaciente; contrasenaTemporal?: string }> {
  return apiFetch<{ datos: { paciente: ExpedientePaciente; contrasenaTemporal?: string } }>(
    '/pacientes',
    { method: 'POST', body: JSON.stringify(datos) },
  ).then((r) => r.datos);
}

/** Actualización del expediente (tipo de sangre y antecedentes) */
export function actualizarExpediente(
  id: number,
  datos: { tipoSangre?: string; antecedentes?: string },
): Promise<ExpedientePaciente> {
  return apiFetch<{ datos: ExpedientePaciente }>(`/pacientes/${id}/expediente`, {
    method: 'PATCH',
    body: JSON.stringify(datos),
  }).then((r) => r.datos);
}

/* ---------------- Cuestionario de salud ---------------- */

/** Datos del cuestionario de salud inicial (único por paciente) */
export interface DatosCuestionario {
  /**
   * Tipo de sangre: dato del expediente que se captura en el cuestionario
   * inicial (si se deja vacío, se conserva el que ya tenga el expediente)
   */
  tipoSangre?: string;
  /** Obligatorios: medidas básicas y hábitos */
  peso: number;
  talla: number;
  actividadFisica: 'Ninguna' | 'Leve' | 'Moderada' | 'Intensa';
  tabaco: 'Nunca' | 'Ex-fumador' | 'Fumador';
  alcohol: 'Nunca' | 'Ocasional' | 'Frecuente';
  /* Historial y contexto (opcionales) */
  medicamentosActuales?: string;
  cirugiasPrevias?: string;
  alergiaOtra?: string;
  enfermedadOtra?: string;
  horasSueno?: number;
  sintomasActuales?: string;
  comentarios?: string;
  /** Nombres: los que no existan en el catálogo se dan de alta al guardar */
  alergias?: string[];
  enfermedades?: string[];
}

/**
 * Guarda el cuestionario de salud del paciente (crea o actualiza) y
 * sincroniza sus alergias y enfermedades crónicas. Devuelve el expediente
 * actualizado, con las alertas ya reflejadas.
 */
export function guardarCuestionario(
  pacienteId: number,
  datos: DatosCuestionario,
): Promise<ExpedientePaciente> {
  return apiFetch<{ datos: ExpedientePaciente }>(`/pacientes/${pacienteId}/cuestionario`, {
    method: 'POST',
    body: JSON.stringify(datos),
  }).then((r) => r.datos);
}

/* ---------------- Citas ---------------- */

export interface Cita {
  id: number;
  personalMedicoId: number;
  personal: string;
  especialidad: string;
  pacienteId: number;
  paciente: string;
  numeroControl: string;
  /** AAAA-MM-DD */
  fecha: string;
  /** HH:mm */
  hora: string;
  motivo: string;
  /** 'Programada' | 'Emergencia' | 'Atención directa' */
  tipo: string;
  /** 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Completada' */
  estatus: string;
}

export interface DatosCita {
  pacienteId: number;
  personalMedicoId: number;
  fecha: string;
  hora: string;
  motivo: string;
  tipo: 'Programada' | 'Emergencia';
}

export function listarCitas(filtro: { fecha?: string; pacienteId?: number } = {}): Promise<Cita[]> {
  const parametros = new URLSearchParams();
  if (filtro.fecha) parametros.set('fecha', filtro.fecha);
  if (filtro.pacienteId) parametros.set('pacienteId', String(filtro.pacienteId));
  const consulta = parametros.toString();
  return apiFetch<{ datos: Cita[] }>(`/citas${consulta ? `?${consulta}` : ''}`).then(
    (r) => r.datos,
  );
}

export function crearCita(datos: DatosCita): Promise<Cita> {
  return apiFetch<{ datos: Cita }>('/citas', {
    method: 'POST',
    body: JSON.stringify(datos),
  }).then((r) => r.datos);
}

export function cambiarEstatusCita(
  id: number,
  estatus: 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Completada',
): Promise<Cita> {
  return apiFetch<{ datos: Cita }>(`/citas/${id}/estatus`, {
    method: 'PATCH',
    body: JSON.stringify({ estatus }),
  }).then((r) => r.datos);
}

/* ---------------- Consultas ---------------- */

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
  cita: { id: number; fecha: string; hora: string; motivo: string; tipo: string; estatus: string };
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

/** Plan alimenticio que se registra junto con la sesión de nutrición */
export interface DatosPlanAlimenticio {
  fechaInicio: string;
  fechaFin: string;
  descripcionDieta: string;
  caloriasDiarias: number;
}

/** Atención completa: auto-cita (si no hay cita previa) + consulta */
export interface DatosAtencion {
  pacienteId: number;
  /** Cita agendada previamente; si no viene, el sistema crea la auto-cita */
  citaId?: number;
  /** Motivo de la atención (se registra en la auto-cita) */
  motivo?: string;
  /** Requerido en consultas médicas y de enfermería (no en nutrición) */
  sintomas?: string;
  exploracion?: string;
  /** Consulta médica (rol Personal médico) */
  diagnostico?: string;
  tratamiento?: string;
  /** Consulta de enfermería (rol Enfermería) */
  intervencionEnfermeria?: string;
  /** Sesión de nutrición: plan alimenticio obligatorio junto con la consulta */
  planAlimenticio?: DatosPlanAlimenticio;
  signosVitales?: {
    ta?: string;
    fc?: number;
    fr?: number;
    temp?: number;
    peso?: number;
    talla?: number;
  };
  insumos?: Array<{ medicamentoId: number; cantidad: number }>;
}

export function crearConsulta(datos: DatosAtencion): Promise<ConsultaDetalle> {
  return apiFetch<{ datos: ConsultaDetalle }>('/consultas', {
    method: 'POST',
    body: JSON.stringify(datos),
  }).then((r) => r.datos);
}

export function listarConsultas(filtro: { pacienteId?: number } = {}): Promise<ConsultaResumen[]> {
  const consulta = filtro.pacienteId ? `?pacienteId=${filtro.pacienteId}` : '';
  return apiFetch<{ datos: ConsultaResumen[] }>(`/consultas${consulta}`).then((r) => r.datos);
}

export function obtenerConsulta(id: number): Promise<ConsultaDetalle> {
  return apiFetch<{ datos: ConsultaDetalle }>(`/consultas/${id}`).then((r) => r.datos);
}

/* ---------------- Utilidades compartidas ---------------- */

/** Edad en años a partir de una fecha AAAA-MM-DD */
export function edadDe(fechaNacimiento: string): number {
  const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);
  if (Number.isNaN(nacimiento.getTime())) return 0;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return Math.max(0, edad);
}

/** Fecha de hoy en el navegador, AAAA-MM-DD */
export function hoyISO(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(
    hoy.getDate(),
  ).padStart(2, '0')}`;
}

/* ---------------- Planes alimenticios ---------------- */

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

export interface DatosPlan {
  /** Requerido al crear */
  pacienteId?: number;
  fechaInicio: string;
  fechaFin: string;
  descripcionDieta: string;
  caloriasDiarias: number;
}

export function listarPlanes(
  filtro: { pacienteId?: number; personalMedicoId?: number } = {},
): Promise<PlanAlimenticio[]> {
  const parametros = new URLSearchParams();
  if (filtro.pacienteId) parametros.set('pacienteId', String(filtro.pacienteId));
  if (filtro.personalMedicoId) parametros.set('personalMedicoId', String(filtro.personalMedicoId));
  const consulta = parametros.toString();
  return apiFetch<{ datos: PlanAlimenticio[] }>(`/planes${consulta ? `?${consulta}` : ''}`).then(
    (r) => r.datos,
  );
}

export function crearPlan(datos: DatosPlan & { pacienteId: number }): Promise<PlanAlimenticio> {
  return apiFetch<{ datos: PlanAlimenticio }>('/planes', {
    method: 'POST',
    body: JSON.stringify(datos),
  }).then((r) => r.datos);
}

export function actualizarPlan(id: number, datos: DatosPlan): Promise<PlanAlimenticio> {
  return apiFetch<{ datos: PlanAlimenticio }>(`/planes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }).then((r) => r.datos);
}

export function cambiarEstatusPlan(
  id: number,
  estatus: 'Por iniciar' | 'Vigente' | 'Finalizado' | 'Cancelado',
): Promise<PlanAlimenticio> {
  return apiFetch<{ datos: PlanAlimenticio }>(`/planes/${id}/estatus`, {
    method: 'PATCH',
    body: JSON.stringify({ estatus }),
  }).then((r) => r.datos);
}

/* ---------------- Seguimiento (peso y talla) ---------------- */

/** Registro de peso y talla (una medición de una sesión de nutrición) */
export interface RegistroSeguimiento {
  /** AAAA-MM-DD HH:mm de la sesión */
  fecha: string;
  peso: number | null;
  talla: number | null;
  /** Consulta de nutrición de la que proviene la medición */
  consultaId: number;
}

/** Avance de peso y talla: solo las mediciones de las sesiones de nutrición */
export function listarSeguimiento(pacienteId: number): Promise<RegistroSeguimiento[]> {
  return apiFetch<{ datos: RegistroSeguimiento[] }>(`/pacientes/${pacienteId}/seguimiento`).then(
    (r) => r.datos,
  );
}

/* ---------------- Disponibilidad de agenda ---------------- */

/** Duración de una cita y el respiro mínimo entre citas (minutos) */
export const DURACION_CITA = 30;
export const SEPARACION_MINIMA = 60; // 30 de sesión + 30 de respiro

/** "08:30" → 510 */
function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** 510 → "08:30" */
function hhmm(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}

/** Día de la semana de una fecha AAAA-MM-DD (1=Lunes … 7=Domingo) */
export function diaDeSemana(fecha: string): number {
  const partes = fecha.split('-').map(Number);
  const anio = partes[0] ?? 1970;
  const mes = partes[1] ?? 1;
  const dia = partes[2] ?? 1;
  return ((new Date(anio, mes - 1, dia).getDay() + 6) % 7) + 1;
}

/** Rangos de atención del personal para una fecha concreta */
export function rangosDeDia(
  horarios: Horario[],
  fecha: string,
): Array<{ inicio: string; fin: string }> {
  const dia = diaDeSemana(fecha);
  return horarios
    .filter((horario) => horario.diaSemana === dia)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
    .map((horario) => ({ inicio: horario.horaInicio, fin: horario.horaFin }));
}

/**
 * Horas de inicio disponibles dentro de los rangos de atención, respetando
 * la regla de agenda: cada cita dura `DURACION_CITA` minutos y después hay
 * `SEPARACION_MINIMA - DURACION_CITA` minutos de respiro (las citas quedan
 * cada 60 minutos). Las horas que chocan con las citas pasadas se descartan.
 */
export function horasDisponiblesPara(
  rangos: Array<{ inicio: string; fin: string }>,
  citas: Array<{ hora: string; estatus: string }>,
): string[] {
  const ocupadas = citas
    .filter((cita) => cita.estatus !== 'Cancelada')
    .map((cita) => aMinutos(cita.hora));

  const opciones: string[] = [];
  for (const rango of rangos) {
    let minutos = aMinutos(rango.inicio);
    const limite = aMinutos(rango.fin);
    while (minutos + DURACION_CITA <= limite) {
      const libre = ocupadas.every(
        (ocupada) => Math.abs(ocupada - minutos) >= SEPARACION_MINIMA,
      );
      if (libre) opciones.push(hhmm(minutos));
      minutos += SEPARACION_MINIMA;
    }
  }
  return [...new Set(opciones)];
}

/** "2026-10-15" → "15 oct 2026" */
export function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  if (!anio || !mes || !dia) return fecha;
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
