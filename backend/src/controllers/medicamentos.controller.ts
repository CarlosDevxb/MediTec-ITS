import type { Request, Response, NextFunction } from 'express';
import { errorValidacion } from '../utils/erroresHttp';
import { textoObligatorio } from '../utils/parametros';
import type { DatosMedicamento } from '../validaciones/medicamentos.validacion';
import {
  esquemaFilaImportarMedicamento,
  type DatosFilaImportarMedicamento,
} from '../validaciones/medicamentos.validacion';
import * as servicio from '../services/medicamentos.service';
import * as servicioImportacion from '../services/importacion.service';
import type { ResultadoFilaImportacion } from '../services/importacion.service';

/**
 * Controlador del inventario de medicamentos.
 * Valida la entrada, llama al servicio y arma la respuesta HTTP.
 */

/** Lee y valida el id numérico de la URL */
function leerId(valor: string | string[] | undefined): number {
  const id = Number.parseInt(textoObligatorio(valor), 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw errorValidacion('Identificador de medicamento no válido.');
  }
  return id;
}

/** GET /api/medicamentos */
export async function listarMedicamentos(_req: Request, res: Response, next: NextFunction) {
  try {
    const datos = await servicio.listarMedicamentos();
    res.json({ datos });
  } catch (error) {
    next(error);
  }
}

/** POST /api/medicamentos */
export async function crearMedicamento(req: Request, res: Response, next: NextFunction) {
  try {
    const medicamento = await servicio.crearMedicamento(req.body as DatosMedicamento);
    res.status(201).json({
      mensaje: `Medicamento "${medicamento.nombre}" agregado al inventario.`,
      datos: medicamento,
    });
  } catch (error) {
    next(error);
  }
}

/** PUT /api/medicamentos/:id (incluye los ajustes de stock) */
export async function actualizarMedicamento(req: Request, res: Response, next: NextFunction) {
  try {
    const id = leerId(req.params.id);
    const medicamento = await servicio.actualizarMedicamento(id, req.body as DatosMedicamento);
    res.json({
      mensaje: `Medicamento "${medicamento.nombre}" actualizado.`,
      datos: medicamento,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/medicamentos/importar · alta masiva desde un archivo de Excel.
 *
 * La validación de formato se hace fila por fila (no con el middleware
 * `validar()`) para poder reportar cada problema en su lugar: una fila con
 * datos inválidos no detiene la importación del resto.
 */
export async function importarMedicamentos(req: Request, res: Response, next: NextFunction) {
  try {
    const { filas } = req.body as { filas: unknown[] };

    const validas: Array<{ fila: number; datos: DatosFilaImportarMedicamento }> = [];
    const resultados: ResultadoFilaImportacion[] = [];

    filas.forEach((fila, indice) => {
      // La fila 1 del Excel son los encabezados; los datos empiezan en la 2
      const numeroFila = indice + 2;
      const parseo = esquemaFilaImportarMedicamento.safeParse(fila);
      if (parseo.success) {
        validas.push({ fila: numeroFila, datos: parseo.data });
      } else {
        resultados.push({
          fila: numeroFila,
          estado: 'error',
          mensaje: parseo.error.issues.map((issue) => issue.message).join(' '),
        });
      }
    });

    if (validas.length > 0) {
      resultados.push(...(await servicioImportacion.importarMedicamentos(validas)));
    }
    resultados.sort((a, b) => a.fila - b.fila);

    const creados = resultados.filter((r) => r.estado === 'creado').length;
    const fallidos = resultados.length - creados;
    res.status(201).json({
      mensaje: `Importación terminada: ${creados} medicamento(s) creado(s), ${fallidos} con errores.`,
      datos: { creados, fallidos, resultados },
    });
  } catch (error) {
    next(error);
  }
}
