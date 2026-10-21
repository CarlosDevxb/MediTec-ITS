import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ClipboardCheck,
  Plus,
  Save,
  X,
  Pencil,
  CheckCircle2,
  XCircle,
  CircleAlert,
  TrendingUp,
  FileText,
  Download,
} from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
import Modal from '../ui/Modal';
import ModalResultado from '../ui/ModalResultado';
import DataTable from '../ui/DataTable';
import EstadoVista from '../ui/EstadoVista';
import StatCard from '../ui/StatCard';
import type { Column } from '../ui/DataTable';
import { Field, Input, Textarea } from '../ui/Input';
import { detallesDe, mensajeDeError } from '../../services/api';
import { obtenerPerfil } from '../../services/auth.service';
import {
  listarPlanes,
  crearPlan,
  actualizarPlan,
  cambiarEstatusPlan,
  listarSeguimiento,
  listarConsultas,
  obtenerConsulta,
  fechaCorta,
  type PlanAlimenticio,
  type RegistroSeguimiento,
  type ConsultaResumen,
  type ConsultaDetalle,
  type ExpedientePaciente,
} from '../../services/atencion.service';
import FichaPaciente from '../atencion/FichaPaciente';
import DetalleConsulta from '../atencion/DetalleConsulta';
import { generarAvancePesoPDF, generarExpedienteNutricionPDF } from '../../services/nutricionPdf';

/* ============================================================
   FICHA DE NUTRICIÓN · Control por paciente: plan alimenticio,
   avance de peso y talla e historial de sesiones.
   ============================================================ */

const ESTILOS_PLAN: Record<string, 'pending' | 'confirmed' | 'scheduled' | 'cancelled'> = {
  'Por iniciar': 'pending',
  Vigente: 'confirmed',
  Finalizado: 'scheduled',
  Cancelado: 'cancelled',
};

export interface FichaNutricionProps {
  paciente: ExpedientePaciente;
  onVolver: () => void;
}

