import { Router } from 'express';
import { limitadorAuth } from '../middleware/limitadorAuth';
import { validar } from '../middleware/validar';
import { verificarToken } from '../middleware/verificarToken';
import { esquemaLogin, esquemaActualizarPerfil } from '../validaciones/auth.validacion';
import { login, perfil, actualizarPerfilUsuario } from '../controllers/auth.controller';

/**
 * Rutas de autenticación.
 *   POST  /api/auth/login   → inicia sesión y devuelve el JWT
 *   GET   /api/auth/perfil  → datos completos del usuario del token
 *   PATCH /api/auth/perfil  → teléfono y contraseña de la propia cuenta
 */
const rutas = Router();

// Rate limit (fuerza bruta) + validación de entrada + controlador
rutas.post('/login', limitadorAuth, validar(esquemaLogin), login);

// Cualquier usuario autenticado puede consultar y actualizar su propio perfil
rutas.get('/perfil', verificarToken, perfil);
rutas.patch('/perfil', verificarToken, validar(esquemaActualizarPerfil), actualizarPerfilUsuario);

export default rutas;
