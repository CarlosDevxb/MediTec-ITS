import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, CircleAlert, Loader2 } from 'lucide-react';
import {
  obtenerDiasDisponibles,
  obtenerDisponibilidad,
  hoyISO,
  diaDeSemana,
  fechaCorta,
  DURACION_CITA,
  SEPARACION_MINIMA,
  type DiaDisponible,
  type DisponibilidadDia,
} from '../../services/atencion.service';
import { nombreDeDia } from '../../services/operacion.service';
import { mensajeDeError } from '../../services/api';

/* ============================================================
   SELECTOR DE CITA · día y hora para agendar

   Reemplaza a los dos `<Select>` de fecha y hora con:
     · chips de día **solo de los días que sí sirven** (tienen
       horario y al menos una hora libre), agrupados por semana
     · rejilla de horas donde se ven los huecos ocupados y los
       pasados, además de los libres

   La disponibilidad la calcula el servidor (`GET
   /api/citas/disponibilidad`): este componente solo pinta y
   devuelve la elección, para que no haya dos versiones de las
   reglas de la agenda.
   ============================================================ */

export interface SelectorCitaProps {
  /** Especialista del que depende la agenda */
  personalMedicoId: number | null;
  /** Fecha elegida (AAAA-MM-DD); vacía si aún no se elige */
  fecha: string;
  /** Hora elegida ('HH:mm'); vacía si aún no se elige */
  hora: string;
  onFechaChange: (fecha: string) => void;
  onHoraChange: (hora: string) => void;
  /** Cita que se está reagendando: no debe bloquear su propio hueco */
  excluirCitaId?: number;
}

/**
 * Días que se consultan de una vez (3 meses).
 *
 * Se queda por debajo del tope del servidor (`MAXIMO_DIAS_CONSULTA`, 92) para
 * que una consulta normal nunca lo toque: el rango va de hoy a hoy + (esto - 1),
 * es decir, exactamente estos días contando el de hoy.
 */
const DIAS_CONSULTA = 90;

/** '2026-11-17' + 62 días → '2027-01-18' */
function sumarDias(fecha: string, cantidad: number): string {
  const dia = new Date(`${fecha}T12:00:00`);
  dia.setDate(dia.getDate() + cantidad);
  return `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(
    dia.getDate(),
  ).padStart(2, '0')}`;
}

/** Separa los días en semanas (de lunes a domingo) conservando el orden */
function agruparPorSemana(dias: DiaDisponible[]): DiaDisponible[][] {
  const semanas: DiaDisponible[][] = [];
  let actual: DiaDisponible[] = [];
  let inicioSemana = '';

  for (const dia of dias) {
    const lunes = sumarDias(dia.fecha, -(diaDeSemana(dia.fecha) - 1));
    if (lunes !== inicioSemana && actual.length > 0) {
      semanas.push(actual);
      actual = [];
    }
    inicioSemana = lunes;
    actual.push(dia);
  }
  if (actual.length > 0) semanas.push(actual);
  return semanas;
}

