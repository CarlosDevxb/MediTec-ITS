/**
 * Normalización de fechas y horas de MySQL a texto.
 *
 * MySQL entrega `DATE` como objeto Date construido con las partes locales y
 * `TIME` como cadena 'HH:MM:SS'; aquí se convierten a los formatos que usa la
 * API (AAAA-MM-DD, HH:mm y AAAA-MM-DD HH:mm) para no depender del conector.
 */
export function fechaISO(valor: unknown): string {
  if (valor instanceof Date) {
    return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(
      valor.getDate(),
    ).padStart(2, '0')}`;
  }
  return String(valor ?? '').slice(0, 10);
}

/** "08:30:00" → "08:30" */
export function horaCorta(valor: unknown): string {
  if (valor instanceof Date) {
    return `${String(valor.getHours()).padStart(2, '0')}:${String(valor.getMinutes()).padStart(2, '0')}`;
  }
  return String(valor ?? '').slice(0, 5);
}

/** "2026-10-15 08:30:00" → "2026-10-15 08:30" */
export function fechaHoraTexto(valor: unknown): string {
  if (valor instanceof Date) {
    return `${fechaISO(valor)} ${horaCorta(valor)}`;
  }
  return String(valor ?? '').slice(0, 16);
}

/** Fecha de hoy en el servidor, en formato AAAA-MM-DD */
export function hoyISO(): string {
  return fechaISO(new Date());
}
