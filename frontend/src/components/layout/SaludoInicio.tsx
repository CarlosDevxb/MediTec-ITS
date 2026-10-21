import React from 'react';
import { fechaCorta, hoyISO } from '../../services/atencion.service';

/* ============================================================
   SALUDO DE INICIO · Encabezado de los paneles clínicos
   Mensaje según la hora del día + nombre del personal con su
   especialidad y la fecha. Compartido por los paneles del doctor
   y de la enfermería.
   ============================================================ */

/** "Buenos días" / "Buenas tardes" / "Buenas noches" según la hora */
function saludoDelDia(): string {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export interface SaludoInicioProps {
  nombre: string;
  /** Especialidad del personal (opcional) */
  especialidad?: string;
  /** Acciones del encabezado (ej. botón de nueva consulta) */
  acciones?: React.ReactNode;
}

export default function SaludoInicio({ nombre, especialidad, acciones }: SaludoInicioProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-6 mb-10">
      <div>
        <p className="text-sm font-semibold text-brand-700 uppercase tracking-wide">
          {saludoDelDia()}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 mt-1">{nombre}</h1>
        <p className="text-gray-500 mt-1.5">
          {especialidad ? `${especialidad} · ` : ''}
          {fechaCorta(hoyISO())}
        </p>
      </div>
      {acciones}
    </div>
  );
}
