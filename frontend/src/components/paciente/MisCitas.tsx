import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, CalendarDays, Plus, XCircle, CircleAlert, RefreshCw, Save } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
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
import AgendaPorDia from '../atencion/AgendaPorDia';
import ReagendarCita from '../atencion/ReagendarCita';
import SelectorCita from '../atencion/SelectorCita';

/* ============================================================
   MIS CITAS (PACIENTE) · El paciente agenda sus citas con el
   personal de Odontología y Nutrición respetando las mismas
   reglas de la agenda: dentro del horario de atención, en días
   con horario, sin juntarse ni empalmarse (30 + 30) y sin
   agendar en el pasado. Sus citas nacen **Pendientes** hasta que
   el especialista las confirme; solo él puede cancelarlas.
   ============================================================ */

const ESTILOS_ESTATUS: Record<string, 'pending' | 'confirmed' | 'cancelled' | 'completed'> = {
  Pendiente: 'pending',
  Confirmada: 'confirmed',
  Cancelada: 'cancelled',
  Completada: 'completed',
};

/** Especialidades con agenda para el paciente (Odontología y Nutrición) */
const especialidadAgendable = (especialidad: string): boolean => {
  const texto = especialidad
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return texto.includes('odontolog') || texto.includes('nutriolog') || texto.includes('nutricion');
};

export interface MisCitasProps {
  /** Expediente propio del paciente (para agendar sus citas) */
  expediente: ExpedientePaciente;
}

