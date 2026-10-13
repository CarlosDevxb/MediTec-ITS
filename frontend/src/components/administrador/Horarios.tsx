import React, { useState } from 'react';
import {
  Plus,
  Clock,
  MousePointerClick,
  Stethoscope,
  HeartPulse,
  Syringe,
  type LucideIcon,
} from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
import EmptyState from '../ui/EmptyState';
import HorarioForm from './HorarioForm';
import { HORARIOS_DEMO, OPCIONES_DIA, type Horario } from './tipos';

/* ============================================================
   VISTA: HORARIOS · Calendario semanal
   Un bloque continuo por turno (sin repetir datos por hora),
   con icono por especialidad y marcas de hora sutiles al
   interior. Los turnos compartidos se apilan en un bloque.
   ============================================================ */

type Subvista = { modo: 'lista' } | { modo: 'alta' } | { modo: 'editar'; horario: Horario };

/** Altura en px de cada hora en el calendario */
const ALTO_HORA = 72;

/** Icono y chip de color por especialidad (tonos suaves) */
const ESPECIALIDAD: Record<string, { icono: LucideIcon; chip: string }> = {
  'Odontología': { icono: Stethoscope, chip: 'bg-brand-50 text-brand-700' },
  'Medicina general': { icono: HeartPulse, chip: 'bg-blue-50 text-blue-600' },
  'Enfermería': { icono: Syringe, chip: 'bg-emerald-50 text-emerald-600' },
};

const especialidadDe = (especialidad: string) =>
  ESPECIALIDAD[especialidad] ?? { icono: Stethoscope, chip: 'bg-gray-50 text-gray-600' };

/** Rejilla de fondo: solo línea de hora (sin media hora) */
const ESTILO_REJILLA: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(to bottom, #f1f5f9 0, #f1f5f9 1px, transparent 1px, transparent 72px)',
};

/** "08:30" → 510 */
const aMinutos = (hora: string) => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};

