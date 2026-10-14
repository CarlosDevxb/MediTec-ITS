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
