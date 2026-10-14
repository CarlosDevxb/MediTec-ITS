import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

/** Datos que viajan dentro del token (nunca la contraseña) */
export interface UsuarioToken {
  id: number;
  numeroControl: string;
  nombre: string;
  rol: string;
}

// Amplía Request para exponer el usuario autenticado
declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioToken;
    }
  }
}

/**
 * Middleware de autenticación: exige un JWT válido en
 * `Authorization: Bearer <token>` y deja el usuario en `req.usuario`.
 */
export function verificarToken(req: Request, res: Response, next: NextFunction) {
  const cabecera = req.headers.authorization;
  const token = cabecera?.startsWith('Bearer ') ? cabecera.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ error: 'No se proporcionó token de autenticación.' });
  }

  try {
    req.usuario = jwt.verify(token, ENV.jwt.secreto) as UsuarioToken;
    next();
  } catch {
    // No se revela si el token es inválido o expiró (evita filtrar información)
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}