const hhmm = (minutos: number) =>
  `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;

/** Límites de hora dentro de un tramo (ej. 08:00–14:00 → 9,10,11,12,13) */
const marcasDeHora = (inicio: number, fin: number): number[] => {
  const marcas: number[] = [];
  let cursor = Math.ceil((inicio + 1) / 60) * 60;
  while (cursor < fin) {
    marcas.push(cursor);
    cursor += 60;
  }
  return marcas;
};

interface PersonaBloque {
  id: number;
  nombre: string;
  especialidad: string;
  horario: Horario;
}

interface Bloque {
  inicio: number;
  fin: number;
  /** Personas del tramo (1 = turno individual) */
  personas: PersonaBloque[];
  top: number;
  alto: number;
  lane: number;
  lanes: number;
}

export default function Horarios() {
  const [horarios, setHorarios] = useState<Horario[]>(HORARIOS_DEMO);
  const [subvista, setSubvista] = useState<Subvista>({ modo: 'lista' });
  const { aviso, mostrar, cerrar } = useAviso();

  /* ---------- Subpáginas (alta / edición) ---------- */
  if (subvista.modo !== 'lista') {
    const horarioOriginal = subvista.modo === 'editar' ? subvista.horario : null;

    return (
      <HorarioForm
        modo={subvista.modo}
        horario={horarioOriginal ?? undefined}
        onCancelar={() => setSubvista({ modo: 'lista' })}
        onGuardar={(nuevos) => {
          setHorarios((prev) => {
            const base = horarioOriginal
              ? prev.flatMap((h) => (h.id === horarioOriginal.id ? nuevos : [h]))
              : [...prev, ...nuevos];

            const vistos = new Set<string>();
            return base.filter((h) => {
              const clave = `${h.personal}|${h.dia}|${h.inicio}|${h.fin}`;
              if (vistos.has(clave)) return false;
              vistos.add(clave);
              return true;
            });
          });

          const diasTexto = nuevos.map((h) => h.dia).join(', ');
          mostrar(
            horarioOriginal
              ? `Horario de ${nuevos[0].personal} actualizado (${diasTexto}).`
              : nuevos.length === 1
                ? `Horario de ${nuevos[0].personal} creado para ${diasTexto}.`
                : `${nuevos.length} horarios creados para ${nuevos[0].personal}: ${diasTexto}.`
          );
          setSubvista({ modo: 'lista' });
        }}
      />
    );
  }

  /* ---------- Fechas de la semana actual (lunes a domingo) ---------- */
  const hoy = new Date();
  const indiceHoy = (hoy.getDay() + 6) % 7; // 0 = Lunes
  const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - indiceHoy);
  const fechasSemana = OPCIONES_DIA.map((_, i) => {
    const fecha = new Date(lunes);
    fecha.setDate(lunes.getDate() + i);
    return fecha;
  });

  /* ---------- Rango del calendario (según los turnos) ---------- */
  const minutosInicio = horarios.length
    ? Math.min(...horarios.map((h) => aMinutos(h.inicio)))
    : 8 * 60;
  const minutosFin = horarios.length
    ? Math.max(...horarios.map((h) => aMinutos(h.fin)))
    : 18 * 60;

  const horaInicio = Math.floor(minutosInicio / 60);
  const horaFin = Math.ceil(minutosFin / 60);
  const filas = Math.max(1, horaFin - horaInicio);
  const altoTotal = filas * ALTO_HORA;

  const ahoraMinutos = hoy.getHours() * 60 + hoy.getMinutes();
  const verAhora = ahoraMinutos >= horaInicio * 60 && ahoraMinutos <= horaFin * 60;

  /** Bloques de un día: un bloque por turno; los turnos con el mismo
   *  tramo (compartidos) comparten bloque con las personas apiladas. */
  const bloquesDelDia = (dia: string): Bloque[] => {
    const delDia = horarios
      .filter((h) => h.dia === dia)
      .sort((a, b) => aMinutos(a.inicio) - aMinutos(b.inicio));

    // 1) Agrupar por tramo exacto: aquí van juntos los compartidos
    const grupos = new Map<string, { inicio: number; fin: number; personas: PersonaBloque[] }>();
    delDia.forEach((horario) => {
      const inicio = aMinutos(horario.inicio);
      const fin = aMinutos(horario.fin);
      const clave = `${inicio}-${fin}`;
      const grupo = grupos.get(clave);
      const persona = {
        id: horario.id,
        nombre: horario.personal,
        especialidad: horario.especialidad,
        horario,
      };
      if (grupo) grupo.personas.push(persona);
      else grupos.set(clave, { inicio, fin, personas: [persona] });
    });

    // 2) Columnas solo si aún quedan solapes entre tramos distintos
    const lista = Array.from(grupos.values()).sort((a, b) => a.inicio - b.inicio);
    const finPorLane: number[] = [];

    const bloques = lista.map((grupo) => {
      let lane = finPorLane.findIndex((f) => f <= grupo.inicio);
      if (lane === -1) {
        finPorLane.push(grupo.fin);
        lane = finPorLane.length - 1;
      } else {
        finPorLane[lane] = grupo.fin;
      }

      return {
        inicio: grupo.inicio,
        fin: grupo.fin,
        personas: grupo.personas,
        top: ((grupo.inicio - horaInicio * 60) / 60) * ALTO_HORA,
        alto: Math.max(34, ((grupo.fin - grupo.inicio) / 60) * ALTO_HORA - 6),
        lane,
        lanes: 1,
      };
    });

    return bloques.map((b) => ({ ...b, lanes: Math.max(1, finPorLane.length) }));
  };

  const especialidades = Array.from(new Set(horarios.map((h) => h.especialidad)));

  return (
    <div className="p-10 xl:p-12 max-w-7xl mx-auto font-sans">
      <PageHeader
        title="Horarios"
        subtitle="Disponibilidad semanal del personal médico"
        meta={
          <Button icon={Plus} onClick={() => setSubvista({ modo: 'alta' })}>
            Nuevo horario
          </Button>
        }
      />

      {aviso && <Aviso mensaje={aviso} onCerrar={cerrar} />}

      {horarios.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200">
          <EmptyState
            icon={Clock}
            title="Sin horarios registrados"
            description="Crea el primer turno del personal para verlo en el calendario."
            action={<Button icon={Plus} onClick={() => setSubvista({ modo: 'alta' })}>Nuevo horario</Button>}
          />
        </div>
      ) : (
        <>
          {/* ============ CALENDARIO SEMANAL ============ */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            
            {/* Encabezado + leyenda */}
            <div className="px-7 py-5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-gray-900">
                  Calendario semanal
                </h3>
                <p className="text-sm text-gray-500 mt-1 tabular-nums">
                  {horarios.length} horarios · de {hhmm(horaInicio * 60)} a {hhmm(horaFin * 60)} ·{' '}
                  {fechasSemana[0].getDate()}–{fechasSemana[6].getDate()} de{' '}
                  {fechasSemana[6].toLocaleDateString('es-MX', { month: 'long' })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {especialidades.map((especialidad) => {
                  const { icono: Icono, chip } = especialidadDe(especialidad);
                  return (
                    <span
                      key={especialidad}
                      className="inline-flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-full pl-1.5 pr-3 py-1"
                    >
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center ${chip}`}>
                        <Icono size={14} />
                      </span>
                      {especialidad}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Rejilla */}
            <div className="overflow-x-auto">
              <div className="min-w-[1000px] px-6 pt-5 pb-6">
                
                {/* Nombres de los días */}
                <div className="flex pl-20 pb-3">
                  {OPCIONES_DIA.map((dia, i) => {
                    const esHoy = i === indiceHoy;
                    const finde = i >= 5;
                    return (
                      <div key={dia} className="flex-1 flex justify-center">
                        <span
                          className={[
                            'inline-flex flex-col items-center px-4 py-1.5 rounded-full',
                            esHoy
                              ? 'bg-brand-800 text-white'
                              : finde
                                ? 'text-gray-400'
                                : 'text-gray-600',
                          ].join(' ')}
                        >
                          <span className="text-xs font-semibold">{dia.slice(0, 3)}</span>
                          <span
                            className={`text-[11px] tabular-nums ${
                              esHoy ? 'text-white/80' : 'text-gray-400'
                            }`}
                          >
                            {fechasSemana[i].getDate()}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Horas × Días */}
                <div className="flex border-t border-gray-200" style={{ height: altoTotal + 4 }}>
                  
                  {/* Columna de horas */}
                  <div className="w-20 shrink-0 relative">
                    {Array.from({ length: filas }).map((_, i) => (
                      <span
                        key={i}
                        className="absolute right-4 text-[11px] text-gray-400 tabular-nums"
                        style={{ top: i * ALTO_HORA + 6 }}
                      >
                        {hhmm((horaInicio + i) * 60)}
                      </span>
                    ))}
                  </div>

                  {/* Columnas de días */}
                  <div className="flex-1 grid grid-cols-7">
                    {OPCIONES_DIA.map((dia, iDia) => {
                      const esHoy = iDia === indiceHoy;
                      const finde = iDia >= 5;
                      const bloques = bloquesDelDia(dia);

                      return (
                        <div
                          key={dia}
                          className={[
                            'relative border-r border-gray-100 last:border-r-0',
                            esHoy ? 'bg-brand-50/60' : finde ? 'bg-gray-50/60' : '',
                          ].join(' ')}
                          style={{ height: altoTotal, ...ESTILO_REJILLA }}
                        >
                          {/* Bloques de turno */}
                          {bloques.map((bloque) => (
                            <div
                              key={`${bloque.inicio}-${bloque.lane}`}
                              className="absolute rounded-lg border border-gray-200 bg-white overflow-hidden transition-colors hover:border-brand-300"
                              style={{
                                top: bloque.top + 3,
                                height: bloque.alto,
                                left: `calc(${(bloque.lane / bloque.lanes) * 100}% + 3px)`,
                                width: `calc(${100 / bloque.lanes}% - 6px)`,
                              }}
                            >
                              <div className="relative h-full">
                                {/* Marcas de hora al interior */}
                                {marcasDeHora(bloque.inicio, bloque.fin).map((minuto) => (
                                  <span
                                    key={minuto}
                                    className="absolute left-0 right-0 flex items-center gap-1 pl-1.5 pr-2"
                                    style={{ top: ((minuto - bloque.inicio) / 60) * ALTO_HORA }}
                                    aria-hidden="true"
                                  >
                                    <span className="text-[10px] text-gray-300 tabular-nums">
                                      {hhmm(minuto)}
                                    </span>
                                    <span className="flex-1 border-t border-dashed border-gray-100" />
                                  </span>
                                ))}

                                {/* Personas del turno */}
                                <div className="relative flex flex-col">
                                  {bloque.personas.map((persona, i) => {
                                    const { icono: Icono, chip } = especialidadDe(persona.especialidad);
                                    return (
                                      <button
                                        key={persona.id}
                                        type="button"
                                        onClick={() => setSubvista({ modo: 'editar', horario: persona.horario })}
                                        title={`${persona.nombre} · ${persona.especialidad} · ${hhmm(bloque.inicio)}–${hhmm(bloque.fin)} · clic para editar`}
                                        aria-label={`Editar horario de ${persona.nombre}, de ${hhmm(bloque.inicio)} a ${hhmm(bloque.fin)}`}
                                        className={[
                                          'flex items-center gap-2 px-2 py-1.5 min-w-0 text-left',
                                          'hover:bg-brand-50/60 transition-colors',
                                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-inset',
                                          i > 0 ? 'border-t border-gray-100' : '',
                                        ].join(' ')}
                                      >
                                        <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${chip}`}>
                                          <Icono size={14} />
                                        </span>
                                        <span className="min-w-0">
                                          <span className="block text-xs font-semibold text-gray-900 truncate leading-tight">
                                            {persona.nombre}
                                          </span>
                                          {bloque.alto >= 60 && (
                                            <span className="block text-[11px] text-gray-400 truncate leading-tight">
                                              {persona.especialidad}
                                            </span>
                                          )}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Línea de "ahora" (solo el día de hoy) */}
                          {esHoy && verAhora && (
                            <span
                              className="absolute left-0 right-0 flex items-center z-10"
                              style={{ top: ((ahoraMinutos - horaInicio * 60) / 60) * ALTO_HORA }}
                              aria-hidden="true"
                            >
                              <span className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                              <span className="flex-1 h-0.5 bg-red-500/70" />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Pie del calendario */}
            <div className="px-7 py-4 border-t border-gray-200 bg-gray-50/60 flex items-center gap-2 text-sm text-gray-500">
              <MousePointerClick size={16} className="text-gray-400" />
              Cada turno es un bloque continuo · los turnos compartidos se apilan · clic en una persona para editar.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
