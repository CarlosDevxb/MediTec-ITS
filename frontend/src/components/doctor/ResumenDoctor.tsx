import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardPlus, Clock, Stethoscope, Users } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import DataTable from '../ui/DataTable';
import EstadoVista from '../ui/EstadoVista';
import StatCard from '../ui/StatCard';
import type { Column } from '../ui/DataTable';
import { mensajeDeError } from '../../services/api';
import { obtenerSesion } from '../../services/sesion';
import { obtenerPerfil } from '../../services/auth.service';
import {
  listarConsultas,
  hoyISO,
  fechaCorta,
  type ConsultaResumen,
} from '../../services/atencion.service';

/* ============================================================
   INICIO (DOCTOR) · Saludo por hora del día con el nombre y la
   especialidad del profesional, indicadores de consultas del día
   y las últimas atenciones registradas.
   ============================================================ */

/** "Buenos días" / "Buenas tardes" / "Buenas noches" según la hora */
function saludoDelDia(): string {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export interface ResumenDoctorProps {
  onNuevaConsulta: () => void;
}

export default function ResumenDoctor({ onNuevaConsulta }: ResumenDoctorProps) {
  const [consultas, setConsultas] = useState<ConsultaResumen[]>([]);
  /** Nombre y especialidad del profesional en sesión */
  const [nombre, setNombre] = useState(() => obtenerSesion()?.usuario.nombre ?? 'Personal médico');
  const [especialidad, setEspecialidad] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [listaConsultas, perfil] = await Promise.all([
        listarConsultas(),
        obtenerPerfil().catch(() => null),
      ]);
      setConsultas(listaConsultas);
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

  /* ---- Indicadores del día ---- */
  const hoy = hoyISO();
  const consultasHoy = useMemo(
    () => consultas.filter((consulta) => consulta.fechaHora.startsWith(hoy)),
    [consultas, hoy],
  );
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
    { key: 'motivo', header: 'Motivo de atención' },
    { key: 'diagnostico', header: 'Diagnóstico' },
    {
      key: 'tipo',
      header: 'Estado',
      className: 'w-40',
      render: (consulta) => <Badge status="scheduled">{consulta.cita.tipo}</Badge>,
    },
  ];

  return (
    <div className="entrada p-10 xl:p-12 max-w-7xl mx-auto font-sans">
      {/* Saludo + identidad del profesional */}
      <div className="flex flex-wrap items-center justify-between gap-6 mb-10">
        <div>
          <p className="text-sm font-semibold text-brand-700 uppercase tracking-wide">
            {saludoDelDia()}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 mt-1">{nombre}</h1>
          <p className="text-gray-500 mt-1.5">
            {especialidad ? `${especialidad} · ` : ''}
            {fechaCorta(hoy)}
          </p>
        </div>
        <Button icon={Stethoscope} onClick={onNuevaConsulta}>
          Nueva consulta
        </Button>
      </div>

      <EstadoVista cargando={cargando} error={error} onReintentar={() => void cargar()}>
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              icon={ClipboardPlus}
              label="Consultas de hoy"
              value={consultasHoy.length}
              detail={`${pacientesUnicos} paciente(s) atendido(s)`}
            />
            <StatCard
              icon={Users}
              label="Pacientes atendidos"
              value={pacientesUnicos}
              detail="en lo que va del día"
            />
            <StatCard
              icon={Clock}
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
