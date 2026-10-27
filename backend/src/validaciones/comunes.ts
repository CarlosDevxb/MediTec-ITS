import { z } from 'zod';

/**
 * Validaciones compartidas entre varios esquemas (usuarios y perfil).
 *
 * El teléfono se valida igual se capture desde el alta de usuarios o desde
 * la configuración de la propia cuenta, para que el formulario nunca acepte
 * algo que el servidor vaya a rechazar después.
 */

/** Formato aceptado: solo números, de 7 a 10 dígitos (teléfonos nacionales) */
export const FORMATO_TELEFONO = /^\d{7,10}$/;

/** Teléfono opcional: si se captura, debe cumplir el formato aceptado */
export const telefonoOpcional = z
  .string()
  .trim()
  .max(20, 'El teléfono no puede exceder 20 caracteres.')
  .refine(
    (valor) => valor === '' || FORMATO_TELEFONO.test(valor),
    'Escribe un teléfono válido: solo números, entre 7 y 10 dígitos.',
  )
  .optional()
  .or(z.literal(''));

/* ============================================================
   NOMBRES CLÍNICOS (alergias y enfermedades crónicas)

   Lo que las personas escriben se limita a texto razonable para
   que no entren basura ni símbolos en los catálogos, y se
   normaliza para no duplicar el mismo concepto escrito distinto
   ("penicilina", "Penicilina " y "PENICILINA" son uno solo).
   El mismo criterio vive en el frontend
   (`frontend/src/services/atencion.service.ts`).
   ============================================================ */

/** Letras (con acentos y ñ), números y puntuación habitual de nombres clínicos */
const FORMATO_NOMBRE_CLINICO = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9][A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .,()&+-]*$/;

/** Minúsculas y sin acentos: para comparar nombres sin importar la escritura */
export function compararNombre(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Nombre clínico normalizado: espacios colapsados y mayúscula inicial */
export function normalizarNombreClinico(texto: string): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : limpio;
}

/** Devuelve el problema del nombre, o cadena vacía si es válido */
export function errorNombreClinico(texto: string): string {
  const nombre = texto.trim();
  if (nombre.length < 3) return 'El nombre debe tener al menos 3 caracteres.';
  if (nombre.length > 100) return 'El nombre no puede exceder 100 caracteres.';
  if (!FORMATO_NOMBRE_CLINICO.test(nombre)) {
    return 'Usa solo letras, números y signos de puntuación (sin emojis ni símbolos).';
  }
  if ((nombre.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) ?? []).length < 2) {
    return 'El nombre debe contener al menos dos letras.';
  }
  if (/(.)\1{2,}/.test(nombre)) {
    return 'El nombre no debe repetir la misma letra tres veces seguidas.';
  }
  return '';
}

/** Nombre de alergia o enfermedad: con el formato clínico y normalizado */
export const nombreClinico = z
  .string({ error: 'El nombre no puede estar vacío.' })
  .trim()
  .min(1, 'El nombre no puede estar vacío.')
  .max(100, 'El nombre no puede exceder 100 caracteres.')
  .transform(normalizarNombreClinico)
  .superRefine((nombre, contexto) => {
    const problema = errorNombreClinico(nombre);
    if (problema) contexto.addIssue({ code: 'custom', message: problema });
  });
