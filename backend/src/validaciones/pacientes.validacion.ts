import { z } from 'zod';
import { esquemaActualizarUsuario } from './usuarios.validacion';

/**
 * Validaciones de pacientes (expedientes clínicos).
 *
 * El alta de un paciente es una cuenta con rol Paciente más su expediente:
 * por eso los campos de la cuenta se reutilizan del módulo de usuarios (sin
 * `rolId`, que siempre es Paciente, ni `estatus`) y aquí solo se agregan los
 * datos propios del expediente.
 */

export const TIPOS_SANGRE = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const;

/** Alta de paciente: cuenta + expediente (tipo de sangre y antecedentes) */
export const esquemaCrearPaciente = esquemaActualizarUsuario
  .omit({ rolId: true, estatus: true })
  .extend({
    tipoSangre: z
      .enum(TIPOS_SANGRE, { error: 'El tipo de sangre no es válido.' })
      .optional()
      .or(z.literal('')),
    antecedentes: z
      .string()
      .trim()
      .max(2000, 'Los antecedentes no pueden exceder 2000 caracteres.')
      .optional()
      .or(z.literal('')),
    contrasena: z
      .string()
      .trim()
      .min(8, 'La contraseña debe tener al menos 8 caracteres.')
      .max(72, 'La contraseña no puede exceder 72 caracteres.')
      .optional()
      .or(z.literal('')),
  });

/** Actualización del expediente (solo los datos propios del paciente) */
export const esquemaActualizarExpediente = z.object({
  tipoSangre: z
    .enum(TIPOS_SANGRE, { error: 'El tipo de sangre no es válido.' })
    .optional()
    .or(z.literal('')),
  antecedentes: z
    .string()
    .trim()
    .max(2000, 'Los antecedentes no pueden exceder 2000 caracteres.')
    .optional()
    .or(z.literal('')),
});

export type DatosCrearPaciente = z.infer<typeof esquemaCrearPaciente>;
export type DatosActualizarExpediente = z.infer<typeof esquemaActualizarExpediente>;
