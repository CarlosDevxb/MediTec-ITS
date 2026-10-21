import type { Request, Response, NextFunction } from 'express';
import { errorProhibido, errorValidacion } from '../utils/erroresHttp';
import { textoObligatorio } from '../utils/parametros';
import type {
  DatosCrearPlan,
  DatosActualizarPlan,
  DatosEstatusPlan,
} from '../validaciones/planes.validacion';
import { buscarPersonalPorUsuario } from '../services/personal.service';
import { buscarPacientePorUsuario } from '../services/pacientes.service';
import * as servicio from '../services/planes.service';

/**
 * Controlador de planes alimenticios.
 * El cuerpo ya viene validado por el middleware `validar()` de la ruta.
 */

/** Lee y valida el id numérico de la URL */
function leerId(valor: string | string[] | undefined): number {
  const id = Number.parseInt(textoObligatorio(valor), 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw errorValidacion('Identificador de plan no válido.');
  }
  return id;
}

/** La ficha de personal de quien gestiona el plan (quien lo firma) */
async function personalDeSesion(req: Request): Promise<number> {
  const usuarioId = req.usuario?.id;
  if (!usuarioId) throw errorValidacion('No autenticado.');
  const personal = await buscarPersonalPorUsuario(usuarioId);
  if (!personal) {
    throw errorProhibido('Tu cuenta no tiene ficha de personal clínico.');
  }
  return personal.id;
}

/** GET /api/planes?pacienteId=N&personalMedicoId=N */
export async function listarPlanes(req: Request, res: Response, next: NextFunction) {
  try {
    const usuario = req.usuario;
    if (!usuario) throw errorValidacion('No autenticado.');

    const pacienteId = Number(req.query['pacienteId'] ?? 0);
    const personalMedicoId = Number(req.query['personalMedicoId'] ?? 0);
    let filtroPaciente = Number.isInteger(pacienteId) && pacienteId > 0 ? pacienteId : undefined;

    // El paciente solo puede ver su propio plan alimenticio
    if (usuario.rol === 'Paciente') {
      filtroPaciente = (await buscarPacientePorUsuario(usuario.id)) ?? -1;
    }

    const datos = await servicio.listarPlanes({
      pacienteId: filtroPaciente,
      personalMedicoId:
        Number.isInteger(personalMedicoId) && personalMedicoId > 0 ? personalMedicoId : undefined,
    });
    res.json({ datos });
  } catch (error) {
    next(error);
  }
}

/** GET /api/planes/:id */
export async function obtenerPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await servicio.buscarPlan(leerId(req.params.id));
    if (!plan) throw servicio.errorPlanNoEncontrado();

    // El paciente solo puede ver su propio plan alimenticio
    const usuario = req.usuario;
    if (usuario?.rol === 'Paciente') {
      const propio = await buscarPacientePorUsuario(usuario.id);
      if (!propio || propio !== plan.pacienteId) {
        throw errorProhibido('Solo puedes ver tu propio plan alimenticio.');
      }
    }

    res.json({ datos: plan });
  } catch (error) {
    next(error);
  }
}

/** POST /api/planes · alta de un plan alimenticio */
export async function crearPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const personalMedicoId = await personalDeSesion(req);
    const plan = await servicio.crearPlan(personalMedicoId, req.body as DatosCrearPlan);
    res.status(201).json({
      mensaje: `Plan alimenticio creado para ${plan.paciente}.`,
      datos: plan,
    });
  } catch (error) {
    next(error);
  }
}

/** PUT /api/planes/:id · dieta, calorías o periodo */
export async function actualizarPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await servicio.actualizarPlan(
      leerId(req.params.id),
      req.body as DatosActualizarPlan,
    );
    res.json({ mensaje: `Plan alimenticio de ${plan.paciente} actualizado.`, datos: plan });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/planes/:id/estatus · vigente, finalizado o cancelado */
export async function cambiarEstatus(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await servicio.cambiarEstatusPlan(
      leerId(req.params.id),
      req.body as DatosEstatusPlan,
    );
    res.json({
      mensaje: `Plan alimenticio marcado como ${plan.estatus.toLowerCase()}.`,
      datos: plan,
    });
  } catch (error) {
    next(error);
  }
}
