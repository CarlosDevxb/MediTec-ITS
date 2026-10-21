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
 *   GET    /api/horarios     → calendario completo (filtro: personalMedicoId)
 *   POST   /api/horarios     → alta múltiple (un turno por día enviado)
 *   PUT    /api/horarios/:id → edición de un turno
 *   DELETE /api/horarios/:id → baja de un turno
 *
 * Solo hay turno de lunes a viernes y no se permiten duplicados exactos
 * (mismo personal, mismo día y mismo rango de horas). La **lectura** también
 * es del personal clínico: la agenda de citas valida la disponibilidad con
 * estos turnos. El alta y la edición siguen siendo del Administrador.
 */
const rutas = Router();

rutas.use(verificarToken);

rutas.get(
  '/',
  requerirRol('Administrador', 'Personal médico', 'Enfermería'),
  controlador.listarHorarios,
);
rutas.post('/', requerirRol('Administrador'), validar(esquemaCrearHorarios), controlador.crearHorarios);
rutas.put('/:id', requerirRol('Administrador'), validar(esquemaActualizarHorario), controlador.actualizarHorario);
rutas.delete('/:id', requerirRol('Administrador'), controlador.eliminarHorario);

export default rutas;
