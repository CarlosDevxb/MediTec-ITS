import React, { useMemo, useState } from 'react';
import { Clock, Save, X, Trash2, CircleAlert, CalendarCheck } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Field, Input, Select } from '../ui/Input';
import { detallesDe, mensajeDeError } from '../../services/api';
import { useOpcionUnica } from '../../hooks/useOpcionUnica';
import {
  DIAS_SEMANA,
  diasEnTexto,
  nombreDeDia,
  type Horario,
  type PersonalMedico,
  type TurnoHorario,
  type DatosHorarios,
  type DatosActualizarTurno,
} from '../../services/operacion.service';

/* ============================================================
   FORMULARIO DE TURNO · alta y edición (subpágina)

   Un turno es un bloque: una persona, un rango de horas y los días
   en los que aplica (solo lunes a viernes: la clínica no opera
   fines de semana). Al editarlo se cambia el bloque completo: las
   horas mueven todos sus días y los días se agregan o se quitan.

   La validación es en tiempo real: los días que ya tienen ese
   turno exacto (mismo personal, día y rango) se señalan mientras
   se captura, sin esperar al envío. El servidor vuelve a validar.
   ============================================================ */

export interface HorarioFormProps {
  modo: 'alta' | 'editar';
  /** Requerido en edición: el bloque que se está editando */
  turno?: TurnoHorario;
  /** Personal clínico activo, para el selector */
  personal: PersonalMedico[];
  /** Turnos ya existentes: para detectar duplicados exactos mientras se escribe */
  horarios: Horario[];
  guardando?: boolean;
  onCancelar: () => void;
  onGuardar: (datos: DatosHorarios | DatosActualizarTurno) => Promise<void>;
  /** Solo en edición: la vista principal pide confirmación antes de borrar */
  onEliminar?: () => void;
}

