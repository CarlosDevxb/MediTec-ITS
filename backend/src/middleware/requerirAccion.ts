import type { Request, Response, NextFunction } from 'express';
import { etiquetaDeAccion } from '../config/permisos';

/**
 * Middleware de autorización por acción: rechaza al usuario cuyo rol tenga
 * esa acción entre sus restricciones (ver `config/permisos.ts`). Un rol sin
 * restricciones hereda todas las acciones de su perfil.
 *
 * Uso:  router.post('/', verificarToken, requerirAccion('horarios'), ...)
 */
export function requerirAccion(accion: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    if ((req.usuario.restricciones ?? []).includes(accion)) {
      return res.status(403).json({
        error: `Tu rol no permite "${etiquetaDeAccion(accion)}": esa acción está restringida para "${req.usuario.rol}".`,
      });
    }
    next();
  };
}
