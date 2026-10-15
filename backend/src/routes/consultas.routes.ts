import { Router } from 'express';
import { verificarToken } from '../middleware/verificarToken';
import { requerirRol } from '../middleware/requerirRol';
import { validar } from '../middleware/validar';
import { esquemaCrearConsulta } from '../validaciones/consultas.validacion';
import * as controlador from '../controllers/consultas.controller';

/**
 * Rutas de consultas clínicas.
 *
 *   POST /api/consultas      → registra una atención completa (transacción)
 *   GET  /api/consultas      → historial (filtro: pacienteId)
 *   GET  /api/consultas/:id  → detalle con signos vitales e insumos
 *
 * Regla central: toda consulta deriva de una cita. Si el paciente llega sin
 * cita (doctor y enfermería), el alta crea primero la auto-cita
 * 'Atención directa' y enseguida la consulta. Acceso exclusivo del personal
 * clínico (Personal médico y Enfermería).
 */
const rutas = Router();

rutas.use(verificarToken, requerirRol('Personal médico', 'Enfermería'));

rutas.get('/', controlador.listarConsultas);
rutas.post('/', validar(esquemaCrearConsulta), controlador.crearConsulta);
rutas.get('/:id', controlador.obtenerConsulta);

export default rutas;
