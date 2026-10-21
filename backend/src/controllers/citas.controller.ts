import type { Request, Response, NextFunction } from 'express';
import { errorValidacion } from '../utils/erroresHttp';
import { textoObligatorio, textoDe } from '../utils/parametros';
import type { DatosCrearCita, DatosEstatusCita } from '../validaciones/citas.validacion';
import { buscarPacientePorUsuario } from '../services/pacientes.service';
import * as servicio from '../services/citas.service';

/**
 * Controlador de citas (agenda del personal clínico y del paciente).
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
    const usuario = req.usuario;
    if (!usuario) throw errorValidacion('No autenticado.');

    const fecha = textoDe(req.query['fecha'] as string | undefined);
    const pacienteId = Number(req.query['pacienteId'] ?? 0);
    let filtroPaciente = Number.isInteger(pacienteId) && pacienteId > 0 ? pacienteId : undefined;

    // El paciente solo ve sus propias citas
    if (usuario.rol === 'Paciente') {
      filtroPaciente = (await buscarPacientePorUsuario(usuario.id)) ?? -1;
    }

    const datos = await servicio.listarCitas({
      fecha: fecha || undefined,
      pacienteId: filtroPaciente,
    });
    res.json({ datos });
  } catch (error) {
    next(error);
  }
}

/** POST /api/citas · alta de citas programadas o de emergencia */
export async function crearCita(req: Request, res: Response, next: NextFunction) {
  try {
    const usuario = req.usuario;
    if (!usuario) throw errorValidacion('No autenticado.');
    const cita = await servicio.crearCita(req.body as DatosCrearCita, usuario);
    res.status(201).json({ mensaje: `Cita creada para ${cita.paciente}.`, datos: cita });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/citas/:id/estatus */
export async function cambiarEstatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = leerId(req.params.id);
    const usuario = req.usuario;
    if (!usuario) throw errorValidacion('No autenticado.');
    const cita = await servicio.cambiarEstatusCita(id, req.body as DatosEstatusCita, usuario);
    res.json({ mensaje: `Cita marcada como ${cita.estatus.toLowerCase()}.`, datos: cita });
  } catch (error) {
    next(error);
  }
}
