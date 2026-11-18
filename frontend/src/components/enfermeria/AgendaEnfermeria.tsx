import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CalendarDays,
  Plus,
  CheckCircle2,
  XCircle,
  CircleAlert,
  RefreshCw,
  Save,
} from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
import AgendaPorDia from '../atencion/AgendaPorDia';
import ReagendarCita from '../atencion/ReagendarCita';
import EstadoVista from '../ui/EstadoVista';
import Modal from '../ui/Modal';
import { Field, Input, Select } from '../ui/Input';
import { detallesDe, mensajeDeError } from '../../services/api';
import { useOpcionUnica } from '../../hooks/useOpcionUnica';
import {
  listarCitas,
  crearCita,
  cambiarEstatusCita,
  hoyISO,
  fechaCorta,
  type Cita,
  type ExpedientePaciente,
} from '../../services/atencion.service';
import {
  listarPersonalMedico,
  type PersonalMedico,
} from '../../services/operacion.service';
import SelectorPaciente from '../atencion/SelectorPaciente';
import SelectorCita from '../atencion/SelectorCita';

/* ============================================================
   AGENDA (ENFERMERÍA) · Registro de citas con el personal de
   **Odontología y Nutrición** (el doctor y la enfermería atienden
   sin cita previa) y seguimiento de su estatus. La cita se
   valida contra los horarios registrados del especialista
   (tabla `horarios`) y contra sus citas ya ocupadas.
   ============================================================ */

/** Especialidades que se agendan desde la agenda de citas */
const especialidadEsDeCita = (especialidad: string): boolean => {
  const texto = especialidad
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return (
    texto.includes('odontolog') || texto.includes('nutriolog') || texto.includes('nutricion')
  );
};

