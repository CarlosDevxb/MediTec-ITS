import { z } from 'zod';

/**
 * Validaciones del inventario de medicamentos.
 *
 * Zod cubre el formato y los largos (que coinciden con las columnas de MySQL:
 * `nombre` VARCHAR(100), `stock` DECIMAL(10,2), `descripcion` TEXT). Las reglas
 * que dependen de consultar la base —que la unidad de medida exista y que el
 * nombre no esté repetido— se aplican en el servicio.
 */

/** DECIMAL(10,2): hasta 8 dígitos enteros y 2 decimales */
const stockValido = z
  .number({ error: 'El stock debe ser un número.' })
  .min(0, 'El stock no puede ser negativo.')
  .max(99999999.99, 'El stock no puede exceder 99,999,999.99.')
  .refine(
    (valor) => Math.round(valor * 100) / 100 === valor,
    'El stock admite máximo dos decimales.',
  );

/** Campos del medicamento: mismos datos en el alta y en la edición */
const camposMedicamento = {
  nombre: z
    .string({ error: 'El nombre del medicamento es obligatorio.' })
    .trim()
    .min(1, 'El nombre del medicamento es obligatorio.')
    .max(100, 'El nombre no puede exceder 100 caracteres.'),
  unidadId: z.coerce
    .number({ error: 'Selecciona una unidad de medida.' })
    .int('Selecciona una unidad de medida válida.')
    .positive('Selecciona una unidad de medida válida.'),
  stock: stockValido,
  descripcion: z
    .string()
    .trim()
    .max(1000, 'La descripción no puede exceder 1000 caracteres.')
    .optional()
    .or(z.literal('')),
};

export const esquemaCrearMedicamento = z.object(camposMedicamento);

/** El contrato de edición es idéntico al del alta */
export const esquemaActualizarMedicamento = z.object(camposMedicamento);

export type DatosMedicamento = z.infer<typeof esquemaCrearMedicamento>;
