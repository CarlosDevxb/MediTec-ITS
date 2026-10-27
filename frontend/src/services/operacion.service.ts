import { apiFetch } from './api';
import { listarValoresCatalogo, type ValorCatalogo } from './administracion.service';
import type { ResultadoImportacion } from './excel.service';

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

export function listarHorarios(filtro: { personalMedicoId?: number } = {}): Promise<Horario[]> {
  const consulta = filtro.personalMedicoId
    ? `?personalMedicoId=${filtro.personalMedicoId}`
    : '';
  return apiFetch<{ datos: Horario[] }>(`/horarios${consulta}`).then((r) => r.datos);
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

/* ---------------- Turnos completos (varios días, un solo bloque) ---------------- */

/**
 * Turno tal como se presenta al usuario: una persona, un rango de horas y
 * todos los días en los que aplica. Debajo sigue habiendo una fila por día
 * en la tabla `horarios`; aquí se agrupan para no mostrar "4 turnos" cuando
 * en realidad es uno solo.
 */
export interface TurnoHorario {
  /** Identificación estable del bloque (personal + rango de horas) */
  clave: string;
  personalMedicoId: number;
  personal: string;
  especialidad: string;
  /** Formato HH:mm */
  horaInicio: string;
  /** Formato HH:mm */
  horaFin: string;
  /** Días del turno, ordenados (1=Lunes … 5=Viernes) */
  dias: number[];
  /** Filas originales, una por día */
  horarios: Horario[];
}

/** Agrupa las filas de horarios en turnos (personal + rango de horas) */
export function agruparHorariosEnTurnos(horarios: Horario[]): TurnoHorario[] {
  const porClave = new Map<string, TurnoHorario>();

  for (const horario of horarios) {
    const clave = `${horario.personalMedicoId}|${horario.horaInicio}|${horario.horaFin}`;
    const turno = porClave.get(clave);
    if (turno) {
      turno.dias.push(horario.diaSemana);
      turno.horarios.push(horario);
    } else {
      porClave.set(clave, {
        clave,
        personalMedicoId: horario.personalMedicoId,
        personal: horario.personal,
        especialidad: horario.especialidad,
        horaInicio: horario.horaInicio,
        horaFin: horario.horaFin,
        dias: [horario.diaSemana],
        horarios: [horario],
      });
    }
  }

  for (const turno of porClave.values()) turno.dias.sort((a, b) => a - b);
  return [...porClave.values()];
}

/** Identificación de un turno completo (personal + rango de horas) */
export interface IdentidadTurno {
  personalMedicoId: number;
  horaInicio: string;
  horaFin: string;
}

/** Reemplazo de un turno completo: sus nuevos días y, si se mueven, sus horas */
export interface DatosActualizarTurno extends IdentidadTurno {
  nuevaHoraInicio: string;
  nuevaHoraFin: string;
  dias: number[];
}

/** Edita un turno completo (todos sus días) en una sola transacción */
export function actualizarTurno(datos: DatosActualizarTurno): Promise<Horario[]> {
  return apiFetch<{ datos: Horario[] }>('/horarios/turno', {
    method: 'PUT',
    body: JSON.stringify(datos),
  }).then((r) => r.datos);
}

/** Elimina un turno completo (todos sus días) en una sola transacción */
export function eliminarTurno(datos: IdentidadTurno): Promise<void> {
  return apiFetch<unknown>('/horarios/turno', {
    method: 'DELETE',
    body: JSON.stringify(datos),
  }).then(() => undefined);
}

/** Días en lenguaje natural: "lunes, martes y miércoles" */
export function diasEnTexto(dias: number[]): string {
  const nombres = [...dias].sort((a, b) => a - b).map((dia) => nombreDeDia(dia).toLowerCase());
  if (nombres.length === 0) return '';
  if (nombres.length === 1) return nombres[0];
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/* ---------------- Medicamentos ---------------- */

/**
 * Categorías del inventario. Cada tipo de consulta usa las suyas:
 * enfermería: Insumo y Medicamento común; odontología: Medicamento común,
 * Medicamento especial e Insumo dental; el personal médico puede usar todas.
 */
export const CATEGORIAS_MEDICAMENTO = [
  'Insumo',
  'Medicamento común',
  'Medicamento especial',
  'Insumo dental',
] as const;

export interface Medicamento {
  id: number;
  unidadId: number;
  /** Nombre de la unidad de medida (catálogo `unidades_medida`) */
  unidad: string;
  abreviatura: string;
  nombre: string;
  /** 'Insumo' | 'Medicamento común' | 'Medicamento especial' */
  categoria: string;
  stock: number;
  descripcion: string;
  /** false con stock en 0: no disponible para usarlo en consultas */
  disponible: boolean;
}

export interface DatosMedicamento {
  nombre: string;
  /** 'Insumo' | 'Medicamento común' | 'Medicamento especial' */
  categoria?: string;
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
 * Alta masiva de medicamentos desde un archivo de Excel.
 * Recibe las filas ya leídas del archivo y devuelve el resultado por fila.
 */
export function importarMedicamentos(
  filas: Array<Record<string, string>>,
): Promise<ResultadoImportacion> {
  return apiFetch<{ datos: ResultadoImportacion }>('/medicamentos/importar', {
    method: 'POST',
    body: JSON.stringify({ filas }),
  }).then((r) => r.datos);
}

/**
 * Unidades de medida del inventario: se administran desde la sección
 * Catálogos y aquí solo se leen para los formularios.
 */
export function listarUnidadesMedida(): Promise<ValorCatalogo[]> {
  return listarValoresCatalogo('unidades_medida');
}
