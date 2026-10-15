/* ============================================================
   TIPOS Y DATOS · Sección del administrador

   Los tipos de Rol y Usuario viven ahora en
   `src/services/administracion.service.ts` (una sola fuente de
   verdad, compartida con la API) y se importan desde ahí.

   Los datos de demostración que quedan aquí pertenecen a las
   secciones que todavía NO tienen backend (Horarios y
   Medicamentos). Se eliminarán cuando se conecten.
   ============================================================ */

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

export const OPCIONES_DIA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const OPCIONES_UNIDAD = ['cápsulas', 'comprimidos', 'bolsas', 'ml', 'gramos'];

export const OPCIONES_PERSONAL = [
  { nombre: 'Dra. Paola Janeth', especialidad: 'Odontología' },
  { nombre: 'Dr. Miguel Sandoval', especialidad: 'Medicina general' },
  { nombre: 'Enf. Lucía Ramos', especialidad: 'Enfermería' },
];

/* ---------------- Datos de demostración (pendientes de API) ---------------- */

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
