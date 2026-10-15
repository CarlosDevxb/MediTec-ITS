import { Router } from 'express';
import { verificarToken } from '../middleware/verificarToken';
import { requerirRol } from '../middleware/requerirRol';
import { validar } from '../middleware/validar';
import {
  esquemaCrearPaciente,
  esquemaActualizarExpediente,
} from '../validaciones/pacientes.validacion';
import * as controlador from '../controllers/pacientes.controller';

/**
 * Rutas de pacientes (expedientes clínicos).
 *
 *   GET   /api/pacientes               → listado para el buscador de atención
 *   GET   /api/pacientes/:id           → expediente clínico completo
 *   POST  /api/pacientes               → alta de paciente (cuenta + expediente)
 *   PATCH /api/pacientes/:id/expediente → tipo de sangre y antecedentes
 *
 * Información sensible de salud: la lectura es del personal clínico que
 * atiende (Personal médico y Enfermería) y el alta, de quien registra
 * pacientes (Enfermería y Administrador). El portal del paciente, cuando
 * exista, hará sus propias consultas acotadas a la cuenta en sesión.
 */
const rutas = Router();

rutas.use(verificarToken);

rutas.get('/', requerirRol('Administrador', 'Personal médico', 'Enfermería'), controlador.listarPacientes);
rutas.get('/:id', requerirRol('Administrador', 'Personal médico', 'Enfermería'), controlador.obtenerPaciente);
rutas.post('/', requerirRol('Administrador', 'Enfermería'), validar(esquemaCrearPaciente), controlador.crearPaciente);
rutas.patch(
  '/:id/expediente',
  requerirRol('Administrador', 'Enfermería'),
  validar(esquemaActualizarExpediente),
  controlador.actualizarExpediente,
);

export default rutas;
