import { z } from 'zod';

/**
 * Validaciones de los horarios del personal.
 *
 * La clínica solo opera de lunes a viernes: los días 6 (sábado) y 7 (domingo)
 * se rechazan aquí y tampoco se ofrecen en la interfaz. El formato de hora y
 * el rango los comprueba Zod; que el personal exista y que el turno no esté
 * duplicado (mismo personal, mismo día y mismo rango) se decide en el
 * servicio, porque requiere consultar la base.
 */

/** Día de la semana del esquema: 1=Lunes … 5=Viernes (sin fin de semana) */
export const DIAS_LABORABLES = [1, 2, 3, 4, 5] as const;

/** Etiqueta del día para los mensajes al cliente */
export const NOMBRES_DIA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] as const;

/** Hora en formato 24 h HH:mm (la columna es TIME) */
const horaValida = z
  .string({ error: 'La hora es obligatoria.' })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener el formato HH:mm.');

/** Día laboral del 1 al 5 */
const diaValido = z.coerce
  .number({ error: 'Selecciona un día de la semana.' })
  .int('Selecciona un día de la semana válido.')
  .refine((dia) => dia >= 1 && dia <= 5, 'Solo hay turno de lunes a viernes.');

/** Personal del que depende el turno */
const personalValido = z.coerce
  .number({ error: 'Selecciona un miembro del personal.' })
  .int('Selecciona un miembro del personal válido.')
  .positive('Selecciona un miembro del personal válido.');

/** La hora de fin siempre después de la de inicio */
function validarRango(
  datos: { horaInicio: string; horaFin: string },
  contexto: z.RefinementCtx,
): void {
  if (datos.horaInicio >= datos.horaFin) {
    contexto.addIssue({
      code: 'custom',
      message: 'La hora de fin debe ser posterior a la hora de inicio.',
      path: ['horaFin'],
    });
  }
}

/** Alta múltiple: un turno por cada día marcado (la interfaz ofrece 1-5) */
export const esquemaCrearHorarios = z
  .object({
    personalMedicoId: personalValido,
    dias: z
      .array(diaValido, { error: 'Selecciona al menos un día de la semana.' })
      .min(1, 'Selecciona al menos un día de la semana.')
      .max(5, 'La semana laboral solo tiene cinco días.')
      .refine((dias) => new Set(dias).size === dias.length, 'Un día no puede repetirse.'),
    horaInicio: horaValida,
    horaFin: horaValida,
  })
  .superRefine(validarRango);

/** Edición: un solo turno (un solo día) */
export const esquemaActualizarHorario = z
  .object({
    personalMedicoId: personalValido,
    diaSemana: diaValido,
    horaInicio: horaValida,
    horaFin: horaValida,
  })
  .superRefine(validarRango);

export type DatosHorarios = z.infer<typeof esquemaCrearHorarios>;
export type DatosHorario = z.infer<typeof esquemaActualizarHorario>;
