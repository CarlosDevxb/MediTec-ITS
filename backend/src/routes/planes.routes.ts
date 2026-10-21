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
 * el alta y los cambios son del personal médico y del Administrador, y el
 * **paciente puede consultar el suyo**.
 */
const rutas = Router();

rutas.use(verificarToken);

const GESTION_PLANES = ['Administrador', 'Personal médico'] as const;

rutas.get('/', requerirRol(...GESTION_PLANES, 'Paciente'), controlador.listarPlanes);
rutas.get('/:id', requerirRol(...GESTION_PLANES, 'Paciente'), controlador.obtenerPlan);
rutas.post('/', requerirRol(...GESTION_PLANES), validar(esquemaCrearPlan), controlador.crearPlan);
rutas.put('/:id', requerirRol(...GESTION_PLANES), validar(esquemaActualizarPlan), controlador.actualizarPlan);
rutas.patch(
  '/:id/estatus',
  requerirRol(...GESTION_PLANES),
  validar(esquemaEstatusPlan),
  controlador.cambiarEstatus,
);

export default rutas;
