import { PACIENTES, type Paciente, type EstatusCita } from '../clinica/datos';
import type { BadgeStatus } from '../ui/Badge';

/* ============================================================
   DATOS DEMO · Portal del paciente
   Citas propias del paciente en las áreas de especialidad
   ============================================================ */

export type Area = 'Odontología' | 'Nutrición';

export interface CitaPaciente {
  id: number;
  area: Area;
  fecha: string; // ISO: 2026-10-02
  hora: string; // 10:00
  motivo: string;
  profesional: string;
  estatus: EstatusCita;
}

/** Persona que usa el portal (demo) */
export const PACIENTE_ACTUAL: Paciente = PACIENTES[0]; // Lucía Torres

export const PROFESIONALES: Record<Area, string> = {
  Odontología: 'Dra. Paola Janeth',
  'Nutrición': 'Nut. Andrea Domínguez',
};

/** Motivos sugeridos por área para agendar */
export const MOTIVOS_POR_AREA: Record<Area, string[]> = {
  Odontología: [
    'Consulta general',
    'Dolor dental',
    'Control de ortodoncia',
    'Limpieza dental',
    'Emergencia dental',
  ],
  'Nutrición': [
    'Plan alimenticio',
    'Seguimiento de plan',
    'Consulta inicial',
    'Control de peso',
  ],
};

/** Estatus de las citas (ENUM de la tabla `cita`) */
export const BADGE_POR_ESTATUS: Record<EstatusCita, BadgeStatus> = {
  Pendiente: 'pending',
  Confirmada: 'confirmed',
  Cancelada: 'cancelled',
  Completada: 'completed',
};

/** ¿La cita aún está por venir? */
export const esProxima = (cita: CitaPaciente, hoy = new Date()): boolean => {
  const fecha = new Date(`${cita.fecha}T00:00:00`);
  const hoyISO = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return fecha >= hoyISO && (cita.estatus === 'Pendiente' || cita.estatus === 'Confirmada');
};

/** Color del badge según el área */
export const AREA_BADGE: Record<Area, { status: BadgeStatus; label: string }> = {
  Odontología: { status: 'completed', label: 'Odontología' },
  'Nutrición': { status: 'confirmed', label: 'Nutrición' },
};

/* ---------------- Citas del paciente (demo) ---------------- */
export const CITAS_PACIENTE: CitaPaciente[] = [
  { id: 1, area: 'Odontología', fecha: '2026-10-02', hora: '10:00', motivo: 'Revisión de obturación', profesional: PROFESIONALES['Odontología'], estatus: 'Confirmada' },
  { id: 2, area: 'Nutrición', fecha: '2026-10-09', hora: '09:30', motivo: 'Seguimiento de plan', profesional: PROFESIONALES['Nutrición'], estatus: 'Pendiente' },
  { id: 3, area: 'Odontología', fecha: '2026-09-12', hora: '10:30', motivo: 'Dolor en molar superior', profesional: PROFESIONALES['Odontología'], estatus: 'Completada' },
  { id: 4, area: 'Nutrición', fecha: '2026-09-05', hora: '12:00', motivo: 'Consulta inicial', profesional: PROFESIONALES['Nutrición'], estatus: 'Completada' },
  { id: 5, area: 'Odontología', fecha: '2026-08-20', hora: '11:00', motivo: 'Limpieza dental', profesional: PROFESIONALES['Odontología'], estatus: 'Completada' },
  { id: 6, area: 'Odontología', fecha: '2026-07-15', hora: '09:00', motivo: 'Control de ortodoncia', profesional: PROFESIONALES['Odontología'], estatus: 'Cancelada' },
  { id: 7, area: 'Odontología', fecha: '2026-05-02', hora: '09:00', motivo: 'Control post-ortodoncia', profesional: PROFESIONALES['Odontología'], estatus: 'Completada' },
  { id: 8, area: 'Nutrición', fecha: '2026-04-18', hora: '16:00', motivo: 'Evaluación antropométrica', profesional: PROFESIONALES['Nutrición'], estatus: 'Completada' },
];

/** Fecha larga legible: 2026-10-02 → "viernes, 2 de octubre" */
export const fechaLarga = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

/** Fecha corta con año: 2026-10-02 → "2 oct 2026" */
export const fechaConAnio = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
