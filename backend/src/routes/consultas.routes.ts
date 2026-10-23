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
 * 'Atención directa' y enseguida la consulta. El personal clínico registra
 * consultas; el **paciente solo consulta lo suyo** (expediente) y el
 * **Administrador las lee** para el reporte de actividad.
 */
const rutas = Router();

rutas.use(verificarToken);

const LECTURA_CONSULTAS = ['Administrador', 'Personal médico', 'Enfermería', 'Paciente'] as const;

rutas.get('/', requerirRol(...LECTURA_CONSULTAS), controlador.listarConsultas);
rutas.post('/', requerirRol('Personal médico', 'Enfermería'), validar(esquemaCrearConsulta), controlador.crearConsulta);
rutas.get('/:id', requerirRol(...LECTURA_CONSULTAS), controlador.obtenerConsulta);

export default rutas;
