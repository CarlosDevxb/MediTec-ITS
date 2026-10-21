import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Users, Clock, UserPlus, Stethoscope } from 'lucide-react';
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
  listarPacientes,
  hoyISO,
  type Cita,
} from '../../services/atencion.service';

/* ============================================================
   INICIO (ENFERMERÍA) · Resumen de la jornada: agenda del día,
   pacientes registrados y citas por confirmar.
   ============================================================ */

const ESTILOS_ESTATUS: Record<string, 'pending' | 'confirmed' | 'cancelled' | 'completed'> = {
  Pendiente: 'pending',
  Confirmada: 'confirmed',
  Cancelada: 'cancelled',
  Completada: 'completed',
};

export interface ResumenEnfermeriaProps {
  onNuevaConsulta: () => void;
  onNuevaCita: () => void;
  onNuevoPaciente: () => void;
}

export default function ResumenEnfermeria({ onNuevaCita, onNuevoPaciente, onNuevaConsulta }: ResumenEnfermeriaProps) {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [totalPacientes, setTotalPacientes] = useState(0);
  /** Nombre y especialidad del personal en sesión */
  const [nombre, setNombre] = useState(() => obtenerSesion()?.usuario.nombre ?? 'Enfermería');
  const [especialidad, setEspecialidad] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [listaCitas, pacientes, perfil] = await Promise.all([
        listarCitas({ fecha: hoyISO() }),
        listarPacientes(),
        obtenerPerfil().catch(() => null),
      ]);
      setCitas(listaCitas);
      setTotalPacientes(pacientes.length);
      if (perfil) {
        setNombre(perfil.nombre);
        setEspecialidad(perfil.especialidad ?? '');
      }
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const porConfirmar = citas.filter((cita) => cita.estatus === 'Pendiente').length;
  const citasOrdenadas = useMemo(
    () => [...citas].sort((a, b) => a.hora.localeCompare(b.hora)),
    [citas],
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
      key: 'personal',
      header: 'Con',
      className: 'w-52',
      render: (cita) => (
        <div>
          <p className="text-gray-800">{cita.personal}</p>
          <p className="text-sm text-gray-500">{cita.especialidad}</p>
        </div>
      ),
    },
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
      {/* Saludo + identidad del personal (igual que el panel del doctor) */}
      <SaludoInicio
        nombre={nombre}
        especialidad={especialidad}
        acciones={
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" icon={UserPlus} onClick={onNuevoPaciente}>
              Nuevo paciente
            </Button>
            <Button variant="secondary" icon={CalendarClock} onClick={onNuevaCita}>
              Nueva cita
            </Button>
            <Button icon={Stethoscope} onClick={onNuevaConsulta}>
              Nueva consulta
            </Button>
          </div>
        }
      />

      <EstadoVista cargando={cargando} error={error} onReintentar={() => void cargar()}>
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              icon={CalendarClock}
              label="Citas de hoy"
              value={citas.length}
              detail={porConfirmar > 0 ? `${porConfirmar} por confirmar` : 'agenda al corriente'}
              highlight={porConfirmar > 0}
            />
            <StatCard
              icon={Users}
              label="Pacientes registrados"
              value={totalPacientes}
              detail="expedientes en la clínica"
            />
            <StatCard
              icon={Clock}
              label="Atenciones de llegada"
              value={citas.filter((cita) => cita.tipo === 'Atención directa').length}
              detail="citas automáticas del día"
            />
          </div>

          <div className="flex items-center gap-2 mb-4">
            <CalendarClock size={18} className="text-gray-400" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-gray-900">Agenda de hoy</h2>
          </div>

          <DataTable
            columns={columnas}
            rows={citasOrdenadas}
            rowKey={(cita) => cita.id}
            emptyMessage="No hay citas registradas para hoy."
          />
        </>
      </EstadoVista>
    </div>
  );
}
