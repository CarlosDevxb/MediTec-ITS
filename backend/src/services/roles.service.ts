import pool from '../db/pool';
import { ROLES_BASE } from '../config/roles';
import { errorConflicto, errorNoEncontrado } from '../utils/erroresHttp';

/**
 * Capa de datos de los roles (tabla `roles`).
 * SQL parametrizado: ningún valor de la petición se interpoliza en la consulta.
 */

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  /** Cuántas cuentas de usuario tienen este rol */
  usuarios: number;
}

/** Lista los roles con el número de cuentas asignadas a cada uno */
export async function listarRoles(): Promise<Rol[]> {
  const [filas] = await pool.query(
    `SELECT r.id_rol AS id, r.nombre, r.descripcion,
            COUNT(u.id_usuarios) AS usuarios
       FROM roles r
       LEFT JOIN usuarios u ON u.roles_id_rol = r.id_rol
      GROUP BY r.id_rol, r.nombre, r.descripcion
      ORDER BY r.nombre ASC`,
  );

  return (filas as Array<Record<string, unknown>>).map((fila) => ({
    id: Number(fila['id']),
    nombre: String(fila['nombre']),
    descripcion: String(fila['descripcion'] ?? ''),
    usuarios: Number(fila['usuarios'] ?? 0),
  }));
}

/** Busca un rol por id */
export async function buscarRol(id: number): Promise<Rol | null> {
  const [filas] = await pool.query(
    `SELECT r.id_rol AS id, r.nombre, r.descripcion,
            (SELECT COUNT(*) FROM usuarios u WHERE u.roles_id_rol = r.id_rol) AS usuarios
       FROM roles r
      WHERE r.id_rol = ?
      LIMIT 1`,
    [id],
  );
  const fila = (filas as Array<Record<string, unknown>>)[0];
  if (!fila) return null;
  return {
    id: Number(fila['id']),
    nombre: String(fila['nombre']),
    descripcion: String(fila['descripcion'] ?? ''),
    usuarios: Number(fila['usuarios'] ?? 0),
  };
}

/** Da de alta un rol */
export async function crearRol(datos: { nombre: string; descripcion?: string }): Promise<Rol> {
  const nombre = datos.nombre.trim();
  await asegurarNombreLibre(nombre);

  const [resultado] = await pool.query(
    'INSERT INTO roles (nombre, descripcion) VALUES (?, ?)',
    [nombre, datos.descripcion?.trim() || null],
  );

  return {
    id: Number((resultado as { insertId: number }).insertId),
    nombre,
    descripcion: datos.descripcion?.trim() ?? '',
    usuarios: 0,
  };
}

/** Actualiza un rol existente */
export async function actualizarRol(
  id: number,
  datos: { nombre: string; descripcion?: string },
): Promise<Rol> {
  const actual = await buscarRol(id);
  if (!actual) throw errorNoEncontrado('El rol no existe.');

  const nombre = datos.nombre.trim();
  if (nombre.toLowerCase() !== actual.nombre.toLowerCase()) {
    await asegurarNombreLibre(nombre);
  }

  await pool.query('UPDATE roles SET nombre = ?, descripcion = ? WHERE id_rol = ?', [
    nombre,
    datos.descripcion?.trim() || null,
    id,
  ]);

  return { ...actual, nombre, descripcion: datos.descripcion?.trim() ?? '' };
}

/**
 * Elimina un rol.
 * No se permite borrar los roles base del sistema ni un rol que todavía tenga
 * cuentas asignadas (la llave foránea es ON DELETE RESTRICT).
 */
export async function eliminarRol(id: number): Promise<{ nombre: string }> {
  const actual = await buscarRol(id);
  if (!actual) throw errorNoEncontrado('El rol no existe.');

  if (ROLES_BASE.some((rol) => rol.nombre === actual.nombre)) {
    throw errorConflicto(
      `"${actual.nombre}" es un rol del sistema y no se puede eliminar.`,
    );
  }
  if (actual.usuarios > 0) {
    throw errorConflicto(
      `No se puede eliminar "${actual.nombre}" porque tiene ${actual.usuarios} cuenta(s) asignada(s).`,
    );
  }

  await pool.query('DELETE FROM roles WHERE id_rol = ?', [id]);
  return { nombre: actual.nombre };
}

/** Rechaza nombres repetidos */
async function asegurarNombreLibre(nombre: string): Promise<void> {
  const [filas] = await pool.query('SELECT id_rol FROM roles WHERE nombre = ? LIMIT 1', [nombre]);
  if ((filas as Array<Record<string, unknown>>)[0]) {
    throw errorConflicto(`El rol "${nombre}" ya existe.`);
  }
}
