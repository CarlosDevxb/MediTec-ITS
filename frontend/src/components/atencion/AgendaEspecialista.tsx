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
  Stethoscope,
} from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
import AgendaPorDia from './AgendaPorDia';
import ReagendarCita from './ReagendarCita';
import EstadoVista from '../ui/EstadoVista';
import Modal from '../ui/Modal';
import { Field, Input, Select } from '../ui/Input';
import { detallesDe, mensajeDeError } from '../../services/api';
import { obtenerPerfil } from '../../services/auth.service';
import {
  listarCitas,
  crearCita,
  cambiarEstatusCita,
  hoyISO,
  fechaCorta,
  diaDeSemana,
  rangosDeDia,
  horasDisponiblesPara,
  diasDisponiblesPara,
  SEPARACION_MINIMA,
  type Cita,
  type ExpedientePaciente,
} from '../../services/atencion.service';
import { listarHorarios, nombreDeDia, type Horario } from '../../services/operacion.service';
import SelectorPaciente from './SelectorPaciente';

/* ============================================================
   AGENDA (NUTRICIÓN) · Citas de la nutrióloga con sus reglas:
   dentro de su horario laboral, sin juntarse ni empalmar y con
   al menos 30 minutos de respiro entre cada cita (sesión de 30
   min → las citas quedan cada 60 minutos). También puede
   confirmar, completar, cancelar y **atender** sus citas.
   ============================================================ */

export interface AgendaEspecialistaProps {
  /** Lleva a la vista de atención con la cita elegida */
  onAtender: (cita: Cita) => void;
}

