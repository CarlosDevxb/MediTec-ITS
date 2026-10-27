import { Router } from 'express';
import { verificarToken } from '../middleware/verificarToken';
import { requerirRol } from '../middleware/requerirRol';
import { validar } from '../middleware/validar';
import {
  esquemaCrearHorarios,
  esquemaActualizarHorario,
  esquemaActualizarTurno,
  esquemaEliminarTurno,
} from '../validaciones/horarios.validacion';
import * as controlador from '../controllers/horarios.controller';

/**
 * Rutas de los horarios del personal (módulo Operación).
 *
 *   GET    /api/horarios       → calendario completo (filtro: personalMedicoId)
 *   POST   /api/horarios       → alta múltiple (un turno por día enviado)
 *   PUT    /api/horarios/turno → edición de un turno completo (todos sus días)
 *   DELETE /api/horarios/turno → baja de un turno completo (todos sus días)
 *   PUT    /api/horarios/:id   → edición de un día suelto
 *   DELETE /api/horarios/:id   → baja de un día suelto
 *
 * Solo hay turno de lunes a viernes y no se permiten duplicados exactos
 * (mismo personal, mismo día y mismo rango de horas). La **lectura** también
 * es del personal clínico (la agenda de citas valida la disponibilidad con
 * estos turnos) y del **paciente** (para elegir día y hora al agendar). El
 * alta y la edición siguen siendo del Administrador.
 */
const rutas = Router();

rutas.use(verificarToken);

rutas.get(
  '/',
  requerirRol('Administrador', 'Personal médico', 'Enfermería', 'Paciente'),
  controlador.listarHorarios,
);
rutas.post('/', requerirRol('Administrador'), validar(esquemaCrearHorarios), controlador.crearHorarios);
// Antes que las rutas con :id, para que "turno" no se interprete como id
rutas.put('/turno', requerirRol('Administrador'), validar(esquemaActualizarTurno), controlador.actualizarTurno);
rutas.delete('/turno', requerirRol('Administrador'), validar(esquemaEliminarTurno), controlador.eliminarTurno);
rutas.put('/:id', requerirRol('Administrador'), validar(esquemaActualizarHorario), controlador.actualizarHorario);
rutas.delete('/:id', requerirRol('Administrador'), controlador.eliminarHorario);

export default rutas;
