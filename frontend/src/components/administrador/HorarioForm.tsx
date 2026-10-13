import React, { useState } from 'react';
import { Clock, Save, X } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Field, Input, Select } from '../ui/Input';
import { OPCIONES_DIA, OPCIONES_PERSONAL, type Horario } from './tipos';

/* ============================================================
   FORMULARIO DE HORARIO · alta y edición (subpágina)
   La selección de días es múltiple: se genera un horario por
   cada día marcado del personal elegido.
   ============================================================ */

export interface HorarioFormProps {
  modo: 'alta' | 'editar';
  horario?: Horario;
  onCancelar: () => void;
  /** Recibe un horario por cada día seleccionado */
  onGuardar: (horarios: Horario[]) => void;
}

/** Lunes a viernes (atajo) */
const DIAS_LABORALES = OPCIONES_DIA.slice(0, 5);

export default function HorarioForm({
  modo,
  horario,
  onCancelar,
  onGuardar,
}: HorarioFormProps) {
  const personalInicial = OPCIONES_PERSONAL.find((p) => p.nombre === horario?.personal);
  const [personal, setPersonal] = useState(personalInicial?.nombre ?? OPCIONES_PERSONAL[0].nombre);
  const [dias, setDias] = useState<string[]>(horario ? [horario.dia] : []);
  const [inicio, setInicio] = useState(horario?.inicio ?? '08:00');
  const [fin, setFin] = useState(horario?.fin ?? '14:00');
  const [error, setError] = useState('');

  const alternarDia = (dia: string) => {
    setDias((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
    setError('');
  };

  const marcarLaborales = () => setDias(DIAS_LABORALES);
  const limpiarDias = () => setDias([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dias.length === 0) {
      setError('Selecciona al menos un día de la semana.');
      return;
    }
    if (inicio >= fin) {
      setError('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }
    setError('');

    const datos = OPCIONES_PERSONAL.find((p) => p.nombre === personal)!;
    const ahora = Date.now();

    // Un horario por cada día seleccionado, en orden de semana
    const generados = OPCIONES_DIA.filter((dia) => dias.includes(dia)).map(
      (dia, indice) => ({
        id: ahora + indice,
        dia,
        personal: datos.nombre,
        especialidad: datos.especialidad,
        inicio,
        fin,
      })
    );

    onGuardar(generados);
  };

  return (
    <div className="p-10 xl:p-12 max-w-5xl mx-auto font-sans">
      <PageHeader
        title={modo === 'alta' ? 'Nuevo horario' : 'Editar horario'}
        subtitle={
          modo === 'alta'
            ? 'Asigna los días y el turno de un miembro del personal'
            : `Editando ${horario?.dia ?? ''} de ${horario?.personal ?? ''}`
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Disponibilidad" icon={Clock}>
          <div className="space-y-4">
            <Field label="Personal médico">
              <Select value={personal} onChange={(e) => setPersonal(e.target.value)}>
                {OPCIONES_PERSONAL.map((persona) => (
                  <option key={persona.nombre} value={persona.nombre}>
                    {persona.nombre} · {persona.especialidad}
                  </option>
                ))}
              </Select>
            </Field>

            {/* Selección múltiple de días */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="block text-base font-semibold text-gray-700">
                  Días de la semana
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={marcarLaborales}
                    className="px-3 py-1.5 rounded-md text-sm font-medium text-brand-800 hover:bg-brand-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
                  >
                    Lunes a viernes
                  </button>
                  <button
                    type="button"
                    onClick={limpiarDias}
                    className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2" role="group" aria-label="Días de la semana">
                {OPCIONES_DIA.map((dia) => {
                  const activo = dias.includes(dia);
                  return (
                    <button
                      key={dia}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => alternarDia(dia)}
                      className={[
                        'px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40',
                        activo
                          ? 'bg-brand-800 text-white border-brand-800 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-brand-300 hover:text-brand-800',
                      ].join(' ')}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>

              <p className="text-sm text-gray-500 mt-2">
                {modo === 'alta'
                  ? 'Se creará un horario por cada día seleccionado.'
                  : 'Al guardar se reemplaza el registro de este día.'}
                {dias.length > 0 && ` Días seleccionados: ${dias.length}.`}
              </p>
            </div>

            {/* Turno */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Hora de inicio">
                <Input
                  type="time"
                  value={inicio}
                  onChange={(e) => setInicio(e.target.value)}
                  className="tabular-nums"
                />
              </Field>
              <Field label="Hora de fin">
                <Input
                  type="time"
                  value={fin}
                  onChange={(e) => setFin(e.target.value)}
                  className="tabular-nums"
                />
              </Field>
            </div>
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
            {modo === 'editar'
              ? 'Guardar cambios'
              : dias.length > 1
                ? `Crear ${dias.length} horarios`
                : 'Crear horario'}
          </Button>
        </div>
      </form>
    </div>
  );
}
