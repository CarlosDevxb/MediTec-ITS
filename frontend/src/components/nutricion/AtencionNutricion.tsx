import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Stethoscope, CalendarClock, CircleAlert, Loader2, ArrowLeft } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import DataTable from '../ui/DataTable';
import EstadoVista from '../ui/EstadoVista';
import type { Column } from '../ui/DataTable';
import { mensajeDeError } from '../../services/api';
import { obtenerPerfil } from '../../services/auth.service';
import {
  listarCitas,
  hoyISO,
  type Cita,
} from '../../services/atencion.service';
import Atencion from '../atencion/Atencion';

/* ============================================================
   ATENCIÓN (NUTRICIÓN) · Sesiones mediante cita agendada
   Si no hay cita elegida, se listan las citas del día para
   seleccionar cuál atender; la sesión se registra ligada a ella
   (nutrición no tiene atención de llegada).
   ============================================================ */

const ESTILOS_ESTATUS: Record<string, 'pending' | 'confirmed' | 'cancelled' | 'completed'> = {
  Pendiente: 'pending',
  Confirmada: 'confirmed',
  Cancelada: 'cancelled',
  Completada: 'completed',
};

export interface AtencionNutricionProps {
  /** Cita elegida desde la agenda (si no, se elige aquí) */
  citaInicial?: Cita | null;
  /** Registra la cita elegida en el panel (pasa a mostrar el formulario) */
  onAtenderCita: (cita: Cita) => void;
  /** Limpia la cita elegida (para volver a la lista de citas) */
  onElegirOtra: () => void;
  onVerAgenda: () => void;
}

export default function AtencionNutricion({
  citaInicial = null,
  onAtenderCita,
  onElegirOtra,
  onVerAgenda,
}: AtencionNutricionProps) {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [perfil, lista] = await Promise.all([
        obtenerPerfil().catch(() => null),
        listarCitas({ fecha: hoyISO() }),
      ]);
      setCitas(
        perfil?.personalMedicoId
          ? lista.filter((cita) => cita.personalMedicoId === perfil.personalMedicoId)
          : lista,
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

  const porAtender = useMemo(
    () => citas.filter((cita) => cita.estatus === 'Pendiente' || cita.estatus === 'Confirmada'),
    [citas],
  );

  /* Con cita elegida, se abre el formulario de sesión compartido */
  if (citaInicial) {
    return (
      <div>
        <div className="px-10 xl:px-12 max-w-7xl mx-auto">
          <Button variant="ghost" icon={ArrowLeft} onClick={onElegirOtra}>
            Elegir otra cita
          </Button>
        </div>
        <Atencion rol="nutricion" citaInicial={citaInicial} />
      </div>
    );
  }

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
        <Button size="sm" icon={Stethoscope} onClick={() => onAtenderCita(cita)}>
          Atender
        </Button>
      ),
    },
  ];

  return (
    <div className="entrada p-10 xl:p-12 max-w-7xl mx-auto font-sans">
      <PageHeader
        title="Atención"
        subtitle="Sesiones de nutrición mediante cita agendada"
        meta={
          <Button variant="secondary" icon={CalendarClock} onClick={onVerAgenda}>
            Ver agenda
          </Button>
        }
      />

      <EstadoVista cargando={cargando} error={error} onReintentar={() => void cargar()}>
        {porAtender.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200">
            <div
              className="flex flex-col items-center gap-3 py-16 text-center"
              role="status"
            >
              {cargando ? (
                <Loader2 size={28} className="animate-spin text-brand-600" aria-hidden="true" />
              ) : (
                <CircleAlert size={28} className="text-amber-500" aria-hidden="true" />
              )}
              <p className="text-lg font-semibold text-gray-900">
                No hay citas por atender hoy
              </p>
              <p className="text-gray-500 max-w-md">
                Las sesiones de nutrición se registran atendiendo una cita. Agenda una cita
                desde la sección Agenda y aparecerá aquí para atenderla.
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {porAtender.length} cita(s) por atender hoy. Elige la que vas a atender para
              registrar la sesión.
            </p>
            <DataTable
              columns={columnas}
              rows={porAtender}
              rowKey={(cita) => cita.id}
              emptyMessage="No hay citas por atender hoy."
            />
          </>
        )}
      </EstadoVista>
    </div>
  );
}
