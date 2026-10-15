import pool from '../db/pool';
import { errorConflicto, errorNoEncontrado } from '../utils/erroresHttp';
import type { DefinicionCatalogo } from '../config/catalogos';

/**
 * Capa de datos de los catálogos (`cat_*`).
 *
 * Todos los identificadores de tabla y de columna salen de la definición del
 * catálogo (lista blanca en `config/catalogos.ts`), nunca de la petición.
 * Los valores siempre se pasan como parámetros `?`.
 */

export interface ValorCatalogo {
  id: number;
  nombre: string;
  abreviatura?: string;
}

/** Columnas a seleccionar: id real + las columnas editables del catálogo */
function columnasDe(def: DefinicionCatalogo): string {
  return [def.columnaId, ...def.campos.map((c) => c.columna)]
    .map((columna) => `\`${columna}\``)
    .join(', ');
}

/** Normaliza una fila de MySQL a la forma que consume la interfaz */
function aValor(def: DefinicionCatalogo, fila: Record<string, unknown>): ValorCatalogo {
  const valor: ValorCatalogo = {
    id: Number(fila[def.columnaId]),
    nombre: String(fila['nombre'] ?? ''),
  };
  if (def.campos.some((c) => c.columna === 'abreviatura')) {
    valor.abreviatura = String(fila['abreviatura'] ?? '');
  }
  return valor;
}

/** Lista todos los valores de un catálogo */
export async function listarValores(def: DefinicionCatalogo): Promise<ValorCatalogo[]> {
  const [filas] = await pool.query(
    `SELECT ${columnasDe(def)} FROM ${def.tabla} ORDER BY nombre ASC`,
  );
  return (filas as Array<Record<string, unknown>>).map((fila) => aValor(def, fila));
}

/** Cuenta los valores de un catálogo (para los metadatos de la interfaz) */
export async function contarValores(def: DefinicionCatalogo): Promise<number> {
  const [filas] = await pool.query(`SELECT COUNT(*) AS total FROM ${def.tabla}`);
  return Number((filas as Array<{ total: number }>)[0]?.total ?? 0);
}

/** Busca un valor por id; `null` si no existe */
export async function buscarValor(
  def: DefinicionCatalogo,
  id: number,
): Promise<ValorCatalogo | null> {
  const [filas] = await pool.query(
    `SELECT ${columnasDe(def)} FROM ${def.tabla} WHERE ${def.columnaId} = ? LIMIT 1`,
    [id],
  );
  const fila = (filas as Array<Record<string, unknown>>)[0];
  return fila ? aValor(def, fila) : null;
}

/** Da de alta un valor. Rechaza duplicados con mensaje claro. */
export async function crearValor(
  def: DefinicionCatalogo,
  datos: Record<string, string>,
): Promise<ValorCatalogo> {
  const nombre = (datos['nombre'] ?? '').trim();

  await asegurarNombreLibre(def, nombre);

  // Los nombres de columna vienen de la definición; los valores van como `?`
  const columnas = def.campos.map((c) => `\`${c.columna}\``).join(', ');
  const comodines = def.campos.map(() => '?').join(', ');
  const valores = def.campos.map((c) => {
    const texto = (datos[c.columna] ?? '').trim();
    return c.columna === 'abreviatura' ? texto.toUpperCase() : texto;
  });

  const [resultado] = await pool.query(
    `INSERT INTO ${def.tabla} (${columnas}) VALUES (${comodines})`,
    valores,
  );

  return {
    id: Number((resultado as { insertId: number }).insertId),
    nombre,
    ...(def.campos.some((c) => c.columna === 'abreviatura')
      ? { abreviatura: (datos['abreviatura'] ?? '').trim().toUpperCase() }
      : {}),
  };
}

/** Actualiza un valor existente */
export async function actualizarValor(
  def: DefinicionCatalogo,
  id: number,
  datos: Record<string, string>,
): Promise<ValorCatalogo> {
  const actual = await buscarValor(def, id);
  if (!actual) throw errorNoEncontrado(`${def.singular} no encontrada en el catálogo.`);

  const nombre = (datos['nombre'] ?? '').trim();
  if (nombre.toLowerCase() !== actual.nombre.toLowerCase()) {
    await asegurarNombreLibre(def, nombre);
  }

  const asignaciones = def.campos.map((c) => `\`${c.columna}\` = ?`).join(', ');
  const valores = def.campos.map((c) => {
    const texto = (datos[c.columna] ?? '').trim();
    return c.columna === 'abreviatura' ? texto.toUpperCase() : texto;
  });

  await pool.query(`UPDATE ${def.tabla} SET ${asignaciones} WHERE ${def.columnaId} = ?`, [
    ...valores,
    id,
  ]);

  return { id, nombre, ...(actual.abreviatura !== undefined ? { abreviatura: (datos['abreviatura'] ?? '').trim().toUpperCase() } : {}) };
}

/**
 * Elimina un valor. Antes comprueba que no esté en uso en ninguna tabla que
 * lo referencie, para no dejar expedientes apuntando a información inexistente.
 */
export async function eliminarValor(
  def: DefinicionCatalogo,
  id: number,
): Promise<{ nombre: string }> {
  const actual = await buscarValor(def, id);
  if (!actual) throw errorNoEncontrado(`${def.singular} no encontrada en el catálogo.`);

  for (const referencia of def.uso) {
    const [filas] = await pool.query(
      `SELECT COUNT(*) AS total FROM ${referencia.tabla} WHERE ${referencia.columna} = ?`,
      [id],
    );
    const total = Number((filas as Array<{ total: number }>)[0]?.total ?? 0);
    if (total > 0) {
      throw errorConflicto(
        `No se puede eliminar "${actual.nombre}" porque está asignado a ${referencia.descripcion}.`,
      );
    }
  }

  await pool.query(`DELETE FROM ${def.tabla} WHERE ${def.columnaId} = ?`, [id]);
  return { nombre: actual.nombre };
}

/** Evita nombres repetidos dentro del mismo catálogo */
async function asegurarNombreLibre(
  def: DefinicionCatalogo,
  nombre: string,
): Promise<void> {
  const [filas] = await pool.query(
    `SELECT ${def.columnaId} FROM ${def.tabla} WHERE nombre = ? LIMIT 1`,
    [nombre],
  );
  const existente = (filas as Array<Record<string, unknown>>)[0];
  if (existente) {
    throw errorConflicto(`El valor "${nombre}" ya está registrado en ${def.titulo}.`);
  }
}
