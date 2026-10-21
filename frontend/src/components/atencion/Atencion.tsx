import React, { useEffect, useState } from 'react';
import { ClipboardPlus, CheckCircle2, Stethoscope, CircleAlert, CalendarClock, Loader2 } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Aviso from '../ui/Aviso';
import ModalResultado from '../ui/ModalResultado';
import { useAviso } from '../ui/useAviso';
import { mensajeDeError } from '../../services/api';
import {
  crearConsulta,
  obtenerExpediente,
  type Cita,
  type ConsultaDetalle,
  type DatosAtencion,
  type ExpedientePaciente,
} from '../../services/atencion.service';
import SelectorPaciente from './SelectorPaciente';
import CuestionarioSalud from './CuestionarioSalud';
import FichaPaciente from './FichaPaciente';
import AtencionForm from './AtencionForm';

/* ============================================================
   NUEVA CONSULTA · Flujo completo de atención (compartido por
   el doctor, la enfermería y nutrición)
   Paciente → ficha con alertas → **cuestionario de salud** (si
   aún no lo tiene) → signos vitales → consulta → insumos.

   - Doctor y enfermería atienden sin cita previa: el sistema
     crea la auto-cita "Atención directa" al guardar.
   - Nutrición (y odontología) atiende **solo con cita agendada**:
     se pasa `citaInicial` y la consulta queda ligada a ella.

   `rol` determina la captura: el personal médico y nutrición
   registran diagnóstico y tratamiento/indicaciones; enfermería
   registra su intervención y solo descuenta insumos comunes.
   ============================================================ */

export interface AtencionProps {
  /** 'medico', 'enfermeria', 'nutricion' u 'odontologia' */
  rol?: 'medico' | 'enfermeria' | 'nutricion' | 'odontologia';
  /** Cita agendada que se atiende (obligatoria para nutrición y odontología) */
  citaInicial?: Cita | null;
}

