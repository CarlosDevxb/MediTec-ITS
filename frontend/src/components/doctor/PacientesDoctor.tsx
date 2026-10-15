import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, ArrowLeft, FileText, Loader2, CircleAlert } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import DataTable from '../ui/DataTable';
import EstadoVista from '../ui/EstadoVista';
import Modal from '../ui/Modal';
import type { Column } from '../ui/DataTable';
import { Input } from '../ui/Input';
import { mensajeDeError } from '../../services/api';
import {
  listarPacientes,
  obtenerExpediente,
  listarConsultas,
  obtenerConsulta,
  fechaCorta,
  type PacienteResumen,
  type ExpedientePaciente,
  type ConsultaResumen,
  type ConsultaDetalle,
} from '../../services/atencion.service';
import FichaPaciente from '../atencion/FichaPaciente';

/* ============================================================
   PACIENTES (DOCTOR) · Buscador + expediente con historial de
   consultas y detalle de cada atención (solo lectura).
   ============================================================ */

type Vista = { modo: 'lista' } | { modo: 'expediente'; expediente: ExpedientePaciente };

export default function PacientesDoctor() {
  const [pacientes, setPacientes] = useState<PacienteResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useState<Vista>({ modo: 'lista' });
  /** Apertura del expediente (carga ficha + historial) */
  const [cargandoExpediente, setCargandoExpediente] = useState(false);

  /* Historial del expediente abierto */
  const [consultas, setConsultas] = useState<ConsultaResumen[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  /** Consulta abierta en el modal de detalle */
  const [detalle, setDetalle] = useState<ConsultaDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

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
      const expediente = await obtenerExpediente(paciente.id);
      setVista({ modo: 'expediente', expediente });
      setCargandoHistorial(true);
      setConsultas(await listarConsultas({ pacienteId: paciente.id }));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargandoExpediente(false);
      setCargandoHistorial(false);
    }
  };

  const verDetalle = async (consulta: ConsultaResumen) => {
    setCargandoDetalle(true);
    try {
      setDetalle(await obtenerConsulta(consulta.id));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargandoDetalle(false);
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

  /* ---------- Vista de expediente ---------- */
  if (vista.modo === 'expediente' && vista.expediente) {
    const columnasHistorial: Column<ConsultaResumen>[] = [
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
        key: 'cita',
        header: 'Motivo de la cita',
        render: (consulta) => (
          <div>
            <p className="text-gray-800">{consulta.cita.motivo}</p>
            <p className="text-sm text-gray-500">{consulta.cita.tipo}</p>
          </div>
        ),
      },
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
      <div className="p-10 xl:p-12 max-w-6xl mx-auto font-sans">
        <PageHeader
          title="Expediente clínico"
          subtitle={vista.expediente.nombre}
          meta={
            <Button variant="secondary" icon={ArrowLeft} onClick={() => setVista({ modo: 'lista' })}>
              Volver a pacientes
            </Button>
          }
        />

        {error && (
          <p
            role="alert"
            className="mb-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <div className="space-y-6">
          <FichaPaciente expediente={vista.expediente} />

          <Card title="Historial de consultas" icon={FileText}>
            <EstadoVista
              cargando={cargandoHistorial}
              textoCargando="Cargando el historial…"
            >
              <DataTable
                columns={columnasHistorial}
                rows={consultas}
                rowKey={(consulta) => consulta.id}
                emptyMessage="Este paciente todavía no tiene consultas registradas."
              />
            </EstadoVista>
          </Card>
        </div>

        {/* Detalle de una consulta */}
        {(detalle || cargandoDetalle) && (
          <Modal
            titulo={detalle ? `Consulta del ${fechaCorta(detalle.cita.fecha)}` : 'Cargando consulta…'}
            icono={FileText}
            onCerrar={() => setDetalle(null)}
            acciones={
              <Button variant="secondary" onClick={() => setDetalle(null)}>
                Cerrar
              </Button>
            }
          >
            {detalle ? (
              <div className="space-y-3 text-sm">
                <p className="flex items-center gap-2">
                  <Badge status="scheduled">{detalle.cita.tipo}</Badge>
                  <span className="text-gray-600">
                    {detalle.cita.motivo} · atendió {detalle.personal.nombre}
                  </span>
                </p>
                <div>
                  <p className="font-semibold text-gray-700">Síntomas</p>
                  <p className="text-gray-600">{detalle.sintomas}</p>
                </div>
                {detalle.exploracion && (
                  <div>
                    <p className="font-semibold text-gray-700">Exploración</p>
                    <p className="text-gray-600">{detalle.exploracion}</p>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-700">Diagnóstico</p>
                  <p className="text-gray-600">{detalle.diagnostico}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Tratamiento</p>
                  <p className="text-gray-600">{detalle.tratamiento}</p>
                </div>
                {detalle.signosVitales && (
                  <div>
                    <p className="font-semibold text-gray-700">Signos vitales</p>
                    <p className="text-gray-600 tabular-nums">
                      {[
                        detalle.signosVitales.ta && `TA ${detalle.signosVitales.ta}`,
                        detalle.signosVitales.fc && `FC ${detalle.signosVitales.fc} lpm`,
                        detalle.signosVitales.fr && `FR ${detalle.signosVitales.fr} rpm`,
                        detalle.signosVitales.temp && `Temp ${detalle.signosVitales.temp} °C`,
                        detalle.signosVitales.peso && `Peso ${detalle.signosVitales.peso} kg`,
                        detalle.signosVitales.talla && `Talla ${detalle.signosVitales.talla} m`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                )}
                {detalle.insumos.length > 0 && (
                  <div>
                    <p className="font-semibold text-gray-700">Insumos usados</p>
                    <ul className="text-gray-600">
                      {detalle.insumos.map((insumo) => (
                        <li key={insumo.medicamentoId}>
                          {insumo.nombre} · {insumo.cantidad} {insumo.abreviatura || insumo.unidad}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="flex items-center gap-2 text-gray-600">
                <Loader2 size={18} className="animate-spin text-brand-600" aria-hidden="true" />
                Cargando el detalle…
              </p>
            )}
          </Modal>
        )}
      </div>
    );
  }

  /* ---------- Lista de pacientes ---------- */
  return (
    <div className="p-10 xl:p-12 max-w-6xl mx-auto font-sans">
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
                    Expediente
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
