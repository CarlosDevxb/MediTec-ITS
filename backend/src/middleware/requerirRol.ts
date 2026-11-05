import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware de autorización: exige que el usuario autenticado
 * tenga uno de los roles indicados, o un rol que herede uno de esos
 * perfiles (un rol creado con perfil Enfermería pasa por 'Enfermería').
 *
 * Uso:  router.get('/admin', verificarToken, requerirRol('Administrador'), ...)
 */
export function requerirRol(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    const { rol, perfil } = req.usuario;
    if (!roles.includes(rol) && !roles.includes(perfil)) {
      return res.status(403).json({ error: 'No tienes permiso para realizar esta acción.' });
    }
    next();
  };
}