export default function Atencion({ rol = 'medico', citaInicial = null }: AtencionProps) {
  const [expediente, setExpediente] = useState<ExpedientePaciente | null>(null);
  const [cargandoExpediente, setCargandoExpediente] = useState(Boolean(citaInicial));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [consultaCreada, setConsultaCreada] = useState<ConsultaDetalle | null>(null);
  /** Confirmación visible del cuestionario guardado (modal) */
  const [resultado, setResultado] = useState<{
    titulo: string;
    mensaje: string;
  } | null>(null);
  const { aviso, tipo, mostrar, cerrar } = useAviso();

  /* Con cita agendada, el paciente ya viene definido en la cita */
  useEffect(() => {
    if (!citaInicial) return;
    let vigente = true;
    setCargandoExpediente(true);
    obtenerExpediente(citaInicial.pacienteId)
      .then((datos) => {
        if (vigente) setExpediente(datos);
      })
      .catch((e) => {
        if (vigente) setError(mensajeDeError(e));
      })
      .finally(() => {
        if (vigente) setCargandoExpediente(false);
      });
    return () => {
      vigente = false;
    };
  }, [citaInicial]);

  /* ---------- Guardado de la atención ---------- */
  const guardarAtencion = async (datos: DatosAtencion) => {
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

  /**
   * El cuestionario quedó guardado: se confirma con modal y se regresa al
   * inicio de la página para comenzar el llenado de la consulta.
   */
  const cuestionarioGuardado = (actualizado: ExpedientePaciente) => {
    setExpediente(actualizado);
    const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reducirMovimiento ? 'auto' : 'smooth' });
    setResultado({
      titulo: 'Cuestionario de salud guardado',
      mensaje: `El cuestionario de ${actualizado.nombre} quedó registrado y sus alertas están al día. Ahora puedes capturar la consulta.`,
    });
  };

  const nuevaAtencion = () => {
    setConsultaCreada(null);
    setExpediente(null);
  };

  /* ---------- Vista de éxito ---------- */
  if (consultaCreada) {
    return (
      <div className="entrada p-10 xl:p-12 max-w-7xl mx-auto font-sans">
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
              <p className="text-sm text-gray-500">{consultaCreada.cita.motivo}</p>
            </div>

            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {consultaCreada.tipo === 'Enfermería' ? (
                <div className="md:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Intervención de enfermería</dt>
                  <dd className="text-gray-900">{consultaCreada.intervencionEnfermeria}</dd>
                </div>
              ) : (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Diagnóstico</dt>
                    <dd className="text-gray-900">{consultaCreada.diagnostico}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tratamiento</dt>
                    <dd className="text-gray-900">{consultaCreada.tratamiento}</dd>
                  </div>
                </>
              )}
              {consultaCreada.sintomas && (
                <div className="md:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Síntomas</dt>
                  <dd className="text-gray-900">{consultaCreada.sintomas}</dd>
                </div>
              )}
              {consultaCreada.planAlimenticio && (
                <div className="md:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">
                    Plan alimenticio registrado
                  </dt>
                  <dd className="text-gray-900">
                    {consultaCreada.planAlimenticio.caloriasDiarias} kcal/día · del{' '}
                    {consultaCreada.planAlimenticio.fechaInicio} al{' '}
                    {consultaCreada.planAlimenticio.fechaFin}
                    <span className="block text-gray-600 mt-1 whitespace-pre-line">
                      {consultaCreada.planAlimenticio.descripcionDieta}
                    </span>
                  </dd>
                </div>
              )}
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
          <Button icon={Stethoscope} onClick={nuevaAtencion}>
            Nueva atención
          </Button>
        </div>
      </div>
    );
  }

  /* ---------- Flujo de captura ---------- */
  return (
    <div className="entrada p-10 xl:p-12 max-w-7xl mx-auto font-sans">
      <PageHeader
        title={
          rol === 'enfermeria'
            ? 'Nueva consulta de enfermería'
            : rol === 'nutricion'
              ? 'Nueva sesión de nutrición'
              : rol === 'odontologia'
                ? 'Nueva consulta odontológica'
                : 'Nueva consulta'
        }
        subtitle={
          citaInicial
            ? `Atendiendo la cita de ${citaInicial.paciente} · ${citaInicial.fecha} ${citaInicial.hora}`
            : rol === 'enfermeria'
              ? 'Registra una atención de enfermería (atención directa)'
              : rol === 'odontologia'
                ? 'Registra una atención odontológica (por cita)'
                : 'Registra la atención de un paciente (atención directa)'
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
        {/* Nutrición y odontología atienden solo desde una cita agendada */}
        {(rol === 'nutricion' || rol === 'odontologia') && !citaInicial ? (
          <Card title="Atención por cita" icon={CalendarClock}>
            <p className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              {rol === 'nutricion'
                ? 'Las sesiones de nutrición'
                : 'Las consultas odontológicas'}{' '}
              se registran atendiendo una cita de la agenda. Ve a Agenda (o Atención) y elige la
              cita que vas a atender.
            </p>
          </Card>
        ) : citaInicial ? (
          cargandoExpediente ? (
            <p className="flex items-center gap-2 text-gray-600" role="status">
              <Loader2 size={18} className="animate-spin text-brand-600" aria-hidden="true" />
              Cargando al paciente…
            </p>
          ) : (
            expediente && <FichaPaciente expediente={expediente} />
          )
        ) : (
          <SelectorPaciente paciente={expediente} onChange={setExpediente} />
        )}

        {/* Sin cuestionario completado, primero se llena el cuestionario */}
        {expediente && expediente.cuestionario?.estatus !== 'Completado' ? (
          <CuestionarioSalud
            expediente={expediente}
            contexto="consulta"
            onGuardado={cuestionarioGuardado}
            onCancelar={nuevaAtencion}
          />
        ) : expediente ? (
          <AtencionForm
            expediente={expediente}
            rol={rol}
            citaInicial={citaInicial}
            guardando={guardando}
            onGuardar={guardarAtencion}
            onCancelar={nuevaAtencion}
          />
        ) : null}
      </div>

      {/* Confirmación del cuestionario guardado (modal) */}
      {resultado && (
        <ModalResultado
          titulo={resultado.titulo}
          mensaje={resultado.mensaje}
          onCerrar={() => setResultado(null)}
        />
      )}
    </div>
  );
}
