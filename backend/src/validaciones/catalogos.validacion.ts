import { z } from 'zod';
import type { DefinicionCatalogo } from '../config/catalogos';

/**
 * Validación de los catálogos.
 *
 * El esquema se construye a partir de la definición del catálogo (que viene
 * de la lista blanca del backend), así que los campos validados y sus largos
 * máximos siempre coinciden con las columnas reales de MySQL.
 */
export function esquemaCatalogo(def: DefinicionCatalogo) {
  const forma: Record<string, z.ZodString> = {};

  for (const campo of def.campos) {
    forma[campo.columna] = z
      .string({ error: `${campo.etiqueta} es obligatoria.` })
      .trim()
      .min(1, `${campo.etiqueta} es obligatoria.`)
      .max(
        campo.maximo,
        `${campo.etiqueta} no puede exceder ${campo.maximo} caracteres.`,
      );
  }

  return z.object(forma);
}

/** Convierte los errores de Zod al formato de la API */
export function detallesDeZod(error: z.ZodError) {
  return error.issues.map((issue) => ({
    campo: issue.path.join('.') || 'body',
    mensaje: issue.message,
  }));
}
