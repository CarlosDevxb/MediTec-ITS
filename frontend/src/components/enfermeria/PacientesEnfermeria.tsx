import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, FileText, KeyRound, CircleAlert, ClipboardPlus } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
import DataTable from '../ui/DataTable';
import EstadoVista from '../ui/EstadoVista';
import IconButton from '../ui/IconButton';
import Modal from '../ui/Modal';
import type { Column } from '../ui/DataTable';
import { Input } from '../ui/Input';
import { mensajeDeError } from '../../services/api';
import {
  listarPacientes,
  obtenerExpediente,
  crearPaciente,
  actualizarExpediente,
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
import CuestionarioSalud from '../atencion/CuestionarioSalud';

/* ============================================================
   PACIENTES (ENFERMERÍA) · Altas, actualización de expedientes,
   cuestionario de salud y consulta del listado. Sin diagnósticos
   ni tratamientos: esa es la atención del doctor.
   ============================================================ */

type Subvista =
  | { modo: 'lista' }
  | { modo: 'alta' }
  | { modo: 'editar'; expediente: ExpedientePaciente }
  | { modo: 'cuestionario'; expediente: ExpedientePaciente };

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

  /* ---------- Apertura del expediente (edición o cuestionario) ---------- */
  const abrirExpediente = async (
    paciente: PacienteResumen,
    modo: 'editar' | 'cuestionario',
  ) => {
    setGuardando(true);
    setError('');
    try {
      // Se carga el expediente completo: editarlo con datos parciales
      // perdería los antecedentes ya registrados
      setSubvista({ modo, expediente: await obtenerExpediente(paciente.id) });
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Guardado (alta / edición de expediente) ---------- */
  const guardarPaciente = async (datos: DatosPaciente) => {
    setGuardando(true);
    try {
      if (subvista.modo === 'editar') {
        const actualizado = await actualizarExpediente(subvista.expediente.id, {
          tipoSangre: datos.tipoSangre,
          antecedentes: datos.antecedentes,
        });
        setPacientes((prev) =>
          prev.map((p) =>
            p.id === actualizado.id
              ? {
                  ...p,
                  tipoSangre: actualizado.tipoSangre,
                }
              : p,
          ),
        );
        mostrar(`Expediente de ${actualizado.nombre} actualizado.`);
      } else {
        const { paciente, contrasenaTemporal } = await crearPaciente(datos);
        setPacientes((prev) =>
          [...prev, paciente].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
        );
        mostrar(`Expediente abierto para ${paciente.nombre}.`);
        if (contrasenaTemporal) {
          setTemporal({ nombre: paciente.nombre, contrasena: contrasenaTemporal });
        }
      }
      setSubvista({ modo: 'lista' });
    } catch (error) {
      // El formulario pinta el error en su campo o como resumen
      throw error;
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Subpágina de cuestionario de salud ---------- */
  if (subvista.modo === 'cuestionario') {
    return (
      <div className="entrada p-10 xl:p-12 max-w-7xl mx-auto font-sans">
        <PageHeader
          title="Cuestionario de salud"
          subtitle={`${subvista.expediente.nombre} · único por paciente`}
        />
        {aviso && <Aviso mensaje={aviso} tipo={tipo} onCerrar={cerrar} />}
        <CuestionarioSalud
          expediente={subvista.expediente}
          contexto="directo"
          onGuardado={(actualizado) => {
            mostrar(`Cuestionario de salud de ${actualizado.nombre} guardado.`);
            setSubvista({ modo: 'lista' });
            void cargar();
          }}
          onCancelar={() => setSubvista({ modo: 'lista' })}
        />
      </div>
    );
  }

  /* ---------- Subpáginas (alta / edición) ---------- */
  if (subvista.modo !== 'lista') {
    return (
      <>
        <PacienteForm
          modo={subvista.modo}
          paciente={subvista.modo === 'editar' ? subvista.expediente : undefined}
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

  /* ---------- Lista de pacientes ---------- */
  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return pacientes;
    return pacientes.filter(
      (p) =>
        p.nombre.toLowerCase().includes(texto) || p.numeroControl.toLowerCase().includes(texto),
    );
  }, [pacientes, busqueda]);

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
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon={ClipboardPlus}
            label={`Cuestionario de salud de ${paciente.nombre}`}
            onClick={() => void abrirExpediente(paciente, 'cuestionario')}
          />
          <Button
            size="sm"
            variant="secondary"
            icon={Pencil}
            onClick={() => void abrirExpediente(paciente, 'editar')}
          >
            Expediente
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="entrada p-10 xl:p-12 max-w-6xl mx-auto font-sans">
      <PageHeader
        title="Pacientes"
        subtitle="Altas y expedientes de la clínica"
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

          <p className="text-sm text-gray-500 mt-4 px-1 flex items-center gap-2">
            <FileText size={16} className="text-gray-400" aria-hidden="true" />
            El historial clínico (consultas y diagnósticos) se consulta en el panel del doctor.
          </p>
        </>
      </EstadoVista>
    </div>
  );
}
