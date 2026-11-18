import type { Request, Response, NextFunction } from 'express';
import { etiquetaDeAccion } from '../config/permisos';

/**
 * Middleware de autorización por acción: exige que el usuario tenga esa
 * acción entre sus permisos (tabla `rol_permisos`, ver `config/permisos.ts`).
 * Los permisos son explícitos: un rol solo puede lo que tiene marcado.
 *
 * Uso:  router.post('/', verificarToken, requerirAccion('horarios'), ...)
 */
export function requerirAccion(accion: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    if (!(req.usuario.permisos ?? []).includes(accion)) {
      return res.status(403).json({
        error: `Tu rol no tiene permiso para "${etiquetaDeAccion(accion)}": esa acción no está concedida a "${req.usuario.rol}".`,
      });
    }
    next();
  };
}
