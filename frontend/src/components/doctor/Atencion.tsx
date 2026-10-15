import React, { useEffect, useState } from 'react';
import { ClipboardPlus, CheckCircle2, CalendarClock, Stethoscope } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
import EstadoVista from '../ui/EstadoVista';
import { mensajeDeError } from '../../services/api';
import {
  crearConsulta,
  obtenerExpediente,
  type Cita,
  type ConsultaDetalle,
  type ExpedientePaciente,
} from '../../services/atencion.service';
import SelectorPaciente from '../atencion/SelectorPaciente';
import FichaPaciente from '../atencion/FichaPaciente';
import AtencionForm from './AtencionForm';

/* ============================================================
   NUEVA CONSULTA · Flujo completo de atención del doctor
   Paciente → ficha con alertas → signos vitales → consulta →
   insumos. Sin cita previa, el sistema crea primero la auto-cita
   'Atención directa' y enseguida la consulta (una transacción).
   ============================================================ */

export interface AtencionProps {
  /** Cita agendada que se está atendiendo (vino desde la Agenda) */
  citaInicial?: Cita | null;
  /** Lleva a la vista de Agenda */
  onVerAgenda?: () => void;
  /** Limpia la cita pendiente en el panel */
  onNuevaAtencion?: () => void;
}

export default function Atencion({ citaInicial = null, onVerAgenda, onNuevaAtencion }: AtencionProps) {
  const [expediente, setExpediente] = useState<ExpedientePaciente | null>(null);
  const [cargando, setCargando] = useState(Boolean(citaInicial));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [consultaCreada, setConsultaCreada] = useState<ConsultaDetalle | null>(null);
  const { aviso, tipo, mostrar, cerrar } = useAviso();

  /* Si se atiende una cita agendada, su paciente ya está definido */
  useEffect(() => {
    if (!citaInicial) return;
    let vigente = true;
    setCargando(true);
    obtenerExpediente(citaInicial.pacienteId)
      .then((datos) => {
        if (vigente) setExpediente(datos);
      })
      .catch((e) => {
        if (vigente) setError(mensajeDeError(e));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [citaInicial]);

  /* ---------- Guardado de la atención ---------- */
  const guardarAtencion = async (datos: Parameters<typeof crearConsulta>[0]) => {
    setGuardando(true);
    try {
      const consulta = await crearConsulta(datos);
      setConsultaCreada(consulta);
      mostrar('Consulta registrada correctamente.');
    } catch (error) {
      // El formulario pinta el error en su campo o como resumen
      throw error;
    } finally {
      setGuardando(false);
    }
  };

  const nuevaAtencion = () => {
    setConsultaCreada(null);
    setExpediente(null);
    setError('');
    onNuevaAtencion?.();
  };

  /* ---------- Vista de éxito ---------- */
  if (consultaCreada) {
    return (
      <div className="p-10 xl:p-12 max-w-5xl mx-auto font-sans">
        <PageHeader
          title="Consulta registrada"
          subtitle={`Atención de ${consultaCreada.paciente.nombre} · ${consultaCreada.fechaHora}`}
        />

        {aviso && <Aviso mensaje={aviso} tipo={tipo} onCerrar={cerrar} />}

        <Card title="Resumen de la atención" icon={CheckCircle2}>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge status="confirmed">Consulta #{consultaCreada.id}</Badge>
              <Badge status="scheduled">{consultaCreada.cita.tipo}</Badge>
              <p className="text-sm text-gray-500">
                Cita {consultaCreada.cita.fecha} {consultaCreada.cita.hora} ·{' '}
                {consultaCreada.cita.motivo}
              </p>
            </div>

            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Diagnóstico</dt>
                <dd className="text-gray-900">{consultaCreada.diagnostico}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Tratamiento</dt>
                <dd className="text-gray-900">{consultaCreada.tratamiento}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Síntomas</dt>
                <dd className="text-gray-900">{consultaCreada.sintomas}</dd>
              </div>
            </dl>

            {consultaCreada.insumos.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">
                  Insumos descontados del inventario
                </p>
                <ul className="flex flex-wrap gap-2">
                  {consultaCreada.insumos.map((insumo) => (
                    <li key={insumo.medicamentoId}>
                      <Badge>
                        {insumo.nombre} · {insumo.cantidad} {insumo.abreviatura || insumo.unidad}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>

        <div className="flex flex-wrap justify-end gap-4 pb-10 mt-8">
          {onVerAgenda && (
            <Button variant="secondary" icon={CalendarClock} onClick={onVerAgenda}>
              Ver agenda
            </Button>
          )}
          <Button icon={Stethoscope} onClick={nuevaAtencion}>
            Nueva atención
          </Button>
        </div>
      </div>
    );
  }

  /* ---------- Flujo de captura ---------- */
  return (
    <div className="p-10 xl:p-12 max-w-5xl mx-auto font-sans">
      <PageHeader
        title="Nueva consulta"
        subtitle={
          citaInicial
            ? `Atendiendo la cita de ${citaInicial.paciente}`
            : 'Registra la atención de un paciente (se crea su cita y su consulta)'
        }
      />

      {aviso && <Aviso mensaje={aviso} tipo={tipo} onCerrar={cerrar} />}

      <EstadoVista cargando={cargando} error={error} textoCargando="Cargando al paciente…">
        <div className="space-y-6">
          {citaInicial && expediente ? (
            <FichaPaciente expediente={expediente} />
          ) : (
            <SelectorPaciente paciente={expediente} onChange={setExpediente} />
          )}

          {expediente && (
            <AtencionForm
              expediente={expediente}
              citaInicial={citaInicial}
              guardando={guardando}
              onGuardar={guardarAtencion}
              onCancelar={nuevaAtencion}
            />
          )}
        </div>
      </EstadoVista>
    </div>
  );
}
