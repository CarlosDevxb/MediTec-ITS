/* ============================================================
   DATOS DEMO · Panel de atención médica (odontología)
   Mapean a init.sql: pacientes, consulta, cita
   ============================================================ */

export type TipoSangre = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface Paciente {
  id: number;
  expediente: string;
  nombre: string;
  fechaNacimiento: string; // ISO: 1998-04-12
  genero: 'Femenino' | 'Masculino';
  telefono: string;
  correo: string;
  alergias: string;
  enfermedadesCronicas: string;
  tipoSangre: TipoSangre;
  antecedentes: string;
  ultimaVisita: string; // ISO: 2026-09-12
}

export interface SignosVitales {
  ta: string;
  fc: string;
  fr: string;
  temp: string;
  peso: string;
  talla: string;
}

export interface Consulta {
  id: number;
  pacienteId: number;
  fecha: string; // ISO datetime
  motivo: string;
  exploracion: string;
  diagnostico: string;
  tratamiento: string;
  vitales: SignosVitales;
}

export type EstatusCita = 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Completada';

export interface Cita {
  id: number;
  pacienteId: number;
  fecha: string; // ISO: 2026-09-28
  hora: string; // 09:00
  motivo: string;
  estatus: EstatusCita;
}

/* ---------------- Catálogos ---------------- */
export const TIPOS_SANGRE: TipoSangre[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const MOTIVOS_CITA = [
  'Consulta de seguimiento',
  'Valoración inicial',
  'Revisión de tratamiento',
  'Limpieza dental',
  'Emergencia odontológica',
  'Control de placa',
];

/* ---------------- Pacientes (expedientes) ---------------- */
export const PACIENTES: Paciente[] = [
  {
    id: 1, expediente: 'EXP-1024', nombre: 'Lucía Torres',
    fechaNacimiento: '1998-04-12', genero: 'Femenino',
    telefono: '55 1234 8891', correo: 'lucia.torres@correo.mx',
    alergias: 'Penicilina', enfermedadesCronicas: 'Ninguna',
    tipoSangre: 'O+', antecedentes: 'Ortodoncia en 2022. Sin cirugías previas.',
    ultimaVisita: '2026-09-12',
  },
  {
    id: 2, expediente: 'EXP-1025', nombre: 'Miguel Herrera',
    fechaNacimiento: '1985-11-03', genero: 'Masculino',
    telefono: '55 2345 1122', correo: 'miguel.herrera@correo.mx',
    alergias: 'Ninguna', enfermedadesCronicas: 'Hipertensión leve',
    tipoSangre: 'A+', antecedentes: 'Tratamiento de hipertensión con Losartán.',
    ultimaVisita: '2026-08-30',
  },
  {
    id: 3, expediente: 'EXP-1026', nombre: 'Sofía Mendoza',
    fechaNacimiento: '2001-07-25', genero: 'Femenino',
    telefono: '55 3456 7788', correo: 'sofia.mendoza@correo.mx',
    alergias: 'Ninguna', enfermedadesCronicas: 'Ninguna',
    tipoSangre: 'B+', antecedentes: 'Blanqueamiento profesional en 2025.',
    ultimaVisita: '2026-09-20',
  },
  {
    id: 4, expediente: 'EXP-1027', nombre: 'Diego Ramírez',
    fechaNacimiento: '1979-02-18', genero: 'Masculino',
    telefono: '55 4567 3344', correo: 'diego.ramirez@correo.mx',
    alergias: 'Látex', enfermedadesCronicas: 'Diabetes tipo 2',
    tipoSangre: 'O-', antecedentes: 'Control glucémico mensual. Retención de prótesis parcial.',
    ultimaVisita: '2026-07-15',
  },
  {
    id: 5, expediente: 'EXP-1028', nombre: 'Valeria Cruz',
    fechaNacimiento: '2010-09-05', genero: 'Femenino',
    telefono: '55 5678 9900', correo: 'valeria.cruz@correo.mx',
    alergias: 'Ninguna', enfermedadesCronicas: 'Ninguna',
    tipoSangre: 'AB+', antecedentes: 'Paciente pediátrica. Aparatología en evaluación.',
    ultimaVisita: '2026-09-01',
  },
  {
    id: 6, expediente: 'EXP-1029', nombre: 'Andrés Gil',
    fechaNacimiento: '1993-12-30', genero: 'Masculino',
    telefono: '55 6789 2233', correo: 'andres.gil@correo.mx',
    alergias: 'Ibuprofeno', enfermedadesCronicas: 'Ninguna',
    tipoSangre: 'A-', antecedentes: 'Exodoncia de molar inferior en 2024.',
    ultimaVisita: '2026-06-28',
  },
];

/* ---------------- Consultas registradas ---------------- */
export const CONSULTAS: Consulta[] = [
  {
    id: 1, pacienteId: 1, fecha: '2026-09-12T10:30',
    motivo: 'Dolor en molar superior derecho al masticar',
    exploracion: 'Caries profunda en pieza 16. Movilidad leve. Encías sin inflamación.',
    diagnostico: 'Caries oclusal pieza 16 (K02.9)',
    tratamiento: 'Obturación con composite. Control en 15 días.',
    vitales: { ta: '110/70', fc: '72', fr: '18', temp: '36.6', peso: '58', talla: '1.64' },
  },
  {
    id: 2, pacienteId: 1, fecha: '2026-05-02T09:00',
    motivo: 'Control post-ortodoncia',
    exploracion: 'Oclusión estable. Retenedor íntegro.',
    diagnostico: 'Seguimiento de ortodoncia (Z46.4)',
    tratamiento: 'Continuar con retenedor nocturno.',
    vitales: { ta: '108/68', fc: '70', fr: '16', temp: '36.5', peso: '57', talla: '1.64' },
  },
  {
    id: 3, pacienteId: 4, fecha: '2026-07-15T15:00',
    motivo: 'Prótesis parcial incómoda',
    exploracion: 'Ajuste necesario en zona de apoyo 46. Mucosa íntegra.',
    diagnostico: 'Prótesis mal ajustada (K08.40)',
    tratamiento: 'Reajuste de prótesis. Refuerzo de control glucémico.',
    vitales: { ta: '128/82', fc: '78', fr: '19', temp: '36.7', peso: '82', talla: '1.72' },
  },
];

/* ---------------- Citas ---------------- */
export const CITAS_DEMO: Cita[] = [
  { id: 1, pacienteId: 1, fecha: '2026-09-28', hora: '09:00', motivo: 'Consulta de seguimiento', estatus: 'Completada' },
  { id: 2, pacienteId: 2, fecha: '2026-09-28', hora: '10:30', motivo: 'Valoración inicial', estatus: 'Confirmada' },
  { id: 3, pacienteId: 3, fecha: '2026-09-28', hora: '12:00', motivo: 'Revisión de tratamiento', estatus: 'Confirmada' },
  { id: 4, pacienteId: 4, fecha: '2026-09-28', hora: '13:15', motivo: 'Control de placa', estatus: 'Pendiente' },
  { id: 5, pacienteId: 5, fecha: '2026-09-28', hora: '15:00', motivo: 'Limpieza dental', estatus: 'Cancelada' },
  { id: 6, pacienteId: 6, fecha: '2026-09-28', hora: '16:30', motivo: 'Emergencia odontológica', estatus: 'Pendiente' },
];

/* ---------------- Utilidades ---------------- */
export const pacientePorId = (id: number): Paciente | undefined =>
  PACIENTES.find((p) => p.id === id);

export const nombrePaciente = (id: number): string =>
  pacientePorId(id)?.nombre ?? 'Paciente';

export const edad = (fechaNacimiento: string): number => {
  const nacimiento = new Date(fechaNacimiento);
  const hoy = new Date();
  let anios = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) anios--;
  return anios;
};

export const fechaCorta = (iso: string): string => {
  const fecha = iso.includes('T') ? new Date(iso) : new Date(`${iso}T00:00:00`);
  return fecha.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/** Hora legible de una fecha con hora (2026-09-12T10:30 → 10:30) */
export const horaDeFecha = (iso: string): string =>
  new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

/** Saludo según la hora real del dispositivo */
export const saludoDelDia = (): string => {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
};
