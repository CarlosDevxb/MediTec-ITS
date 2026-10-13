import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Field, Input, Textarea } from '../ui/Input';
import type { Paciente } from '../clinica/datos';

/* ============================================================
   ACTUALIZAR DATOS · Auto-reporte del paciente
   (subpágina de Mi información)
   ============================================================ */

interface Props {
  paciente: Paciente;
  onCancelar: () => void;
  onGuardar: (datos: Partial<Paciente>) => void;
}

export default function ActualizarDatosForm({ paciente, onCancelar, onGuardar }: Props) {
  const [alergias, setAlergias] = useState(paciente.alergias);
  const [enfermedades, setEnfermedades] = useState(paciente.enfermedadesCronicas);
  const [antecedentes, setAntecedentes] = useState(paciente.antecedentes);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alergias.trim() || !enfermedades.trim()) {
      setError('Indica tus alergias y enfermedades; escribe "Ninguna" si no aplica.');
      return;
    }
    setError('');
    onGuardar({
      alergias: alergias.trim(),
      enfermedadesCronicas: enfermedades.trim(),
      antecedentes: antecedentes.trim(),
    });
  };

  return (
    <div className="p-8 xl:p-10 max-w-4xl mx-auto">
      <PageHeader
        title="Actualizar mis datos"
        subtitle="Auto-reporte que compartirás con tu equipo médico"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card
          title="Auto-reporte clínico"
          description="Responde con información verdadera; puede condicionar tu atención."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Alergias" hint='Escribe "Ninguna" si no tienes alergias.'>
              <Input
                value={alergias}
                onChange={(e) => setAlergias(e.target.value)}
                placeholder="Ej. Penicilina, látex..."
              />
            </Field>
            <Field label="Enfermedades crónicas" hint='Escribe "Ninguna" si no aplica.'>
              <Input
                value={enfermedades}
                onChange={(e) => setEnfermedades(e.target.value)}
                placeholder="Ej. Diabetes tipo 2"
              />
            </Field>
            <Field
              label="Antecedentes"
              hint="Cirugías, tratamientos previos o algo que debamos saber."
              className="md:col-span-2"
            >
              <Textarea
                rows={4}
                value={antecedentes}
                onChange={(e) => setAntecedentes(e.target.value)}
                placeholder="Ej. Ortodoncia en 2022, sin cirugías previas..."
              />
            </Field>
          </div>
        </Card>

        {error && (
          <p className="text-base text-red-600 font-medium" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-4 pb-10">
          <Button variant="secondary" icon={X} onClick={onCancelar}>
            Cancelar
          </Button>
          <Button type="submit" icon={Save}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </div>
  );
}
