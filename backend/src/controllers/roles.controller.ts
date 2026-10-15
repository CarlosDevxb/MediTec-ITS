import type { Request, Response, NextFunction } from 'express';
import { esquemaRol, detallesDeZod } from '../validaciones/roles.validacion';
import { errorValidacion } from '../utils/erroresHttp';
import { textoObligatorio } from '../utils/parametros';
import * as servicio from '../services/roles.service';

/** Controlador de roles (CRUD completo del catálogo de roles). */

/** Lee y valida el id numérico de la URL */
function leerId(valor: string | string[] | undefined): number {
  const id = Number.parseInt(textoObligatorio(valor), 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw errorValidacion('Identificador de rol no válido.');
  }
  return id;
}

/** Valida el cuerpo con el esquema de rol */
function validarCuerpo(req: Request) {
  const resultado = esquemaRol.safeParse(req.body);
  if (!resultado.success) {
    const error = errorValidacion('Datos inválidos.');
    (error as { detalles?: unknown }).detalles = detallesDeZod(resultado.error);
    throw error;
  }
  return resultado.data;
}

/** GET /api/roles */
export async function listarRoles(_req: Request, res: Response, next: NextFunction) {
  try {
    const datos = await servicio.listarRoles();
    res.json({ datos });
  } catch (error) {
    next(error);
  }
}

/** POST /api/roles */
export async function crearRol(req: Request, res: Response, next: NextFunction) {
  try {
    const datos = validarCuerpo(req);
    const rol = await servicio.crearRol(datos);
    res.status(201).json({ mensaje: `Rol "${rol.nombre}" creado.`, datos: rol });
  } catch (error) {
    next(error);
  }
}

/** PUT /api/roles/:id */
export async function actualizarRol(req: Request, res: Response, next: NextFunction) {
  try {
    const id = leerId(req.params.id);
    const datos = validarCuerpo(req);
    const rol = await servicio.actualizarRol(id, datos);
    res.json({ mensaje: `Rol "${rol.nombre}" actualizado.`, datos: rol });
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/roles/:id */
export async function eliminarRol(req: Request, res: Response, next: NextFunction) {
  try {
    const id = leerId(req.params.id);
    const { nombre } = await servicio.eliminarRol(id);
    res.json({ mensaje: `Rol "${nombre}" eliminado.` });
  } catch (error) {
    next(error);
  }
}
