import { Router } from 'express';
import { verificarToken } from '../middleware/verificarToken';
import { requerirRol } from '../middleware/requerirRol';
import { validar } from '../middleware/validar';
import {
  esquemaCrearMedicamento,
  esquemaActualizarMedicamento,
} from '../validaciones/medicamentos.validacion';
import { esquemaImportarFilas } from '../validaciones/importacion.validacion';
import * as controlador from '../controllers/medicamentos.controller';

/**
 * Rutas del inventario de medicamentos (módulo Operación).
 *
 *   GET  /api/medicamentos             → inventario completo
 *   POST /api/medicamentos             → alta
 *   POST /api/medicamentos/importar    → alta masiva (Excel)
 *   PUT  /api/medicamentos/:id         → edición (incluye ajustes de stock)
 *
 * No hay DELETE por regla del inventario: un medicamento no se elimina, se
 * deja con stock en 0 y entonces deja de estar disponible para las consultas
 * futuras (así se conserva el historial de `consulta_insumo`).
 *
 * La **lectura** también es del personal clínico: es la lista que se usa para
 * elegir los insumos de una consulta. El alta y la edición siguen siendo
 * exclusivas del Administrador.
 */
const rutas = Router();

rutas.use(verificarToken);

rutas.get(
  '/',
  requerirRol('Administrador', 'Personal médico', 'Enfermería'),
  controlador.listarMedicamentos,
);
rutas.post('/', requerirRol('Administrador'), validar(esquemaCrearMedicamento), controlador.crearMedicamento);
rutas.post('/importar', requerirRol('Administrador'), validar(esquemaImportarFilas), controlador.importarMedicamentos);
rutas.put('/:id', requerirRol('Administrador'), validar(esquemaActualizarMedicamento), controlador.actualizarMedicamento);

export default rutas;