export default function SelectorCita({
  personalMedicoId,
  fecha,
  hora,
  onFechaChange,
  onHoraChange,
  excluirCitaId,
}: SelectorCitaProps) {
  const [dias, setDias] = useState<DiaDisponible[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadDia | null>(null);
  const [cargandoDias, setCargandoDias] = useState(false);
  const [cargandoHoras, setCargandoHoras] = useState(false);
  const [error, setError] = useState('');
  const [semanaVisible, setSemanaVisible] = useState(0);

  /* ---------- Días que sirven para agendar ---------- */
  useEffect(() => {
    if (!personalMedicoId) {
      setDias([]);
      return;
    }

    let vigente = true;
    setCargandoDias(true);
    setError('');

    obtenerDiasDisponibles(
      personalMedicoId,
      hoyISO(),
      // Hoy cuenta como día del rango: se piden DIAS_CONSULTA en total
      sumarDias(hoyISO(), DIAS_CONSULTA - 1),
      excluirCitaId,
    )
      .then((lista) => {
        if (!vigente) return;
        setDias(lista);
        setSemanaVisible(0);
      })
      .catch((e) => {
        if (!vigente) return;
        setDias([]);
        setError(mensajeDeError(e));
      })
      .finally(() => {
        if (vigente) setCargandoDias(false);
      });

    return () => {
      vigente = false;
    };
  }, [personalMedicoId, excluirCitaId]);

  /* ---------- Rejilla de horas del día elegido ---------- */
  useEffect(() => {
    if (!personalMedicoId || !fecha) {
      setDisponibilidad(null);
      return;
    }

    let vigente = true;
    setCargandoHoras(true);

    obtenerDisponibilidad(personalMedicoId, fecha, excluirCitaId)
      .then((datos) => {
        if (vigente) setDisponibilidad(datos);
      })
      .catch((e) => {
        if (!vigente) return;
        setDisponibilidad(null);
        setError(mensajeDeError(e));
      })
      .finally(() => {
        if (vigente) setCargandoHoras(false);
      });

    return () => {
      vigente = false;
    };
  }, [personalMedicoId, fecha, excluirCitaId]);

  /* ---------- Elecciones válidas ---------- */
  const semanaElegida = useMemo(() => {
    const indice = dias.findIndex((d) => d.fecha === fecha);
    return indice === -1 ? -1 : agruparPorSemana(dias).findIndex((s) => s.some((d) => d.fecha === fecha));
  }, [dias, fecha]);

  const semanas = useMemo(() => agruparPorSemana(dias), [dias]);
  const diasDeLaSemana = semanas[semanaVisible] ?? [];
  const horasLibres = useMemo(
    () => (disponibilidad?.slots ?? []).filter((slot) => slot.disponible),
    [disponibilidad],
  );

  /* ---------- Autocorrección: siempre una elección válida ---------- */
  const elegirPrimeraFecha = useCallback(() => {
    if (dias.length === 0) return;
    if (!dias.some((d) => d.fecha === fecha)) onFechaChange(dias[0].fecha);
  }, [dias, fecha, onFechaChange]);

  useEffect(() => {
    elegirPrimeraFecha();
  }, [elegirPrimeraFecha]);

  useEffect(() => {
    if (!disponibilidad) return;
    const sigueLibre = disponibilidad.slots.some((s) => s.disponible && s.hora === hora);
    if (!sigueLibre) {
      const primera = disponibilidad.slots.find((s) => s.disponible);
      onHoraChange(primera ? primera.hora : '');
    }
  }, [disponibilidad, hora, onHoraChange]);

  /* ---------- Estados sin contenido ---------- */
  if (!personalMedicoId) {
    return (
      <p className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
        Elige primero a un especialista para ver sus días y horas disponibles.
      </p>
    );
  }

  if (error) {
    return (
      <p
        role="alert"
        className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800"
      >
        <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* ---------- Días que sirven ---------- */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="flex items-center gap-2 text-base font-semibold text-gray-700">
            <CalendarDays size={17} aria-hidden="true" />
            Día
          </span>
          {semanas.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSemanaVisible((i) => Math.max(0, i - 1))}
                disabled={semanaVisible === 0}
                aria-label="Semana anterior"
                className="p-1.5 rounded-md text-gray-500 hover:text-brand-800 hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => setSemanaVisible((i) => Math.min(semanas.length - 1, i + 1))}
                disabled={semanaVisible >= semanas.length - 1}
                aria-label="Semana siguiente"
                className="p-1.5 rounded-md text-gray-500 hover:text-brand-800 hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {cargandoDias ? (
          <p className="flex items-center gap-2 text-sm text-gray-500 py-2" role="status">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            Buscando días disponibles…
          </p>
        ) : dias.length === 0 ? (
          <p className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
            No hay días con horas disponibles en las próximas semanas. Consulta más tarde o
            revisa el horario del especialista.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Días disponibles">
            {diasDeLaSemana.map((dia) => {
              const elegido = dia.fecha === fecha;
              return (
                <button
                  key={dia.fecha}
                  type="button"
                  aria-pressed={elegido}
                  onClick={() => onFechaChange(dia.fecha)}
                  className={[
                    'min-w-[7.5rem] rounded-lg border px-3 py-2 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40',
                    elegido
                      ? 'border-brand-700 bg-brand-700 text-white shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-brand-300 hover:bg-brand-50',
                  ].join(' ')}
                >
                  <span className="block text-sm font-semibold leading-tight">
                    {nombreDeDia(diaDeSemana(dia.fecha))} {fechaCorta(dia.fecha)}
                  </span>
                  <span
                    className={[
                      'block text-xs tabular-nums',
                      elegido ? 'text-brand-100' : 'text-gray-500',
                    ].join(' ')}
                  >
                    {dia.horasLibres} hora{dia.horasLibres === 1 ? '' : 's'} libre
                    {dia.horasLibres === 1 ? '' : 's'}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {semanaElegida >= 0 && semanaVisible !== semanaElegida && (
          <button
            type="button"
            onClick={() => setSemanaVisible(semanaElegida)}
            className="mt-2 text-sm text-brand-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 rounded"
          >
            Ir a la semana del día elegido
          </button>
        )}
      </div>

      {/* ---------- Horas del día elegido ---------- */}
      {fecha && (
        <div key={fecha} className="entrada">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="flex items-center gap-2 text-base font-semibold text-gray-700">
              <Clock size={17} aria-hidden="true" />
              Hora
            </span>
            {disponibilidad && disponibilidad.slots.length > 0 && (
              <span className="text-sm text-gray-500 tabular-nums" aria-live="polite">
                {horasLibres.length} de {disponibilidad.slots.length} horas libres
              </span>
            )}
          </div>

          {cargandoHoras ? (
            <p className="flex items-center gap-2 text-sm text-gray-500 py-2" role="status">
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Cargando las horas del día…
            </p>
          ) : !disponibilidad || disponibilidad.slots.length === 0 ? (
            <p className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
              El especialista no tiene horario registrado para ese día. Elige otro día.
            </p>
          ) : horasLibres.length === 0 ? (
            <p className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
              Este día ya está completo: no queda ninguna hora disponible.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Horas disponibles">
                {disponibilidad.slots.map((slot) => {
                  const elegido = slot.hora === hora;
                  const titulo =
                    slot.motivo === 'ocupada'
                      ? 'Ocupada: ya hay una cita en ese tramo'
                      : slot.motivo === 'pasada'
                        ? 'Ya pasó'
                        : 'Disponible';
                  return (
                    <button
                      key={slot.hora}
                      type="button"
                      aria-pressed={elegido}
                      disabled={!slot.disponible}
                      title={titulo}
                      aria-label={`${slot.hora} · ${titulo}`}
                      onClick={() => onHoraChange(slot.hora)}
                      className={[
                        'w-[5.25rem] rounded-lg border px-2 py-2 text-sm font-medium tabular-nums transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40',
                        !slot.disponible
                          ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed line-through'
                          : elegido
                            ? 'border-brand-700 bg-brand-700 text-white shadow-sm'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-brand-300 hover:bg-brand-50',
                      ].join(' ')}
                    >
                      {slot.hora}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Cada {SEPARACION_MINIMA} minutos (sesión de {DURACION_CITA} min +{' '}
                {SEPARACION_MINIMA - DURACION_CITA} de respiro).
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
