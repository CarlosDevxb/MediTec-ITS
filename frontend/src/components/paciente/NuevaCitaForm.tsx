import React, { useState } from 'react';
import { CalendarPlus, Save, X } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Field, Input, Select } from '../ui/Input';
import {
  MOTIVOS_POR_AREA,
  PROFESIONALES,
  type Area,
  type CitaPaciente,
} from './datos';

/* ============================================================
   NUEVA CITA · Solicitud de cita en Odontología o Nutrición
   (subpágina de Mis citas)
   ============================================================ */

interface Props {
  onCancelar: () => void;
  onGuardar: (cita: CitaPaciente) => void;
}

const hoyISO = () => new Date().toISOString().slice(0, 10);

export default function NuevaCitaForm({ onCancelar, onGuardar }: Props) {
  const [area, setArea] = useState<Area>('Odontología');
  const [fecha, setFecha] = useState(hoyISO());
  const [hora, setHora] = useState('10:00');
  const [motivo, setMotivo] = useState(MOTIVOS_POR_AREA['Odontología'][0]);
  const [error, setError] = useState('');

  const cambiarArea = (nuevaArea: Area) => {
    setArea(nuevaArea);
    setMotivo(MOTIVOS_POR_AREA[nuevaArea][0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecha) {
      setError('Selecciona la fecha de la cita.');
      return;
    }
    const hoy = hoyISO();
    if (fecha < hoy) {
      setError('La fecha no puede ser anterior a hoy.');
      return;
    }
    setError('');
    onGuardar({
      id: Date.now(),
      area,
      fecha,
      hora,
      motivo,
      profesional: PROFESIONALES[area],
      estatus: 'Pendiente',
    });
  };

  return (
    <div className="p-8 xl:p-10 max-w-4xl mx-auto">
      <PageHeader
        title="Nueva cita"
        subtitle="Solicita una cita en el área que necesitas"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card
          title="Datos de la cita"
          icon={CalendarPlus}
          description="Tu cita quedará como Pendiente hasta que el área la confirme."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Área de especialidad" className="md:col-span-2">
              <Select
                value={area}
                onChange={(e) => cambiarArea(e.target.value as Area)}
              >
                <option value="Odontología">
                  Odontología · {PROFESIONALES['Odontología']}
                </option>
                <option value="Nutrición">
                  Nutrición · {PROFESIONALES['Nutrición']}
                </option>
              </Select>
            </Field>

            <Field label="Fecha">
              <Input
                type="date"
                value={fecha}
                min={hoyISO()}
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

            <Field label="Motivo de la cita" className="md:col-span-2">
              <Select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                {MOTIVOS_POR_AREA[area].map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {opcion}
                  </option>
                ))}
              </Select>
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
            Solicitar cita
          </Button>
        </div>
      </form>
    </div>
  );
}
