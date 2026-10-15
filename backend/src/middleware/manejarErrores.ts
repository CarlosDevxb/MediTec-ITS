import type { Request, Response, NextFunction } from 'express';
import { ErrorHttp } from '../utils/erroresHttp';

/**
 * 404: ruta inexistente dentro de la API.
 */
export function noEncontrado(_req: Request, res: Response) {
  res.status(404).json({ error: 'Ruta no encontrada.' });
}

/**
 * Manejo central de errores:
 * - registra el detalle en el servidor
 * - nunca expone stack traces ni mensajes internos de MySQL al cliente
 *
 * Los errores lanzados a propósito (`ErrorHttp`) conservan su código y su
 * mensaje ya escrito en español; el resto se convierte en un 500 genérico.
 */
export function manejarErrores(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Error lanzado por la propia API: el mensaje ya está pensado para el usuario
  if (err instanceof ErrorHttp) {
    if (err.detalles) {
      return res.status(err.status).json({ error: err.message, detalles: err.detalles });
    }
    return res.status(err.status).json({ error: err.message });
  }

  console.error('[error]', err);

  // Errores de MySQL que se escaparon a las validaciones previas
  const codigoMysql = (err as { code?: string })?.code;
  if (codigoMysql === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'El registro ya existe (dato duplicado).' });
  }
  if (codigoMysql === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ error: 'Referencia inválida: el registro relacionado no existe.' });
  }
  if (codigoMysql === 'ER_ROW_IS_REFERENCED_2') {
    return res
      .status(409)
      .json({ error: 'No se puede eliminar porque el registro está en uso.' });
  }

  res.status(500).json({ error: 'Error interno del servidor.' });
}
