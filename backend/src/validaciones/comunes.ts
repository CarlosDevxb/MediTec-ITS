import { z } from 'zod';

/**
 * Validaciones compartidas entre varios esquemas (usuarios y perfil).
 *
 * El teléfono se valida igual se capture desde el alta de usuarios o desde
 * la configuración de la propia cuenta, para que el formulario nunca acepte
 * algo que el servidor vaya a rechazar después.
 */

/** Formato aceptado: dígitos, espacios, +, - o paréntesis (7 a 20 caracteres) */
export const FORMATO_TELEFONO = /^[0-9+\-() ]{7,20}$/;

/** Teléfono opcional: si se captura, debe cumplir el formato aceptado */
export const telefonoOpcional = z
  .string()
  .trim()
  .max(20, 'El teléfono no puede exceder 20 caracteres.')
  .refine(
    (valor) => valor === '' || FORMATO_TELEFONO.test(valor),
    'Escribe un teléfono válido (solo números, espacios, +, - o paréntesis).',
  )
  .optional()
  .or(z.literal(''));
