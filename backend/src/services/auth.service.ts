import pool from '../db/pool';
import { errorNoEncontrado, errorValidacion } from '../utils/erroresHttp';
import { compararContrasena, hashearContrasena } from '../utils/contrasenas';
import { buscarUsuario, type Usuario } from './usuarios.service';
import type { DatosActualizarPerfil } from '../validaciones/auth.validacion';

/**
 * Capa de datos de autenticación (SQL nativo, sin ORM).
 */

export interface UsuarioLogin {
  id: number;
  numeroControl: string;
  nombre: string;
  correo: string;
  contrasenaHash: string;
  estatus: number;
  rol: string;
  /** Especialidad del personal médico (puede no existir) */
  especialidad: string | null;
}

/**
 * Busca un usuario por número de control junto con su rol.
 * Es la única consulta que recupera la contraseña (para compararla
 * con bcrypt); ninguna otra capa debe exponer ese campo.
 */
export async function buscarUsuarioPorControl(numeroControl: string): Promise<UsuarioLogin | null> {
  const [filas] = await pool.query(
    `SELECT u.*, r.nombre AS rol, pm.especialidad AS especialidad
       FROM usuarios u
       JOIN roles r ON r.id_rol = u.roles_id_rol
       LEFT JOIN personal_medico pm ON pm.usuarios_id_usuarios = u.id_usuarios
      WHERE u.numero_control = ?
      LIMIT 1`,
    [numeroControl]
  );

  const registro = (filas as Array<Record<string, unknown>>)[0];
  if (!registro) return null;

  return {
    id: Number(registro.id_usuarios),
    numeroControl: String(registro.numero_control),
    nombre: String(registro.nombre),
    correo: String(registro.correo),
    contrasenaHash: String(registro.contraseña),
    estatus: Number(registro.estatus),
    rol: String(registro.rol),
    especialidad:
      registro['especialidad'] != null ? String(registro['especialidad']) : null,
  };
}

/**
 * Actualiza los datos de contacto y la contraseña de la propia cuenta.
 *
 * El correo no se modifica desde aquí (identificador de la cuenta). Para
 * cambiar la contraseña se exige y se verifica la contraseña actual; la nueva
 * se guarda hasheada, igual que en el resto del sistema.
 */
export async function actualizarPerfil(
  usuarioId: number,
  datos: DatosActualizarPerfil,
): Promise<Usuario> {
  // Verificación de la contraseña actual antes de cualquier cambio
  if (datos.contrasenaNueva) {
    const [filas] = await pool.query(
      'SELECT contraseña FROM usuarios WHERE id_usuarios = ? LIMIT 1',
      [usuarioId],
    );
    const registro = (filas as Array<Record<string, unknown>>)[0];
    if (!registro) throw errorNoEncontrado('El usuario no existe.');

    const coincide = await compararContrasena(
      datos.contrasenaActual ?? '',
      String(registro['contraseña']),
    );
    if (!coincide) {
      throw errorValidacion('La contraseña actual no es correcta.', [
        { campo: 'contrasenaActual', mensaje: 'La contraseña actual no es correcta.' },
      ]);
    }
  }

  const campos: string[] = [];
  const parametros: unknown[] = [];

  if (datos.telefono !== undefined) {
    campos.push('telefono = ?');
    parametros.push(datos.telefono.trim() || null);
  }
  if (datos.contrasenaNueva) {
    campos.push('contraseña = ?');
    parametros.push(await hashearContrasena(datos.contrasenaNueva));
  }

  if (campos.length > 0) {
    parametros.push(usuarioId);
    await pool.query(`UPDATE usuarios SET ${campos.join(', ')} WHERE id_usuarios = ?`, parametros);
  }

  const usuario = await buscarUsuario(usuarioId);
  if (!usuario) throw errorNoEncontrado('El usuario no existe.');
  return usuario;
}