export default function HorarioForm({
  modo,
  turno,
  personal,
  horarios,
  guardando = false,
  onCancelar,
  onGuardar,
  onEliminar,
}: HorarioFormProps) {
  const [personalId, setPersonalId] = useState(
    turno ? String(turno.personalMedicoId) : '',
  );
  /** Días del turno (1-5): en alta y en edición se marcan varios */
  const [dias, setDias] = useState<number[]>(turno ? [...turno.dias] : []);
  const [horaInicio, setHoraInicio] = useState(turno?.horaInicio ?? '08:00');
  const [horaFin, setHoraFin] = useState(turno?.horaFin ?? '14:00');
  const [tocado, setTocado] = useState<Record<string, boolean>>({});
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState('');

  const esEdicion = modo === 'editar';
  const personalElegido = personal.find((p) => p.id === Number(personalId));

  // Con una sola persona en el catálogo el selector la elige solo (ver hooks/)
  useOpcionUnica(personal, personalId, (id) => setPersonalId(String(id)));

  const alternarDia = (dia: number) => {
    setDias((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia].sort((a, b) => a - b),
    );
    setTocado((prev) => ({ ...prev, dias: true }));
  };

  const marcarLaborales = () => setDias([1, 2, 3, 4, 5]);
  const limpiarDias = () => setDias([]);

  /* ---------- Duplicados exactos en tiempo real ---------- */
  // Mismo personal, mismo día y mismo rango de horas que un turno ya cargado
  // (los días del turno que se edita se excluyen para no confundirse consigo mismo)
  const idsDelTurno = useMemo(
    () => new Set((turno?.horarios ?? []).map((horario) => horario.id)),
    [turno],
  );
  const diasDuplicados = useMemo(() => {
    if (!personalId || !horaInicio || !horaFin || horaInicio >= horaFin) return [];
    return dias.filter((dia) =>
      horarios.some(
        (h) =>
          !idsDelTurno.has(h.id) &&
          h.personalMedicoId === Number(personalId) &&
          h.diaSemana === dia &&
          h.horaInicio === horaInicio &&
          h.horaFin === horaFin,
      ),
    );
  }, [dias, personalId, horaInicio, horaFin, horarios, idsDelTurno]);

  const duplicadosTexto =
    diasDuplicados.length > 0
      ? `Ese turno ya existe ${diasDuplicados
          .map((d) => `el ${nombreDeDia(d).toLowerCase()}`)
          .join(', ')} para ${personalElegido?.nombre ?? 'ese personal'} (${horaInicio}–${horaFin}). Quita ${
          diasDuplicados.length === 1 ? 'ese día' : 'esos días'
        } o cambia el horario.`
      : '';

  /* ---------- Errores vivos: se recalculan en cada tecla ---------- */
  const errores = useMemo(() => {
    const calculados: Record<string, string> = {};
    calculados.personalMedicoId = personalId ? '' : 'Selecciona un miembro del personal.';
    calculados.dias =
      dias.length === 0 ? 'Selecciona al menos un día de la semana.' : '';
    calculados.horaFin =
      horaInicio && horaFin && horaInicio >= horaFin
        ? 'La hora de fin debe ser posterior a la hora de inicio.'
        : '';
    calculados.horaInicio = horaInicio ? '' : 'Indica la hora de inicio.';
    return calculados;
  }, [personalId, dias, horaInicio, horaFin]);

  const errorVisible = (campo: string): string | undefined => {
    const propio = errores[campo];
    if (propio) return tocado[campo] ? propio : erroresServidor[campo] || undefined;
    return erroresServidor[campo] || undefined;
  };

  const hayErrores = Object.values(errores).some(Boolean) || diasDuplicados.length > 0;
  const marcarTocado = (campo: string) => setTocado((prev) => ({ ...prev, [campo]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTocado({ personalMedicoId: true, dias: true, horaInicio: true, horaFin: true });
    setErroresServidor({});
    setErrorGeneral('');
    if (hayErrores) return;

    try {
      if (esEdicion && turno) {
        await onGuardar({
          personalMedicoId: Number(personalId),
          // El rango original identifica el bloque que se está editando
          horaInicio: turno.horaInicio,
          horaFin: turno.horaFin,
          nuevaHoraInicio: horaInicio,
          nuevaHoraFin: horaFin,
          dias,
        } satisfies DatosActualizarTurno);
      } else {
        await onGuardar({
          personalMedicoId: Number(personalId),
          dias,
          horaInicio,
          horaFin,
        } satisfies DatosHorarios);
      }
    } catch (error) {
      // Errores del servidor pintados en su campo (400) o como resumen (409 / red)
      const porCampo = detallesDe(error);
      if (Object.keys(porCampo).length > 0) setErroresServidor(porCampo);
      else setErrorGeneral(mensajeDeError(error));
    }
  };

  /* ---------- Resumen vivo de lo que se va a guardar ---------- */
  const resumen =
    dias.length > 0 && !hayErrores
      ? `${esEdicion ? 'El turno quedará' : 'Se creará un turno'} de ${horaInicio} a ${horaFin} los días ${diasEnTexto(dias)} (${dias.length} ${dias.length === 1 ? 'día' : 'días'}).`
      : '';

  return (
    <div className="entrada p-10 xl:p-12 max-w-5xl mx-auto font-sans">
      <PageHeader
        title={esEdicion ? 'Editar turno' : 'Nuevo horario'}
        subtitle={
          esEdicion
            ? `Turno de ${turno?.personal ?? ''} · ${turno?.horaInicio ?? ''}–${turno?.horaFin ?? ''} · ${diasEnTexto(turno?.dias ?? [])}`
            : 'Asigna la disponibilidad semanal del personal (lunes a viernes)'
        }
      />

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6" noValidate>
        <Card title="Datos del turno" icon={Clock}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Personal"
              className="md:col-span-2"
              error={errorVisible('personalMedicoId')}
              hint={
                esEdicion
                  ? 'El turno pertenece a esta persona: para moverlo a otro personal, elimínalo y créalo de nuevo.'
                  : 'Personal médico y de enfermería con cuenta activa.'
              }
            >
              {personal.length === 0 ? (
                <p className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                  No hay personal disponible. Da de alta primero a alguien con el
                  rol Personal médico o Enfermería en la sección Usuarios.
                </p>
              ) : (
                <Select
                  value={personalId}
                  onChange={(e) => {
                    setPersonalId(e.target.value);
                    marcarTocado('personalMedicoId');
                  }}
                  onBlur={() => marcarTocado('personalMedicoId')}
                  disabled={guardando || esEdicion}
                  aria-invalid={errorVisible('personalMedicoId') ? true : undefined}
                >
                  <option value="">Selecciona a alguien del personal…</option>
                  {personal.map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.nombre} · {persona.especialidad}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label="Hora de inicio" error={errorVisible('horaInicio')}>
              <Input
                type="time"
                value={horaInicio}
                onChange={(e) => {
                  setHoraInicio(e.target.value);
                  marcarTocado('horaInicio');
                }}
                onBlur={() => marcarTocado('horaInicio')}
                className="tabular-nums"
                aria-invalid={errorVisible('horaInicio') ? true : undefined}
              />
            </Field>

            <Field label="Hora de fin" error={errorVisible('horaFin')}>
              <Input
                type="time"
                value={horaFin}
                onChange={(e) => {
                  setHoraFin(e.target.value);
                  marcarTocado('horaFin');
                }}
                onBlur={() => marcarTocado('horaFin')}
                className="tabular-nums"
                aria-invalid={errorVisible('horaFin') ? true : undefined}
              />
            </Field>

            {/* Días de la semana: solo lunes a viernes */}
            <div className="md:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="block text-base font-semibold text-gray-700">
                    Días de la semana
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={marcarLaborales} type="button">
                      Lunes a viernes
                    </Button>
                    <Button variant="ghost" size="sm" onClick={limpiarDias} type="button">
                      Limpiar
                    </Button>
                  </div>
                </div>

                <div
                  className="mt-2 flex flex-wrap gap-2"
                  role="group"
                  aria-label="Días de la semana (lunes a viernes)"
                >
                  {DIAS_SEMANA.map((nombre, indice) => {
                    const dia = indice + 1;
                    const marcado = dias.includes(dia);
                    const duplicado = diasDuplicados.includes(dia);
                    return (
                      <button
                        key={nombre}
                        type="button"
                        onClick={() => alternarDia(dia)}
                        aria-pressed={marcado}
                        className={[
                          'inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40',
                          marcado
                            ? duplicado
                              ? 'bg-red-50 border-red-300 text-red-700'
                              : 'bg-brand-800 border-brand-800 text-white'
                            : 'bg-white border-gray-300 text-gray-600 hover:border-brand-300',
                        ].join(' ')}
                      >
                        {duplicado && <CircleAlert size={14} aria-hidden="true" />}
                        {nombre}
                        {duplicado && <span className="text-xs">· ya existe</span>}
                      </button>
                    );
                  })}
                </div>

                {errorVisible('dias') ? (
                  <p className="text-xs text-red-600 mt-1 font-medium">{errorVisible('dias')}</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">
                    Marca los días en los que atenderá este personal. La clínica no
                    opera fines de semana.
                  </p>
                )}
            </div>
          </div>

          {/* Alerta temprana de duplicados y resumen de lo que se guardará */}
          {duplicadosTexto && (
            <p
              role="alert"
              className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
              <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              {duplicadosTexto}
            </p>
          )}
          {resumen && (
            <p className="mt-4 flex items-center gap-2.5 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
              <CalendarCheck size={18} className="shrink-0" aria-hidden="true" />
              {resumen}
            </p>
          )}
        </Card>

        {(errorGeneral || (hayErrores && Object.values(tocado).some(Boolean))) && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              {errorGeneral ||
                'Revisa los campos marcados antes de guardar: hay datos inválidos o turnos repetidos.'}
            </span>
          </div>
        )}

        <div
          className={[
            'flex gap-4 pb-10',
            esEdicion ? 'justify-between' : 'justify-end',
          ].join(' ')}
        >
          {esEdicion && onEliminar && (
            <Button
              variant="danger"
              icon={Trash2}
              onClick={onEliminar}
              disabled={guardando}
              type="button"
            >
              Eliminar turno
            </Button>
          )}
          <div className="flex gap-4">
            <Button variant="secondary" icon={X} onClick={onCancelar} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" icon={Save} loading={guardando} disabled={guardando}>
              {esEdicion ? 'Guardar cambios' : 'Crear turno'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
