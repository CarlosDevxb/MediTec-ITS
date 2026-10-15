import { z } from 'zod';

/** Esquema para crear y editar un rol */
export const esquemaRol = z.object({
  nombre: z
    .string({ error: 'El nombre del rol es obligatorio.' })
    .trim()
    .min(3, 'El nombre del rol debe tener al menos 3 caracteres.')
    .max(50, 'El nombre del rol no puede exceder 50 caracteres.'),
  descripcion: z
    .string()
    .trim()
    .max(255, 'La descripción no puede exceder 255 caracteres.')
    .optional()
    .or(z.literal('')),
});

export type DatosRol = z.infer<typeof esquemaRol>;

/** Convierte los errores de Zod al formato de la API */
export function detallesDeZod(error: z.ZodError) {
  return error.issues.map((issue) => ({
    campo: issue.path.join('.') || 'body',
    mensaje: issue.message,
  }));
}
