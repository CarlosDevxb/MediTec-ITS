import pool from '../db/pool';

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
}

/**
 * Busca un usuario por número de control junto con su rol.
 * Es la única consulta que recupera la contraseña (para compararla
 * con bcrypt); ninguna otra capa debe exponer ese campo.
 */
export async function buscarUsuarioPorControl(numeroControl: string): Promise<UsuarioLogin | null> {
  const [filas] = await pool.query(
    `SELECT u.*, r.nombre AS rol
       FROM usuarios u
       JOIN roles r ON r.id_rol = u.roles_id_rol
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
  };
}
