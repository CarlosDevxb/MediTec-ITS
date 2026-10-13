import React, { useState } from 'react';
import { UserRound, Pencil } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
import ExpedientePaciente from '../clinica/ExpedientePaciente';
import ActualizarDatosForm from './ActualizarDatosForm';
import type { Paciente } from '../clinica/datos';

/* ============================================================
   MI INFORMACIÓN · Consulta del expediente propio + subpágina
   para actualizar el auto-reporte (alergias, crónicas,
   antecedentes)
   ============================================================ */

interface Props {
  paciente: Paciente;
  onActualizar: (datos: Partial<Paciente>) => void;
}

type Subvista = { modo: 'consulta' } | { modo: 'actualizar' };

export default function MiInformacion({ paciente, onActualizar }: Props) {
  const { aviso, mostrar, cerrar } = useAviso();
  const [subvista, setSubvista] = useState<Subvista>({ modo: 'consulta' });

  /* ---------- Subpágina: actualizar auto-reporte ---------- */
  if (subvista.modo === 'actualizar') {
    return (
      <ActualizarDatosForm
        paciente={paciente}
        onCancelar={() => setSubvista({ modo: 'consulta' })}
        onGuardar={(datos) => {
          onActualizar(datos);
          setSubvista({ modo: 'consulta' });
          mostrar('Tu información fue actualizada.');
        }}
      />
    );
  }

  return (
    <div className="p-8 xl:p-10 max-w-6xl mx-auto">
      <PageHeader
        title="Mi información"
        subtitle="Consulta tus datos personales y clínicos"
        meta={
          <Button icon={Pencil} onClick={() => setSubvista({ modo: 'actualizar' })}>
            Actualizar mis datos
          </Button>
        }
      />

      {aviso && <Aviso mensaje={aviso} onCerrar={cerrar} />}

      {/* Ficha compartida con el equipo médico (solo consulta) */}
      <ExpedientePaciente paciente={paciente} />

      {/* Nota orientada al paciente */}
      <div className="flex items-start gap-3 bg-white border border-gray-200 rounded-2xl px-6 py-5 text-base text-gray-600">
        <UserRound size={20} className="text-brand-600 shrink-0 mt-0.5" />
        <p>
          Puedes actualizar tu <strong className="text-gray-900">auto-reporte clínico</strong>{' '}
          (alergias, enfermedades y antecedentes). Para{' '}
          <strong className="text-gray-900">teléfono, correo y contraseña</strong> usa
          Configuración.
        </p>
      </div>
    </div>
  );
}
