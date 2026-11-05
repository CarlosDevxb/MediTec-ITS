import { Router } from 'express';
import { verificarToken } from '../middleware/verificarToken';
import { requerirRol } from '../middleware/requerirRol';
import { requerirAccion } from '../middleware/requerirAccion';
import * as controlador from '../controllers/roles.controller';

/**
 * Rutas de roles.
 *
 *   GET    /api/roles/acciones → catálogo de acciones restringibles
 *   GET    /api/roles          → listado con perfil, restricciones y cuentas
 *   POST   /api/roles          → alta        (Administrador, acción 'roles')
 *   PUT    /api/roles/:id      → edición      (Administrador, acción 'roles')
 *   DELETE /api/roles/:id      → baja         (Administrador, acción 'roles')
 *
 * La lectura es pública para cualquier sesión válida: los formularios de
 * usuarios necesitan el listado de roles para ofrecerlos como opciones.
 */
const rutas = Router();

rutas.get('/', verificarToken, controlador.listarRoles);
// Antes que las rutas con :id, para que "acciones" no se interprete como id
rutas.get('/acciones', verificarToken, requerirRol('Administrador'), controlador.listarAcciones);

rutas.post(
  '/',
  verificarToken,
  requerirRol('Administrador'),
  requerirAccion('roles'),
  controlador.crearRol,
);
rutas.put(
  '/:id',
  verificarToken,
  requerirRol('Administrador'),
  requerirAccion('roles'),
  controlador.actualizarRol,
);
rutas.delete(
  '/:id',
  verificarToken,
  requerirRol('Administrador'),
  requerirAccion('roles'),
  controlador.eliminarRol,
);

export default rutas;
