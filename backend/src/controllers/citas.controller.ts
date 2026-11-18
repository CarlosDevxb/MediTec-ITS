import type { Request, Response, NextFunction } from 'express';
import { errorValidacion } from '../utils/erroresHttp';
import { textoObligatorio, textoDe } from '../utils/parametros';
import type {
  DatosCrearCita,
  DatosEstatusCita,
  DatosReagendarCita,
} from '../validaciones/citas.validacion';
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

/** PUT /api/citas/:id · reagendar (cambia fecha y hora) */
export async function reagendar(req: Request, res: Response, next: NextFunction) {
  try {
    const usuario = req.usuario;
    if (!usuario) throw errorValidacion('No autenticado.');
    const cita = await servicio.reagendarCita(
      leerId(req.params.id),
      req.body as DatosReagendarCita,
      usuario,
    );
    res.json({
      mensaje: `Cita reagendada al ${cita.fecha} a las ${cita.hora}.`,
      datos: cita,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/citas/disponibilidad?personalMedicoId=N&fecha=AAAA-MM-DD
 *
 * Devuelve los huecos del día con el motivo de los que no se pueden elegir
 * (ocupada o pasada). Es la única fuente de la disponibilidad: la interfaz
 * dibuja estos slots y no recalcula las reglas. Nunca incluye datos de
 * pacientes.
 */
export async function disponibilidad(req: Request, res: Response, next: NextFunction) {
  try {
    const personalMedicoId = Number(req.query['personalMedicoId'] ?? 0);
    const fecha = textoDe(req.query['fecha'] as string | undefined);
    if (!Number.isInteger(personalMedicoId) || personalMedicoId <= 0) {
      throw errorValidacion('Indica al profesional de la salud.');
    }
    if (!esFecha(fecha)) throw errorValidacion('Indica la fecha.');

    const datos = await servicio.disponibilidadDe(
      personalMedicoId,
      fecha as string,
      excluirCitaIdDe(req),
    );
    res.json({ datos });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/citas/disponibilidad/dias?personalMedicoId=N&desde=&hasta=
 *
 * Días útiles del personal en un rango: los que tienen horario y al menos un
 * hueco libre, con el número de horas disponibles de cada uno.
 */
export async function diasDisponibles(req: Request, res: Response, next: NextFunction) {
  try {
    const personalMedicoId = Number(req.query['personalMedicoId'] ?? 0);
    const desde = textoDe(req.query['desde'] as string | undefined);
    const hasta = textoDe(req.query['hasta'] as string | undefined);

    if (!Number.isInteger(personalMedicoId) || personalMedicoId <= 0) {
      throw errorValidacion('Indica al profesional de la salud.');
    }
    if (!esFecha(desde) || !esFecha(hasta)) {
      throw errorValidacion('Indica el rango de fechas.');
    }
    servicio.asegurarRangoConsultable(desde as string, hasta as string);

    const dias = await servicio.diasDisponibles(
      personalMedicoId,
      desde as string,
      hasta as string,
      excluirCitaIdDe(req),
    );
    res.json({ datos: { personalMedicoId, desde, hasta, dias } });
  } catch (error) {
    next(error);
  }
}

/**
 * Cita a ignorar en el cálculo de disponibilidad (al reagendar): se pasa como
 * `excluirCitaId` y solo se acepta si es un entero positivo.
 */
function excluirCitaIdDe(req: Request): number | undefined {
  const valor = Number(req.query['excluirCitaId'] ?? 0);
  return Number.isInteger(valor) && valor > 0 ? valor : undefined;
}

/** ¿La cadena es una fecha real en formato AAAA-MM-DD? */
function esFecha(valor: string | undefined): boolean {
  return Boolean(valor && /^\d{4}-\d{2}-\d{2}$/.test(valor));
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
