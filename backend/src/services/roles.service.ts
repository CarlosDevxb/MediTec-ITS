import type { PoolConnection } from 'mysql2/promise';
import pool from '../db/pool';
import { ROLES_BASE } from '../config/roles';
import { elPerfilTieneAccion, esPerfil } from '../config/permisos';
import { errorConflicto, errorNoEncontrado, errorValidacion } from '../utils/erroresHttp';
import type { DatosRol } from '../validaciones/roles.validacion';

/**
 * Capa de datos de los roles (tablas `roles` y `rol_restricciones`).
 *
 * Un rol declara un **perfil base** (del que hereda su panel y sus permisos)
 * y puede llevar **restricciones**: acciones que NO hereda de ese perfil. Los
 * roles base del sistema son la referencia de permisos: no cambian de perfil
 * ni aceptan restricciones.
 *
 * SQL parametrizado: ningún valor de la petición se interpoliza en la consulta.
 */

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  /** Perfil base heredado (panel y permisos) */
  perfil: string;
  /** Acciones que NO hereda del perfil */
  restricciones: string[];
  /** true para los roles base del sistema (solo se edita su descripción) */
  esBase: boolean;
  /** Cuántas cuentas de usuario tienen este rol */
  usuarios: number;
}

/** SELECT común: rol con su perfil, restricciones y cuentas asignadas */
const COLUMNAS_ROL = `
  SELECT r.id_rol AS id, r.nombre, r.descripcion, r.perfil AS perfil,
         (SELECT GROUP_CONCAT(rr.accion)
            FROM rol_restricciones rr
           WHERE rr.roles_id_rol = r.id_rol) AS restricciones,
         (SELECT COUNT(*) FROM usuarios u WHERE u.roles_id_rol = r.id_rol) AS usuarios
    FROM roles r`;

/** Convierte una fila de MySQL al modelo de la API */
function aRol(fila: Record<string, unknown>): Rol {
  const nombre = String(fila['nombre'] ?? '');
  return {
    id: Number(fila['id']),
    nombre,
    descripcion: String(fila['descripcion'] ?? ''),
    perfil: String(fila['perfil'] ?? ''),
    restricciones: fila['restricciones']
      ? String(fila['restricciones'])
          .split(',')
          .filter(Boolean)
      : [],
    esBase: ROLES_BASE.some((rol) => rol.nombre === nombre),
    usuarios: Number(fila['usuarios'] ?? 0),
  };
}

/** Lista los roles con perfil, restricciones y cuentas asignadas */
export async function listarRoles(): Promise<Rol[]> {
  const [filas] = await pool.query(`${COLUMNAS_ROL} ORDER BY r.nombre ASC`);
  return (filas as Array<Record<string, unknown>>).map(aRol);
}

/** Busca un rol por id */
export async function buscarRol(id: number): Promise<Rol | null> {
  const [filas] = await pool.query(`${COLUMNAS_ROL} WHERE r.id_rol = ? LIMIT 1`, [id]);
  const fila = (filas as Array<Record<string, unknown>>)[0];
  return fila ? aRol(fila) : null;
}

/** Comprueba el perfil base y que las restricciones le pertenezcan */
function validarPermisos(perfil: string, restricciones: string[]): void {
  if (!esPerfil(perfil)) {
    throw errorValidacion('El perfil base del rol no es válido.', [
      { campo: 'perfil', mensaje: 'Selecciona un perfil base.' },
    ]);
  }
  for (const restriccion of restricciones) {
    if (!elPerfilTieneAccion(perfil, restriccion)) {
      throw errorValidacion(`La acción "${restriccion}" no pertenece al perfil ${perfil}.`, [
        { campo: 'restricciones', mensaje: 'Quita las acciones que no correspondan al perfil.' },
      ]);
    }
  }
}

/** Reemplaza las restricciones de un rol */
async function guardarRestricciones(
  conexion: PoolConnection,
  rolId: number,
  restricciones: string[],
): Promise<void> {
  await conexion.query('DELETE FROM rol_restricciones WHERE roles_id_rol = ?', [rolId]);
  for (const accion of new Set(restricciones)) {
    await conexion.query('INSERT INTO rol_restricciones (roles_id_rol, accion) VALUES (?, ?)', [
      rolId,
      accion,
    ]);
  }
}

/** Da de alta un rol con su perfil base y sus restricciones */
export async function crearRol(datos: DatosRol): Promise<Rol> {
  const nombre = datos.nombre.trim();
  await asegurarNombreLibre(nombre);

  const restricciones = datos.restricciones ?? [];
  validarPermisos(datos.perfil, restricciones);

  const conexion = await pool.getConnection();
  let rolId = 0;
  try {
    await conexion.beginTransaction();
    const [resultado] = await conexion.query(
      'INSERT INTO roles (nombre, descripcion, perfil) VALUES (?, ?, ?)',
      [nombre, datos.descripcion?.trim() || null, datos.perfil],
    );
    rolId = Number((resultado as { insertId: number }).insertId);
    await guardarRestricciones(conexion, rolId, restricciones);
    await conexion.commit();
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }

  const creado = await buscarRol(rolId);
  if (!creado) throw errorNoEncontrado('El rol no existe.');
  return creado;
}

/** Actualiza un rol. Los roles base del sistema solo cambian su descripción. */
export async function actualizarRol(id: number, datos: DatosRol): Promise<Rol> {
  const actual = await buscarRol(id);
  if (!actual) throw errorNoEncontrado('El rol no existe.');

  const nombre = datos.nombre.trim();
  const restricciones = datos.restricciones ?? [];

  if (actual.esBase) {
    if (nombre !== actual.nombre || datos.perfil !== actual.perfil || restricciones.length > 0) {
      throw errorConflicto(
        `"${actual.nombre}" es un rol del sistema: solo se puede editar su descripción.`,
      );
    }
    await pool.query('UPDATE roles SET descripcion = ? WHERE id_rol = ?', [
      datos.descripcion?.trim() || null,
      id,
    ]);
    return { ...actual, descripcion: datos.descripcion?.trim() ?? '' };
  }

  if (nombre.toLowerCase() !== actual.nombre.toLowerCase()) {
    await asegurarNombreLibre(nombre);
  }
  validarPermisos(datos.perfil, restricciones);

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    await conexion.query(
      'UPDATE roles SET nombre = ?, descripcion = ?, perfil = ? WHERE id_rol = ?',
      [nombre, datos.descripcion?.trim() || null, datos.perfil, id],
    );
    await guardarRestricciones(conexion, id, restricciones);
    await conexion.commit();
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }

  const actualizado = await buscarRol(id);
  if (!actualizado) throw errorNoEncontrado('El rol no existe.');
  return actualizado;
}

/**
 * Elimina un rol.
 * No se permite borrar los roles base del sistema ni un rol que todavía tenga
 * cuentas asignadas (la llave foránea es ON DELETE RESTRICT). Sus
 * restricciones se van en cascada con el rol.
 */
export async function eliminarRol(id: number): Promise<{ nombre: string }> {
  const actual = await buscarRol(id);
  if (!actual) throw errorNoEncontrado('El rol no existe.');

  if (actual.esBase) {
    throw errorConflicto(`"${actual.nombre}" es un rol del sistema y no se puede eliminar.`);
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
