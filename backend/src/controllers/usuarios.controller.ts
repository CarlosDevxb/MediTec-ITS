import type { Request, Response, NextFunction } from 'express';
import type { DatosCrearUsuario, DatosActualizarUsuario } from '../validaciones/usuarios.validacion';
import {
  esquemaFilaImportarUsuario,
  type DatosFilaImportarUsuario,
} from '../validaciones/usuarios.validacion';
import { errorNoEncontrado, errorValidacion } from '../utils/erroresHttp';
import { textoObligatorio } from '../utils/parametros';
import * as servicio from '../services/usuarios.service';
import * as servicioImportacion from '../services/importacion.service';
import type { ResultadoFilaImportacion } from '../services/importacion.service';

/**
 * Controlador de usuarios.
 *
 * El cuerpo ya viene validado por el middleware `validar()` de la ruta, así que
 * aquí solo se castea y se delega en el servicio (igual que en `auth`).
 */

/** Lee y valida el id numérico de la URL */
function leerId(valor: string | string[] | undefined): number {
  const id = Number.parseInt(textoObligatorio(valor), 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw errorValidacion('Identificador de usuario no válido.');
  }
  return id;
}

/** GET /api/usuarios */
export async function listarUsuarios(_req: Request, res: Response, next: NextFunction) {
  try {
    const datos = await servicio.listarUsuarios();
    res.json({ datos });
  } catch (error) {
    next(error);
  }
}

/** GET /api/usuarios/:id */
export async function obtenerUsuario(req: Request, res: Response, next: NextFunction) {
  try {
    const id = leerId(req.params.id);
    const usuario = await servicio.buscarUsuario(id);
    if (!usuario) throw errorNoEncontrado('El usuario no existe.');
    res.json({ datos: usuario });
  } catch (error) {
    next(error);
  }
}

/** POST /api/usuarios */
export async function crearUsuario(req: Request, res: Response, next: NextFunction) {
  try {
    const datos = req.body as unknown as DatosCrearUsuario;
    const usuario = await servicio.crearUsuario(datos, datos.contrasena);
    res.status(201).json({
      mensaje: `Usuario "${usuario.nombre}" dado de alta.`,
      datos: usuario,
    });
  } catch (error) {
    next(error);
  }
}

/** PUT /api/usuarios/:id */
export async function actualizarUsuario(req: Request, res: Response, next: NextFunction) {
  try {
    const id = leerId(req.params.id);
    const datos = req.body as unknown as DatosActualizarUsuario;
    const usuario = await servicio.actualizarUsuario(id, datos);
    res.json({ mensaje: `Usuario "${usuario.nombre}" actualizado.`, datos: usuario });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/usuarios/:id/estatus */
export async function cambiarEstatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = leerId(req.params.id);
    const { estatus } = req.body as unknown as { estatus: boolean };
    const solicitante = req.usuario?.id;
    if (!solicitante) throw errorValidacion('No autenticado.');

    const usuario = await servicio.cambiarEstatus(id, estatus, solicitante);
    res.json({
      mensaje: estatus
        ? `Cuenta de ${usuario.nombre} habilitada.`
        : `Cuenta de ${usuario.nombre} deshabilitada.`,
      datos: usuario,
    });
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/usuarios/:id */
export async function eliminarUsuario(req: Request, res: Response, next: NextFunction) {
  try {
    const id = leerId(req.params.id);
    const solicitante = req.usuario?.id;
    if (!solicitante) throw errorValidacion('No autenticado.');
    const { nombre } = await servicio.eliminarUsuario(id, solicitante);
    res.json({ mensaje: `Usuario "${nombre}" eliminado.` });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/usuarios/importar · alta masiva desde un archivo de Excel.
 *
 * La validación de formato se hace fila por fila (no con el middleware
 * `validar()`) para poder reportar cada problema en su lugar: una fila con
 * datos inválidos no detiene la importación del resto.
 */
export async function importarUsuarios(req: Request, res: Response, next: NextFunction) {
  try {
    const { filas } = req.body as { filas: unknown[] };

    const validas: Array<{ fila: number; datos: DatosFilaImportarUsuario }> = [];
    const resultados: ResultadoFilaImportacion[] = [];

    filas.forEach((fila, indice) => {
      // La fila 1 del Excel son los encabezados; los datos empiezan en la 2
      const numeroFila = indice + 2;
      const parseo = esquemaFilaImportarUsuario.safeParse(fila);
      if (parseo.success) {
        validas.push({ fila: numeroFila, datos: parseo.data });
      } else {
        resultados.push({
          fila: numeroFila,
          estado: 'error',
          mensaje: parseo.error.issues.map((issue) => issue.message).join(' '),
        });
      }
    });

    if (validas.length > 0) {
      resultados.push(...(await servicioImportacion.importarUsuarios(validas)));
    }
    resultados.sort((a, b) => a.fila - b.fila);

    const creados = resultados.filter((r) => r.estado === 'creado').length;
    const fallidos = resultados.length - creados;
    res.status(201).json({
      mensaje: `Importación terminada: ${creados} cuenta(s) creada(s), ${fallidos} con errores.`,
      datos: { creados, fallidos, resultados },
    });
  } catch (error) {
    next(error);
  }
}
