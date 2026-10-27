import { z } from 'zod';
import { nombreClinico, compararNombre } from './comunes';
import { TIPOS_SANGRE } from './pacientes.validacion';

/**
 * Validaciones del cuestionario de salud inicial.
 *
 * El cuestionario es **único por paciente** (la tabla `cuestionario_salud`
 * tiene una sola fila por expediente) y se llena de dos formas: al primer
 * acceso del paciente a su portal, o antes de su primera consulta cuando
 * llega de manera directa (lo completa el personal clínico).
 *
 * Las alergias y las enfermedades crónicas se capturan como listas de
 * nombres: los que no existan en los catálogos (`cat_alergias`,
 * `cat_enfermedades`) se dan de alta al guardar el cuestionario y se vinculan
 * al paciente, para que aparezcan como alertas en la atención.
 */

export const ACTIVIDADES_FISICAS = ['Ninguna', 'Leve', 'Moderada', 'Intensa'] as const;
export const CONSUMO_TABACO = ['Nunca', 'Ex-fumador', 'Fumador'] as const;
export const CONSUMO_ALCOHOL = ['Nunca', 'Ocasional', 'Frecuente'] as const;

/** Nombre de alergia o enfermedad (catálogo o alta nueva): formato clínico */
const nombreConcepto = nombreClinico;

const textoOpcional = (maximo: number, etiqueta: string) =>
  z
    .string()
    .trim()
    .max(maximo, `${etiqueta} no puede exceder ${maximo} caracteres.`)
    .optional()
    .or(z.literal(''));

const listaConceptos = z
  .array(nombreConcepto, { error: 'La lista debe ser un arreglo de nombres.' })
  .max(50, 'Máximo 50 elementos por lista.')
  .refine(
    (nombres) => new Set(nombres.map((n) => compararNombre(n))).size === nombres.length,
    'Un nombre no puede repetirse en la lista.',
  );

export const esquemaCuestionario = z.object({
  /**
   * Tipo de sangre: es un dato del expediente (tabla `pacientes`), pero se
   * captura en el cuestionario inicial y se actualiza junto con él.
   */
  tipoSangre: z
    .enum(TIPOS_SANGRE, { error: 'El tipo de sangre no es válido.' })
    .optional()
    .or(z.literal('')),

  /* Medidas básicas (obligatorias: son la base del expediente) */
  peso: z
    .number({ error: 'El peso debe ser un número.' })
    .refine((v) => v >= 0.5 && v <= 500, 'El peso debe estar entre 0.5 y 500 kg.')
    .refine(
      (v) => Math.round(v * 100) / 100 === v,
      'El peso admite máximo dos decimales.',
    ),
  talla: z
    .number({ error: 'La talla debe ser un número.' })
    .refine((v) => v >= 0.3 && v <= 2.5, 'La talla debe estar entre 0.3 y 2.5 m.')
    .refine(
      (v) => Math.round(v * 100) / 100 === v,
      'La talla admite máximo dos decimales.',
    ),

  /* Hábitos (obligatorios: son respuestas rápidas y siempre aplican) */
  actividadFisica: z.enum(ACTIVIDADES_FISICAS, {
    error: 'Selecciona el nivel de actividad física.',
  }),
  tabaco: z.enum(CONSUMO_TABACO, { error: 'Selecciona el consumo de tabaco.' }),
  alcohol: z.enum(CONSUMO_ALCOHOL, { error: 'Selecciona el consumo de alcohol.' }),

  /* Historial y contexto (opcionales) */
  medicamentosActuales: textoOpcional(2000, 'Los medicamentos actuales'),
  cirugiasPrevias: textoOpcional(2000, 'Las cirugías previas'),
  alergiaOtra: textoOpcional(100, 'La otra alergia'),
  enfermedadOtra: textoOpcional(100, 'La otra enfermedad'),
  horasSueno: z
    .number({ error: 'Las horas de sueño deben ser un número.' })
    .int('Las horas de sueño deben ser un número entero.')
    .min(0, 'Las horas de sueño no pueden ser negativas.')
    .max(24, 'Las horas de sueño no pueden exceder 24.')
    .optional(),
  sintomasActuales: textoOpcional(2000, 'Los síntomas actuales'),
  comentarios: textoOpcional(2000, 'Los comentarios'),

  /* Alergias y enfermedades crónicas (catálogos + altas nuevas) */
  alergias: listaConceptos.optional(),
  enfermedades: listaConceptos.optional(),
});

export type DatosCuestionario = z.infer<typeof esquemaCuestionario>;
