import type { Request, Response, NextFunction } from 'express';
import { errorValidacion } from '../utils/erroresHttp';
import { textoObligatorio } from '../utils/parametros';
import type {
  DatosCrearPaciente,
  DatosActualizarExpediente,
} from '../validaciones/pacientes.validacion';
import * as servicio from '../services/pacientes.service';

/**
 * Controlador de pacientes (expedientes clínicos).
 * El cuerpo ya viene validado por el middleware `validar()` de la ruta.
 */

/** Lee y valida el id numérico de la URL */
function leerId(valor: string | string[] | undefined): number {
  const id = Number.parseInt(textoObligatorio(valor), 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw errorValidacion('Identificador de paciente no válido.');
  }
  return id;
}

/** GET /api/pacientes */
export async function listarPacientes(_req: Request, res: Response, next: NextFunction) {
  try {
    const datos = await servicio.listarPacientes();
    res.json({ datos });
  } catch (error) {
    next(error);
  }
}

/** GET /api/pacientes/:id · expediente con alergias, enfermedades y cuestionario */
export async function obtenerPaciente(req: Request, res: Response, next: NextFunction) {
  try {
    const id = leerId(req.params.id);
    const expediente = await servicio.buscarPaciente(id);
    if (!expediente) throw servicio.errorPacienteNoEncontrado();
    res.json({ datos: expediente });
  } catch (error) {
    next(error);
  }
}

/** POST /api/pacientes · alta de paciente (cuenta + expediente) */
export async function crearPaciente(req: Request, res: Response, next: NextFunction) {
  try {
    const { paciente, contrasenaTemporal } = await servicio.crearPaciente(
      req.body as DatosCrearPaciente,
    );
    res.status(201).json({
      mensaje: `Expediente abierto para ${paciente.nombre}.`,
      datos: { paciente, contrasenaTemporal },
    });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/pacientes/:id/expediente · tipo de sangre y antecedentes */
export async function actualizarExpediente(req: Request, res: Response, next: NextFunction) {
  try {
    const id = leerId(req.params.id);
    const paciente = await servicio.actualizarExpediente(
      id,
      req.body as DatosActualizarExpediente,
    );
    res.json({ mensaje: `Expediente de ${paciente.nombre} actualizado.`, datos: paciente });
  } catch (error) {
    next(error);
  }
}
