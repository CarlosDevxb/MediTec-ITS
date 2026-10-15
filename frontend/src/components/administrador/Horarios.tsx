import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Clock,
  MousePointerClick,
  Stethoscope,
  HeartPulse,
  Syringe,
  CalendarRange,
  List,
  Users,
  Pencil,
  Trash2,
  CircleAlert,
  type LucideIcon,
} from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
import EmptyState from '../ui/EmptyState';
import EstadoVista from '../ui/EstadoVista';
import DataTable from '../ui/DataTable';
import Modal from '../ui/Modal';
import ModalResultado from '../ui/ModalResultado';
import StatCard from '../ui/StatCard';
import IconButton from '../ui/IconButton';
import type { Column } from '../ui/DataTable';
import { mensajeDeError } from '../../services/api';
import {
  DIAS_SEMANA,
  nombreDeDia,
  listarHorarios,
  crearHorarios,
  actualizarHorario,
  eliminarHorario,
  listarPersonalMedico,
  type Horario,
  type PersonalMedico,
  type DatosHorarios,
  type DatosHorario,
} from '../../services/operacion.service';
import HorarioForm from './HorarioForm';

/* ============================================================
   VISTA: HORARIOS · Calendario semanal (lunes a viernes)
   Conectada a /api/horarios (tabla `horarios`)

   Cada turno es un bloque continuo por persona (sin repetir datos
   por hora). Las personas que comparten el mismo tramo se apilan
   en un bloque y los tramos que se solapan se abren en columnas.
   También hay vista de lista para revisar y gestionar turnos.
   ============================================================ */

type Subvista = { modo: 'lista' } | { modo: 'alta' } | { modo: 'editar'; horario: Horario };

/** Altura en px de cada hora del calendario */
const ALTO_HORA = 72;

/** Icono y colores por especialidad (tonos suaves); gris para las demás */
const ESPECIALIDAD: Record<string, { icono: LucideIcon; chip: string; acento: string }> = {
  Odontología: { icono: Stethoscope, chip: 'bg-brand-50 text-brand-700', acento: 'border-l-brand-600' },
  'Medicina general': { icono: HeartPulse, chip: 'bg-blue-50 text-blue-600', acento: 'border-l-blue-500' },
  Enfermería: { icono: Syringe, chip: 'bg-emerald-50 text-emerald-600', acento: 'border-l-emerald-500' },
};

const especialidadDe = (especialidad: string) =>
  ESPECIALIDAD[especialidad] ?? {
    icono: Stethoscope,
    chip: 'bg-gray-50 text-gray-600',
    acento: 'border-l-gray-400',
  };

