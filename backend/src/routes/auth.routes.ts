import { Router } from 'express';
import { limitadorAuth } from '../middleware/limitadorAuth';
import { validar } from '../middleware/validar';
import { verificarToken } from '../middleware/verificarToken';
import { esquemaLogin } from '../validaciones/auth.validacion';
import { login, perfil } from '../controllers/auth.controller';

/**
 * Rutas de autenticación.
 *   POST /api/auth/login    → inicia sesión y devuelve el JWT
 *   GET  /api/auth/perfil   → devuelve el usuario del token (autenticado)
 */
const rutas = Router();

// Rate limit (fuerza bruta) + validación de entrada + controlador
rutas.post('/login', limitadorAuth, validar(esquemaLogin), login);

// Cualquier usuario autenticado puede consultar su propio perfil
rutas.get('/perfil', verificarToken, perfil);

export default rutas;
