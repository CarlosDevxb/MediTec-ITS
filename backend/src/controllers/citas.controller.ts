import type { Request, Response, NextFunction } from 'express';
import { errorValidacion } from '../utils/erroresHttp';
import { textoObligatorio, textoDe } from '../utils/parametros';
import type { DatosCrearCita, DatosEstatusCita } from '../validaciones/citas.validacion';
import * as servicio from '../services/citas.service';

/**
 * Controlador de citas (agenda del personal clínico).
 * El cuerpo ya viene validado por el middleware `validar()` de la ruta.
 */

/** Lee y valida el id numérico de la URL */
function leerId(valor: string | string[] | undefined): number {
  const id = Number.parseInt(textoObligatorio(valor), 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw errorValidacion('Identificador de cita no válido.');
  }
  return id;
}

/** GET /api/citas?fecha=AAAA-MM-DD&pacienteId=N */
export async function listarCitas(req: Request, res: Response, next: NextFunction) {
  try {
    const fecha = textoDe(req.query['fecha'] as string | undefined);
    const pacienteId = Number(req.query['pacienteId'] ?? 0);
    const datos = await servicio.listarCitas({
      fecha: fecha || undefined,
      pacienteId: Number.isInteger(pacienteId) && pacienteId > 0 ? pacienteId : undefined,
    });
    res.json({ datos });
  } catch (error) {
    next(error);
  }
}

/** POST /api/citas · alta de citas programadas o de emergencia */
export async function crearCita(req: Request, res: Response, next: NextFunction) {
  try {
    const cita = await servicio.crearCita(req.body as DatosCrearCita);
    res.status(201).json({ mensaje: `Cita creada para ${cita.paciente}.`, datos: cita });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/citas/:id/estatus */
export async function cambiarEstatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = leerId(req.params.id);
    const cita = await servicio.cambiarEstatusCita(id, req.body as DatosEstatusCita);
    res.json({ mensaje: `Cita marcada como ${cita.estatus.toLowerCase()}.`, datos: cita });
  } catch (error) {
    next(error);
  }
}
