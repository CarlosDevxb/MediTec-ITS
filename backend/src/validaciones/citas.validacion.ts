import { z } from 'zod';
import { hoyISO } from '../utils/fechas';

/**
 * Validaciones de citas.
 *
 * El tipo 'Atención directa' y el estatus que emana de una atención sin cita
 * previa solo los asigna el sistema al registrar una consulta; aquí se
 * validan las citas que se capturan por interfaz (agendas de doctor y
 * enfermería).
 */

export const TIPOS_CITA = ['Programada', 'Emergencia', 'Atención directa'] as const;
export const ESTATUS_CITA = ['Pendiente', 'Confirmada', 'Cancelada', 'Completada'] as const;

const idPositivo = (mensaje: string) =>
  z.coerce.number({ error: mensaje }).int(mensaje).positive(mensaje);

/** Hora en formato 24 h HH:mm (la columna es TIME) */
const horaValida = z
  .string({ error: 'La hora es obligatoria.' })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener el formato HH:mm.');

/** Fecha AAAA-MM-DD, hoy o futura (una cita no se agenda en el pasado) */
const fechaValida = z
  .string({ error: 'La fecha es obligatoria.' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD.')
  .refine((valor) => valor >= hoyISO(), 'La fecha no puede ser pasada.');

export const esquemaCrearCita = z.object({
  pacienteId: idPositivo('Selecciona un paciente.'),
  personalMedicoId: idPositivo('Selecciona al profesional de la salud.'),
  fecha: fechaValida,
  hora: horaValida,
  motivo: z
    .string({ error: 'El motivo de la cita es obligatorio.' })
    .trim()
    .min(1, 'El motivo de la cita es obligatorio.')
    .max(255, 'El motivo no puede exceder 255 caracteres.'),
  tipo: z.enum(['Programada', 'Emergencia'], {
    error: 'El tipo debe ser Programada o Emergencia.',
  }),
});

export const esquemaEstatusCita = z.object({
  estatus: z.enum(ESTATUS_CITA, { error: 'El estatus no es válido.' }),
});

export type DatosCrearCita = z.infer<typeof esquemaCrearCita>;
export type DatosEstatusCita = z.infer<typeof esquemaEstatusCita>;