export default function FichaNutricion({ paciente, onVolver }: FichaNutricionProps) {
  const [planes, setPlanes] = useState<PlanAlimenticio[]>([]);
  const [seguimiento, setSeguimiento] = useState<RegistroSeguimiento[]>([]);
  const [sesiones, setSesiones] = useState<ConsultaResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  /* Formulario del plan alimenticio */
  const [planAEditar, setPlanAEditar] = useState<PlanAlimenticio | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [descripcionDieta, setDescripcionDieta] = useState('');
  const [caloriasDiarias, setCaloriasDiarias] = useState('');
  const [tocado, setTocado] = useState<Record<string, boolean>>({});
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [guardando, setGuardando] = useState(false);

  /** Confirmación de cancelación de un plan (destructiva) */
  const [planACancelar, setPlanACancelar] = useState<PlanAlimenticio | null>(null);
  /** Resultado visible de la última acción */
  const [resultado, setResultado] = useState<{
    titulo: string;
    mensaje: string;
    tipo: 'exito' | 'error';
  } | null>(null);

  /** Sesión abierta en el detalle */
  const [detalle, setDetalle] = useState<ConsultaDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  /** Documento en descarga (avance o expediente de nutrición) */
  const [descargando, setDescargando] = useState<'avance' | 'expediente' | null>(null);

  const { aviso, tipo, mostrar, cerrar } = useAviso();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [perfil, listaPlanes, listaConsultas] = await Promise.all([
        obtenerPerfil().catch(() => null),
        listarPlanes({ pacienteId: paciente.id }),
        listarConsultas({ pacienteId: paciente.id }),
      ]);
      const miFicha = perfil?.personalMedicoId ?? null;
      setPlanes(listaPlanes);
      // Solo mis sesiones de nutrición con este paciente (no las de otras
      // profesionales con mi misma especialidad)
      setSesiones(
        listaConsultas.filter(
          (consulta) =>
            consulta.tipo === 'Nutrición' && (!miFicha || consulta.personal.id === miFicha),
        ),
      );
      // El avance se mide con los signos vitales de MIS sesiones
      setSeguimiento(await listarSeguimiento(paciente.id, miFicha ?? undefined));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, [paciente.id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* ---------- Validación en tiempo real del plan ---------- */
  const errores = useMemo(() => {
    const calculados: Record<string, string> = {};
    calculados.fechaInicio = !fechaInicio ? 'Indica la fecha de inicio.' : '';
    calculados.fechaFin = !fechaFin
      ? 'Indica la fecha de fin.'
      : fechaInicio && fechaFin < fechaInicio
        ? 'La fecha de fin no puede ser anterior a la de inicio.'
        : '';
    calculados.descripcionDieta = descripcionDieta.trim()
      ? descripcionDieta.length > 4000
        ? 'La descripción no puede exceder 4000 caracteres.'
        : ''
      : 'Describe la dieta.';
    const calorias = Number(caloriasDiarias);
    calculados.caloriasDiarias = !caloriasDiarias
      ? 'Indica las calorías diarias.'
      : Number.isNaN(calorias) || !Number.isInteger(calorias)
        ? 'Las calorías diarias deben ser un número entero.'
        : calorias < 500 || calorias > 10000
          ? 'Las calorías deben estar entre 500 y 10,000.'
          : '';
    return calculados;
  }, [fechaInicio, fechaFin, descripcionDieta, caloriasDiarias]);

  const errorVisible = (campo: string): string | undefined => {
    const propio = errores[campo];
    if (propio) return tocado[campo] ? propio : erroresServidor[campo] || undefined;
    return erroresServidor[campo] || undefined;
  };
  const hayErrores = Object.values(errores).some(Boolean);
  const marcarTocado = (campo: string) => setTocado((prev) => ({ ...prev, [campo]: true }));

  /* ---------- Alta / edición del plan ---------- */
  const abrirFormulario = (plan: PlanAlimenticio | null) => {
    setPlanAEditar(plan);
    setFechaInicio(plan?.fechaInicio ?? '');
    setFechaFin(plan?.fechaFin ?? '');
    setDescripcionDieta(plan?.descripcionDieta ?? '');
    setCaloriasDiarias(plan ? String(plan.caloriasDiarias) : '');
    setTocado({});
    setErroresServidor({});
    setErrorGeneral('');
    setMostrarFormulario(true);
  };

  const guardarPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setTocado({ fechaInicio: true, fechaFin: true, descripcionDieta: true, caloriasDiarias: true });
    setErroresServidor({});
    setErrorGeneral('');
    if (hayErrores) return;

    setGuardando(true);
    try {
      const datos = {
        fechaInicio,
        fechaFin,
        descripcionDieta: descripcionDieta.trim(),
        caloriasDiarias: Number(caloriasDiarias),
      };
      if (planAEditar) {
        const actualizado = await actualizarPlan(planAEditar.id, datos);
        setPlanes((prev) => prev.map((plan) => (plan.id === actualizado.id ? actualizado : plan)));
        mostrar(`Plan alimenticio de ${actualizado.paciente} actualizado.`);
      } else {
        const creado = await crearPlan({ ...datos, pacienteId: paciente.id });
        setPlanes((prev) => [creado, ...prev]);
        mostrar(`Plan alimenticio creado para ${creado.paciente}.`);
      }
      setMostrarFormulario(false);
      setPlanAEditar(null);
    } catch (error) {
      const porCampo = detallesDe(error);
      if (Object.keys(porCampo).length > 0) setErroresServidor(porCampo);
      else setErrorGeneral(mensajeDeError(error));
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Cambios de estatus del plan ---------- */
  const cambiarEstatus = async (
    plan: PlanAlimenticio,
    estatus: 'Por iniciar' | 'Vigente' | 'Finalizado' | 'Cancelado',
  ) => {
    setGuardando(true);
    try {
      const actualizado = await cambiarEstatusPlan(plan.id, estatus);
      setPlanes((prev) => prev.map((p) => (p.id === actualizado.id ? actualizado : p)));
      setPlanACancelar(null);
      setResultado({
        titulo: estatus === 'Cancelado' ? 'Plan cancelado' : 'Plan actualizado',
        mensaje: `El plan alimenticio de ${actualizado.paciente} quedó como ${estatus.toLowerCase()}.`,
        tipo: 'exito',
      });
    } catch (e) {
      mostrar(mensajeDeError(e), 'error');
      setPlanACancelar(null);
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Detalle de una sesión ---------- */
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

  /* ---------- Documentos PDF (avance y expediente de nutrición) ---------- */
  const planActual = planes.find((plan) => plan.estatus === 'Vigente') ?? planes[0] ?? null;

  const descargar = async (documento: 'avance' | 'expediente') => {
    setDescargando(documento);
    try {
      if (documento === 'avance') {
        // El avance se mide desde el inicio del plan hasta hoy
        const inicio = planActual?.fechaInicio ?? '';
        const medicionesPlan = inicio
          ? seguimiento.filter((registro) => registro.fecha.slice(0, 10) >= inicio)
          : seguimiento;
        await generarAvancePesoPDF({
          paciente,
          plan: planActual,
          mediciones: medicionesPlan,
          sesiones,
        });
        mostrar('Avance de peso y talla descargado.');
      } else {
        await generarExpedienteNutricionPDF({
          paciente,
          plan: planActual,
          planes,
          mediciones: seguimiento,
          sesiones,
        });
        mostrar('Expediente de nutrición descargado.');
      }
    } catch {
      mostrar('No se pudo generar el documento. Intenta de nuevo.', 'error');
    } finally {
      setDescargando(null);
    }
  };

  /* ---------- Avance de peso y talla ---------- */
  const pesoActual = [...seguimiento].reverse().find((r) => r.peso != null)?.peso ?? null;
  const tallaActual = [...seguimiento].reverse().find((r) => r.talla != null)?.talla ?? null;
  const pesos = seguimiento.filter((r) => r.peso != null);
  const variacionPeso =
    pesos.length > 1 ? (pesos[pesos.length - 1]?.peso ?? 0) - (pesos[0]?.peso ?? 0) : 0;

  const columnasSeguimiento: Column<RegistroSeguimiento>[] = [
    {
      key: 'fecha',
      header: 'Fecha',
      className: 'w-48',
      render: (registro) => (
        <div>
          <p className="text-gray-900">{registro.fecha}</p>
          <p className="text-sm text-gray-500">Sesión de nutrición</p>
        </div>
      ),
    },
    {
      key: 'peso',
      header: 'Peso',
      align: 'right',
      className: 'w-32 tabular-nums',
      render: (registro) => (registro.peso != null ? `${registro.peso} kg` : '—'),
    },
    {
      key: 'talla',
      header: 'Talla',
      align: 'right',
      className: 'w-32 tabular-nums',
      render: (registro) => (registro.talla != null ? `${registro.talla} m` : '—'),
    },
  ];

  const columnasSesiones: Column<ConsultaResumen>[] = [
    {
      key: 'fecha',
      header: 'Fecha',
      className: 'w-48',
      render: (consulta) => (
        <div>
          <p className="text-gray-900">{consulta.fechaHora}</p>
          <p className="text-sm text-gray-500">{consulta.cita.motivo}</p>
        </div>
      ),
    },
    {
      key: 'diagnostico',
      header: 'Diagnóstico nutricional',
      render: (consulta) => consulta.diagnostico || '—',
    },
    {
      key: 'tratamiento',
      header: 'Indicaciones',
      render: (consulta) => consulta.tratamiento || '—',
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
        title="Ficha de nutrición"
        subtitle={paciente.nombre}
        meta={
          <div className="flex flex-wrap items-center gap-3">
            <Button
              icon={Download}
              loading={descargando === 'avance'}
              disabled={descargando !== null}
              onClick={() => void descargar('avance')}
            >
              Avance (PDF)
            </Button>
            <Button
              icon={Download}
              loading={descargando === 'expediente'}
              disabled={descargando !== null}
              onClick={() => void descargar('expediente')}
            >
              Expediente de nutrición (PDF)
            </Button>
            <Button variant="secondary" icon={ArrowLeft} onClick={onVolver}>
              Volver a planes
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
        <FichaPaciente expediente={paciente} />

        {/* ===== Plan alimenticio ===== */}
        <Card
          title="Plan alimenticio"
          icon={ClipboardCheck}
          description="Dietas, calorías diarias y vigencia de cada plan"
        >
          <div className="flex justify-end mb-4">
            <Button icon={Plus} onClick={() => abrirFormulario(null)}>
              Nuevo plan
            </Button>
          </div>

          {mostrarFormulario && (
            <form onSubmit={(e) => void guardarPlan(e)} className="mb-6 space-y-4" noValidate>
              <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-5">
                <h4 className="font-semibold text-gray-900 mb-4">
                  {planAEditar ? 'Editar plan alimenticio' : 'Nuevo plan alimenticio'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Fecha de inicio" error={errorVisible('fechaInicio')}>
                    <Input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => {
                        setFechaInicio(e.target.value);
                        marcarTocado('fechaInicio');
                      }}
                      onBlur={() => marcarTocado('fechaInicio')}
                      aria-invalid={errorVisible('fechaInicio') ? true : undefined}
                    />
                  </Field>
                  <Field label="Fecha de fin" error={errorVisible('fechaFin')}>
                    <Input
                      type="date"
                      value={fechaFin}
                      min={fechaInicio || undefined}
                      onChange={(e) => {
                        setFechaFin(e.target.value);
                        marcarTocado('fechaFin');
                      }}
                      onBlur={() => marcarTocado('fechaFin')}
                      aria-invalid={errorVisible('fechaFin') ? true : undefined}
                    />
                  </Field>
                  <Field label="Calorías diarias" error={errorVisible('caloriasDiarias')}>
                    <Input
                      type="number"
                      min={500}
                      max={10000}
                      value={caloriasDiarias}
                      onChange={(e) => {
                        setCaloriasDiarias(e.target.value);
                        marcarTocado('caloriasDiarias');
                      }}
                      onBlur={() => marcarTocado('caloriasDiarias')}
                      placeholder="Ej. 1500"
                      className="tabular-nums"
                      aria-invalid={errorVisible('caloriasDiarias') ? true : undefined}
                    />
                  </Field>
                  <Field
                    label="Descripción de la dieta"
                    className="md:col-span-3"
                    error={errorVisible('descripcionDieta')}
                  >
                    <Textarea
                      rows={3}
                      value={descripcionDieta}
                      onChange={(e) => {
                        setDescripcionDieta(e.target.value);
                        marcarTocado('descripcionDieta');
                      }}
                      onBlur={() => marcarTocado('descripcionDieta')}
                      placeholder="Ej. Desayuno: avena con fruta; comida: pollo a la plancha con ensalada…"
                      aria-invalid={errorVisible('descripcionDieta') ? true : undefined}
                    />
                  </Field>
                </div>

                {(errorGeneral || hayErrores) && (
                  <div
                    role="alert"
                    className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  >
                    <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                      {errorGeneral ||
                        'Revisa los campos marcados antes de guardar: hay datos inválidos.'}
                    </span>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-4">
                  <Button
                    variant="secondary"
                    icon={X}
                    type="button"
                    disabled={guardando}
                    onClick={() => {
                      setMostrarFormulario(false);
                      setPlanAEditar(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" icon={Save} loading={guardando} disabled={guardando}>
                    {planAEditar ? 'Guardar cambios' : 'Crear plan'}
                  </Button>
                </div>
              </div>
            </form>
          )}

          <EstadoVista cargando={cargando} textoCargando="Cargando planes…">
            {planes.length === 0 ? (
              <p className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
                Este paciente aún no tiene planes alimenticios registrados.
              </p>
            ) : (
              <ul className="space-y-4">
                {planes.map((plan) => (
                  <li key={plan.id} className="rounded-xl border border-gray-200 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge status={ESTILOS_PLAN[plan.estatus] ?? 'neutral'}>
                            {plan.estatus}
                          </Badge>
                          <span className="text-sm text-gray-500 tabular-nums">
                            {fechaCorta(plan.fechaInicio)} – {fechaCorta(plan.fechaFin)}
                          </span>
                          <span className="text-sm font-medium text-brand-700 tabular-nums">
                            {plan.caloriasDiarias} kcal/día
                          </span>
                        </div>
                        <p className="text-gray-800 whitespace-pre-line">{plan.descripcionDieta}</p>
                        <p className="text-xs text-gray-400 mt-2">Plan de {plan.personal}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {plan.estatus !== 'Finalizado' && plan.estatus !== 'Cancelado' && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={Pencil}
                              onClick={() => abrirFormulario(plan)}
                            >
                              Editar
                            </Button>
                            {plan.estatus === 'Vigente' && (
                              <Button
                                size="sm"
                                icon={CheckCircle2}
                                onClick={() => void cambiarEstatus(plan, 'Finalizado')}
                              >
                                Finalizar
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={XCircle}
                              onClick={() => setPlanACancelar(plan)}
                            >
                              Cancelar plan
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </EstadoVista>
        </Card>

        {/* ===== Avance de peso y talla ===== */}
        <Card
          title="Avance de peso y talla"
          icon={TrendingUp}
          description="Mediciones capturadas en tus sesiones de nutrición"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard icon={TrendingUp} label="Peso actual" value={pesoActual != null ? `${pesoActual} kg` : '—'} />
            <StatCard icon={TrendingUp} label="Talla actual" value={tallaActual != null ? `${tallaActual} m` : '—'} />
            <StatCard
              icon={TrendingUp}
              label="Variación de peso"
              value={`${variacionPeso > 0 ? '+' : ''}${variacionPeso.toFixed(1)} kg`}
              detail={pesos.length > 1 ? `entre ${pesos.length} mediciones` : 'pendiente de más mediciones'}
              highlight={Math.abs(variacionPeso) > 0}
            />
          </div>

          <DataTable
            columns={columnasSeguimiento}
            rows={seguimiento}
            rowKey={(registro) => registro.fecha}
            emptyMessage="Sin mediciones: aparecerán al capturar peso y talla en las sesiones de nutrición."
          />
        </Card>

        {/* ===== Historial de sesiones ===== */}
        <Card title="Historial de sesiones" icon={FileText}>
          <EstadoVista cargando={cargando} textoCargando="Cargando sesiones…">
            <DataTable
              columns={columnasSesiones}
              rows={sesiones}
              rowKey={(consulta) => consulta.id}
              emptyMessage="Este paciente aún no tiene sesiones de nutrición registradas."
            />
          </EstadoVista>
        </Card>
      </div>

      {/* Confirmación de cancelación del plan */}
      {planACancelar && (
        <Modal
          titulo="¿Cancelar el plan alimenticio?"
          descripcion={`El plan del ${fechaCorta(planACancelar.fechaInicio)} al ${fechaCorta(
            planACancelar.fechaFin,
          )} quedará cancelado.`}
          icono={CircleAlert}
          onCerrar={() => setPlanACancelar(null)}
          acciones={
            <>
              <Button variant="secondary" onClick={() => setPlanACancelar(null)} disabled={guardando}>
                Volver
              </Button>
              <Button
                variant="danger"
                icon={XCircle}
                loading={guardando}
                onClick={() => void cambiarEstatus(planACancelar, 'Cancelado')}
              >
                Sí, cancelar plan
              </Button>
            </>
          }
        >
          <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            El plan se conservará en el historial con estatus cancelado.
          </p>
        </Modal>
      )}

      {/* Resultado de la última acción */}
      {resultado && (
        <ModalResultado
          titulo={resultado.titulo}
          mensaje={resultado.mensaje}
          tipo={resultado.tipo}
          onCerrar={() => setResultado(null)}
        />
      )}

      <DetalleConsulta
        consulta={detalle}
        cargando={cargandoDetalle}
        onCerrar={() => setDetalle(null)}
      />
    </div>
  );
}
