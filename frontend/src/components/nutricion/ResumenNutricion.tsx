import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, ClipboardCheck, Stethoscope, RefreshCw, CircleAlert } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import DataTable from '../ui/DataTable';
import EstadoVista from '../ui/EstadoVista';
import StatCard from '../ui/StatCard';
import SaludoInicio from '../layout/SaludoInicio';
import type { Column } from '../ui/DataTable';
import { mensajeDeError } from '../../services/api';
import { obtenerSesion } from '../../services/sesion';
import { obtenerPerfil } from '../../services/auth.service';
import {
  listarCitas,
  listarPlanes,
  listarConsultas,
  hoyISO,
  type Cita,
  type PlanAlimenticio,
  type ConsultaResumen,
} from '../../services/atencion.service';

/* ============================================================
   INICIO (NUTRICIÓN) · Saludo por hora del día con el nombre y
   la especialidad, indicadores del trabajo (citas del día, planes
   vigentes, sesiones del mes) y las próximas citas.
   ============================================================ */

export interface ResumenNutricionProps {
  onNuevaCita: () => void;
  onVerAgenda: () => void;
  onVerPacientes: () => void;
}

const ESTILOS_ESTATUS: Record<string, 'pending' | 'confirmed' | 'cancelled' | 'completed'> = {
  Pendiente: 'pending',
  Confirmada: 'confirmed',
  Cancelada: 'cancelled',
  Completada: 'completed',
};

export default function ResumenNutricion({
  onNuevaCita,
  onVerAgenda,
  onVerPacientes,
}: ResumenNutricionProps) {
  const [todasLasCitas, setTodasLasCitas] = useState<Cita[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [planes, setPlanes] = useState<PlanAlimenticio[]>([]);
  const [sesiones, setSesiones] = useState<ConsultaResumen[]>([]);
  /** Nombre y especialidad del personal en sesión */
  const [nombre, setNombre] = useState(() => obtenerSesion()?.usuario.nombre ?? 'Nutrición');
  const [especialidad, setEspecialidad] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [perfil, todasCitas, planesHoy, consultas] = await Promise.all([
        obtenerPerfil().catch(() => null),
        listarCitas(),
        listarPlanes(),
        listarConsultas(),
      ]);
      const miFicha = perfil?.personalMedicoId ?? null;
      if (perfil) {
        setNombre(perfil.nombre);
        setEspecialidad(perfil.especialidad ?? '');
      }
      // Solo lo propio: mi agenda, mis planes y mis sesiones
      const misCitas = miFicha
        ? todasCitas.filter((cita) => cita.personalMedicoId === miFicha)
        : todasCitas;
      setTodasLasCitas(misCitas);
      setCitas(misCitas.filter((cita) => cita.fecha === hoyISO()));
      setPlanes(
        miFicha ? planesHoy.filter((plan) => plan.personalMedicoId === miFicha) : planesHoy,
      );
      setSesiones(
        consultas.filter(
          (consulta) =>
            consulta.tipo === 'Nutrición' && (!miFicha || consulta.personal.id === miFicha),
        ),
      );
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const hoy = hoyISO();
  const sesionesMes = useMemo(
    () => sesiones.filter((sesion) => sesion.fechaHora.startsWith(hoy.slice(0, 7))),
    [sesiones, hoy],
  );
  const planesVigentes = useMemo(
    () => planes.filter((plan) => plan.estatus === 'Vigente'),
    [planes],
  );
  /** Citas pendientes de confirmar (las que agendó enfermería para ella) */
  const pendientes = useMemo(
    () => todasLasCitas.filter((cita) => cita.estatus === 'Pendiente'),
    [todasLasCitas],
  );

  const columnas: Column<Cita>[] = [
    { key: 'hora', header: 'Hora', className: 'w-24 tabular-nums' },
    {
      key: 'paciente',
      header: 'Paciente',
      render: (cita) => (
        <div>
          <p className="font-semibold text-gray-900">{cita.paciente}</p>
          <p className="text-sm text-gray-500 tabular-nums">{cita.numeroControl}</p>
        </div>
      ),
    },
    { key: 'motivo', header: 'Motivo' },
    {
      key: 'estatus',
      header: 'Estatus',
      className: 'w-36',
      render: (cita) => (
        <Badge status={ESTILOS_ESTATUS[cita.estatus] ?? 'neutral'}>{cita.estatus}</Badge>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'right',
      className: 'w-32',
      render: (cita) => (
        <Button
          size="sm"
          icon={Stethoscope}
          disabled={cita.estatus !== 'Pendiente' && cita.estatus !== 'Confirmada'}
          onClick={onVerAgenda}
        >
          Atender
        </Button>
      ),
    },
  ];

  return (
    <div className="entrada p-10 xl:p-12 max-w-7xl mx-auto font-sans">
      {/* Saludo + identidad del personal (componente compartido) */}
      <SaludoInicio
        nombre={nombre}
        especialidad={especialidad || 'Nutrición'}
        acciones={
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" icon={ClipboardCheck} onClick={onVerPacientes}>
              Planes
            </Button>
            <Button icon={CalendarClock} onClick={onNuevaCita}>
              Nueva cita
            </Button>
          </div>
        }
      />

      <EstadoVista cargando={cargando} error={error} onReintentar={() => void cargar()}>
        <>
          {/* Notificación: citas pendientes de confirmar al entrar al panel */}
          {pendientes.length > 0 && (
            <div
              role="status"
              className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4"
            >
              <p className="flex items-center gap-2.5 text-amber-900 font-medium">
                <CircleAlert size={18} className="shrink-0" aria-hidden="true" />
                Tienes {pendientes.length} cita(s) pendientes de confirmar
                {pendientes.some((cita) => cita.fecha !== hoy) ? ' (incluidas de otros días)' : ''}.
              </p>
              <Button size="sm" icon={CalendarClock} onClick={onVerAgenda}>
                Revisar en la agenda
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              icon={CalendarClock}
              label="Citas de hoy"
              value={citas.length}
              detail="sesiones programadas en tu agenda"
            />
            <StatCard
              icon={ClipboardCheck}
              label="Planes vigentes"
              value={planesVigentes.length}
              detail={`${planes.length} planes en total`}
            />
            <StatCard
              icon={Stethoscope}
              label="Sesiones este mes"
              value={sesionesMes.length}
              detail={`${sesiones.length} sesiones registradas`}
            />
          </div>

          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Citas de hoy</h2>
            <Button variant="ghost" icon={RefreshCw} onClick={() => void cargar()}>
              Actualizar
            </Button>
          </div>

          <DataTable
            columns={columnas}
            rows={citas}
            rowKey={(cita) => cita.id}
            emptyMessage="No hay citas programadas para hoy."
          />
        </>
      </EstadoVista>
    </div>
  );
}
