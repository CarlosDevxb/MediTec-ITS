/* ============================================================
   TIPOS Y DATOS DEMO · Sección del administrador
   Compartidos entre vistas y formularios (mapean a init.sql)
   ============================================================ */

export interface Usuario {
  id: number;
  nombre: string;
  numeroControl: string;
  correo: string;
  rol: string;
  estatus: 'Activo' | 'Inactivo';
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  usuarios: number;
}

export interface Horario {
  id: number;
  dia: string;
  personal: string;
  especialidad: string;
  inicio: string;
  fin: string;
}

export interface Medicamento {
  id: number;
  nombre: string;
  unidad: string;
  stock: number;
  descripcion: string;
}

/* ---------------- Catálogos para selects ---------------- */
export const OPCIONES_ROL = ['Administrador', 'Personal médico', 'Enfermería', 'Recepción'];

export const OPCIONES_DIA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const OPCIONES_UNIDAD = ['cápsulas', 'comprimidos', 'bolsas', 'ml', 'gramos'];

export const OPCIONES_PERSONAL = [
  { nombre: 'Dra. Paola Janeth', especialidad: 'Odontología' },
  { nombre: 'Dr. Miguel Sandoval', especialidad: 'Medicina general' },
  { nombre: 'Enf. Lucía Ramos', especialidad: 'Enfermería' },
];

export const PERMISOS = [
  'Ver y editar pacientes',
  'Registrar consultas',
  'Gestionar citas',
  'Administrar medicamentos',
  'Ver reportes',
];

/* ---------------- Datos de demostración ---------------- */
export const USUARIOS_DEMO: Usuario[] = [
  { id: 1, nombre: 'Dra. Paola Janeth', numeroControl: 'PM-0012', correo: 'paola.janeth@meditec.mx', rol: 'Personal médico', estatus: 'Activo' },
  { id: 2, nombre: 'Dr. Miguel Sandoval', numeroControl: 'PM-0018', correo: 'miguel.sandoval@meditec.mx', rol: 'Personal médico', estatus: 'Activo' },
  { id: 3, nombre: 'Enf. Lucía Ramos', numeroControl: 'EF-0043', correo: 'lucia.ramos@meditec.mx', rol: 'Enfermería', estatus: 'Activo' },
  { id: 4, nombre: 'Carlos Herrera', numeroControl: 'RC-0007', correo: 'carlos.herrera@meditec.mx', rol: 'Recepción', estatus: 'Activo' },
  { id: 5, nombre: 'Ana Villalobos', numeroControl: 'RC-0011', correo: 'ana.villalobos@meditec.mx', rol: 'Recepción', estatus: 'Inactivo' },
  { id: 6, nombre: 'Administrador', numeroControl: 'AD-0001', correo: 'admin@meditec.mx', rol: 'Administrador', estatus: 'Activo' },
];

export const ROLES_DEMO: Rol[] = [
  { id: 1, nombre: 'Administrador', descripcion: 'Acceso total a la configuración del sistema', usuarios: 1 },
  { id: 2, nombre: 'Personal médico', descripcion: 'Registra consultas, diagnósticos y recetas', usuarios: 12 },
  { id: 3, nombre: 'Enfermería', descripcion: 'Captura signos vitales y apoya la atención', usuarios: 8 },
  { id: 4, nombre: 'Recepción', descripcion: 'Gestiona la agenda y los datos de pacientes', usuarios: 4 },
];

export const HORARIOS_DEMO: Horario[] = [
  { id: 1, dia: 'Lunes', personal: 'Dra. Paola Janeth', especialidad: 'Odontología', inicio: '08:00', fin: '14:00' },
  { id: 2, dia: 'Martes', personal: 'Dra. Paola Janeth', especialidad: 'Odontología', inicio: '08:00', fin: '14:00' },
  { id: 3, dia: 'Miércoles', personal: 'Dr. Miguel Sandoval', especialidad: 'Medicina general', inicio: '09:00', fin: '17:00' },
  { id: 4, dia: 'Jueves', personal: 'Dr. Miguel Sandoval', especialidad: 'Medicina general', inicio: '09:00', fin: '17:00' },
  { id: 5, dia: 'Viernes', personal: 'Dra. Paola Janeth', especialidad: 'Odontología', inicio: '08:00', fin: '13:00' },
  { id: 6, dia: 'Sábado', personal: 'Enf. Lucía Ramos', especialidad: 'Enfermería', inicio: '09:00', fin: '13:00' },
  // Turno compartido: la enfermera acompaña a la doctora el lunes
  { id: 7, dia: 'Lunes', personal: 'Enf. Lucía Ramos', especialidad: 'Enfermería', inicio: '10:00', fin: '14:00' },
];

export const MEDICAMENTOS_DEMO: Medicamento[] = [
  { id: 1, nombre: 'Amoxicilina 500 mg', unidad: 'cápsulas', stock: 240, descripcion: 'Antibiótico de amplio espectro' },
  { id: 2, nombre: 'Paracetamol 500 mg', unidad: 'comprimidos', stock: 180, descripcion: 'Analgésico y antipirético' },
  { id: 3, nombre: 'Ibuprofeno 400 mg', unidad: 'comprimidos', stock: 8, descripcion: 'Antiinflamatorio no esteroideo' },
  { id: 4, nombre: 'Losartán 50 mg', unidad: 'comprimidos', stock: 64, descripcion: 'Control de presión arterial' },
  { id: 5, nombre: 'Suero salino 0.9%', unidad: 'bolsas', stock: 6, descripcion: 'Rehidratación intravenosa' },
  { id: 6, nombre: 'Metformina 850 mg', unidad: 'comprimidos', stock: 92, descripcion: 'Control de glucosa' },
];
