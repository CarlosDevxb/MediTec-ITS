import { z } from 'zod';
import { PERFILES } from '../config/permisos';

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
  /** Perfil base del que el rol hereda panel y permisos */
  perfil: z.enum(PERFILES, { error: 'Selecciona un perfil base para el rol.' }),
  /** Acciones que el rol NO hereda del perfil (ver config/permisos.ts) */
  restricciones: z
    .array(z.string().trim().min(1).max(50), {
      error: 'Las restricciones deben ser una lista de acciones.',
    })
    .max(20, 'Un rol no puede tener más de 20 restricciones.')
    .refine((lista) => new Set(lista).size === lista.length, 'Una acción no puede repetirse.')
    .default([]),
});

export type DatosRol = z.infer<typeof esquemaRol>;

/** Convierte los errores de Zod al formato de la API */
export function detallesDeZod(error: z.ZodError) {
  return error.issues.map((issue) => ({
    campo: issue.path.join('.') || 'body',
    mensaje: issue.message,
  }));
}
