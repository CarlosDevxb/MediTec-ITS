import { Wheat, HeartPulse, Ruler, IdCard, GraduationCap, type LucideIcon } from 'lucide-react';

/* ============================================================
   ICONOS DE CATÁLOGOS · La API manda los metadatos de cada
   catálogo (título, descripción, campos); los iconos son de
   presentación y viven aquí.

   Si se agrega un catálogo al esquema, se registra su icono aquí
   y su definición en `backend/src/config/catalogos.ts`.
   ============================================================ */

export const ICONOS_CATALOGO: Record<string, LucideIcon> = {
  alergias: Wheat,
  enfermedades: HeartPulse,
  unidades_medida: Ruler,
  tipo_paciente: IdCard,
  carreras: GraduationCap,
};

/** Icono por defecto para un catálogo sin icono asignado */
export const ICONO_POR_DEFECTO: LucideIcon = Wheat;
