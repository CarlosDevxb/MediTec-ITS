import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, FileText, KeyRound, CircleAlert, Loader2 } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
import DataTable from '../ui/DataTable';
import EstadoVista from '../ui/EstadoVista';
import Modal from '../ui/Modal';
import type { Column } from '../ui/DataTable';
import { Input } from '../ui/Input';
import { mensajeDeError } from '../../services/api';
import {
  listarPacientes,
  obtenerExpediente,
  crearPaciente,
  type PacienteResumen,
  type ExpedientePaciente,
  type DatosPaciente,
} from '../../services/atencion.service';
import {
  listarTiposPaciente,
  listarCarreras,
  type ValorCatalogo,
} from '../../services/administracion.service';
import PacienteForm from './PacienteForm';
import ExpedienteVista from '../atencion/ExpedienteVista';

/* ============================================================
   PACIENTES (ENFERMERÍA) · Altas de pacientes y acceso a los
   expedientes en **solo lectura** (ver y descargar el PDF).
   El cuestionario de salud se llena en el flujo de consultas y
   los datos clínicos se editan desde su alta y su cuestionario.
   ============================================================ */

type Subvista =
  | { modo: 'lista' }
  | { modo: 'alta' }
  | { modo: 'expediente'; expediente: ExpedientePaciente };

export default function PacientesEnfermeria() {
  const [pacientes, setPacientes] = useState<PacienteResumen[]>([]);
  const [tiposPaciente, setTiposPaciente] = useState<ValorCatalogo[]>([]);
  const [carreras, setCarreras] = useState<ValorCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [subvista, setSubvista] = useState<Subvista>({ modo: 'lista' });
  /** Contraseña temporal generada en un alta (se muestra una sola vez) */
  const [temporal, setTemporal] = useState<{ nombre: string; contrasena: string } | null>(null);
  /** Apertura del expediente */
  const [cargandoExpediente, setCargandoExpediente] = useState(false);
  const { aviso, tipo, mostrar, cerrar } = useAviso();
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [lista, tipos, listaCarreras] = await Promise.all([
        listarPacientes(),
        listarTiposPaciente(),
        listarCarreras(),
      ]);
      setPacientes(lista);
      setTiposPaciente(tipos);
      setCarreras(listaCarreras);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* ---------- Apertura del expediente (solo lectura) ---------- */
  const abrirExpediente = async (paciente: PacienteResumen) => {
    setCargandoExpediente(true);
    setError('');
    try {
      setSubvista({ modo: 'expediente', expediente: await obtenerExpediente(paciente.id) });
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargandoExpediente(false);
    }
  };

  /* ---------- Alta de paciente ---------- */
  const guardarPaciente = async (datos: DatosPaciente) => {
    setGuardando(true);
    try {
      const { paciente, contrasenaTemporal } = await crearPaciente(datos);
      setPacientes((prev) =>
        [...prev, paciente].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
      );
      mostrar(`Expediente abierto para ${paciente.nombre}.`);
      if (contrasenaTemporal) {
        setTemporal({ nombre: paciente.nombre, contrasena: contrasenaTemporal });
      }
      setSubvista({ modo: 'lista' });
    } catch (error) {
      // El formulario pinta el error en su campo o como resumen
      throw error;
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Filtros (hooks siempre antes de los return tempranos) ---------- */
  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return pacientes;
    return pacientes.filter(
      (p) =>
        p.nombre.toLowerCase().includes(texto) || p.numeroControl.toLowerCase().includes(texto),
    );
  }, [pacientes, busqueda]);

  /* ---------- Subpágina de alta ---------- */
  if (subvista.modo === 'alta') {
    return (
      <>
        <PacienteForm
          modo="alta"
          tiposPaciente={tiposPaciente}
          carreras={carreras}
          existentes={pacientes}
          guardando={guardando}
          onCancelar={() => setSubvista({ modo: 'lista' })}
          onGuardar={guardarPaciente}
        />
        {temporal && (
          <Modal
            titulo={`Contraseña temporal de ${temporal.nombre}`}
            icono={KeyRound}
            onCerrar={() => setTemporal(null)}
            acciones={
              <Button icon={KeyRound} onClick={() => setTemporal(null)}>
                Entendido
              </Button>
            }
          >
            <p className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900 mb-4">
              Guárdala ahora y entrégasela a la persona: no se volverá a mostrar. Podrá cambiarla
              desde su portal.
            </p>
            <p className="font-mono text-lg bg-gray-100 px-4 py-3 rounded-lg text-center">
              {temporal.contrasena}
            </p>
          </Modal>
        )}
      </>
    );
  }

  /* ---------- Expediente (solo lectura: ver y descargar PDF) ---------- */
  if (subvista.modo === 'expediente') {
    return (
      <ExpedienteVista
        expediente={subvista.expediente}
        onVolver={() => setSubvista({ modo: 'lista' })}
      />
    );
  }

  /* ---------- Lista de pacientes ---------- */
  const columnas: Column<PacienteResumen>[] = [
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
    {
      key: 'tipoPaciente',
      header: 'Tipo',
      className: 'w-40',
      render: (paciente) => (
        <div>
          <p className="text-gray-800">{paciente.tipoPaciente}</p>
          {paciente.carrera && <p className="text-sm text-gray-500">{paciente.carrera}</p>}
        </div>
      ),
    },
    {
      key: 'tipoSangre',
      header: 'Sangre',
      className: 'w-28',
      render: (paciente) => paciente.tipoSangre || <span className="text-gray-400">—</span>,
    },
    {
      key: 'telefono',
      header: 'Teléfono',
      className: 'w-40 tabular-nums',
      render: (paciente) => paciente.telefono || <span className="text-gray-400">—</span>,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'right',
      className: 'w-40',
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
  ];

  return (
    <div className="entrada p-10 xl:p-12 max-w-6xl mx-auto font-sans">
      <PageHeader
        title="Pacientes"
        subtitle="Altas de pacientes y expedientes (solo lectura)"
        meta={
          <Button icon={Plus} onClick={() => setSubvista({ modo: 'alta' })}>
            Nuevo paciente
          </Button>
        }
      />

      {aviso && <Aviso mensaje={aviso} tipo={tipo} onCerrar={cerrar} />}

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
            columns={columnas}
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
