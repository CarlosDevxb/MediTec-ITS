/**
 * Lectura de parámetros de ruta.
 *
 * Express 5 tipifica `req.params` como `string | string[]` (por el soporte de
 * comodines en las rutas), así que en este proyecto los parámetros siempre se
 * leen con este helper para quedarnos con un único texto.
 */
export function textoDe(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

/** Igual que `textoDe`, pero devuelve cadena vacía si no viene nada */
export function textoObligatorio(valor: string | string[] | undefined): string {
  return textoDe(valor) ?? '';
}
