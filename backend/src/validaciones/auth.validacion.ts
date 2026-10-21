import { z } from 'zod';

/** Esquema del cuerpo de la petición de inicio de sesión */
export const esquemaLogin = z.object({
  numeroControl: z
    .string({ error: 'El número de control es obligatorio.' })
    .trim()
    .min(3, 'El número de control debe tener al menos 3 caracteres.')
    .max(20, 'El número de control no puede exceder 20 caracteres.'),
  contrasena: z
    .string({ error: 'La contraseña es obligatoria.' })
    .min(1, 'La contraseña es obligatoria.')
    .max(255, 'La contraseña no puede exceder 255 caracteres.'),
});

export type DatosLogin = z.infer<typeof esquemaLogin>;

/**
 * Esquema de actualización del propio perfil.
 * El correo no se toca nunca desde aquí: es el identificador de la cuenta.
 * Para cambiar la contraseña se exige la contraseña actual.
 */
export const esquemaActualizarPerfil = z
  .object({
    telefono: z
      .string()
      .trim()
      .max(20, 'El teléfono no puede exceder 20 caracteres.')
      .optional()
      .or(z.literal('')),
    contrasenaActual: z
      .string()
      .max(72, 'La contraseña no puede exceder 72 caracteres.')
      .optional()
      .or(z.literal('')),
    contrasenaNueva: z
      .string()
      .trim()
      .min(8, 'La contraseña nueva debe tener al menos 8 caracteres.')
      .max(72, 'La contraseña no puede exceder 72 caracteres.')
      .optional()
      .or(z.literal('')),
  })
  .superRefine((datos, contexto) => {
    if (datos.contrasenaNueva && !datos.contrasenaActual) {
      contexto.addIssue({
        code: 'custom',
        message: 'Escribe tu contraseña actual para poder cambiarla.',
        path: ['contrasenaActual'],
      });
    }
    if (
      datos.contrasenaNueva &&
      datos.contrasenaActual &&
      datos.contrasenaNueva === datos.contrasenaActual
    ) {
      contexto.addIssue({
        code: 'custom',
        message: 'La contraseña nueva debe ser distinta a la actual.',
        path: ['contrasenaNueva'],
      });
    }
    if (datos.contrasenaNueva === undefined && datos.telefono === undefined) {
      contexto.addIssue({
        code: 'custom',
        message: 'No hay cambios que guardar.',
        path: ['body'],
      });
    }
  });

export type DatosActualizarPerfil = z.infer<typeof esquemaActualizarPerfil>;
