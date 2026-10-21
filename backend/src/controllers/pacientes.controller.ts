import type { Request, Response, NextFunction } from 'express';
import { errorProhibido, errorValidacion } from '../utils/erroresHttp';
import { textoObligatorio } from '../utils/parametros';
import type {
  DatosCrearPaciente,
  DatosActualizarExpediente,
} from '../validaciones/pacientes.validacion';
import type { DatosCuestionario } from '../validaciones/cuestionario.validacion';
import * as servicio from '../services/pacientes.service';
import * as servicioCuestionario from '../services/cuestionarios.service';

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

/**
 * Un paciente solo puede consultar y llenar su propio expediente
 * (el resto del personal clínico opera sobre cualquiera).
 */
async function asegurarPropioExpediente(req: Request, pacienteId: number): Promise<void> {
  const solicitante = req.usuario;
  if (!solicitante || solicitante.rol !== 'Paciente') return;
  const propio = await servicio.buscarPacientePorUsuario(solicitante.id);
  if (!propio || propio !== pacienteId) {
    throw errorProhibido('Solo puedes consultar y llenar tu propio cuestionario de salud.');
  }
}

/** GET /api/pacientes/:id · expediente con alergias, enfermedades y cuestionario */
export async function obtenerPaciente(req: Request, res: Response, next: NextFunction) {
  try {
    const id = leerId(req.params.id);
    await asegurarPropioExpediente(req, id);
    const expediente = await servicio.buscarPaciente(id);
    if (!expediente) throw servicio.errorPacienteNoEncontrado();
    res.json({ datos: expediente });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/pacientes/:id/cuestionario · cuestionario de salud inicial.
 * Lo llena el personal clínico antes de una primera consulta o el propio
 * paciente al entrar a su portal. Es único por expediente: si ya existe, se
 * actualiza.
 */
export async function guardarCuestionario(req: Request, res: Response, next: NextFunction) {
  try {
    const id = leerId(req.params.id);
    await asegurarPropioExpediente(req, id);
    const expediente = await servicioCuestionario.guardarCuestionario(
      id,
      req.body as DatosCuestionario,
    );
    res.json({
      mensaje: `Cuestionario de salud guardado para ${expediente.nombre}.`,
      datos: expediente,
    });
  } catch (error) {
    next(error);
  }
}

/** GET /api/pacientes/:id/seguimiento · avance de peso y talla */
export async function obtenerSeguimiento(req: Request, res: Response, next: NextFunction) {
  try {
    const id = leerId(req.params.id);
    await asegurarPropioExpediente(req, id);
    const personalMedicoId = Number(req.query['personalMedicoId'] ?? 0);
    const datos = await servicio.listarSeguimiento(
      id,
      Number.isInteger(personalMedicoId) && personalMedicoId > 0 ? personalMedicoId : undefined,
    );
    res.json({ datos });
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
    // El paciente solo puede actualizar su propio expediente
    await asegurarPropioExpediente(req, id);
    const paciente = await servicio.actualizarExpediente(
      id,
      req.body as DatosActualizarExpediente,
    );
    res.json({ mensaje: `Expediente de ${paciente.nombre} actualizado.`, datos: paciente });
  } catch (error) {
    next(error);
  }
}
