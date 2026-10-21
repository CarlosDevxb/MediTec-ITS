import { Router } from 'express';
import { verificarToken } from '../middleware/verificarToken';
import { requerirRol } from '../middleware/requerirRol';
import { validar } from '../middleware/validar';
import {
  esquemaCrearPlan,
  esquemaActualizarPlan,
  esquemaEstatusPlan,
} from '../validaciones/planes.validacion';
import * as controlador from '../controllers/planes.controller';

/**
 * Rutas de planes alimenticios (`plan_alimenticio`).
 *
 *   GET   /api/planes               → listado (filtros: pacienteId, personalMedicoId)
 *   GET   /api/planes/:id           → detalle
 *   POST  /api/planes               → alta (quien lo crea queda como responsable)
 *   PUT   /api/planes/:id           → dieta, calorías o periodo
 *   PATCH /api/planes/:id/estatus   → vigente, finalizado o cancelado
 *
 * Los planes son el trabajo del personal de nutrición sobre cada paciente;
 * el acceso es del personal médico y del Administrador.
 */
const rutas = Router();

rutas.use(verificarToken, requerirRol('Administrador', 'Personal médico'));

rutas.get('/', controlador.listarPlanes);
rutas.get('/:id', controlador.obtenerPlan);
rutas.post('/', validar(esquemaCrearPlan), controlador.crearPlan);
rutas.put('/:id', validar(esquemaActualizarPlan), controlador.actualizarPlan);
rutas.patch('/:id/estatus', validar(esquemaEstatusPlan), controlador.cambiarEstatus);

export default rutas;
