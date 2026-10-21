import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, FileText } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import DataTable from '../ui/DataTable';
import EstadoVista from '../ui/EstadoVista';
import type { Column } from '../ui/DataTable';
import { Input } from '../ui/Input';
import { mensajeDeError } from '../../services/api';
import {
  listarConsultas,
  obtenerConsulta,
  fechaCorta,
  type ConsultaResumen,
  type ConsultaDetalle,
} from '../../services/atencion.service';
import DetalleConsulta from '../atencion/DetalleConsulta';

/* ============================================================
   HISTORIAL DE CONSULTAS (DOCTOR) · Listado global de atenciones
   registradas, con buscador y detalle completo de cada consulta.
   ============================================================ */

export default function HistorialConsultas() {
  const [consultas, setConsultas] = useState<ConsultaResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');

  /** Consulta abierta en el detalle */
  const [detalle, setDetalle] = useState<ConsultaDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setConsultas(await listarConsultas());
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const verDetalle = async (consulta: ConsultaResumen) => {
    setCargandoDetalle(true);
    setDetalle(null);
    try {
      setDetalle(await obtenerConsulta(consulta.id));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargandoDetalle(false);
    }
  };

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return consultas;
    return consultas.filter(
      (consulta) =>
        consulta.paciente.nombre.toLowerCase().includes(texto) ||
        consulta.paciente.numeroControl.toLowerCase().includes(texto) ||
        consulta.diagnostico.toLowerCase().includes(texto) ||
        consulta.cita.motivo.toLowerCase().includes(texto),
    );
  }, [consultas, busqueda]);

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
      key: 'personal',
      header: 'Atendió',
      className: 'w-52',
      render: (consulta) => (
        <div>
          <p className="text-gray-800">{consulta.personal.nombre}</p>
          <p className="text-sm text-gray-500">{consulta.personal.especialidad}</p>
        </div>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      className: 'w-36',
      render: (consulta) => <Badge status="scheduled">{consulta.cita.tipo}</Badge>,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'right',
      className: 'w-32',
      render: (consulta) => (
        <Button size="sm" variant="secondary" icon={FileText} onClick={() => void verDetalle(consulta)}>
          Detalle
        </Button>
      ),
    },
  ];

  return (
    <div className="entrada p-10 xl:p-12 max-w-7xl mx-auto font-sans">
      <PageHeader
        title="Historial de consultas"
        subtitle="Todas las atenciones registradas en la clínica"
      />

      <EstadoVista cargando={cargando} error={error} onReintentar={() => void cargar()}>
        <>
          <div className="mb-6">
            <Input
              type="search"
              icon={Search}
              placeholder="Buscar por paciente, número de control, motivo o diagnóstico…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="max-w-lg"
              aria-label="Buscar consultas"
            />
          </div>

          <DataTable
            columns={columnas}
            rows={filtradas}
            rowKey={(consulta) => consulta.id}
            emptyMessage="No hay consultas que coincidan con la búsqueda."
          />

          <p className="text-sm text-gray-500 mt-4 px-1">
            Mostrando {filtradas.length} de {consultas.length} consultas
          </p>
        </>
      </EstadoVista>

      <DetalleConsulta
        consulta={detalle}
        cargando={cargandoDetalle}
        onCerrar={() => setDetalle(null)}
      />
    </div>
  );
}
