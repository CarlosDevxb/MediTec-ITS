import { z } from 'zod';

/**
 * Validaciones de consultas clínicas.
 *
 * El esquema es la fuente de la regla central: toda consulta deriva de una
 * cita. Si el atendido llega sin cita (doctor y enfermería), el formulario
 * envía el motivo de la atención y el sistema crea primero la auto-cita
 * 'Atención directa'; si trae cita agendada, se envía `citaId` y el motivo
 * no es necesario.
 */

const idPositivo = (mensaje: string) =>
  z.coerce.number({ error: mensaje }).int(mensaje).positive(mensaje);

/** Signos vitales opcionales (tabla `signos_vitales`, 1 por consulta) */
export const esquemaSignosVitales = z.object({
  ta: z
    .string()
    .trim()
    .max(10, 'La presión arterial no puede exceder 10 caracteres.')
    .optional()
    .or(z.literal('')),
  fc: idPositivo('La frecuencia cardíaca debe ser un número.')
    .refine((v) => v >= 20 && v <= 250, 'La frecuencia cardíaca debe estar entre 20 y 250 lpm.')
    .optional(),
  fr: idPositivo('La frecuencia respiratoria debe ser un número.')
    .refine((v) => v >= 5 && v <= 60, 'La frecuencia respiratoria debe estar entre 5 y 60 rpm.')
    .optional(),
  temp: z
    .number({ error: 'La temperatura debe ser un número.' })
    .refine((v) => v >= 25 && v <= 45, 'La temperatura debe estar entre 25 y 45 °C.')
    .optional(),
  peso: z
    .number({ error: 'El peso debe ser un número.' })
    .refine((v) => v >= 0.5 && v <= 500, 'El peso debe estar entre 0.5 y 500 kg.')
    .optional(),
  talla: z
    .number({ error: 'La talla debe ser un número.' })
    .refine((v) => v >= 0.3 && v <= 2.5, 'La talla debe estar entre 0.3 y 2.5 m.')
    .optional(),
});

/** Insumo usado en la atención (tabla `consulta_insumo`) */
export const esquemaInsumo = z.object({
  medicamentoId: idPositivo('Selecciona un medicamento.'),
  cantidad: z
    .number({ error: 'La cantidad debe ser un número.' })
    .min(0.01, 'La cantidad debe ser mayor a cero.')
    .max(99999999.99, 'La cantidad no puede exceder 99,999,999.99.')
    .refine(
      (valor) => Math.round(valor * 100) / 100 === valor,
      'La cantidad admite máximo dos decimales.',
    ),
});

export const esquemaCrearConsulta = z
  .object({
    pacienteId: idPositivo('Selecciona un paciente.'),
    /** Cita agendada previamente; si no viene, el sistema crea la auto-cita */
    citaId: idPositivo('La cita no es válida.').optional(),
    /** Motivo de la atención (se registra en la auto-cita) */
    motivo: z
      .string()
      .trim()
      .max(255, 'El motivo no puede exceder 255 caracteres.')
      .optional()
      .or(z.literal('')),
    sintomas: z
      .string({ error: 'Describe los síntomas.' })
      .trim()
      .min(1, 'Describe los síntomas.')
      .max(2000, 'Los síntomas no pueden exceder 2000 caracteres.'),
    exploracion: z
      .string()
      .trim()
      .max(2000, 'La exploración no puede exceder 2000 caracteres.')
      .optional()
      .or(z.literal('')),
    diagnostico: z
      .string()
      .trim()
      .min(1, 'El diagnóstico es obligatorio.')
      .max(255, 'El diagnóstico no puede exceder 255 caracteres.')
      .optional()
      .or(z.literal('')),
    tratamiento: z
      .string()
      .trim()
      .min(1, 'El tratamiento es obligatorio.')
      .max(2000, 'El tratamiento no puede exceder 2000 caracteres.')
      .optional()
      .or(z.literal('')),
    /** Intervención de enfermería (consultas del rol Enfermería) */
    intervencionEnfermeria: z
      .string()
      .trim()
      .min(1, 'Describe la intervención de enfermería.')
      .max(2000, 'La intervención no puede exceder 2000 caracteres.')
      .optional()
      .or(z.literal('')),
    signosVitales: esquemaSignosVitales.optional(),
    insumos: z
      .array(esquemaInsumo, { error: 'Los insumos deben ser una lista.' })
      .max(50, 'Máximo 50 insumos por consulta.')
      .refine(
        (insumos) => new Set(insumos.map((i) => i.medicamentoId)).size === insumos.length,
        'Un medicamento no puede repetirse en los insumos; suma las cantidades.',
      )
      .optional(),
  })
  .superRefine((datos, contexto) => {
    // Sin cita agendada, el motivo de la atención es obligatorio:
    // es el que se registra en la auto-cita que crea el sistema
    if (!datos.citaId && !datos.motivo?.trim()) {
      contexto.addIssue({
        code: 'custom',
        message: 'Indica el motivo de la atención (se registra en la cita).',
        path: ['motivo'],
      });
    }
  });

export type DatosCrearConsulta = z.infer<typeof esquemaCrearConsulta>;
export type DatosSignosVitales = z.infer<typeof esquemaSignosVitales>;
export type DatosInsumo = z.infer<typeof esquemaInsumo>;
