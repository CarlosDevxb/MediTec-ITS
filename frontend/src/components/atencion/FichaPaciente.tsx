import React from 'react';
import { AlertTriangle, Activity, Pill, FileText, User } from 'lucide-react';
import { edadDe, type ExpedientePaciente } from '../../services/atencion.service';

/* ============================================================
   FICHA DE PACIENTE · Datos de cabecera + alertas clínicas
   (alergias, enfermedades crónicas y medicamentos actuales).

   Las alertas se muestran siempre en el flujo de atención: nunca
   se ocultan tras una pestaña (ver skill `seguridad-clinica`).
   ============================================================ */

export interface FichaPacienteProps {
  expediente: ExpedientePaciente;
  /** Acción opcional a la derecha (ej. "Cambiar de paciente") */
  accion?: React.ReactNode;
}

export default function FichaPaciente({ expediente, accion }: FichaPacienteProps) {
  const iniciales = expediente.nombre
    .split(' ')
    .filter((parte) => parte.length > 2)
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('');

  const cuestionario = expediente.cuestionario;
  const medicamentosActuales = cuestionario?.medicamentosActuales?.trim() ?? '';
  const sinAlertas =
    expediente.alergias.length === 0 && expediente.enfermedades.length === 0 && !medicamentosActuales;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Cabecera del paciente */}
      <div className="flex flex-wrap items-start justify-between gap-4 px-7 py-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-brand-700 text-white flex items-center justify-center font-semibold shrink-0">
            {iniciales || <User size={20} aria-hidden="true" />}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{expediente.nombre}</p>
            <p className="text-sm text-gray-600 tabular-nums">
              {expediente.numeroControl} · {expediente.tipoPaciente}
              {expediente.carrera ? ` · ${expediente.carrera}` : ''} · {edadDe(expediente.fechaNacimiento)} años
              {expediente.tipoSangre ? ` · Sangre ${expediente.tipoSangre}` : ''}
            </p>
          </div>
        </div>
        {accion}
      </div>

      {/* Alertas clínicas: siempre visibles durante la atención */}
      <div className="px-7 pb-6 space-y-3">
        {expediente.alergias.length > 0 && (
          <p className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-900">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <strong>Alergias:</strong> {expediente.alergias.join(', ')}
              {cuestionario?.alergiaOtra ? ` · ${cuestionario.alergiaOtra}` : ''}
            </span>
          </p>
        )}
        {expediente.enfermedades.length > 0 && (
          <p className="flex items-start gap-3 rounded-lg bg-brand-50 border border-brand-200 px-4 py-3 text-brand-800">
            <Activity size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <strong>Enfermedades crónicas:</strong> {expediente.enfermedades.join(', ')}
              {cuestionario?.enfermedadOtra ? ` · ${cuestionario.enfermedadOtra}` : ''}
            </span>
          </p>
        )}
        {medicamentosActuales && (
          <p className="flex items-start gap-3 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-gray-700">
            <Pill size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <strong>Medicamentos actuales:</strong> {medicamentosActuales}
            </span>
          </p>
        )}
        {expediente.antecedentes?.trim() && (
          <p className="flex items-start gap-3 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-gray-700">
            <FileText size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <strong>Antecedentes:</strong> {expediente.antecedentes}
            </span>
          </p>
        )}
        {sinAlertas && (
          <p className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-500">
            Sin alergias, enfermedades crónicas ni medicamentos actuales registrados.
          </p>
        )}
      </div>
    </div>
  );
}
