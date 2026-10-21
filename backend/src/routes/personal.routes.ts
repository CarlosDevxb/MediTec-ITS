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
 * (roles con cédula: Personal médico y Enfermería). La lista acompaña datos
 * del personal, por lo que es del personal clínico y del Administrador; el
 * **paciente también puede consultarla** (sin cédula) para elegir a su
 * especialista al agendar citas.
 */
const rutas = Router();

rutas.get(
  '/',
  verificarToken,
  requerirRol('Administrador', 'Personal médico', 'Enfermería', 'Paciente'),
  controlador.listarPersonal,
);

export default rutas;
