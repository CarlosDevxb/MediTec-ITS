import type { Request, Response, NextFunction } from 'express';
import { errorValidacion } from '../utils/erroresHttp';
import { textoObligatorio } from '../utils/parametros';
import type { DatosMedicamento } from '../validaciones/medicamentos.validacion';
import * as servicio from '../services/medicamentos.service';

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
