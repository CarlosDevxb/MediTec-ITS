import type { Request, Response, NextFunction } from 'express';

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
 */
export function manejarErrores(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('[error]', err);

  const codigo = (err as { status?: number })?.status ?? 500;

  // Errores de MySQL conocidos → mensajes amigables
  const codigoMysql = (err as { code?: string })?.code;
  if (codigoMysql === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'El registro ya existe (dato duplicado).' });
  }
  if (codigoMysql === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ error: 'Referencia inválida: el registro relacionado no existe.' });
  }

  res.status(codigo).json({ error: 'Error interno del servidor.' });
}
