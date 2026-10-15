import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, ClipboardPlus, Clock, Stethoscope, Users } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import DataTable from '../ui/DataTable';
import EstadoVista from '../ui/EstadoVista';
import StatCard from '../ui/StatCard';
import type { Column } from '../ui/DataTable';
import { mensajeDeError } from '../../services/api';
import {
  listarCitas,
  listarConsultas,
  hoyISO,
  fechaCorta,
  type Cita,
  type ConsultaResumen,
} from '../../services/atencion.service';

/* ============================================================
   INICIO (DOCTOR) · Resumen del día: citas, consultas y últimas
   atenciones registradas.
   ============================================================ */

export interface ResumenDoctorProps {
  onNuevaConsulta: () => void;
}

export default function ResumenDoctor({ onNuevaConsulta }: ResumenDoctorProps) {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [consultas, setConsultas] = useState<ConsultaResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [listaCitas, listaConsultas] = await Promise.all([
        listarCitas({ fecha: hoyISO() }),
        listarConsultas(),
      ]);
      setCitas(listaCitas);
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

  /* ---- Indicadores del día ---- */
  const hoy = hoyISO();
  const consultasHoy = useMemo(
    () => consultas.filter((consulta) => consulta.fechaHora.startsWith(hoy)),
    [consultas, hoy],
  );
  const porAtender = citas.filter(
    (cita) => cita.estatus === 'Pendiente' || cita.estatus === 'Confirmada',
  ).length;
  const pacientesUnicos = new Set(consultasHoy.map((consulta) => consulta.paciente.id)).size;

  const columnas: Column<ConsultaResumen>[] = [
    {
      key: 'fecha',
      header: 'Fecha',
      className: 'w-40',
      render: (consulta) => (
        <div>
          <p className="text-gray-900">{fechaCorta(consulta.cita.fecha)}</p>
          <p className="text-sm text-gray-500 tabular-nums">{consulta.cita.hora}</p>
        </div>
      ),
    },
    {
      key: 'paciente',
      header: 'Paciente',
      render: (consulta) => (
        <div>
          <p className="font-semibold text-gray-900">{consulta.paciente.nombre}</p>
          <p className="text-sm text-gray-500 tabular-nums">{consulta.paciente.numeroControl}</p>
        </div>
      ),
    },
    { key: 'diagnostico', header: 'Diagnóstico' },
    {
      key: 'tipo',
      header: 'Tipo de cita',
      className: 'w-40',
      render: (consulta) => <Badge status="scheduled">{consulta.cita.tipo}</Badge>,
    },
  ];

  return (
    <div className="p-10 xl:p-12 max-w-7xl mx-auto font-sans">
      <PageHeader
        title="Inicio"
        subtitle="Resumen de la jornada"
        meta={
          <Button icon={Stethoscope} onClick={onNuevaConsulta}>
            Nueva consulta
          </Button>
        }
      />

      <EstadoVista cargando={cargando} error={error} onReintentar={() => void cargar()}>
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              icon={CalendarClock}
              label="Citas de hoy"
              value={citas.length}
              detail={
                porAtender > 0 ? `${porAtender} por atender` : 'agenda al corriente'
              }
              highlight={porAtender > 0}
            />
            <StatCard
              icon={ClipboardPlus}
              label="Consultas de hoy"
              value={consultasHoy.length}
              detail={`${pacientesUnicos} paciente(s) atendido(s)`}
            />
            <StatCard
              icon={Users}
              label="Consultas registradas"
              value={consultas.length}
              detail="historial total de la clínica"
            />
          </div>

          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-gray-400" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-gray-900">Últimas consultas</h2>
          </div>

          <DataTable
            columns={columnas}
            rows={consultas.slice(0, 6)}
            rowKey={(consulta) => consulta.id}
            emptyMessage="Todavía no hay consultas registradas."
          />
        </>
      </EstadoVista>
    </div>
  );
}
