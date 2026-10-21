import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  FileText,
  ClipboardCheck,
  RefreshCw,
  CircleAlert,
} from 'lucide-react';
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
  fechaCorta,
  type Cita,
  type ConsultaResumen,
  type ExpedientePaciente,
  type PlanAlimenticio,
} from '../../services/atencion.service';

/* ============================================================
   INICIO (PACIENTE) · Saludo con su nombre, sus próximas citas
   y accesos a su expediente y a su plan alimenticio.
   ============================================================ */

const ESTILOS_ESTATUS: Record<string, 'pending' | 'confirmed' | 'cancelled' | 'completed'> = {
  Pendiente: 'pending',
  Confirmada: 'confirmed',
  Cancelada: 'cancelled',
  Completada: 'completed',
};

export interface InicioPacienteProps {
  expediente: ExpedientePaciente;
  onVerCitas: () => void;
  onVerExpediente: () => void;
  onVerPlan: () => void;
}

export default function InicioPaciente({
  expediente,
  onVerCitas,
  onVerExpediente,
  onVerPlan,
}: InicioPacienteProps) {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [planes, setPlanes] = useState<PlanAlimenticio[]>([]);
  const [consultas, setConsultas] = useState<ConsultaResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [nombre, setNombre] = useState(() => obtenerSesion()?.usuario.nombre ?? '');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [perfil, lista, listaPlanes, listaConsultas] = await Promise.all([
        obtenerPerfil().catch(() => null),
        listarCitas(),
        listarPlanes(),
        listarConsultas(),
      ]);
      if (perfil?.nombre) setNombre(perfil.nombre);
      setCitas(lista);
      setPlanes(listaPlanes);
      setConsultas(listaConsultas);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* ---- Resumen del paciente (solo lo suyo) ---- */
  const hoy = hoyISO();
  const proximas = useMemo(
    () =>
      citas
        .filter((cita) => cita.fecha >= hoy && cita.estatus !== 'Cancelada')
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora)),
    [citas, hoy],
  );
  const pendientes = useMemo(
    () => citas.filter((cita) => cita.estatus === 'Pendiente'),
    [citas],
  );
  const planVigente = useMemo(
    () => planes.find((plan) => plan.estatus === 'Vigente') ?? planes[0] ?? null,
    [planes],
  );

  const columnas: Column<Cita>[] = [
    {
      key: 'fecha',
      header: 'Fecha',
      className: 'w-52',
      render: (cita) => (
        <div>
          <p className="text-gray-900">{fechaCorta(cita.fecha)}</p>
          <p className="text-sm text-gray-500 tabular-nums">{cita.hora}</p>
        </div>
      ),
    },
    {
      key: 'personal',
      header: 'Con',
      className: 'w-56',
      render: (cita) => (
        <div>
          <p className="text-gray-800">{cita.personal}</p>
          <p className="text-sm text-gray-500">{cita.especialidad}</p>
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
  ];

  return (
    <div className="entrada p-10 xl:p-12 max-w-7xl mx-auto font-sans">
      {/* Saludo del paciente */}
      <SaludoInicio
        nombre={nombre}
        especialidad={`Expediente ${expediente.numeroControl}`}
        acciones={
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" icon={FileText} onClick={onVerExpediente}>
              Mi expediente
            </Button>
            <Button icon={CalendarClock} onClick={onVerCitas}>
              Mis citas
            </Button>
          </div>
        }
      />

      <EstadoVista cargando={cargando} error={error} onReintentar={() => void cargar()}>
        <>
          {/* Aviso de citas pendientes de confirmar */}
          {pendientes.length > 0 && (
            <div
              role="status"
              className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4"
            >
              <p className="flex items-center gap-2.5 text-amber-900 font-medium">
                <CircleAlert size={18} className="shrink-0" aria-hidden="true" />
                Tienes {pendientes.length} cita(s) por confirmar: el especialista las revisará
                pronto.
              </p>
              <Button size="sm" icon={CalendarClock} onClick={onVerCitas}>
                Ver mis citas
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              icon={CalendarClock}
              label="Próximas citas"
              value={proximas.length}
              detail="programadas y por confirmar"
            />
            <StatCard
              icon={ClipboardCheck}
              label="Mi plan alimenticio"
              value={planVigente ? `${planVigente.caloriasDiarias} kcal` : '—'}
              detail={
                planVigente
                  ? `del ${fechaCorta(planVigente.fechaInicio)} al ${fechaCorta(planVigente.fechaFin)}`
                  : 'aún sin plan asignado'
              }
            />
            <StatCard
              icon={FileText}
              label="Consultas registradas"
              value={consultas.length}
              detail="en tu expediente médico"
            />
          </div>

          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Mis próximas citas</h2>
            <Button variant="ghost" icon={RefreshCw} onClick={() => void cargar()}>
              Actualizar
            </Button>
          </div>

          <DataTable
            columns={columnas}
            rows={proximas.slice(0, 5)}
            rowKey={(cita) => cita.id}
            emptyMessage="No tienes citas próximas. Agenda una desde la sección Mis citas."
          />

          <div className="flex flex-wrap gap-4 mt-8">
            <Button variant="secondary" icon={ClipboardCheck} onClick={onVerPlan}>
              Ver mi plan alimenticio
            </Button>
            <Button variant="secondary" icon={FileText} onClick={onVerExpediente}>
              Ver mi expediente
            </Button>
          </div>
        </>
      </EstadoVista>
    </div>
  );
}
