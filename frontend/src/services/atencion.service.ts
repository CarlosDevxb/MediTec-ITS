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

/** Última medición de peso y talla registrada del paciente */
export interface UltimaMedicion {
  peso: number | null;
  talla: number | null;
  /** AAAA-MM-DD HH:mm */
  fecha: string;
}

export interface ExpedientePaciente extends PacienteResumen {
  antecedentes: string;
  /** AAAA-MM-DD HH:mm */
  aperturaExpediente: string;
  alergias: string[];
  enfermedades: string[];
  cuestionario: CuestionarioSalud | null;
  /** Último peso y talla (signos de consultas o cuestionario); se precargan al atender */
  ultimaMedicion: UltimaMedicion | null;
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

/** Reagenda una cita: cambia su fecha y su hora (con las reglas de la agenda) */
export function reagendarCita(id: number, datos: { fecha: string; hora: string }): Promise<Cita> {
  return apiFetch<{ datos: Cita }>(`/citas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }).then((r) => r.datos);
}

/* ============================================================
   DISPONIBILIDAD · los huecos que se pueden elegir

   El servidor calcula la rejilla del día con las reglas de la
   agenda (sesión de 30 min con 30 de respiro, dentro del turno y
   sin pasadas). La interfaz solo dibuja estos datos: no los
   recalcula, para que no haya dos versiones de las reglas.
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
  /** Rejilla del día: un hueco por cada 30 minutos dentro de los turnos */
  slots: SlotDisponibilidad[];
  /** Horas con cita no cancelada (sin datos de pacientes) */
  horasOcupadas: string[];
}

/** Un día que sirve para agendar: tiene horario y al menos un hueco libre */
export interface DiaDisponible {
  fecha: string;
  horasLibres: number;
}

/**
 * Disponibilidad de un día. `excluirCitaId` se usa al reagendar: la cita que
 * se mueve no debe bloquear su propia hora ni su propio día.
 */
export function obtenerDisponibilidad(
  personalMedicoId: number,
  fecha: string,
  excluirCitaId?: number,
): Promise<DisponibilidadDia> {
  const excluir = excluirCitaId ? `&excluirCitaId=${excluirCitaId}` : '';
  return apiFetch<{ datos: DisponibilidadDia }>(
    `/citas/disponibilidad?personalMedicoId=${personalMedicoId}&fecha=${fecha}${excluir}`,
  ).then((r) => r.datos);
}

/**
 * Días útiles del personal en un rango (máximo 62 días): los que tienen
 * horario y al menos un hueco libre, con el número de horas disponibles.
 */
export function obtenerDiasDisponibles(
  personalMedicoId: number,
  desde: string,
  hasta: string,
  excluirCitaId?: number,
): Promise<DiaDisponible[]> {
  const excluir = excluirCitaId ? `&excluirCitaId=${excluirCitaId}` : '';
  return apiFetch<{ datos: { dias: DiaDisponible[] } }>(
    `/citas/disponibilidad/dias?personalMedicoId=${personalMedicoId}&desde=${desde}&hasta=${hasta}${excluir}`,
  ).then((r) => r.datos.dias);
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

/** Historial de consultas (filtro opcional: personalMedicoId para "solo las mías") */
export function listarConsultas(
  filtro: { pacienteId?: number; personalMedicoId?: number } = {},
): Promise<ConsultaResumen[]> {
  const parametros = new URLSearchParams();
  if (filtro.pacienteId) parametros.set('pacienteId', String(filtro.pacienteId));
  if (filtro.personalMedicoId) parametros.set('personalMedicoId', String(filtro.personalMedicoId));
  const consulta = parametros.toString();
  return apiFetch<{ datos: ConsultaResumen[] }>(`/consultas${consulta ? `?${consulta}` : ''}`).then(
    (r) => r.datos,
  );
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

/* ---------------- Alergias vs. medicamentos ----------------
   Mismo criterio que `backend/src/utils/alergias.ts`: la comparación es
   textual (minúsculas, sin acentos) entre el nombre del medicamento y el
   término de la alergia. "Paracetamol 500 mg" choca con "Paracetamol". */

/** Minúsculas, sin acentos y sin espacios dobles, para comparar nombres */
export function normalizarNombre(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Devuelve la alergia registrada que impide dispensar el medicamento, o
 * `null` si no hay choque. Los términos de menos de 4 caracteres se ignoran
 * para evitar falsos positivos.
 */
export function alergiaEnConflicto(
  nombreMedicamento: string,
  alergias: readonly string[],
): string | null {
  const medicamento = normalizarNombre(nombreMedicamento);
  if (!medicamento) return null;

  for (const alergia of alergias) {
    const termino = normalizarNombre(alergia);
    if (termino.length < 4) continue;
    if (medicamento.includes(termino)) return alergia;
    if (medicamento.length >= 4 && termino.includes(medicamento)) return alergia;
  }
  return null;
}

/* ---------------- Nombres clínicos ----------------
   Mismo criterio que `backend/src/validaciones/comunes.ts`: lo que se
   escribe como alergia o enfermedad se limita a texto razonable y se
   normaliza, para que no entre basura ni conceptos duplicados. */

/** Nombre clínico normalizado: espacios colapsados y mayúscula inicial */
export function normalizarNombreClinico(texto: string): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : limpio;
}

/** Devuelve el problema del nombre, o cadena vacía si es válido */
export function errorNombreClinico(texto: string): string {
  const nombre = texto.trim();
  if (nombre.length < 3) return 'El nombre debe tener al menos 3 caracteres.';
  if (nombre.length > 100) return 'El nombre no puede exceder 100 caracteres.';
  if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9][A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .,()&+-]*$/.test(nombre)) {
    return 'Usa solo letras, números y signos de puntuación (sin emojis ni símbolos).';
  }
  if ((nombre.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) ?? []).length < 2) {
    return 'El nombre debe contener al menos dos letras.';
  }
  if (/(.)\1{2,}/.test(nombre)) {
    return 'El nombre no debe repetir la misma letra tres veces seguidas.';
  }
  return '';
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

/**
 * Avance de peso y talla: solo las mediciones de las sesiones de nutrición.
 * Con `personalMedicoId` se acota a las sesiones de ese profesional.
 */
export function listarSeguimiento(
  pacienteId: number,
  personalMedicoId?: number,
): Promise<RegistroSeguimiento[]> {
  const consulta = personalMedicoId ? `?personalMedicoId=${personalMedicoId}` : '';
  return apiFetch<{ datos: RegistroSeguimiento[] }>(
    `/pacientes/${pacienteId}/seguimiento${consulta}`,
  ).then((r) => r.datos);
}

/* ---------------- Disponibilidad de agenda ---------------- */

/** Duración de una cita y el respiro mínimo entre citas (minutos) */
export const DURACION_CITA = 30;
export const SEPARACION_MINIMA = 60; // 30 de sesión + 30 de respiro

/** Día de la semana de una fecha AAAA-MM-DD (1=Lunes … 7=Domingo) */
export function diaDeSemana(fecha: string): number {
  const partes = fecha.split('-').map(Number);
  const anio = partes[0] ?? 1970;
  const mes = partes[1] ?? 1;
  const dia = partes[2] ?? 1;
  return ((new Date(anio, mes - 1, dia).getDay() + 6) % 7) + 1;
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
