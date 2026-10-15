import { Router } from 'express';
import { verificarToken } from '../middleware/verificarToken';
import { requerirRol } from '../middleware/requerirRol';
import { validar } from '../middleware/validar';
import {
  esquemaCrearHorarios,
  esquemaActualizarHorario,
} from '../validaciones/horarios.validacion';
import * as controlador from '../controllers/horarios.controller';

/**
 * Rutas de los horarios del personal (módulo Operación).
 *
 *   GET    /api/horarios     → calendario completo
 *   POST   /api/horarios     → alta múltiple (un turno por día enviado)
 *   PUT    /api/horarios/:id → edición de un turno
 *   DELETE /api/horarios/:id → baja de un turno
 *
 * Solo hay turno de lunes a viernes y no se permiten duplicados exactos
 * (mismo personal, mismo día y mismo rango de horas). Los turnos son
 * exclusivos del rol Administrador; cuando exista el módulo de citas se
 * abrirá una consulta de disponibilidad con reglas por rol.
 */
const rutas = Router();

rutas.use(verificarToken, requerirRol('Administrador'));

rutas.get('/', controlador.listarHorarios);
rutas.post('/', validar(esquemaCrearHorarios), controlador.crearHorarios);
rutas.put('/:id', validar(esquemaActualizarHorario), controlador.actualizarHorario);
rutas.delete('/:id', controlador.eliminarHorario);

export default rutas;
