import { z } from 'zod';

/**
 * Validaciones de usuarios.
 *
 * Zod se encarga del formato y de los largos (que coinciden con las columnas
 * de MySQL). Las reglas que dependen del nombre del rol o del tipo de paciente
 * (cédula obligatoria, carrera para alumnos, expediente de paciente) solo se
 * conocen consultando la base, así que se aplican en el servicio.
 */

const GENEROS = ['Masculino', 'Femenino', 'Otro'] as const;

/** Id opcional: valida que sea entero positivo cuando venga */
const idOpcional = (etiqueta: string) =>
  z.coerce
    .number({ error: etiqueta })
    .int('Selecciona una opción válida.')
    .positive('Selecciona una opción válida.')
    .optional()
    .or(z.literal(0));

/** Acepta una fecha real en formato AAAA-MM-DD y que no sea futura */
const fechaValida = z
  .string({ error: 'La fecha de nacimiento es obligatoria.' })
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD.')
  .refine((valor) => {
    const fecha = new Date(`${valor}T00:00:00`);
    if (Number.isNaN(fecha.getTime())) return false;
    return fecha.getTime() <= Date.now() + 24 * 60 * 60 * 1000;
  }, 'La fecha de nacimiento no puede ser futura.');

/** Correo con validación explícita (independiente de la versión de Zod) */
const correoValido = z
  .string({ error: 'El correo es obligatorio.' })
  .trim()
  .min(1, 'El correo es obligatorio.')
  .max(150, 'El correo no puede exceder 150 caracteres.')
  .refine((valor) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor), 'Escribe un correo electrónico válido.');

/** Campos comunes al alta y a la edición */
const camposBase = {
  nombre: z
    .string({ error: 'El nombre es obligatorio.' })
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres.')
    .max(100, 'El nombre no puede exceder 100 caracteres.'),
  numeroControl: z
    .string({ error: 'El número de control es obligatorio.' })
    .trim()
    .min(3, 'El número de control debe tener al menos 3 caracteres.')
    .max(20, 'El número de control no puede exceder 20 caracteres.')
    .regex(/^[A-Za-z0-9-]+$/, 'El número de control solo admite letras, números y guiones.'),
  correo: correoValido,
  telefono: z
    .string()
    .trim()
    .max(20, 'El teléfono no puede exceder 20 caracteres.')
    .optional()
    .or(z.literal('')),
  fechaNacimiento: fechaValida,
  genero: z.enum(GENEROS, { error: 'Selecciona un género.' }),
  rolId: z.coerce
    .number({ error: 'Selecciona un rol.' })
    .int('Selecciona un rol válido.')
    .positive('Selecciona un rol válido.'),
  estatus: z.coerce.boolean().optional(),
  cedula: z
    .string()
    .trim()
    .max(50, 'La cédula no puede exceder 50 caracteres.')
    .optional()
    .or(z.literal('')),
  especialidad: z
    .string()
    .trim()
    .max(100, 'La especialidad no puede exceder 100 caracteres.')
    .optional()
    .or(z.literal('')),

  /* ---- Datos del expediente (solo cuando el rol es Paciente) ---- */
  tipoPacienteId: idOpcional('Selecciona el tipo de paciente.'),
  carreraId: idOpcional('Selecciona la carrera.'),
};

/** Alta: la contraseña inicial es obligatoria */
export const esquemaCrearUsuario = z.object({
  ...camposBase,
  contrasena: z
    .string({ error: 'Define una contraseña inicial.' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(72, 'La contraseña no puede exceder 72 caracteres.'),
});

/** Edición: la contraseña se cambia aparte, nunca desde este endpoint */
export const esquemaActualizarUsuario = z.object(camposBase);

export type DatosCrearUsuario = z.infer<typeof esquemaCrearUsuario>;
export type DatosActualizarUsuario = z.infer<typeof esquemaActualizarUsuario>;

/** Cambio de estatus (habilitar / deshabilitar una cuenta) */
export const esquemaEstatus = z.object({
  estatus: z.coerce.boolean({ error: 'Indica el estatus de la cuenta.' }),
});

/** Convierte los errores de Zod al formato de la API */
export function detallesDeZod(error: z.ZodError) {
  return error.issues.map((issue) => ({
    campo: issue.path.join('.') || 'body',
    mensaje: issue.message,
  }));
}
