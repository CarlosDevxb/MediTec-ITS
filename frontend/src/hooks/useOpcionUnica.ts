import { useEffect } from 'react';

/* ============================================================
   HOOK · useOpcionUnica
   Selecciona sola la única opción disponible cuando el campo aún
   no tiene valor.

   Sin esto, un selector con un solo dato (un rol, un tipo de
   paciente, una unidad…) se veía "elegido" en pantalla pero el
   formulario seguía sin selección, o aparecía en blanco: el
   navegador muestra la primera opción aunque el valor del estado
   no coincida con ninguna.
   ============================================================ */

/**
 * @param opciones  Catálogo ya cargado (cada elemento con su `id`).
 * @param valor     Valor actual del campo ('' o 0 cuentan como vacío).
 * @param seleccionar  Setter del campo; recibe el `id` de la única opción.
 */
export function useOpcionUnica(
  opciones: ReadonlyArray<{ id: number | string }>,
  valor: number | string,
  seleccionar: (id: number | string) => void,
): void {
  useEffect(() => {
    if (opciones.length !== 1) return;
    if (valor !== '' && valor !== 0) return;
    const unica = opciones[0];
    if (unica) seleccionar(unica.id);
    // `seleccionar` suele ser una función en línea: el guardas de arriba
    // evitan cualquier bucle aunque la referencia cambie en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opciones, valor]);
}
