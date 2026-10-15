import bcrypt from 'bcryptjs';
import crypto from 'crypto';
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

/**
 * Contraseña temporal aleatoria para cuentas dadas de alta sin contraseña
 * explícita (importaciones masivas, bootstrap). Cumple la política mínima
 * del sistema: 8+ caracteres con mayúscula, minúscula, número y símbolo.
 * Solo se muestra una vez, al momento de crear la cuenta.
 */
export function generarContrasenaTemporal(): string {
  return `${crypto.randomBytes(9).toString('base64url')}!aA1`;
}
