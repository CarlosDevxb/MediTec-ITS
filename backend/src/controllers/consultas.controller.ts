import type { Request, Response, NextFunction } from 'express';
import { errorProhibido, errorNoEncontrado, errorValidacion } from '../utils/erroresHttp';
import { textoObligatorio } from '../utils/parametros';
import type { DatosCrearConsulta } from '../validaciones/consultas.validacion';
import { buscarPacientePorUsuario } from '../services/pacientes.service';
import * as servicio from '../services/consultas.service';

/**
 * Controlador de consultas clínicas.
 * El cuerpo ya viene validado por el middleware `validar()` de la ruta.
 */

/** Lee y valida el id numérico de la URL */
function leerId(valor: string | string[] | undefined): number {
  const id = Number.parseInt(textoObligatorio(valor), 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw errorValidacion('Identificador de consulta no válido.');
  }
  return id;
}

/**
 * POST /api/consultas · registra una atención completa.
 * La auto-cita 'Atención directa' (cuando no hay cita previa) se crea en el
 * servicio, antes que la consulta y dentro de la misma transacción.
 */
export async function crearConsulta(req: Request, res: Response, next: NextFunction) {
  try {
    const usuarioId = req.usuario?.id;
    if (!usuarioId) throw errorValidacion('No autenticado.');

    const consulta = await servicio.crearConsulta(
      usuarioId,
      req.body as DatosCrearConsulta,
    );
    res.status(201).json({
      mensaje: `Consulta registrada para ${consulta.paciente.nombre}.`,
      datos: consulta,
    });
  } catch (error) {
    next(error);
  }
}

/** GET /api/consultas?pacienteId=N&personalMedicoId=N · historial de consultas */
export async function listarConsultas(req: Request, res: Response, next: NextFunction) {
  try {
    const usuario = req.usuario;
    if (!usuario) throw errorValidacion('No autenticado.');

    const pacienteId = Number(req.query['pacienteId'] ?? 0);
    const personalMedicoId = Number(req.query['personalMedicoId'] ?? 0);
    let filtroPaciente = Number.isInteger(pacienteId) && pacienteId > 0 ? pacienteId : undefined;

    // El paciente solo ve sus propias consultas
    if (usuario.rol === 'Paciente') {
      filtroPaciente = (await buscarPacientePorUsuario(usuario.id)) ?? -1;
    }

    const datos = await servicio.listarConsultas({
      pacienteId: filtroPaciente,
      personalMedicoId:
        Number.isInteger(personalMedicoId) && personalMedicoId > 0 ? personalMedicoId : undefined,
    });
    res.json({ datos });
  } catch (error) {
    next(error);
  }
}

/** GET /api/consultas/:id · detalle con signos vitales e insumos */
export async function obtenerConsulta(req: Request, res: Response, next: NextFunction) {
  try {
    const id = leerId(req.params.id);
    const consulta = await servicio.buscarConsulta(id);
    if (!consulta) throw errorNoEncontrado('La consulta no existe.');

    // El paciente solo puede ver sus propias consultas
    const usuario = req.usuario;
    if (usuario?.rol === 'Paciente') {
      const propio = await buscarPacientePorUsuario(usuario.id);
      if (!propio || propio !== consulta.paciente.id) {
        throw errorProhibido('Solo puedes ver tus propias consultas.');
      }
    }

    res.json({ datos: consulta });
  } catch (error) {
    next(error);
  }
}
