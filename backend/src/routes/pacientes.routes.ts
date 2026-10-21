import { Router } from 'express';
import { verificarToken } from '../middleware/verificarToken';
import { requerirRol } from '../middleware/requerirRol';
import { validar } from '../middleware/validar';
import {
  esquemaCrearPaciente,
  esquemaActualizarExpediente,
} from '../validaciones/pacientes.validacion';
import { esquemaCuestionario } from '../validaciones/cuestionario.validacion';
import * as controlador from '../controllers/pacientes.controller';

/**
 * Rutas de pacientes (expedientes clínicos).
 *
 *   GET   /api/pacientes                   → listado para el buscador de atención
 *   GET   /api/pacientes/:id               → expediente clínico completo
 *   POST  /api/pacientes/:id/cuestionario  → cuestionario de salud inicial
 *   POST  /api/pacientes                   → alta de paciente (cuenta + expediente)
 *   PATCH /api/pacientes/:id/expediente    → tipo de sangre y antecedentes
 *
 * Información sensible de salud: la lectura es del personal clínico que
 * atiende (Personal médico y Enfermería) y el alta, de quien registra
 * pacientes (Enfermería y Administrador). El cuestionario de salud también
 * lo puede llenar el paciente, pero solo el suyo (su portal, cuando exista).
 */
const rutas = Router();

rutas.use(verificarToken);

const PERSONAL_CLINICO = ['Administrador', 'Personal médico', 'Enfermería'] as const;

rutas.get('/', requerirRol(...PERSONAL_CLINICO), controlador.listarPacientes);
rutas.get(
  '/:id',
  requerirRol(...PERSONAL_CLINICO, 'Paciente'),
  controlador.obtenerPaciente,
);
rutas.post(
  '/:id/cuestionario',
  requerirRol(...PERSONAL_CLINICO, 'Paciente'),
  validar(esquemaCuestionario),
  controlador.guardarCuestionario,
);
rutas.post('/', requerirRol('Administrador', 'Enfermería'), validar(esquemaCrearPaciente), controlador.crearPaciente);
rutas.patch(
  '/:id/expediente',
  requerirRol('Administrador', 'Enfermería'),
  validar(esquemaActualizarExpediente),
  controlador.actualizarExpediente,
);

export default rutas;
