import React from 'react';
import { ArrowRight, CircleAlert, CalendarClock, CheckCircle2 } from 'lucide-react';
import { fechaCorta } from '../../services/atencion.service';
import type { PlanReagendamiento } from '../../services/operacion.service';

/* ============================================================
   PLAN DE REAGENDAMIENTO · lo que hará un cambio de horario
   sobre las citas agendadas.

   Se muestra antes de aplicar el cambio (la API lo calcula
   simulándolo) y también como resultado: las citas que se mueven
   quedan en Pendiente de confirmación.
   ============================================================ */

export interface PlanReagendamientoProps {
  plan: PlanReagendamiento;
  /** Cambiar el texto cuando se muestra como resultado y no como previsión */
  modo?: 'previo' | 'resultado';
}

export default function PlanReagendamientoVista({
  plan,
  modo = 'previo',
}: PlanReagendamientoProps) {
  const hayMovimientos = plan.movimientos.length > 0;
  const haySinHueco = plan.sinHueco.length > 0;

  if (!hayMovimientos && !haySinHueco) {
    return (
      <p className="flex items-start gap-2.5 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-900">
        <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        Ninguna cita se afecta: todas las citas agendadas siguen dentro del horario.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {hayMovimientos && (
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
            <CalendarClock size={16} aria-hidden="true" />
            {modo === 'previo'
              ? `Se moverán ${plan.movimientos.length} cita(s) al primer hueco libre:`
              : `Se movieron ${plan.movimientos.length} cita(s):`}
          </p>
          <ul className="space-y-1.5">
            {plan.movimientos.map((movimiento) => (
              <li
                key={movimiento.citaId}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-brand-50 border border-brand-100 px-3 py-2 text-sm"
              >
                <span className="font-medium text-gray-800">{movimiento.paciente}</span>
                <span className="text-gray-500">·</span>
                <span className="text-gray-600 tabular-nums">
                  {fechaCorta(movimiento.fechaAnterior)} {movimiento.horaAnterior}
                </span>
                <ArrowRight size={14} className="text-brand-600" aria-hidden="true" />
                <span className="font-semibold text-brand-800 tabular-nums">
                  {fechaCorta(movimiento.fechaNueva)} {movimiento.horaNueva}
                </span>
                <span className="text-gray-400 truncate">{movimiento.motivo}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-500">
            Las citas movidas quedan <strong>pendientes de confirmación</strong> y el paciente
            ve el cambio en su portal.
          </p>
        </div>
      )}

      {haySinHueco && (
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-red-800 mb-2">
            <CircleAlert size={16} aria-hidden="true" />
            {plan.sinHueco.length} cita(s) no tienen día disponible:
          </p>
          <ul className="space-y-1.5">
            {plan.sinHueco.map((cita) => (
              <li
                key={cita.citaId}
                className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800"
              >
                <span className="font-medium">{cita.paciente}</span>{' '}
                <span className="tabular-nums">
                  · {fechaCorta(cita.fecha)} {cita.hora}
                </span>
                <span className="text-red-600"> · {cita.motivo}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-red-700">
            El cambio no se aplicará. Reagenda o cancela estas citas antes de modificar el turno.
          </p>
        </div>
      )}
    </div>
  );
}
