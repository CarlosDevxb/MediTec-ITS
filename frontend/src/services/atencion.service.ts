import { apiFetch } from './api';

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
}

/** Atención completa: auto-cita (si no hay cita previa) + consulta */
export interface DatosAtencion {
  pacienteId: number;
  /** Cita agendada previamente; si no viene, el sistema crea la auto-cita */
  citaId?: number;
  /** Motivo de la atención (se registra en la auto-cita) */
  motivo?: string;
  sintomas: string;
  exploracion?: string;
  /** Consulta médica (rol Personal médico) */
  diagnostico?: string;
  tratamiento?: string;
  /** Consulta de enfermería (rol Enfermería) */
  intervencionEnfermeria?: string;
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
