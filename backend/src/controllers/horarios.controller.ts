import type { Request, Response, NextFunction } from 'express';
import { errorValidacion } from '../utils/erroresHttp';
import { textoObligatorio } from '../utils/parametros';
import type {
  DatosHorarios,
  DatosHorario,
  DatosActualizarTurno,
  DatosEliminarTurno,
} from '../validaciones/horarios.validacion';
import * as servicio from '../services/horarios.service';

/**
 * Controlador de los horarios del personal.
 * Valida la entrada, llama al servicio y arma la respuesta HTTP.
 */

/** Lee y valida el id numérico de la URL */
function leerId(valor: string | string[] | undefined): number {
  const id = Number.parseInt(textoObligatorio(valor), 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw errorValidacion('Identificador de turno no válido.');
  }
  return id;
}

/** GET /api/horarios?personalMedicoId=N */
export async function listarHorarios(req: Request, res: Response, next: NextFunction) {
  try {
    const personalMedicoId = Number(req.query['personalMedicoId'] ?? 0);
    const datos = await servicio.listarHorarios({
      personalMedicoId:
        Number.isInteger(personalMedicoId) && personalMedicoId > 0 ? personalMedicoId : undefined,
    });
    res.json({ datos });
  } catch (error) {
    next(error);
  }
}

/** POST /api/horarios · crea un turno por cada día enviado */
export async function crearHorarios(req: Request, res: Response, next: NextFunction) {
  try {
    const datos = req.body as DatosHorarios;
    const horarios = await servicio.crearHorarios(datos);
    res.status(201).json({
      mensaje:
        horarios.length === 1
          ? 'Turno creado (1 día).'
          : `Turno creado (${horarios.length} días).`,
      datos: horarios,
    });
  } catch (error) {
    next(error);
  }
}

/** PUT /api/horarios/:id */
export async function actualizarHorario(req: Request, res: Response, next: NextFunction) {
  try {
    const id = leerId(req.params.id);
    const horario = await servicio.actualizarHorario(id, req.body as DatosHorario);
    res.json({ mensaje: 'Turno actualizado.', datos: horario });
  } catch (error) {
    next(error);
  }
}

/** PUT /api/horarios/turno · reemplaza un turno completo (todos sus días) */
export async function actualizarTurno(req: Request, res: Response, next: NextFunction) {
  try {
    const datos = req.body as DatosActualizarTurno;
    const { horarios, plan } = await servicio.actualizarTurno(datos);
    res.json({
      mensaje: `${mensajeDeTurno(horarios.length)}${mensajeDeMovimientos(plan)}`,
      datos: { horarios, plan },
    });
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/horarios/turno · baja de un turno completo (todos sus días) */
export async function eliminarTurno(req: Request, res: Response, next: NextFunction) {
  try {
    const datos = req.body as DatosEliminarTurno;
    const { horarios, plan } = await servicio.eliminarTurno(datos);
    res.json({
      mensaje: `Turno de ${horarios[0]?.personal ?? 'personal'} eliminado.${mensajeDeMovimientos(plan)}`,
      datos: { horarios, plan },
    });
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/horarios/:id */
export async function eliminarHorario(req: Request, res: Response, next: NextFunction) {
  try {
    const id = leerId(req.params.id);
    const { horario, plan } = await servicio.eliminarHorario(id);
    res.json({
      mensaje: `Turno de ${horario.personal} eliminado.${mensajeDeMovimientos(plan)}`,
      datos: { horario, plan },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/horarios/plan-reagendamiento · qué haría un cambio de horario
 * sobre las citas, sin aplicarlo (se simula y se revierte).
 */
export async function planReagendamiento(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await servicio.simularOperacion(req.body as servicio.OperacionHorario);
    res.json({ datos: plan });
  } catch (error) {
    next(error);
  }
}

/** "Turno actualizado (3 días)." */
function mensajeDeTurno(dias: number): string {
  return dias === 1 ? 'Turno actualizado (1 día).' : `Turno actualizado (${dias} días).`;
}

/** Sufijo del mensaje cuando el cambio movió citas automáticamente */
function mensajeDeMovimientos(plan: { movimientos: unknown[] }): string {
  const total = plan.movimientos.length;
  if (total === 0) return ' Ninguna cita se movió.';
  return total === 1
    ? ' 1 cita pasó a estar pendiente de confirmación.'
    : ` ${total} citas pasaron a estar pendientes de confirmación.`;
}
