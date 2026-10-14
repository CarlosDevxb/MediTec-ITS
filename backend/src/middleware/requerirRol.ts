import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware de autorización: exige que el usuario autenticado
 * tenga uno de los roles indicados.
 *
 * Uso:  router.get('/admin', verificarToken, requerirRol('Administrador'), ...)
 */
export function requerirRol(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para realizar esta acción.' });
    }
    next();
  };
}