/** Rejilla de fondo: una línea por hora */
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
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [personal, setPersonal] = useState<PersonalMedico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [subvista, setSubvista] = useState<Subvista>({ modo: 'lista' });
  /** Turno pendiente de borrado (espera confirmación en el modal) */
  const [pendiente, setPendiente] = useState<Horario | null>(null);
  /** Resultado visible de la última acción (modal de confirmación) */
  const [resultado, setResultado] = useState<{
    titulo: string;
    mensaje: string;
    tipo: 'exito' | 'error';
  } | null>(null);
  const [modoVista, setModoVista] = useState<'calendario' | 'lista'>('calendario');
  const { aviso, tipo, mostrar, cerrar } = useAviso();

  /* ---------- Carga desde la API ---------- */
  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      // Turnos y personal juntos: el calendario y los formularios necesitan
      // ambos, y así la vista se muestra completa de una sola vez
      const [lista, listaPersonal] = await Promise.all([
        listarHorarios(),
        listarPersonalMedico(),
      ]);
      setHorarios(lista);
      setPersonal(listaPersonal);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* ---------- Guardado (alta múltiple / edición) ---------- */
  const guardarHorario = async (datos: DatosHorarios | DatosHorario) => {
    setGuardando(true);
    try {
      if (subvista.modo === 'editar') {
        const turno = await actualizarHorario(
          subvista.horario.id,
          datos as DatosHorario,
        );
        setHorarios((prev) =>
          prev
            .map((h) => (h.id === turno.id ? turno : h))
            .sort((a, b) => a.diaSemana - b.diaSemana || aMinutos(a.horaInicio) - aMinutos(b.horaInicio)),
        );
        mostrar(`Turno de ${turno.personal} actualizado (${nombreDeDia(turno.diaSemana)}).`);
      } else {
        const creados = await crearHorarios(datos as DatosHorarios);
        setHorarios((prev) =>
          [...prev, ...creados].sort(
            (a, b) => a.diaSemana - b.diaSemana || aMinutos(a.horaInicio) - aMinutos(b.horaInicio),
          ),
        );
        mostrar(
          creados.length === 1
            ? `Turno de ${creados[0].personal} creado para ${nombreDeDia(creados[0].diaSemana)}.`
            : `${creados.length} turnos creados para ${creados[0].personal}: ${creados
                .map((h) => nombreDeDia(h.diaSemana))
                .join(', ')}.`,
        );
      }
      setSubvista({ modo: 'lista' });
    } catch (error) {
      // El formulario pinta el error en su campo o como resumen
      throw error;
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Borrado (tras confirmar en el modal) ---------- */
  const ejecutarPendiente = async () => {
    if (!pendiente) return;
    setGuardando(true);
    try {
      await eliminarHorario(pendiente.id);
      setHorarios((prev) => prev.filter((h) => h.id !== pendiente.id));
      setResultado({
        titulo: 'Turno eliminado',
        mensaje: `El turno de ${pendiente.personal} (${nombreDeDia(
          pendiente.diaSemana,
        )} de ${pendiente.horaInicio} a ${pendiente.horaFin}) ya no aparece en el calendario.`,
        tipo: 'exito',
      });
      setPendiente(null);
      setSubvista({ modo: 'lista' });
    } catch (e) {
      mostrar(mensajeDeError(e), 'error');
      setPendiente(null);
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Indicadores y orden (hooks siempre antes de los return tempranos) ---------- */
  const horasSemanales = useMemo(
    () =>
      horarios.reduce((total, h) => total + (aMinutos(h.horaFin) - aMinutos(h.horaInicio)) / 60, 0),
    [horarios],
  );
  const personalConHorario = useMemo(
    () => new Set(horarios.map((h) => h.personalMedicoId)).size,
    [horarios],
  );
  const especialidades = useMemo(
    () =>
      Array.from(new Set(horarios.map((h) => h.especialidad))).sort((a, b) =>
        a.localeCompare(b, 'es'),
      ),
    [horarios],
  );
  const horariosOrdenados = useMemo(
    () =>
      [...horarios].sort(
        (a, b) =>
          a.diaSemana - b.diaSemana ||
          aMinutos(a.horaInicio) - aMinutos(b.horaInicio) ||
          a.personal.localeCompare(b.personal, 'es'),
      ),
    [horarios],
  );

  /* ---------- Subpáginas (alta / edición) ---------- */
  /** Confirmación de borrado: se muestra también sobre el formulario de edición */
  const modalBorrado = pendiente ? (
    <Modal
      titulo={`¿Eliminar el turno de ${pendiente.personal}?`}
      descripcion={`El ${nombreDeDia(pendiente.diaSemana).toLowerCase()} de ${
        pendiente.horaInicio
      } a ${pendiente.horaFin} dejará de aparecer en el calendario.`}
      icono={CircleAlert}
      onCerrar={() => setPendiente(null)}
      acciones={
        <>
          <Button variant="secondary" onClick={() => setPendiente(null)} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            icon={Trash2}
            loading={guardando}
            onClick={() => void ejecutarPendiente()}
          >
            Eliminar turno
          </Button>
        </>
      }
    >
      <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
        Si solo cambiaron las horas o el día, edita el turno en lugar de eliminarlo.
      </p>
    </Modal>
  ) : null;

  /** Confirmación visible de la última acción (se muestra en ambas vistas) */
  const modalResultado = resultado ? (
    <ModalResultado
      titulo={resultado.titulo}
      mensaje={resultado.mensaje}
      tipo={resultado.tipo}
      onCerrar={() => setResultado(null)}
    />
  ) : null;

  if (subvista.modo !== 'lista') {
    return (
      <>
        <HorarioForm
          modo={subvista.modo}
          horario={subvista.modo === 'editar' ? subvista.horario : undefined}
          personal={personal}
          horarios={horarios}
          guardando={guardando}
          onCancelar={() => setSubvista({ modo: 'lista' })}
          onGuardar={guardarHorario}
          onEliminar={
            subvista.modo === 'editar'
              ? () => setPendiente(subvista.horario)
              : undefined
          }
        />
        {modalBorrado}
        {modalResultado}
      </>
    );
  }

  /* ---------- Semana actual (lunes a viernes) ---------- */
  const hoy = new Date();
  const indiceHoy = (hoy.getDay() + 6) % 7; // 0 = Lunes
  const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - indiceHoy);
  const fechasSemana = DIAS_SEMANA.map((_, i) => {
    const fecha = new Date(lunes);
    fecha.setDate(lunes.getDate() + i);
    return fecha;
  });

  /* ---------- Rango del calendario (según los turnos) ---------- */
  const minutosInicio = horarios.length
    ? Math.min(...horarios.map((h) => aMinutos(h.horaInicio)))
    : 8 * 60;
  const minutosFin = horarios.length
    ? Math.max(...horarios.map((h) => aMinutos(h.horaFin)))
    : 18 * 60;
  const horaInicio = Math.floor(minutosInicio / 60);
  const horaFin = Math.ceil(minutosFin / 60);
  const filas = Math.max(1, horaFin - horaInicio);
  const altoTotal = filas * ALTO_HORA;

  const ahoraMinutos = hoy.getHours() * 60 + hoy.getMinutes();
  const verAhora = ahoraMinutos >= horaInicio * 60 && ahoraMinutos <= horaFin * 60;

  /**
   * Bloques de un día: un bloque por turno. Las personas con el mismo
   * tramo exacto (turnos simultáneos) comparten bloque apiladas y los
   * tramos que se solapan se reparten en columnas.
   */
  const bloquesDelDia = (diaSemana: number): Bloque[] => {
    const delDia = horarios
      .filter((h) => h.diaSemana === diaSemana)
      .sort((a, b) => aMinutos(a.horaInicio) - aMinutos(b.horaInicio));

    // 1) Agrupar por tramo exacto: aquí van juntos los turnos simultáneos
    const grupos = new Map<string, { inicio: number; fin: number; personas: PersonaBloque[] }>();
    delDia.forEach((horario) => {
      const inicio = aMinutos(horario.horaInicio);
      const fin = aMinutos(horario.horaFin);
      const clave = `${inicio}-${fin}`;
      const grupo = grupos.get(clave);
      const persona: PersonaBloque = {
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

  /* ---------- Vista de lista ---------- */
  const columnas: Column<Horario>[] = [
    {
      key: 'dia',
      header: 'Día',
      className: 'w-36',
      render: (horario) => (
        <span className="font-semibold text-gray-900">{nombreDeDia(horario.diaSemana)}</span>
      ),
    },
    {
      key: 'personal',
      header: 'Personal',
      render: (horario) => (
        <div>
          <p className="font-semibold text-gray-900">{horario.personal}</p>
          <p className="text-sm text-gray-500">{horario.especialidad}</p>
        </div>
      ),
    },
    {
      key: 'horario',
      header: 'Horario',
      className: 'w-44 tabular-nums',
      render: (horario) => `${horario.horaInicio} – ${horario.horaFin}`,
    },
    {
      key: 'duracion',
      header: 'Duración',
      align: 'right',
      className: 'w-32 tabular-nums',
      render: (horario) =>
        `${((aMinutos(horario.horaFin) - aMinutos(horario.horaInicio)) / 60).toFixed(1)} h`,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'right',
      className: 'w-32',
      render: (horario) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon={Pencil}
            label={`Editar turno de ${horario.personal} el ${nombreDeDia(horario.diaSemana)}`}
            onClick={() => setSubvista({ modo: 'editar', horario })}
          />
          <IconButton
            icon={Trash2}
            label={`Eliminar turno de ${horario.personal} el ${nombreDeDia(horario.diaSemana)}`}
            tone="danger"
            onClick={() => setPendiente(horario)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="p-10 xl:p-12 max-w-7xl mx-auto font-sans">
      <PageHeader
        title="Horarios"
        subtitle="Disponibilidad semanal del personal médico · lunes a viernes"
        meta={
          <Button icon={Plus} onClick={() => setSubvista({ modo: 'alta' })}>
            Nuevo horario
          </Button>
        }
      />

      {aviso && <Aviso mensaje={aviso} tipo={tipo} onCerrar={cerrar} />}

      <EstadoVista cargando={cargando} error={error} onReintentar={() => void cargar()}>
        {horarios.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200">
            <EmptyState
              icon={Clock}
              title="Sin turnos registrados"
              description="Crea el primer turno del personal para verlo en el calendario semanal."
              action={
                <Button icon={Plus} onClick={() => setSubvista({ modo: 'alta' })}>
                  Nuevo horario
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {/* Indicadores de la semana */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard
                icon={Clock}
                label="Turnos programados"
                value={horarios.length}
                detail={`${nombreDeDia(1)} a ${nombreDeDia(5)}`}
              />
              <StatCard
                icon={Users}
                label="Personal con horario"
                value={personalConHorario}
                detail={
                  personalConHorario === 1
                    ? '1 persona con turnos asignados'
                    : `${personalConHorario} personas con turnos asignados`
                }
              />
              <StatCard
                icon={CalendarRange}
                label="Horas a la semana"
                value={horasSemanales % 1 === 0 ? horasSemanales : horasSemanales.toFixed(1)}
                detail="suma de todos los turnos"
              />
            </div>

            {/* Conmutador de vista: calendario o lista */}
            <div
              className="inline-flex rounded-full border border-gray-200 bg-white p-1 mb-6"
              role="group"
              aria-label="Vista de los horarios"
            >
              <button
                type="button"
                onClick={() => setModoVista('calendario')}
                aria-pressed={modoVista === 'calendario'}
                className={[
                  'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40',
                  modoVista === 'calendario'
                    ? 'bg-brand-800 text-white'
                    : 'text-gray-600 hover:bg-brand-50',
                ].join(' ')}
              >
                <CalendarRange size={16} aria-hidden="true" />
                Calendario
              </button>
              <button
                type="button"
                onClick={() => setModoVista('lista')}
                aria-pressed={modoVista === 'lista'}
                className={[
                  'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40',
                  modoVista === 'lista'
                    ? 'bg-brand-800 text-white'
                    : 'text-gray-600 hover:bg-brand-50',
                ].join(' ')}
              >
                <List size={16} aria-hidden="true" />
                Lista
              </button>
            </div>

            {modoVista === 'lista' ? (
              <>
                <DataTable
                  columns={columnas}
                  rows={horariosOrdenados}
                  rowKey={(horario) => horario.id}
                  emptyMessage="No hay turnos registrados."
                />
                <p className="text-sm text-gray-500 mt-4 px-1">
                  {horariosOrdenados.length} turnos esta semana
                </p>
              </>
            ) : (
              /* ============ CALENDARIO SEMANAL (L-V) ============ */
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Encabezado + leyenda */}
                <div className="px-7 py-5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight text-gray-900">
                      Calendario semanal
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 tabular-nums">
                      {horarios.length} turnos · de {hhmm(horaInicio * 60)} a {hhmm(horaFin * 60)} ·{' '}
                      {fechasSemana[0].getDate()}–{fechasSemana[4].getDate()} de{' '}
                      {fechasSemana[4].toLocaleDateString('es-MX', { month: 'long' })}
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
                          <span
                            className={`w-6 h-6 rounded-md flex items-center justify-center ${chip}`}
                          >
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
                  <div className="min-w-[880px] px-6 pt-5 pb-6">
                    {/* Nombres de los días */}
                    <div className="flex pl-20 pb-3">
                      {DIAS_SEMANA.map((dia, i) => {
                        const esHoy = i === indiceHoy;
                        return (
                          <div key={dia} className="flex-1 flex justify-center">
                            <span
                              className={[
                                'inline-flex flex-col items-center px-5 py-1.5 rounded-full',
                                esHoy ? 'bg-brand-800 text-white' : 'text-gray-600',
                              ].join(' ')}
                            >
                              <span className="text-xs font-semibold">{dia}</span>
                              <span
                                className={`text-[11px] tabular-nums ${
                                  esHoy ? 'text-white/80' : 'text-gray-400'
                                }`}
                              >
                                {esHoy ? 'hoy · ' : ''}
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
                      <div className="flex-1 grid grid-cols-5">
                        {DIAS_SEMANA.map((dia, iDia) => {
                          const esHoy = iDia === indiceHoy;
                          const bloques = bloquesDelDia(iDia + 1);

                          return (
                            <div
                              key={dia}
                              className={[
                                'relative border-r border-gray-100 last:border-r-0',
                                esHoy ? 'bg-brand-50/60' : '',
                              ].join(' ')}
                              style={{ height: altoTotal, ...ESTILO_REJILLA }}
                            >
                              {/* Bloques de turno */}
                              {bloques.map((bloque) => (
                                <div
                                  key={`${bloque.inicio}-${bloque.lane}`}
                                  className={[
                                    'absolute rounded-lg border border-gray-200 bg-white overflow-hidden transition-shadow',
                                    'hover:shadow-md hover:border-brand-300',
                                    bloque.personas.length === 1
                                      ? especialidadDe(bloque.personas[0].especialidad).acento
                                      : 'border-l-gray-400',
                                    'border-l-4',
                                  ].join(' ')}
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
                                        const { icono: Icono, chip } = especialidadDe(
                                          persona.especialidad,
                                        );
                                        return (
                                          <button
                                            key={persona.id}
                                            type="button"
                                            onClick={() =>
                                              setSubvista({ modo: 'editar', horario: persona.horario })
                                            }
                                            title={`${persona.nombre} · ${persona.especialidad} · ${hhmm(
                                              bloque.inicio,
                                            )}–${hhmm(bloque.fin)} · clic para editar`}
                                            aria-label={`Editar turno de ${persona.nombre}, ${nombreDeDia(
                                              persona.horario.diaSemana,
                                            )} de ${hhmm(bloque.inicio)} a ${hhmm(bloque.fin)}`}
                                            className={[
                                              'flex items-center gap-2 px-2 py-1.5 min-w-0 text-left',
                                              'hover:bg-brand-50/60 transition-colors',
                                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-inset',
                                              i > 0 ? 'border-t border-gray-100' : '',
                                            ].join(' ')}
                                          >
                                            <span
                                              className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${chip}`}
                                            >
                                              <Icono size={14} />
                                            </span>
                                            <span className="min-w-0">
                                              <span className="block text-xs font-semibold text-gray-900 truncate leading-tight">
                                                {persona.nombre}
                                              </span>
                                              {bloque.alto >= 60 && (
                                                <span className="block text-[11px] text-gray-400 tabular-nums truncate leading-tight">
                                                  {hhmm(bloque.inicio)}–{hhmm(bloque.fin)}
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
                                  style={{
                                    top: ((ahoraMinutos - horaInicio * 60) / 60) * ALTO_HORA,
                                  }}
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
                  Cada turno es un bloque continuo · los turnos simultáneos se apilan · clic en una
                  persona para editar su turno.
                </div>
              </div>
            )}
          </>
        )}
      </EstadoVista>

      {/* Confirmación de borrado del turno */}
      {modalBorrado}

      {/* Confirmación visible de la última acción */}
      {modalResultado}
    </div>
  );
}
