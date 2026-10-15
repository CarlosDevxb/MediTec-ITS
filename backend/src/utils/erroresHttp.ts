/**
 * Errores HTTP de la API.
 *
 * El manejador central (`manejarErrores`) lee `status` de estos errores para
 * responder con el código correcto y con un mensaje pensado para el usuario,
 * en lugar de filtrar detalles internos de MySQL.
 */
export class ErrorHttp extends Error {
  constructor(
    readonly status: number,
    mensaje: string,
    readonly detalles?: Array<{ campo: string; mensaje: string }>,
  ) {
    super(mensaje);
    this.name = 'ErrorHttp';
  }
}

/** 400 · el cuerpo de la petición no es válido */
export function errorValidacion(
  mensaje: string,
  detalles?: Array<{ campo: string; mensaje: string }>,
): ErrorHttp {
  return new ErrorHttp(400, mensaje, detalles);
}

/** 404 · el recurso no existe */
export function errorNoEncontrado(mensaje: string): ErrorHttp {
  return new ErrorHttp(404, mensaje);
}

/** 403 · la cuenta no tiene permiso para esta operación */
export function errorProhibido(mensaje: string): ErrorHttp {
  return new ErrorHttp(403, mensaje);
}

/** 409 · conflicto con el estado actual (duplicado o registro en uso) */
export function errorConflicto(mensaje: string): ErrorHttp {
  return new ErrorHttp(409, mensaje);
}
