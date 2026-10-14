import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { buscarUsuarioPorControl } from '../services/auth.service';
import { compararContrasena } from '../utils/contrasenas';
import type { DatosLogin } from '../validaciones/auth.validacion';
import type { UsuarioToken } from '../middleware/verificarToken';

/**
 * POST /api/auth/login
 * Valida credenciales contra `usuarios` y devuelve un JWT de sesión.
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { numeroControl, contrasena } = req.body as DatosLogin;
    const usuario = await buscarUsuarioPorControl(numeroControl);

    // Mensaje idéntico si el usuario no existe o si la contraseña no
    // coincide: evita descubrir qué cuentas están registradas.
    const mensajeInvalido = 'Número de control o contraseña incorrectos.';
    if (!usuario || !(await compararContrasena(contrasena, usuario.contrasenaHash))) {
      return res.status(401).json({ error: mensajeInvalido });
    }

    // Solo tras verificar la contraseña se informa si la cuenta está inactiva
    if (usuario.estatus !== 1) {
      return res
        .status(403)
        .json({ error: 'Tu cuenta está deshabilitada. Contacta al administrador.' });
    }

    const payload: UsuarioToken = {
      id: usuario.id,
      numeroControl: usuario.numeroControl,
      nombre: usuario.nombre,
      rol: usuario.rol,
    };

    const token = jwt.sign(payload, ENV.jwt.secreto, {
      expiresIn: ENV.jwt.expiracion,
    } as jwt.SignOptions);

    res.json({
      mensaje: `Bienvenido(a), ${usuario.nombre}`,
      token,
      usuario: payload,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/perfil
 * Devuelve el usuario del token (público para cualquier rol autenticado).
 */
export function perfil(req: Request, res: Response) {
  res.json({ datos: req.usuario });
}
