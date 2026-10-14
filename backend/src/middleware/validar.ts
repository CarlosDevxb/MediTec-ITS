import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';

/**
 * Validación de entrada con Zod:
 * rechaza con 400 cualquier payload que no cumpla el esquema,
 * dejando en `req.body` los datos ya validados y tipados.
 */
export function validar(esquema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const resultado = esquema.safeParse(req.body);

    if (!resultado.success) {
      return res.status(400).json({
        error: 'Datos inválidos.',
        detalles: resultado.error.issues.map((issue) => ({
          campo: issue.path.join('.') || 'body',
          mensaje: issue.message,
        })),
      });
    }

    req.body = resultado.data;
    next();
  };
}
