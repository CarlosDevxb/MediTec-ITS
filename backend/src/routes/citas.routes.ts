import { Router } from 'express';
import { verificarToken } from '../middleware/verificarToken';
import { requerirRol } from '../middleware/requerirRol';
import { validar } from '../middleware/validar';
import { esquemaCrearCita, esquemaEstatusCita } from '../validaciones/citas.validacion';
import * as controlador from '../controllers/citas.controller';

/**
 * Rutas de citas (agenda del personal clínico).
 *
 *   GET   /api/citas               → agenda (filtros: fecha, pacienteId)
 *   POST  /api/citas               → alta de citas programadas/emergencia
 *   PATCH /api/citas/:id/estatus   → confirmar, cancelar o completar
 *
 * Las citas de tipo 'Atención directa' no se capturan aquí: las crea el
 * sistema al registrar una consulta sin cita previa. El personal clínico
 * gestiona la agenda; el **paciente solo puede agendar para sí mismo y
 * cancelar sus citas** (siempre quedan Pendientes hasta que el especialista
 * las confirme).
 */
const rutas = Router();

rutas.use(verificarToken, requerirRol('Personal médico', 'Enfermería', 'Paciente'));

rutas.get('/', controlador.listarCitas);
rutas.post('/', validar(esquemaCrearCita), controlador.crearCita);
rutas.patch('/:id/estatus', validar(esquemaEstatusCita), controlador.cambiarEstatus);

export default rutas;