export default function AgendaEspecialista({ onAtender }: AgendaEspecialistaProps) {
  const [citas, setCitas] = useState<Cita[]>([]);
  /** Ficha de personal de la nutrióloga en sesión */
  const [personalMedicoId, setPersonalMedicoId] = useState<number | null>(null);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  /** Cita elegida para reagendar (cambio de fecha y hora) */
  const [citaAReagendar, setCitaAReagendar] = useState<Cita | null>(null);

  /* Alta de cita */
  const [paciente, setPaciente] = useState<ExpedientePaciente | null>(null);
  const [fechaCita, setFechaCita] = useState(hoyISO());
  const [hora, setHora] = useState('');
  const [motivo, setMotivo] = useState('');
  const [tipo, setTipo] = useState<'Programada' | 'Emergencia'>('Programada');
  const [tocado, setTocado] = useState<Record<string, boolean>>({});
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  /** Cita pendiente de cancelar (espera confirmación en el modal) */
  const [pendiente, setPendiente] = useState<Cita | null>(null);

  const { aviso, tipo: tipoAviso, mostrar, cerrar } = useAviso();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [perfil, lista, listaHorarios] = await Promise.all([
        obtenerPerfil().catch(() => null),
        listarCitas(),
        listarHorarios(),
      ]);
      const miFicha = perfil?.personalMedicoId ?? null;
      setPersonalMedicoId(miFicha);
      setHorarios(
        miFicha ? listaHorarios.filter((horario) => horario.personalMedicoId === miFicha) : [],
      );
      setCitas(miFicha ? lista.filter((cita) => cita.personalMedicoId === miFicha) : lista);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* ---------- Disponibilidad para la fecha del alta ---------- */
  const citasDelDia = useMemo(
    () =>
      citas.filter(
        (cita) => cita.fecha === fechaCita && cita.estatus !== 'Cancelada',
      ),
    [citas, fechaCita],
  );
  const rangos = useMemo(() => rangosDeDia(horarios, fechaCita), [horarios, fechaCita]);
  // Cada cita dura 30 minutos con 30 de respiro: horas cada 60 min
  const horasDisponibles = useMemo(
    () => horasDisponiblesPara(rangos, citasDelDia, fechaCita),
    [rangos, citasDelDia, fechaCita],
  );
  /** Solo se puede elegir fecha en los días con horario de atención */
  const fechasDisponibles = useMemo(() => diasDisponiblesPara(horarios), [horarios]);

  useEffect(() => {
    if (horasDisponibles.length > 0 && !horasDisponibles.includes(hora)) {
      setHora(horasDisponibles[0] ?? '');
    }
    if (horasDisponibles.length === 0) setHora('');
  }, [horasDisponibles, hora]);

  // Si la fecha elegida deja de estar disponible, se selecciona la primera
  useEffect(() => {
    if (fechasDisponibles.length > 0 && !fechasDisponibles.includes(fechaCita)) {
      setFechaCita(fechasDisponibles[0] ?? hoyISO());
    }
  }, [fechasDisponibles, fechaCita]);

  /* ---------- Validación en tiempo real del alta ---------- */
  const errores = useMemo(() => {
    const calculados: Record<string, string> = {};
    calculados.paciente = paciente ? '' : 'Selecciona un paciente.';
    calculados.fechaCita = !fechaCita
      ? 'Indica la fecha de la cita.'
      : fechaCita < hoyISO()
        ? 'La fecha no puede ser pasada.'
        : '';
    calculados.hora =
      rangos.length === 0
        ? 'No tienes horario registrado ese día.'
        : !horasDisponibles.includes(hora)
          ? 'Elige una hora disponible (las citas duran 30 min con 30 de respiro).'
          : '';
    calculados.motivo = motivo.trim()
      ? motivo.trim().length > 255
        ? 'El motivo no puede exceder 255 caracteres.'
        : ''
      : 'Indica el motivo de la cita.';
    return calculados;
  }, [paciente, fechaCita, hora, motivo, rangos, horasDisponibles]);

  const errorVisible = (campo: string): string | undefined => {
    const propio = errores[campo];
    if (propio) return tocado[campo] ? propio : erroresServidor[campo] || undefined;
    return erroresServidor[campo] || undefined;
  };
  const hayErrores = Object.values(errores).some(Boolean);
  const marcarTocado = (campo: string) => setTocado((prev) => ({ ...prev, [campo]: true }));

  /* ---------- Alta de la cita ---------- */
  const guardarCita = async (e: React.FormEvent) => {
    e.preventDefault();
    setTocado({ paciente: true, fechaCita: true, hora: true, motivo: true });
    setErroresServidor({});
    setErrorGeneral('');
    if (hayErrores || !personalMedicoId) return;

    setGuardando(true);
    try {
      const cita = await crearCita({
        pacienteId: paciente!.id,
        personalMedicoId,
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
   * Acciones de cada cita: **atender solo las del día de hoy** (las demás se
   * atienden el día que fueron agendadas); reagendar, confirmar y cancelar
   * sí aplican a las citas por venir.
   */
  const accionesDeCita = (cita: Cita, esHoy: boolean) => {
    const atendible = cita.estatus === 'Pendiente' || cita.estatus === 'Confirmada';
    return (
      <>
        <Button
          size="sm"
          icon={Stethoscope}
          disabled={!esHoy || !atendible}
          title={esHoy ? undefined : 'Solo se pueden atender las citas del día de hoy'}
          onClick={() => onAtender(cita)}
        >
          Atender
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={CalendarDays}
          disabled={!atendible}
          onClick={() => setCitaAReagendar(cita)}
        >
          Reagendar
        </Button>
        {cita.estatus === 'Pendiente' && (
          <Button
            size="sm"
            variant="secondary"
            icon={CheckCircle2}
            onClick={() => void cambiarEstatus(cita, 'Confirmada')}
          >
            Confirmar
          </Button>
        )}
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
    <div className="entrada p-10 xl:p-12 max-w-7xl mx-auto font-sans">
      <PageHeader
        title="Agenda"
        subtitle="Tus citas: sesiones de 30 minutos con 30 de respiro entre cada una"
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
              <Field label="Tipo de cita" hint="La atención de llegada no aplica en nutrición.">
                <Select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as 'Programada' | 'Emergencia')}
                >
                  <option value="Programada">Programada</option>
                  <option value="Emergencia">Emergencia</option>
                </Select>
              </Field>
              <Field
                label="Fecha"
                error={errorVisible('fechaCita')}
                hint="Solo días con horario de atención registrado."
              >
                <Select
                  value={fechasDisponibles.includes(fechaCita) ? fechaCita : ''}
                  onChange={(e) => {
                    setFechaCita(e.target.value);
                    marcarTocado('fechaCita');
                  }}
                  onBlur={() => marcarTocado('fechaCita')}
                  aria-invalid={errorVisible('fechaCita') ? true : undefined}
                >
                  <option value="">
                    {fechasDisponibles.length === 0
                      ? 'Sin días con horario…'
                      : 'Selecciona un día…'}
                  </option>
                  {fechasDisponibles.map((fechaOpcion) => (
                    <option key={fechaOpcion} value={fechaOpcion}>
                      {nombreDeDia(diaDeSemana(fechaOpcion))} {fechaCorta(fechaOpcion)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Hora"
                error={errorVisible('hora')}
                hint={`Cada ${SEPARACION_MINIMA} minutos (sesión de 30 min + respiro).`}
              >
                <Select
                  value={horasDisponibles.includes(hora) ? hora : ''}
                  onChange={(e) => {
                    setHora(e.target.value);
                    marcarTocado('hora');
                  }}
                  onBlur={() => marcarTocado('hora')}
                  aria-invalid={errorVisible('hora') ? true : undefined}
                >
                  <option value="">
                    {horasDisponibles.length === 0
                      ? 'Sin horas disponibles…'
                      : 'Selecciona una hora…'}
                  </option>
                  {horasDisponibles.map((horaOpcion) => (
                    <option key={horaOpcion} value={horaOpcion}>
                      {horaOpcion}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Motivo" error={errorVisible('motivo')}>
                <Input
                  value={motivo}
                  onChange={(e) => {
                    setMotivo(e.target.value);
                    marcarTocado('motivo');
                  }}
                  onBlur={() => marcarTocado('motivo')}
                  placeholder="Ej. Primera consulta nutricional"
                  maxLength={255}
                  aria-invalid={errorVisible('motivo') ? true : undefined}
                />
              </Field>
            </div>

            {/* Disponibilidad del día elegido */}
            <div className="mt-4">
              {rangos.length > 0 ? (
                <>
                  <p className="text-sm font-medium text-gray-600 mb-2">Tu horario de ese día:</p>
                  <ul className="flex flex-wrap gap-2">
                    {rangos.map((rango) => (
                      <li key={`${rango.inicio}-${rango.fin}`}>
                        <Badge status="confirmed">
                          {rango.inicio} – {rango.fin}
                        </Badge>
                      </li>
                    ))}
                    {citasDelDia.length > 0 && (
                      <li>
                        <Badge status="pending">{citasDelDia.length} cita(s) ocupada(s)</Badge>
                      </li>
                    )}
                  </ul>
                </>
              ) : (
                <p
                  role="alert"
                  className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800"
                >
                  No tienes horario registrado para ese día. Regístralo desde la sección Horarios
                  del panel de administración.
                </p>
              )}
            </div>

            {(errorGeneral || hayErrores) && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  {errorGeneral ||
                    'Revisa los campos marcados antes de guardar: hay datos inválidos o incompletos.'}
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
            vacio="No hay citas programadas. Da de alta una cita para verla agrupada por día."
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
            La cita quedará registrada como cancelada y su horario volverá a estar disponible.
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
