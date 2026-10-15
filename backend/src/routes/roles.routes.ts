import { Router } from 'express';
import { verificarToken } from '../middleware/verificarToken';
import { requerirRol } from '../middleware/requerirRol';
import * as controlador from '../controllers/roles.controller';

/**
 * Rutas de roles.
 *
 *   GET    /api/roles      → listado con cuentas asignadas
 *   POST   /api/roles      → alta        (Administrador)
 *   PUT    /api/roles/:id  → edición      (Administrador)
 *   DELETE /api/roles/:id  → baja         (Administrador)
 *
 * La lectura es pública para cualquier sesión válida: los formularios de
 * usuarios necesitan el listado de roles para ofrecerlos como opciones.
 */
const rutas = Router();

rutas.get('/', verificarToken, controlador.listarRoles);

rutas.post('/', verificarToken, requerirRol('Administrador'), controlador.crearRol);
rutas.put('/:id', verificarToken, requerirRol('Administrador'), controlador.actualizarRol);
rutas.delete('/:id', verificarToken, requerirRol('Administrador'), controlador.eliminarRol);

export default rutas;
