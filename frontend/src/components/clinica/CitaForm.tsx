import React, { useState } from 'react';
import { CalendarPlus, Save, X } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Field, Input, Select } from '../ui/Input';
import { PACIENTES, MOTIVOS_CITA, type Cita, type EstatusCita } from './datos';

/* ============================================================
   FORMULARIO DE CITA · alta y edición (subpágina de Citas)
   ============================================================ */

export interface CitaFormProps {
  modo: 'alta' | 'editar';
  cita?: Cita;
  onCancelar: () => void;
  onGuardar: (cita: Cita) => void;
}

const hoyISO = () => new Date().toISOString().slice(0, 10);

export default function CitaForm({ modo, cita, onCancelar, onGuardar }: CitaFormProps) {
  const [pacienteId, setPacienteId] = useState(cita?.pacienteId ?? PACIENTES[0].id);
  const [fecha, setFecha] = useState(cita?.fecha ?? hoyISO());
  const [hora, setHora] = useState(cita?.hora ?? '09:00');
  const [motivo, setMotivo] = useState(cita?.motivo ?? MOTIVOS_CITA[0]);
  const [estatus, setEstatus] = useState<EstatusCita>(cita?.estatus ?? 'Pendiente');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecha) {
      setError('Selecciona la fecha de la cita.');
      return;
    }
    setError('');
    onGuardar({
      id: cita?.id ?? Date.now(),
      pacienteId: Number(pacienteId),
      fecha,
      hora,
      motivo,
      estatus,
    });
  };

  return (
    <div className="p-10 xl:p-12 max-w-5xl mx-auto font-sans">
      <PageHeader
        title={modo === 'alta' ? 'Nueva cita' : 'Editar cita'}
        subtitle={
          modo === 'alta'
            ? 'Agenda una cita para un paciente'
            : 'Modifica los datos de la cita'
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Datos de la cita" icon={CalendarPlus}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Paciente" className="md:col-span-2">
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

            <Field label="Fecha">
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="tabular-nums"
              />
            </Field>

            <Field label="Hora">
              <Input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="tabular-nums"
              />
            </Field>

            <Field label="Motivo" className="md:col-span-2">
              <Select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                {MOTIVOS_CITA.map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {opcion}
                  </option>
                ))}
              </Select>
            </Field>

            {modo === 'editar' && (
              <Field label="Estatus" className="md:col-span-2">
                <Select value={estatus} onChange={(e) => setEstatus(e.target.value as EstatusCita)}>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Confirmada">Confirmada</option>
                  <option value="Cancelada">Cancelada</option>
                  <option value="Completada">Completada</option>
                </Select>
              </Field>
            )}
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
            {modo === 'alta' ? 'Agendar cita' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}
