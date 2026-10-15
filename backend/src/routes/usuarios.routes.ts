import { Router } from 'express';
import { verificarToken } from '../middleware/verificarToken';
import { requerirRol } from '../middleware/requerirRol';
import { validar } from '../middleware/validar';
import {
  esquemaCrearUsuario,
  esquemaActualizarUsuario,
  esquemaEstatus,
  esquemaNuevaContrasena,
} from '../validaciones/usuarios.validacion';
import { esquemaImportarFilas } from '../validaciones/importacion.validacion';
import * as controlador from '../controllers/usuarios.controller';

/**
 * Rutas de usuarios (cuentas de acceso al sistema).
 *
 *   GET    /api/usuarios              → listado                (Administrador)
 *   GET    /api/usuarios/:id          → detalle                (Administrador)
 *   POST   /api/usuarios              → alta                   (Administrador)
 *   POST   /api/usuarios/importar     → alta masiva (Excel)    (Administrador)
 *   PUT    /api/usuarios/:id          → edición                (Administrador)
 *   PATCH  /api/usuarios/:id/estatus    → habilitar/suspender    (Administrador)
 *   PATCH  /api/usuarios/:id/contrasena → restablecer contraseña (Administrador)
 *   DELETE /api/usuarios/:id            → eliminación            (Administrador)
 *
 * La información de cuentas es sensible, así que todo el módulo es exclusivo
 * del rol Administrador y ninguna respuesta incluye el hash de la contraseña.
 */
const rutas = Router();

// Todo el módulo exige sesión y rol de Administrador
rutas.use(verificarToken, requerirRol('Administrador'));

rutas.get('/', controlador.listarUsuarios);
rutas.get('/:id', controlador.obtenerUsuario);

rutas.post('/', validar(esquemaCrearUsuario), controlador.crearUsuario);
rutas.post('/importar', validar(esquemaImportarFilas), controlador.importarUsuarios);
rutas.put('/:id', validar(esquemaActualizarUsuario), controlador.actualizarUsuario);
rutas.patch('/:id/estatus', validar(esquemaEstatus), controlador.cambiarEstatus);
rutas.patch('/:id/contrasena', validar(esquemaNuevaContrasena), controlador.restablecerContrasena);
rutas.delete('/:id', controlador.eliminarUsuario);

export default rutas;
