import React, { useState } from 'react';
import { ClipboardList, Save, X } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
import { Field, Input, Textarea } from '../ui/Input';
import SelectorPaciente from '../clinica/SelectorPaciente';
import type { Paciente } from '../clinica/datos';
import type { Plan } from './datos';

/* ============================================================
   NUEVO PLAN · Alta de plan alimenticio (flujo directo al
   formulario, igual que Nueva consulta en odontología)
   ============================================================ */

const hoyISO = () => new Date().toISOString().slice(0, 10);

interface Props {
  onAlta: (plan: Plan) => void;
  onCancelar: () => void;
}

export default function NuevoPlan({ onAlta, onCancelar }: Props) {
  const { aviso, mostrar, cerrar } = useAviso();

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [fechaInicio, setFechaInicio] = useState(hoyISO());
  const [fechaFin, setFechaFin] = useState('');
  const [calorias, setCalorias] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState('');

  const limpiar = () => {
    setPaciente(null);
    setFechaInicio(hoyISO());
    setFechaFin('');
    setCalorias('');
    setDescripcion('');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paciente) {
      setError('Selecciona el paciente del plan.');
      return;
    }
    if (!fechaInicio || !fechaFin) {
      setError('Registra las fechas de inicio y fin del plan.');
      return;
    }
    if (fechaFin <= fechaInicio) {
      setError('La fecha de fin debe ser posterior a la de inicio.');
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
    onAlta({
      id: Date.now(),
      pacienteId: paciente.id,
      fechaInicio,
      fechaFin,
      caloriasDiarias: Number(calorias),
      descripcion: descripcion.trim(),
    });
    mostrar(`Plan alimenticio de ${paciente.nombre} creado.`);
    limpiar();
  };

  return (
    <div className="p-10 xl:p-12 max-w-5xl mx-auto font-sans">
      <PageHeader
        title="Nuevo plan alimenticio"
        subtitle="Define la dieta y el seguimiento del paciente"
        meta={
          <div className="text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-lg">
            Fecha: {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        }
      />

      {aviso && <Aviso mensaje={aviso} onCerrar={cerrar} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Paciente (componente compartido) */}
        <SelectorPaciente
          paciente={paciente}
          onChange={(p) => {
            setPaciente(p);
            setError('');
          }}
        />

        {/* Periodo y calorías */}
        <Card title="Periodo y objetivos" icon={ClipboardList}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <Field label="Calorías diarias" hint="Estimadas por día.">
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
          </div>
        </Card>

        {/* Dieta */}
        <Card title="Plan alimenticio" description="Incluye comidas, restricciones y recomendaciones.">
          <Textarea
            rows={7}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej. Dieta hipocalórica: 3 comidas principales y 2 colaciones, evita ultraprocesados y refrescos..."
          />
        </Card>

        {error && (
          <p className="text-base text-red-600 font-medium" role="alert">
            {error}
          </p>
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-4 pt-4 pb-10">
          <Button variant="secondary" icon={X} onClick={onCancelar}>
            Cancelar
          </Button>
          <Button type="submit" icon={Save}>
            Guardar plan
          </Button>
        </div>
      </form>
    </div>
  );
}
