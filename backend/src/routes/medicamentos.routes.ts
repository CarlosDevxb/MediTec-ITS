import { Router } from 'express';
import { verificarToken } from '../middleware/verificarToken';
import { requerirRol } from '../middleware/requerirRol';
import { validar } from '../middleware/validar';
import {
  esquemaCrearMedicamento,
  esquemaActualizarMedicamento,
} from '../validaciones/medicamentos.validacion';
import * as controlador from '../controllers/medicamentos.controller';

/**
 * Rutas del inventario de medicamentos (módulo Operación).
 *
 *   GET  /api/medicamentos     → inventario completo
 *   POST /api/medicamentos     → alta
 *   PUT  /api/medicamentos/:id → edición (incluye ajustes de stock)
 *
 * No hay DELETE por regla del inventario: un medicamento no se elimina, se
 * deja con stock en 0 y entonces deja de estar disponible para las consultas
 * futuras (así se conserva el historial de `consulta_insumo`).
 *
 * El inventario es exclusivo del rol Administrador.
 */
const rutas = Router();

rutas.use(verificarToken, requerirRol('Administrador'));

rutas.get('/', controlador.listarMedicamentos);
rutas.post('/', validar(esquemaCrearMedicamento), controlador.crearMedicamento);
rutas.put('/:id', validar(esquemaActualizarMedicamento), controlador.actualizarMedicamento);

export default rutas;
