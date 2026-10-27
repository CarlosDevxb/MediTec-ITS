/**
 * Detección de choques entre las alergias registradas del paciente y los
 * medicamentos del inventario (seguridad clínica al dispensar insumos).
 *
 * La comparación es textual: no hay un catálogo de principios activos, así
 * que se normalizan los nombres (minúsculas, sin acentos) y se busca el
 * término de la alergia dentro del nombre del medicamento o al revés.
 * Ej.: "Paracetamol 500 mg" choca con la alergia "Paracetamol".
 *
 * Es una alerta temprana, no un sustituto del juicio clínico: ante sinónimos
 * (paracetamol / acetaminofén) el personal debe verificar el principio activo.
 * El mismo criterio vive en el frontend (`services/atencion.service.ts`).
 */

/** Minúsculas, sin acentos y sin espacios dobles, para comparar nombres */
export function normalizarNombre(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Devuelve la alergia que impide dispensar el medicamento, o `null` si no
 * hay choque. Los términos de menos de 4 caracteres se ignoran para evitar
 * falsos positivos.
 */
export function alergiaEnConflicto(
  nombreMedicamento: string,
  alergias: readonly string[],
): string | null {
  const medicamento = normalizarNombre(nombreMedicamento);
  if (!medicamento) return null;

  for (const alergia of alergias) {
    const termino = normalizarNombre(alergia);
    if (termino.length < 4) continue;
    if (medicamento.includes(termino)) return alergia;
    if (medicamento.length >= 4 && termino.includes(medicamento)) return alergia;
  }
  return null;
}
