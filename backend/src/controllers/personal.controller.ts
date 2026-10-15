import type { Request, Response, NextFunction } from 'express';
import * as servicio from '../services/personal.service';

/**
 * Controlador del personal clínico (fichas de `personal_medico`).
 * Solo lectura: las fichas se crean y editan desde la sección Usuarios.
 */

/** GET /api/personal-medico */
export async function listarPersonal(_req: Request, res: Response, next: NextFunction) {
  try {
    const datos = await servicio.listarPersonal();
    res.json({ datos });
  } catch (error) {
    next(error);
  }
}
