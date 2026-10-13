/* ============================================================
   DATOS DEMO · Panel de Nutrición
   Mapea a la tabla `plan_alimenticio` de init.sql
   (personal_medico, paciente, fechas, descripcion_dieta,
    calorias_diarias)
   ============================================================ */

export interface Plan {
  id: number;
  pacienteId: number;
  fechaInicio: string; // ISO: 2026-09-15
  fechaFin: string; // ISO: 2026-10-15
  caloriasDiarias: number;
  descripcion: string;
}

export type EstadoPlan = 'vigente' | 'porIniciar' | 'finalizado';

/** Estado del plan respecto a hoy */
export const estadoPlan = (plan: Plan, hoy = new Date()): EstadoPlan => {
  const fecha = (iso: string) => new Date(`${iso}T00:00:00`);
  const hoyISO = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (fecha(plan.fechaInicio) > hoyISO) return 'porIniciar';
  if (fecha(plan.fechaFin) < hoyISO) return 'finalizado';
  return 'vigente';
};

/** Fecha corta sin año: 2026-10-15 → "15 oct" */
export const fechaCortaSinAnio = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

/* ---------------- Planes (demo) ---------------- */
export const PLANES_DEMO: Plan[] = [
  {
    id: 1, pacienteId: 1,
    fechaInicio: '2026-09-15', fechaFin: '2026-10-15', caloriasDiarias: 1800,
    descripcion:
      'Dieta hipocalórica para control de peso: 3 comidas principales y 2 colaciones, evita ultraprocesados y refrescos.',
  },
  {
    id: 2, pacienteId: 2,
    fechaInicio: '2026-09-01', fechaFin: '2026-09-20', caloriasDiarias: 2000,
    descripcion:
      'Restricción de sodio menor a 2 g/día, alta en potasio con frutas y verduras frescas; sin embutidos.',
  },
  {
    id: 3, pacienteId: 4,
    fechaInicio: '2026-09-25', fechaFin: '2026-10-25', caloriasDiarias: 1900,
    descripcion:
      'Plan con control de carbohidratos: distribución del 45%, índice glucémico bajo y 5 tomas al día.',
  },
  {
    id: 4, pacienteId: 3,
    fechaInicio: '2026-10-05', fechaFin: '2026-12-05', caloriasDiarias: 2400,
    descripcion:
      'Aumento de masa muscular: superávit calórico moderado y 2.4 g de proteína por kilo de peso.',
  },
  {
    id: 5, pacienteId: 5,
    fechaInicio: '2026-09-10', fechaFin: '2026-10-10', caloriasDiarias: 2100,
    descripcion:
      'Plan pediátrico equilibrado: desayuno fuerte, colación saludable y control de azúcares añadidos.',
  },
  {
    id: 6, pacienteId: 6,
    fechaInicio: '2026-08-15', fechaFin: '2026-09-15', caloriasDiarias: 2600,
    descripcion:
      'Rendimiento deportivo: carga de carbohidratos previa al entrenamiento e hidratación de 3 L al día.',
  },
];
