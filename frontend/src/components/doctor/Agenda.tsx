import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, CircleAlert, Stethoscope, XCircle, RefreshCw } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
import DataTable from '../ui/DataTable';
import EstadoVista from '../ui/EstadoVista';
import Modal from '../ui/Modal';
import type { Column } from '../ui/DataTable';
import { Input } from '../ui/Input';
import { mensajeDeError } from '../../services/api';
import {
  listarCitas,
  cambiarEstatusCita,
  hoyISO,
  type Cita,
} from '../../services/atencion.service';

/* ============================================================
   AGENDA DEL DOCTOR · Citas del día (agendadas y de atención
   directa) con la opción de atenderlas o cancelarlas.
   ============================================================ */

/** Colores del badge por estatus de la cita */
const ESTILOS_ESTATUS: Record<string, 'pending' | 'confirmed' | 'cancelled' | 'completed'> = {
  Pendiente: 'pending',
  Confirmada: 'confirmed',
  Cancelada: 'cancelled',
  Completada: 'completed',
};

const ESTILOS_TIPO: Record<string, 'confirmed' | 'scheduled' | 'neutral'> = {
  'Atención directa': 'confirmed',
  Programada: 'scheduled',
  Emergencia: 'neutral',
};

export interface AgendaProps {
  /** Lleva a Nueva consulta con la cita elegida */
  onAtender: (cita: Cita) => void;
}

export default function Agenda({ onAtender }: AgendaProps) {
  const [fecha, setFecha] = useState(hoyISO());
  const [citas, setCitas] = useState<Cita[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  /** Cita pendiente de cancelar (espera confirmación en el modal) */
  const [pendiente, setPendiente] = useState<Cita | null>(null);
  const { aviso, tipo, mostrar, cerrar } = useAviso();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setCitas(await listarCitas({ fecha }));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* ---------- Cancelación (tras confirmar en el modal) ---------- */
  const cancelarPendiente = async () => {
    if (!pendiente) return;
    setGuardando(true);
    try {
      const cita = await cambiarEstatusCita(pendiente.id, 'Cancelada');
      setCitas((prev) => prev.map((c) => (c.id === cita.id ? cita : c)));
      mostrar(`Cita de ${cita.paciente} cancelada.`);
      setPendiente(null);
    } catch (e) {
      mostrar(mensajeDeError(e), 'error');
      setPendiente(null);
    } finally {
      setGuardando(false);
    }
  };

  const citasOrdenadas = useMemo(
    () => [...citas].sort((a, b) => a.hora.localeCompare(b.hora)),
    [citas],
  );
  const porAtender = citas.filter(
    (cita) => cita.estatus === 'Pendiente' || cita.estatus === 'Confirmada',
  ).length;

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
      key: 'tipo',
      header: 'Tipo',
      className: 'w-40',
      render: (cita) => <Badge status={ESTILOS_TIPO[cita.tipo] ?? 'neutral'}>{cita.tipo}</Badge>,
    },
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
      className: 'w-48',
      render: (cita) => {
        const atendible = cita.estatus === 'Pendiente' || cita.estatus === 'Confirmada';
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              icon={Stethoscope}
              disabled={!atendible}
              onClick={() => onAtender(cita)}
            >
              Atender
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={XCircle}
              disabled={!atendible}
              onClick={() => setPendiente(cita)}
            >
              Cancelar
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-10 xl:p-12 max-w-7xl mx-auto font-sans">
      <PageHeader title="Agenda" subtitle="Citas del día y atenciones de llegada" />

      {aviso && <Aviso mensaje={aviso} tipo={tipo} onCerrar={cerrar} />}

      <EstadoVista cargando={cargando} error={error} onReintentar={() => void cargar()}>
        <>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="w-56">
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                aria-label="Fecha de la agenda"
              />
            </div>
            <Badge status="scheduled">{citas.length} citas</Badge>
            {porAtender > 0 && <Badge status="pending">{porAtender} por atender</Badge>}
            <Button variant="ghost" icon={RefreshCw} onClick={() => void cargar()}>
              Actualizar
            </Button>
          </div>

          <DataTable
            columns={columnas}
            rows={citasOrdenadas}
            rowKey={(cita) => cita.id}
            emptyMessage="No hay citas registradas para este día."
          />

          <p className="text-sm text-gray-500 mt-4 px-1">
            Las atenciones de llegada aparecen aquí como citas de tipo "Atención directa", creadas
            automáticamente al registrar una consulta.
          </p>
        </>
      </EstadoVista>

      {/* Confirmación de cancelación */}
      {pendiente && (
        <Modal
          titulo={`¿Cancelar la cita de ${pendiente.paciente}?`}
          descripcion={`Del ${pendiente.fecha} a las ${pendiente.hora} · ${pendiente.motivo}`}
          icono={CircleAlert}
          onCerrar={() => setPendiente(null)}
          acciones={
            <>
              <Button variant="secondary" onClick={() => setPendiente(null)} disabled={guardando}>
                Volver
              </Button>
              <Button
                variant="danger"
                icon={XCircle}
                loading={guardando}
                onClick={() => void cancelarPendiente()}
              >
                Sí, cancelar
              </Button>
            </>
          }
        >
          <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            La cita quedará registrada como cancelada y no se podrá atender.
          </p>
        </Modal>
      )}
    </div>
  );
}
