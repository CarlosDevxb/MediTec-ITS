import { Router } from 'express';
import { verificarToken } from '../middleware/verificarToken';
import { requerirRol } from '../middleware/requerirRol';
import * as controlador from '../controllers/personal.controller';

/**
 * Rutas del personal clínico con ficha (tabla `personal_medico`).
 *
 *   GET /api/personal-medico → personal activo (cuentas habilitadas)
 *
 * Solo lectura: las fichas se crean y editan desde la sección Usuarios
 * (roles con cédula: Personal médico y Enfermería). La lista incluye datos
 * del personal, así que es exclusiva del rol Administrador.
 */
const rutas = Router();

rutas.get('/', verificarToken, requerirRol('Administrador'), controlador.listarPersonal);

export default rutas;
