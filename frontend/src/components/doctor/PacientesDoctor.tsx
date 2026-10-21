import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, FileText, Loader2, CircleAlert } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import DataTable from '../ui/DataTable';
import EstadoVista from '../ui/EstadoVista';
import type { Column } from '../ui/DataTable';
import { Input } from '../ui/Input';
import { mensajeDeError } from '../../services/api';
import {
  listarPacientes,
  obtenerExpediente,
  type PacienteResumen,
  type ExpedientePaciente,
} from '../../services/atencion.service';
import ExpedienteVista from '../atencion/ExpedienteVista';

/* ============================================================
   PACIENTES (DOCTOR) · Buscador + acceso al expediente clínico
   (solo lectura: ficha, historial de consultas y PDF).
   ============================================================ */

type Vista = { modo: 'lista' } | { modo: 'expediente'; expediente: ExpedientePaciente };

export default function PacientesDoctor() {
  const [pacientes, setPacientes] = useState<PacienteResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useState<Vista>({ modo: 'lista' });
  /** Apertura del expediente */
  const [cargandoExpediente, setCargandoExpediente] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setPacientes(await listarPacientes());
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrirExpediente = async (paciente: PacienteResumen) => {
    setCargandoExpediente(true);
    setError('');
    try {
      setVista({ modo: 'expediente', expediente: await obtenerExpediente(paciente.id) });
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargandoExpediente(false);
    }
  };

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return pacientes;
    return pacientes.filter(
      (p) =>
        p.nombre.toLowerCase().includes(texto) || p.numeroControl.toLowerCase().includes(texto),
    );
  }, [pacientes, busqueda]);

  /* ---------- Vista de expediente (solo lectura) ---------- */
  if (vista.modo === 'expediente') {
    return (
      <ExpedienteVista
        expediente={vista.expediente}
        onVolver={() => setVista({ modo: 'lista' })}
      />
    );
  }

  /* ---------- Lista de pacientes ---------- */
  return (
    <div className="entrada p-10 xl:p-12 max-w-6xl mx-auto font-sans">
      <PageHeader title="Pacientes" subtitle="Consulta los expedientes de la clínica" />

      {error && (
        <p
          role="alert"
          className="mb-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <EstadoVista cargando={cargando} error={error} onReintentar={() => void cargar()}>
        <>
          <div className="mb-6">
            <Input
              type="search"
              icon={Search}
              placeholder="Buscar paciente por nombre o número de control…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="max-w-md"
              aria-label="Buscar paciente"
            />
          </div>

          <DataTable
            columns={[
              {
                key: 'nombre',
                header: 'Paciente',
                render: (paciente) => (
                  <div>
                    <p className="font-semibold text-gray-900">{paciente.nombre}</p>
                    <p className="text-sm text-gray-500 tabular-nums">{paciente.numeroControl}</p>
                  </div>
                ),
              },
              { key: 'tipoPaciente', header: 'Tipo', className: 'w-40' },
              {
                key: 'tipoSangre',
                header: 'Sangre',
                className: 'w-28',
                render: (paciente) => paciente.tipoSangre || <span className="text-gray-400">—</span>,
              },
              { key: 'telefono', header: 'Teléfono', className: 'w-40 tabular-nums' },
              {
                key: 'acciones',
                header: 'Acciones',
                align: 'right',
                className: 'w-36',
                render: (paciente) => (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={FileText}
                    onClick={() => void abrirExpediente(paciente)}
                  >
                    Ver expediente
                  </Button>
                ),
              },
            ]}
            rows={filtrados}
            rowKey={(paciente) => paciente.id}
            emptyMessage="No hay pacientes que coincidan con la búsqueda."
          />

          {cargandoExpediente && (
            <p className="mt-4 flex items-center gap-2 text-sm text-gray-600" role="status">
              <Loader2 size={16} className="animate-spin text-brand-600" aria-hidden="true" />
              Abriendo el expediente…
            </p>
          )}
        </>
      </EstadoVista>
    </div>
  );
}
