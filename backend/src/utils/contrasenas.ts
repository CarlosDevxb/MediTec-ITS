import bcrypt from 'bcryptjs';
import { ENV } from '../config/env';

/**
 * Utilidades de contraseñas (bcrypt).
 * Nunca se almacenan ni se registran contraseñas en texto plano.
 */
export function hashearContrasena(contrasena: string): Promise<string> {
  return bcrypt.hash(contrasena, ENV.bcrypt.rondas);
}

export function compararContrasena(contrasena: string, hash: string): Promise<boolean> {
  return bcrypt.compare(contrasena, hash);
}
