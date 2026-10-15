import { apiFetch } from './api';
import { listarValoresCatalogo, type ValorCatalogo } from './administracion.service';

/* ============================================================
   OPERACIÓN · Cliente de la API para los horarios del personal
   y el inventario de medicamentos (módulo Operación del panel
   de administración). Todas las funciones devuelven datos
   tipados y lanzan errores con mensaje en español (ver `api.ts`).
   ============================================================ */

/* ---------------- Días de la semana ---------------- */

/**
 * Semana laboral de la clínica: 1=Lunes … 5=Viernes.
 * Son los mismos valores que guarda `horarios.dia_semana` (sin fin de
 * semana: los días 6 y 7 no existen para el sistema).
 */
export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] as const;

/** 'Lunes'…'Viernes' a partir del número de día del esquema */
export function nombreDeDia(diaSemana: number): string {
  return DIAS_SEMANA[diaSemana - 1] ?? `Día ${diaSemana}`;
}

/* ---------------- Personal médico ---------------- */

export interface PersonalMedico {
  /** id_personal_medico: el que referencian los horarios */
  id: number;
  nombre: string;
  especialidad: string;
  cedula: string;
}

/** Personal clínico activo (roles con cédula: Personal médico y Enfermería) */
export function listarPersonalMedico(): Promise<PersonalMedico[]> {
  return apiFetch<{ datos: PersonalMedico[] }>('/personal-medico').then((r) => r.datos);
}

/* ---------------- Horarios ---------------- */

export interface Horario {
  id: number;
  personalMedicoId: number;
  personal: string;
  especialidad: string;
  /** 1=Lunes … 5=Viernes */
  diaSemana: number;
  /** Formato HH:mm */
  horaInicio: string;
  /** Formato HH:mm */
  horaFin: string;
}

/** Alta múltiple: se crea un turno por cada día marcado */
export interface DatosHorarios {
  personalMedicoId: number;
  dias: number[];
  horaInicio: string;
  horaFin: string;
}

/** Edición de un turno existente (un solo día) */
export interface DatosHorario {
  personalMedicoId: number;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

export function listarHorarios(): Promise<Horario[]> {
  return apiFetch<{ datos: Horario[] }>('/horarios').then((r) => r.datos);
}

export function crearHorarios(datos: DatosHorarios): Promise<Horario[]> {
  return apiFetch<{ datos: Horario[] }>('/horarios', {
    method: 'POST',
    body: JSON.stringify(datos),
  }).then((r) => r.datos);
}

export function actualizarHorario(id: number, datos: DatosHorario): Promise<Horario> {
  return apiFetch<{ datos: Horario }>(`/horarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }).then((r) => r.datos);
}

export function eliminarHorario(id: number): Promise<void> {
  return apiFetch<unknown>(`/horarios/${id}`, { method: 'DELETE' }).then(() => undefined);
}

/* ---------------- Medicamentos ---------------- */

export interface Medicamento {
  id: number;
  unidadId: number;
  /** Nombre de la unidad de medida (catálogo `unidades_medida`) */
  unidad: string;
  abreviatura: string;
  nombre: string;
  stock: number;
  descripcion: string;
  /** false con stock en 0: no disponible para usarlo en consultas */
  disponible: boolean;
}

export interface DatosMedicamento {
  nombre: string;
  unidadId: number;
  stock: number;
  descripcion?: string;
}

export function listarMedicamentos(): Promise<Medicamento[]> {
  return apiFetch<{ datos: Medicamento[] }>('/medicamentos').then((r) => r.datos);
}

export function crearMedicamento(datos: DatosMedicamento): Promise<Medicamento> {
  return apiFetch<{ datos: Medicamento }>('/medicamentos', {
    method: 'POST',
    body: JSON.stringify(datos),
  }).then((r) => r.datos);
}

export function actualizarMedicamento(id: number, datos: DatosMedicamento): Promise<Medicamento> {
  return apiFetch<{ datos: Medicamento }>(`/medicamentos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  }).then((r) => r.datos);
}

/**
 * Unidades de medida del inventario: se administran desde la sección
 * Catálogos y aquí solo se leen para los formularios.
 */
export function listarUnidadesMedida(): Promise<ValorCatalogo[]> {
  return listarValoresCatalogo('unidades_medida');
}
