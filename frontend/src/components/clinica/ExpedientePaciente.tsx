import React from 'react';
import { AlertTriangle, Activity, ClipboardList } from 'lucide-react';
import Card from '../ui/Card';
import { edad, fechaCorta, type Paciente } from './datos';

/* ============================================================
   EXPEDIENTE DE PACIENTE · Alertas clínicas + datos generales
   Compartido por Historial clínico (odontología) e Historial
   nutrición.
   ============================================================ */

export interface ExpedientePacienteProps {
  paciente: Paciente;
}

export default function ExpedientePaciente({ paciente }: ExpedientePacienteProps) {
  const datos: Array<[string, string]> = [
    ['Expediente', paciente.expediente],
    ['Edad', `${edad(paciente.fechaNacimiento)} años`],
    ['Fecha de nacimiento', fechaCorta(paciente.fechaNacimiento)],
    ['Género', paciente.genero],
    ['Tipo de sangre', paciente.tipoSangre],
    ['Teléfono', paciente.telefono],
    ['Correo', paciente.correo],
    ['Última visita', fechaCorta(paciente.ultimaVisita)],
  ];

  return (
    <>
      {/* Alertas clínicas */}
      {paciente.alergias !== 'Ninguna' && (
        <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3.5 text-base">
          <AlertTriangle size={18} className="shrink-0" />
          <span><strong>Alergias:</strong> {paciente.alergias}</span>
        </div>
      )}
      {paciente.enfermedadesCronicas !== 'Ninguna' && (
        <div className="mb-6 flex items-center gap-3 bg-brand-50 border border-brand-200 text-brand-800 rounded-lg px-4 py-3.5 text-base">
          <Activity size={18} className="shrink-0" />
          <span><strong>Enfermedades crónicas:</strong> {paciente.enfermedadesCronicas}</span>
        </div>
      )}

      {/* Datos generales */}
      <Card
        title="Datos del expediente"
        icon={ClipboardList}
        description={paciente.antecedentes ? undefined : 'Sin antecedentes registrados.'}
        className="mb-6"
      >
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
          {datos.map(([etiqueta, valor]) => (
            <div key={etiqueta}>
              <dt className="text-sm font-medium text-gray-500">{etiqueta}</dt>
              <dd className="text-base text-gray-900 tabular-nums mt-0.5">{valor}</dd>
            </div>
          ))}
        </dl>
        {paciente.antecedentes && (
          <p className="mt-6 pt-6 border-t border-gray-100 text-base text-gray-700">
            <strong className="text-gray-900">Antecedentes:</strong> {paciente.antecedentes}
          </p>
        )}
      </Card>
    </>
  );
}