export default function MisCitas({ expediente }: MisCitasProps) {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [especialistas, setEspecialistas] = useState<PersonalMedico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  /* Alta de cita */
  const [especialistaId, setEspecialistaId] = useState('');
  const [fechaCita, setFechaCita] = useState(hoyISO());
  const [hora, setHora] = useState('');
  const [motivo, setMotivo] = useState('');
  const [tipo, setTipo] = useState<'Programada' | 'Emergencia'>('Programada');
  const [tocado, setTocado] = useState<Record<string, boolean>>({});
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  /** Cita propia pendiente de cancelar (confirmación) */
  const [pendiente, setPendiente] = useState<Cita | null>(null);
  /** Cita propia elegida para reagendar (cambio de fecha y hora) */
  const [citaAReagendar, setCitaAReagendar] = useState<Cita | null>(null);

  const { aviso, tipo: tipoAviso, mostrar, cerrar } = useAviso();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [lista, listaPersonal] = await Promise.all([
        listarCitas(),
        listarPersonalMedico(),
      ]);
      // La API solo devuelve las citas propias del paciente
      setCitas(lista);
      setEspecialistas(listaPersonal.filter((persona) => especialidadAgendable(persona.especialidad)));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* ---------- Disponibilidad del especialista elegido ----------
     Con un solo especialista el selector lo elige solo (ver hooks/):
     evita el campo que "se ve seleccionado" pero no lo está. */
  useOpcionUnica(especialistas, especialistaId, (id) => setEspecialistaId(String(id)));

  /* ---------- Validación en tiempo real ----------
     El día y la hora los garantiza `SelectorCita` (la disponibilidad la
     calcula el servidor): aquí solo se comprueba que haya elección. */
  const errores = useMemo(() => {
    const calculados: Record<string, string> = {};
    calculados.especialistaId = especialistaId
      ? ''
      : 'Selecciona al especialista de Odontología o Nutrición.';
    calculados.fechaCita = !especialistaId
      ? 'Selecciona primero al especialista.'
      : !fechaCita
        ? 'Elige un día disponible.'
        : '';
    calculados.hora = !hora ? 'Elige una hora disponible.' : '';
    calculados.motivo = motivo.trim()
      ? motivo.trim().length > 255
        ? 'El motivo no puede exceder 255 caracteres.'
        : ''
      : 'Indica el motivo de la cita.';
    return calculados;
  }, [especialistaId, fechaCita, hora, motivo]);

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
    setTocado({ especialistaId: true, fechaCita: true, hora: true, motivo: true });
    setErroresServidor({});
    setErrorGeneral('');
    if (hayErrores) return;

    setGuardando(true);
    try {
      // El paciente solo agenda para sí mismo: la API lo revalida
      const cita = await crearCita({
        pacienteId: expediente.id,
        personalMedicoId: Number(especialistaId),
        fecha: fechaCita,
        hora,
        motivo: motivo.trim(),
        tipo,
      });
      mostrar(
        `Cita solicitada para el ${fechaCorta(cita.fecha)} a las ${cita.hora}. Queda pendiente de confirmación.`,
      );
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

  /* ---------- Cancelar una cita propia ---------- */
  const cancelarCita = async () => {
    if (!pendiente) return;
    setGuardando(true);
    try {
      const cita = await cambiarEstatusCita(pendiente.id, 'Cancelada');
      setCitas((prev) => prev.map((c) => (c.id === cita.id ? cita : c)));
      mostrar(`Tu cita del ${fechaCorta(cita.fecha)} a las ${cita.hora} fue cancelada.`);
      setPendiente(null);
    } catch (e) {
      mostrar(mensajeDeError(e), 'error');
      setPendiente(null);
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Acciones sobre cada cita ---------- */
  const accionesDeCita = (cita: Cita) => {
    const cancelable = cita.estatus === 'Pendiente' || cita.estatus === 'Confirmada';
    return (
      <>
        <Button
          size="sm"
          variant="secondary"
          icon={CalendarDays}
          disabled={!cancelable}
          title={cancelable ? undefined : 'Solo puedes reagendar citas pendientes o confirmadas'}
          onClick={() => setCitaAReagendar(cita)}
        >
          Reagendar
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={XCircle}
          disabled={!cancelable}
          title={cancelable ? undefined : 'Solo puedes cancelar citas pendientes o confirmadas'}
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
        title="Mis citas"
        subtitle="Agenda con Odontología y Nutrición: sesiones de 30 minutos con 30 de respiro"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Especialista"
                error={errorVisible('especialistaId')}
                hint="Puedes agendar con Odontología o Nutrición."
              >
                <Select
                  value={especialistaId}
                  onChange={(e) => {
                    setEspecialistaId(e.target.value);
                    marcarTocado('especialistaId');
                  }}
                  onBlur={() => marcarTocado('especialistaId')}
                  aria-invalid={errorVisible('especialistaId') ? true : undefined}
                >
                  <option value="">Selecciona…</option>
                  {especialistas.map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.nombre} · {persona.especialidad}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tipo de cita">
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
                  placeholder="Ej. Revisión dental de rutina"
                  maxLength={255}
                  aria-invalid={errorVisible('motivo') ? true : undefined}
                />
              </Field>
            </div>

            {/* Elección de día y hora: solo días útiles y huecos visibles */}
            <div className="mt-5">
              <SelectorCita
                personalMedicoId={especialistaId ? Number(especialistaId) : null}
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
                Solicitar cita
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

          {/* Mis citas agrupadas por día (anteriores hasta el final) */}
          <AgendaPorDia
            citas={citas}
            acciones={(cita) => accionesDeCita(cita)}
            vacio="No tienes citas registradas. Agenda una cita para verla aquí."
          />
        </>
      </EstadoVista>

      {/* Confirmación de cancelación */}
      {pendiente && (
        <Modal
          titulo="¿Cancelar tu cita?"
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
                onClick={() => void cancelarCita()}
              >
                Sí, cancelar mi cita
              </Button>
            </>
          }
        >
          <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            El horario quedará libre y podrás agendar otra cita cuando quieras.
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
            mostrar(
              `Tu cita se reagendó al ${fechaCorta(cita.fecha)} a las ${cita.hora}. Queda pendiente de confirmación.`,
            );
          }}
        />
      )}
    </div>
  );
}
