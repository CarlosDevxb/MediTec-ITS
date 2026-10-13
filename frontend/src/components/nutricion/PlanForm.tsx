import React, { useState } from 'react';
import { ClipboardList, Save, X } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/Input';
import { PACIENTES } from '../clinica/datos';
import type { Plan } from './datos';

/* ============================================================
   FORMULARIO DE PLAN · alta y edición (subpágina de Planes)
   ============================================================ */

export interface PlanFormProps {
  modo: 'alta' | 'editar';
  plan?: Plan;
  onCancelar: () => void;
  onGuardar: (plan: Plan) => void;
}

export default function PlanForm({ modo, plan, onCancelar, onGuardar }: PlanFormProps) {
  const [pacienteId, setPacienteId] = useState(plan?.pacienteId ?? PACIENTES[0].id);
  const [fechaInicio, setFechaInicio] = useState(plan?.fechaInicio ?? '');
  const [fechaFin, setFechaFin] = useState(plan?.fechaFin ?? '');
  const [calorias, setCalorias] = useState(plan ? String(plan.caloriasDiarias) : '');
  const [descripcion, setDescripcion] = useState(plan?.descripcion ?? '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fechaInicio || !fechaFin || fechaFin <= fechaInicio) {
      setError('Revisa las fechas: la fin debe ser posterior al inicio.');
      return;
    }
    if (!calorias || Number(calorias) <= 0) {
      setError('Define las calorías diarias del plan.');
      return;
    }
    if (!descripcion.trim()) {
      setError('Describe la dieta del paciente.');
      return;
    }
    setError('');
    onGuardar({
      id: plan?.id ?? Date.now(),
      pacienteId: Number(pacienteId),
      fechaInicio,
      fechaFin,
      caloriasDiarias: Number(calorias),
      descripcion: descripcion.trim(),
    });
  };

  return (
    <div className="p-10 xl:p-12 max-w-5xl mx-auto font-sans">
      <PageHeader
        title={modo === 'alta' ? 'Nuevo plan' : 'Editar plan'}
        subtitle={
          modo === 'alta'
            ? 'Asigna un plan alimenticio a un paciente'
            : 'Modifica el plan alimenticio'
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Datos del plan" icon={ClipboardList}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Paciente" className="md:col-span-3">
              <Select
                value={pacienteId}
                onChange={(e) => setPacienteId(Number(e.target.value))}
              >
                {PACIENTES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} · {p.expediente}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Fecha de inicio">
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="tabular-nums"
              />
            </Field>
            <Field label="Fecha de fin">
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="tabular-nums"
              />
            </Field>
            <Field label="Calorías diarias">
              <Input
                type="number"
                min={0}
                step={50}
                value={calorias}
                onChange={(e) => setCalorias(e.target.value)}
                placeholder="Ej. 1800"
                className="tabular-nums"
              />
            </Field>
            <Field
              label="Plan alimenticio"
              hint="Incluye comidas, restricciones y recomendaciones."
              className="md:col-span-3"
            >
              <Textarea
                rows={6}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej. Dieta hipocalórica: 3 comidas principales y 2 colaciones..."
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
            {modo === 'alta' ? 'Crear plan' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}
