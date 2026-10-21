import { z } from 'zod';

/**
 * Validaciones de los planes alimenticios (`plan_alimenticio`).
 *
 * Un plan lo lleva el personal de nutrición para un paciente: indica la
 * dieta, las calorías diarias y su vigencia. El estatus avanza entre
 * 'Por iniciar', 'Vigente', 'Finalizado' y 'Cancelado'.
 */

export const ESTATUS_PLAN = ['Por iniciar', 'Vigente', 'Finalizado', 'Cancelado'] as const;

const idPositivo = (mensaje: string) =>
  z.coerce.number({ error: mensaje }).int(mensaje).positive(mensaje);

/** Fecha AAAA-MM-DD válida */
const fechaValida = z
  .string({ error: 'La fecha es obligatoria.' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD.');

/** Campos comunes del plan alimenticio */
const camposPlan = {
  fechaInicio: fechaValida,
  fechaFin: fechaValida,
  descripcionDieta: z
    .string({ error: 'Describe la dieta.' })
    .trim()
    .min(1, 'Describe la dieta.')
    .max(4000, 'La descripción de la dieta no puede exceder 4000 caracteres.'),
  caloriasDiarias: z.coerce
    .number({ error: 'Las calorías diarias deben ser un número.' })
    .int('Las calorías diarias deben ser un número entero.')
    .min(500, 'Las calorías diarias deben ser al menos 500.')
    .max(10000, 'Las calorías diarias no pueden exceder 10,000.'),
};

/** El periodo del plan debe ser coherente (fin no anterior al inicio) */
function validarPeriodo(
  datos: { fechaInicio: string; fechaFin: string },
  contexto: z.RefinementCtx,
): void {
  if (datos.fechaFin < datos.fechaInicio) {
    contexto.addIssue({
      code: 'custom',
      message: 'La fecha de fin no puede ser anterior a la de inicio.',
      path: ['fechaFin'],
    });
  }
}

export const esquemaCrearPlan = z
  .object({
    pacienteId: idPositivo('Selecciona un paciente.'),
    ...camposPlan,
  })
  .superRefine(validarPeriodo);

export const esquemaActualizarPlan = z.object(camposPlan).superRefine(validarPeriodo);

export const esquemaEstatusPlan = z.object({
  estatus: z.enum(ESTATUS_PLAN, { error: 'El estatus del plan no es válido.' }),
});

export type DatosCrearPlan = z.infer<typeof esquemaCrearPlan>;
export type DatosActualizarPlan = z.infer<typeof esquemaActualizarPlan>;
export type DatosEstatusPlan = z.infer<typeof esquemaEstatusPlan>;
