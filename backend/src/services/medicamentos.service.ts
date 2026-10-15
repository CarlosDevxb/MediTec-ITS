import pool from '../db/pool';
import { errorConflicto, errorNoEncontrado, errorValidacion } from '../utils/erroresHttp';
import type { DatosMedicamento } from '../validaciones/medicamentos.validacion';

/**
 * Capa de datos del inventario de medicamentos (tabla `medicamentos`).
 *
 * Regla de negocio del inventario: **un medicamento no se elimina**. Se vacía
 * poniendo su stock en 0 y entonces deja de estar disponible para las consultas
 * futuras (campo `disponible` de la respuesta). Así se conserva el historial de
 * `consulta_insumo` y no hace falta una baja lógica en el esquema.
 *
 * SQL parametrizado: ningún valor de la petición se interpoliza en la consulta.
 */

export interface Medicamento {
  id: number;
  unidadId: number;
  /** Nombre de la unidad de medida (catálogo `cat_unidades_medida`) */
  unidad: string;
  abreviatura: string;
  nombre: string;
  stock: number;
  descripcion: string;
  /** false con stock en 0: el medicamento no se puede usar en consultas */
  disponible: boolean;
}

/** SELECT común: trae el medicamento junto con su unidad de medida */
const COLUMNAS = `
  SELECT m.id_medicamento              AS id,
         m.cat_unidades_medida_id_unidad AS unidadId,
         c.nombre                      AS unidad,
         c.abreviatura                 AS abreviatura,
         m.nombre                      AS nombre,
         m.stock                       AS stock,
         m.descripcion                 AS descripcion
    FROM medicamentos m
    JOIN cat_unidades_medida c ON c.id_unidad = m.cat_unidades_medida_id_unidad`;

/** Convierte una fila de MySQL al modelo de la API */
function aMedicamento(fila: Record<string, unknown>): Medicamento {
  const stock = Number(fila['stock']);
  return {
    id: Number(fila['id']),
    unidadId: Number(fila['unidadId']),
    unidad: String(fila['unidad'] ?? ''),
    abreviatura: String(fila['abreviatura'] ?? ''),
    nombre: String(fila['nombre'] ?? ''),
    stock,
    descripcion: String(fila['descripcion'] ?? ''),
    // Regla del inventario: sin stock no hay disponibilidad para consultas
    disponible: stock > 0,
  };
}

/** Lista el inventario completo ordenado por nombre */
export async function listarMedicamentos(): Promise<Medicamento[]> {
  const [filas] = await pool.query(`${COLUMNAS} ORDER BY m.nombre ASC`);
  return (filas as Array<Record<string, unknown>>).map(aMedicamento);
}

/** Busca un medicamento por id (o null si no existe) */
export async function buscarMedicamento(id: number): Promise<Medicamento | null> {
  const [filas] = await pool.query(`${COLUMNAS} WHERE m.id_medicamento = ? LIMIT 1`, [id]);
  const fila = (filas as Array<Record<string, unknown>>)[0];
  return fila ? aMedicamento(fila) : null;
}

/** Da de alta un medicamento en el inventario */
export async function crearMedicamento(datos: DatosMedicamento): Promise<Medicamento> {
  const nombre = datos.nombre.trim();
  await asegurarUnidadExiste(datos.unidadId);
  await asegurarNombreLibre(nombre);

  const [resultado] = await pool.query(
    'INSERT INTO medicamentos (cat_unidades_medida_id_unidad, nombre, stock, descripcion) VALUES (?, ?, ?, ?)',
    [datos.unidadId, nombre, datos.stock, datos.descripcion?.trim() || null],
  );

  const creado = await buscarMedicamento(Number((resultado as { insertId: number }).insertId));
  if (!creado) throw errorNoEncontrado('No se pudo recuperar el medicamento recién creado.');
  return creado;
}

/**
 * Actualiza un medicamento (incluye los ajustes de stock).
 * Cambiar el nombre a uno ya usado por otro medicamento es un conflicto.
 */
export async function actualizarMedicamento(
  id: number,
  datos: DatosMedicamento,
): Promise<Medicamento> {
  const actual = await buscarMedicamento(id);
  if (!actual) throw errorNoEncontrado('El medicamento no existe.');

  const nombre = datos.nombre.trim();
  if (nombre.toLowerCase() !== actual.nombre.toLowerCase()) {
    await asegurarNombreLibre(nombre, id);
  }
  await asegurarUnidadExiste(datos.unidadId);

  await pool.query(
    'UPDATE medicamentos SET cat_unidades_medida_id_unidad = ?, nombre = ?, stock = ?, descripcion = ? WHERE id_medicamento = ?',
    [datos.unidadId, nombre, datos.stock, datos.descripcion?.trim() || null, id],
  );

  const actualizado = await buscarMedicamento(id);
  if (!actualizado) throw errorNoEncontrado('El medicamento no existe.');
  return actualizado;
}

/** Comprueba que la unidad de medida exista en su catálogo */
async function asegurarUnidadExiste(unidadId: number): Promise<void> {
  const [filas] = await pool.query(
    'SELECT id_unidad FROM cat_unidades_medida WHERE id_unidad = ? LIMIT 1',
    [unidadId],
  );
  if (!(filas as Array<Record<string, unknown>>)[0]) {
    throw errorValidacion('La unidad de medida no existe.', [
      { campo: 'unidadId', mensaje: 'Selecciona una unidad de medida registrada en Catálogos.' },
    ]);
  }
}

/** Rechaza nombres de medicamento repetidos (unicidad del inventario) */
async function asegurarNombreLibre(nombre: string, excluirId?: number): Promise<void> {
  const [filas] = await pool.query(
    excluirId
      ? 'SELECT id_medicamento FROM medicamentos WHERE nombre = ? AND id_medicamento <> ? LIMIT 1'
      : 'SELECT id_medicamento FROM medicamentos WHERE nombre = ? LIMIT 1',
    excluirId ? [nombre, excluirId] : [nombre],
  );
  if ((filas as Array<Record<string, unknown>>)[0]) {
    throw errorConflicto(`Ya existe un medicamento con el nombre "${nombre}".`);
  }
}