export default function AgendaEnfermeria() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [personal, setPersonal] = useState<PersonalMedico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  /* Alta de cita */
  const [paciente, setPaciente] = useState<ExpedientePaciente | null>(null);
  const [personalId, setPersonalId] = useState('');
  const [fechaCita, setFechaCita] = useState(hoyISO());
  const [hora, setHora] = useState('');
  const [motivo, setMotivo] = useState('');
  const [tipo, setTipo] = useState<'Programada' | 'Emergencia'>('Programada');
  const [tocado, setTocado] = useState<Record<string, boolean>>({});
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  /** Cita pendiente de cancelar (espera confirmación en el modal) */
  const [pendiente, setPendiente] = useState<Cita | null>(null);
  /** Cita elegida para reagendar (cambio de fecha y hora) */
  const [citaAReagendar, setCitaAReagendar] = useState<Cita | null>(null);
  /** Disponibilidad del especialista (horarios registrados y citas ocupadas) */


  const { aviso, tipo: tipoAviso, mostrar, cerrar } = useAviso();

  /** Solo se agenda con el personal de Odontología y Nutrición */
  const personalCitas = useMemo(
    () => personal.filter((persona) => especialidadEsDeCita(persona.especialidad)),
    [personal],
  );

  // Con un solo especialista el selector lo elige solo (ver hooks/):
  // evita el campo que "se ve seleccionado" pero no lo está.
  useOpcionUnica(personalCitas, personalId, (id) => setPersonalId(String(id)));

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [lista, listaPersonal] = await Promise.all([
        listarCitas(),
        listarPersonalMedico(),
      ]);
      setCitas(lista);
      setPersonal(listaPersonal);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* ---------- Validación en tiempo real del alta ----------
     El día y la hora los garantiza `SelectorCita` (la disponibilidad
     la calcula el servidor): aquí solo se comprueba que haya llegado
     alguna elección. */
  const errores = useMemo(() => {
    const calculados: Record<string, string> = {};
    calculados.paciente = paciente ? '' : 'Selecciona un paciente.';
    calculados.personalId = personalId
      ? ''
      : 'Selecciona a un especialista en Odontología o Nutrición.';
    calculados.fechaCita = !fechaCita ? 'Elige un día disponible.' : '';
    calculados.hora = !personalId
      ? 'Selecciona al profesional para ver sus horarios.'
      : !hora
        ? 'Elige una hora disponible.'
        : '';
    calculados.motivo = motivo.trim()
      ? motivo.trim().length > 255
        ? 'El motivo no puede exceder 255 caracteres.'
        : ''
      : 'Indica el motivo de la cita.';
    return calculados;
  }, [paciente, personalId, fechaCita, hora, motivo]);

  const errorVisible = (campo: string): string | undefined => {
    const propio = errores[campo];
    if (propio) return tocado[campo] ? propio : erroresServidor[campo] || undefined;
    return erroresServidor[campo] || undefined;
  };
  const hayErrores = Object.values(errores).some(Boolean);
  /** El aviso de "completa los campos" solo se muestra si ya se intentó guardar */
  const huboIntento = Object.values(tocado).some(Boolean);
  const marcarTocado = (campo: string) => setTocado((prev) => ({ ...prev, [campo]: true }));

  /* ---------- Alta de la cita ---------- */
  const guardarCita = async (e: React.FormEvent) => {
    e.preventDefault();
    setTocado({ paciente: true, personalId: true, fechaCita: true, hora: true, motivo: true });
    setErroresServidor({});
    setErrorGeneral('');
    if (hayErrores) return;

    setGuardando(true);
    try {
      const cita = await crearCita({
        pacienteId: paciente!.id,
        personalMedicoId: Number(personalId),
        fecha: fechaCita,
        hora,
        motivo: motivo.trim(),
        tipo,
      });
      mostrar(`Cita creada para ${cita.paciente} el ${cita.fecha} a las ${cita.hora}.`);
      setPaciente(null);
      setMotivo('');
      setMostrarFormulario(false);
      setTocado({});
      await cargar();
    } catch (error) {
      const porCampo = detallesDe(error);
      if (Object.keys(porCampo).length > 0) setErroresServidor(porCampo);
      else setErrorGeneral(mensajeDeError(error));
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Cambios de estatus ---------- */
  const cambiarEstatus = async (cita: Cita, estatus: 'Confirmada' | 'Completada' | 'Cancelada') => {
    setGuardando(true);
    try {
      const actualizada = await cambiarEstatusCita(cita.id, estatus);
      setCitas((prev) => prev.map((c) => (c.id === actualizada.id ? actualizada : c)));
      mostrar(`Cita de ${actualizada.paciente} marcada como ${estatus.toLowerCase()}.`);
      setPendiente(null);
    } catch (e) {
      mostrar(mensajeDeError(e), 'error');
      setPendiente(null);
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Acciones de cada cita: confirmar y cancelar aplican a las citas por venir;
   * **completar solo las del día de hoy** (el resto se completan al registrar
   * su consulta, o se cancelan solas al cambiar de día).
   */
  const accionesDeCita = (cita: Cita, esHoy: boolean) => {
    const atendible = cita.estatus === 'Pendiente' || cita.estatus === 'Confirmada';
    return (
      <>
        {cita.estatus === 'Pendiente' && (
          <Button
            size="sm"
            icon={CheckCircle2}
            onClick={() => void cambiarEstatus(cita, 'Confirmada')}
          >
            Confirmar
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          icon={CalendarDays}
          disabled={!atendible}
          onClick={() => setCitaAReagendar(cita)}
        >
          Reagendar
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={CheckCircle2}
          disabled={!esHoy || !atendible}
          title={esHoy ? undefined : 'Solo se pueden completar las citas del día de hoy'}
          onClick={() => void cambiarEstatus(cita, 'Completada')}
        >
          Completar
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={XCircle}
          disabled={!atendible}
          onClick={() => setPendiente(cita)}
        >
          Cancelar
        </Button>
      </>
    );
  };

  return (
    <div className="entrada p-4 sm:p-6 lg:p-10 xl:p-12 max-w-7xl mx-auto font-sans">
      <PageHeader
        title="Agenda"
        subtitle="Citas programadas de la clínica"
        meta={
          <Button icon={Plus} onClick={() => setMostrarFormulario((valor) => !valor)}>
            {mostrarFormulario ? 'Ocultar formulario' : 'Nueva cita'}
          </Button>
        }
      />

      {aviso && <Aviso mensaje={aviso} tipo={tipoAviso} onCerrar={cerrar} />}

      {/* Alta de cita */}
      {mostrarFormulario && (
        <form onSubmit={(e) => void guardarCita(e)} className="mb-8 space-y-4" noValidate>
          <Card title="Datos de la cita" icon={CalendarClock}>
            <SelectorPaciente paciente={paciente} onChange={setPaciente} />
            {errorVisible('paciente') && (
              <p role="alert" className="mt-2 text-xs text-red-600 font-medium">
                {errorVisible('paciente')}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Field
                label="Especialista"
                error={errorVisible('personalId')}
                hint="Solo el personal de Odontología y Nutrición recibe citas."
              >
                {personalCitas.length === 0 ? (
                  <p className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                    No hay especialistas de Odontología o Nutrición registrados. Da de alta al
                    personal en la sección Usuarios.
                  </p>
                ) : (
                  <Select
                    value={personalId}
                    onChange={(e) => {
                      setPersonalId(e.target.value);
                      marcarTocado('personalId');
                    }}
                    onBlur={() => marcarTocado('personalId')}
                    aria-invalid={errorVisible('personalId') ? true : undefined}
                  >
                    <option value="">Selecciona…</option>
                    {personalCitas.map((persona) => (
                      <option key={persona.id} value={persona.id}>
                        {persona.nombre} · {persona.especialidad}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Tipo de cita" hint="La atención sin cita previa se registra en el panel del doctor.">
                <Select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as 'Programada' | 'Emergencia')}
                >
                  <option value="Programada">Programada</option>
                  <option value="Emergencia">Emergencia</option>
                </Select>
              </Field>
              <Field label="Motivo" className="md:col-span-2" error={errorVisible('motivo')}>
                <Input
                  value={motivo}
                  onChange={(e) => {
                    setMotivo(e.target.value);
                    marcarTocado('motivo');
                  }}
                  onBlur={() => marcarTocado('motivo')}
                  placeholder="Ej. Revisión de seguimiento"
                  maxLength={255}
                  aria-invalid={errorVisible('motivo') ? true : undefined}
                />
              </Field>
            </div>

            {/* Elección de día y hora: solo días útiles y huecos visibles */}
            <div className="mt-5">
              <SelectorCita
                personalMedicoId={personalId ? Number(personalId) : null}
                fecha={fechaCita}
                hora={hora}
                onFechaChange={(nueva) => {
                  setFechaCita(nueva);
                  marcarTocado('fechaCita');
                }}
                onHoraChange={(nueva) => {
                  setHora(nueva);
                  marcarTocado('hora');
                }}
              />
            </div>

            {(errorGeneral || (hayErrores && huboIntento)) && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  {errorGeneral || 'Completa los campos marcados antes de guardar.'}
                </span>
              </div>
            )}

            <div className="flex justify-end gap-4 mt-6">
              <Button
                variant="secondary"
                onClick={() => setMostrarFormulario(false)}
                disabled={guardando}
                type="button"
              >
                Cancelar
              </Button>
              <Button type="submit" icon={Save} loading={guardando} disabled={guardando}>
                Guardar cita
              </Button>
            </div>
          </Card>
        </form>
      )}

      <EstadoVista cargando={cargando} error={error} onReintentar={() => void cargar()}>
        <>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Badge status="scheduled">{citas.length} citas en total</Badge>
            <Button variant="ghost" icon={RefreshCw} onClick={() => void cargar()}>
              Actualizar
            </Button>
          </div>

          {/* Citas agrupadas por día (anteriores hasta el final) */}
          <AgendaPorDia
            citas={citas}
            acciones={accionesDeCita}
            vacio="No hay citas registradas. Da de alta una cita para verla agrupada por día."
          />
        </>
      </EstadoVista>

      {/* Confirmación de cancelación */}
      {pendiente && (
        <Modal
          titulo={`¿Cancelar la cita de ${pendiente.paciente}?`}
          descripcion={`Del ${pendiente.fecha} a las ${pendiente.hora} · ${pendiente.motivo}`}
          icono={CircleAlert}
          onCerrar={() => setPendiente(null)}
          acciones={
            <>
              <Button variant="secondary" onClick={() => setPendiente(null)} disabled={guardando}>
                Volver
              </Button>
              <Button
                variant="danger"
                icon={XCircle}
                loading={guardando}
                onClick={() => void cambiarEstatus(pendiente, 'Cancelada')}
              >
                Sí, cancelar
              </Button>
            </>
          }
        >
          <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            La cita quedará registrada como cancelada y no se podrá atender.
          </p>
        </Modal>
      )}

      {/* Reagendar: cambio de fecha y hora con las reglas de la agenda */}
      {citaAReagendar && (
        <ReagendarCita
          cita={citaAReagendar}
          onCerrar={() => setCitaAReagendar(null)}
          onGuardada={(cita) => {
            setCitas((prev) => prev.map((c) => (c.id === cita.id ? cita : c)));
            setCitaAReagendar(null);
            mostrar(`Cita reagendada al ${fechaCorta(cita.fecha)} a las ${cita.hora}.`);
          }}
        />
      )}
    </div>
  );
}
