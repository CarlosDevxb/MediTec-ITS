import { Router } from 'express';
import { verificarToken } from '../middleware/verificarToken';
import { requerirRol } from '../middleware/requerirRol';
import * as controlador from '../controllers/catalogos.controller';

/**
 * Rutas de catálogos (`cat_*`).
 *
 *   GET    /api/catalogos              → catálogos disponibles con sus totales
 *   GET    /api/catalogos/:catalogo   → valores de un catálogo
 *   POST   /api/catalogos/:catalogo   → alta            (Administrador)
 *   PUT    /api/catalogos/:catalogo/:id → edición        (Administrador)
 *   DELETE /api/catalogos/:catalogo/:id → baja           (Administrador)
 *
 * La lectura está abierta a cualquier usuario autenticado porque los catálogos
 * alimentan los formularios de todas las áreas (alergias al registrar un
 * paciente, unidades al dar de alta un medicamento…).
 */
const rutas = Router();

// Cualquier sesión válida puede consultar
rutas.get('/', verificarToken, controlador.listarCatalogos);
rutas.get('/:catalogo', verificarToken, controlador.listarValores);

// La administración de catálogos es exclusiva del Administrador
rutas.post('/:catalogo', verificarToken, requerirRol('Administrador'), controlador.crearValor);
// Antes que las rutas con :id, para que "consolidar" no se interprete como id
rutas.post('/:catalogo/consolidar', verificarToken, requerirRol('Administrador'), controlador.consolidarValor);
rutas.put('/:catalogo/:id', verificarToken, requerirRol('Administrador'), controlador.actualizarValor);
rutas.delete('/:catalogo/:id', verificarToken, requerirRol('Administrador'), controlador.eliminarValor);

export default rutas;
