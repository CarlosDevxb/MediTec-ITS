import type { Request, Response, NextFunction } from 'express';
import { CATALOGOS, buscarCatalogo } from '../config/catalogos';
import { errorNoEncontrado, errorValidacion } from '../utils/erroresHttp';
import { textoObligatorio } from '../utils/parametros';
import {
  esquemaCatalogo,
  esquemaConsolidarValor,
  detallesDeZod,
  type DatosConsolidarValor,
} from '../validaciones/catalogos.validacion';
import * as servicio from '../services/catalogos.service';

/**
 * Controlador de catálogos.
 * Todas las rutas comparten el mismo flujo: resolver el catálogo por su id
 * (lista blanca), validar el cuerpo y delegar en el servicio.
 */

/** Lee el id numérico de la URL; 400 si no es un número válido */
function leerId(valor: string | string[] | undefined): number {
  const id = Number.parseInt(textoObligatorio(valor), 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw errorValidacion('Identificador de registro no válido.');
  }
  return id;
}

/** Resuelve el catálogo o responde 404 */
function resolverCatalogo(id: string) {
  const def = buscarCatalogo(id);
  if (!def) {
    throw errorNoEncontrado(`El catálogo "${id}" no existe.`);
  }
  return def;
}

/** Concordancia de género en los mensajes ("agregada" / "agregado") */
function participio(def: { articulo: string }): 'a' | 'o' {
  return def.articulo === 'la' ? 'a' : 'o';
}

/** GET /api/catalogos · metadatos de los catálogos disponibles */
export async function listarCatalogos(_req: Request, res: Response, next: NextFunction) {
  try {
    const datos = await Promise.all(
      Object.values(CATALOGOS).map(async (def) => ({
        id: def.id,
        titulo: def.titulo,
        descripcion: def.descripcion,
        singular: def.singular,
        articulo: def.articulo,
        campos: def.campos,
        total: await servicio.contarValores(def),
      })),
    );
    res.json({ datos });
  } catch (error) {
    next(error);
  }
}

/** GET /api/catalogos/:catalogo · valores del catálogo */
export async function listarValores(req: Request, res: Response, next: NextFunction) {
  try {
    const def = resolverCatalogo(textoObligatorio(req.params.catalogo));
    const datos = await servicio.listarValores(def);
    res.json({ datos });
  } catch (error) {
    next(error);
  }
}

/** POST /api/catalogos/:catalogo · alta de un valor */
export async function crearValor(req: Request, res: Response, next: NextFunction) {
  try {
    const def = resolverCatalogo(textoObligatorio(req.params.catalogo));
    const resultado = esquemaCatalogo(def).safeParse(req.body);
    if (!resultado.success) {
      return res.status(400).json({ error: 'Datos inválidos.', detalles: detallesDeZod(resultado.error) });
    }

    const datos = await servicio.crearValor(def, resultado.data as Record<string, string>);
    res.status(201).json({
      mensaje: `${def.singular} "${datos.nombre}" agregad${participio(def)} al catálogo de ${def.titulo.toLowerCase()}.`,
      datos,
    });
  } catch (error) {
    next(error);
  }
}

/** PUT /api/catalogos/:catalogo/:id · edición de un valor */
export async function actualizarValor(req: Request, res: Response, next: NextFunction) {
  try {
    const def = resolverCatalogo(textoObligatorio(req.params.catalogo));
    const id = leerId(req.params.id);
    const resultado = esquemaCatalogo(def).safeParse(req.body);
    if (!resultado.success) {
      return res.status(400).json({ error: 'Datos inválidos.', detalles: detallesDeZod(resultado.error) });
    }

    const datos = await servicio.actualizarValor(def, id, resultado.data as Record<string, string>);
    res.json({ mensaje: `${def.singular} "${datos.nombre}" actualizad${participio(def)}.`, datos });
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/catalogos/:catalogo/:id · baja de un valor */
export async function eliminarValor(req: Request, res: Response, next: NextFunction) {
  try {
    const def = resolverCatalogo(textoObligatorio(req.params.catalogo));
    const id = leerId(req.params.id);
    const { nombre } = await servicio.eliminarValor(def, id);
    res.json({ mensaje: `${def.singular} "${nombre}" eliminad${participio(def)} del catálogo.` });
  } catch (error) {
    next(error);
  }
}

/** POST /api/catalogos/:catalogo/consolidar · une un valor en otro */
export async function consolidarValor(req: Request, res: Response, next: NextFunction) {
  try {
    const def = resolverCatalogo(textoObligatorio(req.params.catalogo));
    const resultado = esquemaConsolidarValor.safeParse(req.body);
    if (!resultado.success) {
      return res.status(400).json({ error: 'Datos inválidos.', detalles: detallesDeZod(resultado.error) });
    }

    const datos = resultado.data as DatosConsolidarValor;
    const consolidado = await servicio.consolidarValor(def, datos);
    res.json({
      mensaje:
        consolidado.movidos > 0
          ? `"${consolidado.nombre}" se consolidó en "${consolidado.destino}" (${consolidado.movidos} ${
              consolidado.movidos === 1 ? 'registro pasó' : 'registros pasaron'
            } al valor destino) y ya no existe en el catálogo.`
          : `"${consolidado.nombre}" se consolidó en "${consolidado.destino}" y ya no existe en el catálogo (sus registros ya apuntaban al valor destino).`,
      datos: consolidado,
    });
  } catch (error) {
    next(error);
  }
}
