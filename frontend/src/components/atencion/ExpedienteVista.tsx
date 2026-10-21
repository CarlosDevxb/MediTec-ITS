import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, FileText, Download, CircleAlert } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import DataTable from '../ui/DataTable';
import EstadoVista from '../ui/EstadoVista';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
import type { Column } from '../ui/DataTable';
import { mensajeDeError } from '../../services/api';
import { generarExpedientePDF } from '../../services/expedientePdf';
import {
  listarConsultas,
  obtenerConsulta,
  fechaCorta,
  type ExpedientePaciente,
  type ConsultaResumen,
  type ConsultaDetalle,
} from '../../services/atencion.service';
import FichaPaciente from './FichaPaciente';
import DetalleConsulta from './DetalleConsulta';

/* ============================================================
   VISTA DE EXPEDIENTE · Solo lectura (compartida por doctor y
   enfermería): ficha con alertas, historial de consultas con su
   detalle y descarga del expediente en PDF. No permite editar:
   los datos del paciente se capturan en su alta y en el
   cuestionario de salud.
   ============================================================ */

export interface ExpedienteVistaProps {
  expediente: ExpedientePaciente;
  /** Vuelve a la lista de pacientes */
  onVolver: () => void;
}

export default function ExpedienteVista({ expediente, onVolver }: ExpedienteVistaProps) {
  const [consultas, setConsultas] = useState<ConsultaResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  /** Consulta abierta en el modal de detalle */
  const [detalle, setDetalle] = useState<ConsultaDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const { aviso, tipo, mostrar, cerrar } = useAviso();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setConsultas(await listarConsultas({ pacienteId: expediente.id }));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, [expediente.id]);

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

  /* ---------- Expediente en PDF (formato tipo expediente) ---------- */
  const descargarExpediente = async () => {
    setGenerandoPdf(true);
    try {
      const detalles = await Promise.all(consultas.map((c) => obtenerConsulta(c.id)));
      await generarExpedientePDF({ expediente, consultas: detalles });
      mostrar(`Expediente de ${expediente.nombre} descargado.`);
    } catch {
      mostrar('No se pudo generar el expediente. Intenta de nuevo.', 'error');
    } finally {
      setGenerandoPdf(false);
    }
  };

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
      key: 'cita',
      header: 'Motivo de atención',
      render: (consulta) => (
        <div>
          <p className="text-gray-800">{consulta.cita.motivo}</p>
          <p className="text-sm text-gray-500">{consulta.cita.tipo}</p>
        </div>
      ),
    },
    {
      key: 'resultado',
      header: 'Diagnóstico / Intervención',
      render: (consulta) => (
        <div>
          <p className="text-gray-800">
            {consulta.tipo === 'Enfermería'
              ? consulta.intervencionEnfermeria || '—'
              : consulta.diagnostico || '—'}
          </p>
          <p className="text-sm text-gray-500">{consulta.tipo}</p>
        </div>
      ),
    },
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
    <div className="entrada p-10 xl:p-12 max-w-7xl mx-auto font-sans">
      <PageHeader
        title="Expediente clínico"
        subtitle={`${expediente.nombre} · ${expediente.numeroControl}`}
        meta={
          <div className="flex flex-wrap items-center gap-3">
            <Button
              icon={Download}
              loading={generandoPdf}
              disabled={generandoPdf}
              onClick={() => void descargarExpediente()}
            >
              Descargar expediente
            </Button>
            <Button variant="secondary" icon={ArrowLeft} onClick={onVolver}>
              Volver
            </Button>
          </div>
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

      <div className="space-y-6">
        <FichaPaciente expediente={expediente} />

        <Card title="Historial de consultas" icon={FileText}>
          <EstadoVista cargando={cargando} textoCargando="Cargando el historial…">
            <DataTable
              columns={columnas}
              rows={consultas}
              rowKey={(consulta) => consulta.id}
              emptyMessage="Este paciente todavía no tiene consultas registradas."
            />
          </EstadoVista>
        </Card>

        <p className="flex items-center gap-2 text-sm text-gray-500 px-1 pb-10">
          <Badge status="scheduled">Solo lectura</Badge>
          Los datos del paciente se capturan en su alta y en el cuestionario de salud.
        </p>
      </div>

      <DetalleConsulta
        consulta={detalle}
        cargando={cargandoDetalle}
        onCerrar={() => setDetalle(null)}
      />
    </div>
  );
}
