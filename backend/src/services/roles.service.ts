import type { PoolConnection } from 'mysql2/promise';
import pool from '../db/pool';
import { ROLES_BASE } from '../config/roles';
import { elPerfilTieneAccion, esPerfil } from '../config/permisos';
import { errorConflicto, errorNoEncontrado, errorValidacion } from '../utils/erroresHttp';
import type { DatosRol } from '../validaciones/roles.validacion';

/**
 * Capa de datos de los roles (tablas `roles` y `rol_permisos`).
 *
 * Un rol declara un **perfil base** (que define su panel y su identidad
 * clínica) y elige de forma **explícita** las acciones que SÍ puede
 * realizar (`rol_permisos`): no hay herencia. Los roles base del sistema
 * conservan su juego completo de permisos y solo admiten editar su
 * descripción.
 *
 * SQL parametrizado: ningún valor de la petición se interpoliza en la consulta.
 */

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  /** Perfil base del rol (panel e identidad clínica) */
  perfil: string;
  /** Acciones concedidas al rol (permisos explícitos) */
  permisos: string[];
  /** true para los roles base del sistema (solo se edita su descripción) */
  esBase: boolean;
  /** Cuántas cuentas de usuario tienen este rol */
  usuarios: number;
}

/** SELECT común: rol con su perfil, permisos y cuentas asignadas */
const COLUMNAS_ROL = `
  SELECT r.id_rol AS id, r.nombre, r.descripcion, r.perfil AS perfil,
         (SELECT GROUP_CONCAT(rp.accion)
            FROM rol_permisos rp
           WHERE rp.roles_id_rol = r.id_rol) AS permisos,
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
    permisos: fila['permisos']
      ? String(fila['permisos'])
          .split(',')
          .filter(Boolean)
      : [],
    esBase: ROLES_BASE.some((rol) => rol.nombre === nombre),
    usuarios: Number(fila['usuarios'] ?? 0),
  };
}

/** Lista los roles con perfil, permisos y cuentas asignadas */
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

/** Comprueba el perfil y que los permisos pertenezcan a su panel */
function validarPermisos(perfil: string, permisos: string[]): void {
  if (!esPerfil(perfil)) {
    throw errorValidacion('El perfil base del rol no es válido.', [
      { campo: 'perfil', mensaje: 'Selecciona un perfil base.' },
    ]);
  }
  if (permisos.length === 0) {
    throw errorValidacion('Selecciona al menos una acción para el rol.', [
      { campo: 'permisos', mensaje: 'Marca las acciones que este rol podrá realizar.' },
    ]);
  }
  for (const permiso of permisos) {
    if (!elPerfilTieneAccion(perfil, permiso)) {
      throw errorValidacion(`La acción "${permiso}" no pertenece al perfil ${perfil}.`, [
        { campo: 'permisos', mensaje: 'Quita las acciones que no correspondan al perfil.' },
      ]);
    }
  }
}

/** Reemplaza los permisos de un rol */
async function guardarPermisos(
  conexion: PoolConnection,
  rolId: number,
  permisos: string[],
): Promise<void> {
  await conexion.query('DELETE FROM rol_permisos WHERE roles_id_rol = ?', [rolId]);
  for (const accion of new Set(permisos)) {
    await conexion.query('INSERT INTO rol_permisos (roles_id_rol, accion) VALUES (?, ?)', [
      rolId,
      accion,
    ]);
  }
}

/** Da de alta un rol con su perfil base y sus permisos explícitos */
export async function crearRol(datos: DatosRol): Promise<Rol> {
  const nombre = datos.nombre.trim();
  await asegurarNombreLibre(nombre);

  const permisos = datos.permisos ?? [];
  validarPermisos(datos.perfil, permisos);

  const conexion = await pool.getConnection();
  let rolId = 0;
  try {
    await conexion.beginTransaction();
    const [resultado] = await conexion.query(
      'INSERT INTO roles (nombre, descripcion, perfil) VALUES (?, ?, ?)',
      [nombre, datos.descripcion?.trim() || null, datos.perfil],
    );
    rolId = Number((resultado as { insertId: number }).insertId);
    await guardarPermisos(conexion, rolId, permisos);
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

  if (actual.esBase) {
    if (nombre !== actual.nombre || datos.perfil !== actual.perfil) {
      throw errorConflicto(
        `"${actual.nombre}" es un rol del sistema: solo se puede editar su descripción (conserva su juego completo de permisos).`,
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
  const permisos = datos.permisos ?? [];
  validarPermisos(datos.perfil, permisos);

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    await conexion.query(
      'UPDATE roles SET nombre = ?, descripcion = ?, perfil = ? WHERE id_rol = ?',
      [nombre, datos.descripcion?.trim() || null, datos.perfil, id],
    );
    await guardarPermisos(conexion, id, permisos);
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
 * cuentas asignadas (la llave foránea es ON DELETE RESTRICT). Sus permisos se
 * van en cascada con el rol.
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
