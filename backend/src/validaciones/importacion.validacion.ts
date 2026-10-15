import { z } from 'zod';

/**
 * Validación de importaciones masivas (alta desde archivos de Excel).
 *
 * Aquí solo se valida la **envoltura** de la petición: que venga una lista de
 * filas y que respete el límite por importación. Cada fila se valida aparte en
 * el controlador (con el esquema de su entidad) para poder reportar los
 * problemas fila por fila sin detener toda la importación.
 */

/** Máximo de filas por importación (protege la API y la paciencia del usuario) */
export const LIMITE_FILAS_IMPORTACION = 200;

export const esquemaImportarFilas = z.object({
  filas: z
    .array(z.record(z.string(), z.unknown()), {
      error: 'Envía las filas del archivo como una lista.',
    })
    .min(1, 'El archivo no tiene filas para importar.')
    .max(
      LIMITE_FILAS_IMPORTACION,
      `Máximo ${LIMITE_FILAS_IMPORTACION} filas por importación. Divide el archivo en varios.`,
    ),
});

export type DatosImportacion = z.infer<typeof esquemaImportarFilas>;
