import { z } from 'zod';
import type { DefinicionCatalogo } from '../config/catalogos';
import { nombreClinico } from './comunes';

/**
 * Validación de los catálogos.
 *
 * El esquema se construye a partir de la definición del catálogo (que viene
 * de la lista blanca del backend), así que los campos validados y sus largos
 * máximos siempre coinciden con las columnas reales de MySQL.
 *
 * Los catálogos de conceptos clínicos (alergias y enfermedades) además exigen
 * el formato de nombre clínico y lo normalizan: no entra basura ni símbolos y
 * el mismo concepto escrito distinto no se duplica.
 */

/** Catálogos cuyos valores son conceptos clínicos */
const CATALOGOS_CONCEPTO = ['alergias', 'enfermedades'];

export function esquemaCatalogo(def: DefinicionCatalogo) {
  const forma: Record<string, z.ZodType> = {};

  for (const campo of def.campos) {
    const texto = z
      .string({ error: `${campo.etiqueta} es obligatoria.` })
      .trim()
      .min(1, `${campo.etiqueta} es obligatoria.`)
      .max(
        campo.maximo,
        `${campo.etiqueta} no puede exceder ${campo.maximo} caracteres.`,
      );

    forma[campo.columna] =
      CATALOGOS_CONCEPTO.includes(def.id) && campo.columna === 'nombre' ? nombreClinico : texto;
  }

  return z.object(forma);
}

/** Consolidación de un valor de catálogo en otro (limpieza de duplicados) */
export const esquemaConsolidarValor = z
  .object({
    origenId: z.coerce
      .number({ error: 'Indica el valor a consolidar.' })
      .int('Indica un valor válido.')
      .positive('Indica un valor válido.'),
    destinoId: z.coerce
      .number({ error: 'Indica el valor destino.' })
      .int('Indica un valor válido.')
      .positive('Indica un valor válido.'),
  })
  .refine(
    (datos) => datos.origenId !== datos.destinoId,
    'El valor destino debe ser distinto al origen.',
  );

export type DatosConsolidarValor = z.infer<typeof esquemaConsolidarValor>;

/** Convierte los errores de Zod al formato de la API */
export function detallesDeZod(error: z.ZodError) {
  return error.issues.map((issue) => ({
    campo: issue.path.join('.') || 'body',
    mensaje: issue.message,
  }));
}
