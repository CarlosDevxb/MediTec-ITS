import rateLimit from 'express-rate-limit';

/**
 * Límite de intentos para autenticación:
 * protege contra fuerza bruta sobre el login (10 intentos / 15 min por IP).
 */
export const limitadorAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
});

/**
 * Límite general de la API (300 peticiones / 15 min por IP).
 */
export const limitadorGlobal = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Intenta más tarde.' },
});
