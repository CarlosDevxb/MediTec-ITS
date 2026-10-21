import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
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
import DataTable from '../ui/DataTable';
import EstadoVista from '../ui/EstadoVista';
import Modal from '../ui/Modal';
import type { Column } from '../ui/DataTable';
import { Field, Input, Select } from '../ui/Input';
import { detallesDe, mensajeDeError } from '../../services/api';
import {
  listarCitas,
  crearCita,
  cambiarEstatusCita,
  hoyISO,
  type Cita,
  type ExpedientePaciente,
} from '../../services/atencion.service';
import {
  listarPersonalMedico,
  type PersonalMedico,
} from '../../services/operacion.service';
import SelectorPaciente from '../atencion/SelectorPaciente';

/* ============================================================
   AGENDA (ENFERMERÍA) · Registro de citas programadas o de
   emergencia y seguimiento de su estatus. Las atenciones sin
   cita previa se registran desde el panel del doctor (allí el
   sistema crea la auto-cita 'Atención directa').
   ============================================================ */

const ESTILOS_ESTATUS: Record<string, 'pending' | 'confirmed' | 'cancelled' | 'completed'> = {
  Pendiente: 'pending',
  Confirmada: 'confirmed',
  Cancelada: 'cancelled',
  Completada: 'completed',
};

export default function AgendaEnfermeria() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [personal, setPersonal] = useState<PersonalMedico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [fecha, setFecha] = useState(hoyISO());
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  /* Alta de cita */
  const [paciente, setPaciente] = useState<ExpedientePaciente | null>(null);
  const [personalId, setPersonalId] = useState('');
  const [fechaCita, setFechaCita] = useState(hoyISO());
  const [hora, setHora] = useState('09:00');
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
      const [lista, listaPersonal] = await Promise.all([
        listarCitas({ fecha }),
        listarPersonalMedico(),
      ]);
      setCitas(lista);
      setPersonal(listaPersonal);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* ---------- Validación en tiempo real del alta ---------- */
  const errores = useMemo(() => {
    const calculados: Record<string, string> = {};
    calculados.paciente = paciente ? '' : 'Selecciona un paciente.';
    calculados.personalId = personalId ? '' : 'Selecciona al profesional de la salud.';
    calculados.fechaCita = !fechaCita
      ? 'Indica la fecha de la cita.'
      : fechaCita < hoyISO()
        ? 'La fecha no puede ser pasada.'
        : '';
    calculados.hora = /^([01]\d|2[0-3]):[0-5]\d$/.test(hora)
      ? ''
      : 'La hora debe tener el formato HH:mm.';
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
      setFecha(fechaCita);
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

  const citasOrdenadas = useMemo(
    () => [...citas].sort((a, b) => a.hora.localeCompare(b.hora)),
    [citas],
  );

  const columnas: Column<Cita>[] = [
    { key: 'hora', header: 'Hora', className: 'w-24 tabular-nums' },
    {
      key: 'paciente',
      header: 'Paciente',
      render: (cita) => (
        <div>
          <p className="font-semibold text-gray-900">{cita.paciente}</p>
          <p className="text-sm text-gray-500 tabular-nums">{cita.numeroControl}</p>
        </div>
      ),
    },
    { key: 'motivo', header: 'Motivo' },
    {
      key: 'personal',
      header: 'Con',
      className: 'w-52',
      render: (cita) => (
        <div>
          <p className="text-gray-800">{cita.personal}</p>
          <p className="text-sm text-gray-500">{cita.especialidad}</p>
        </div>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      className: 'w-36',
      render: (cita) => <Badge status="scheduled">{cita.tipo}</Badge>,
    },
    {
      key: 'estatus',
      header: 'Estatus',
      className: 'w-36',
      render: (cita) => (
        <Badge status={ESTILOS_ESTATUS[cita.estatus] ?? 'neutral'}>{cita.estatus}</Badge>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'right',
      className: 'w-56',
      render: (cita) => {
        const atendible = cita.estatus === 'Pendiente' || cita.estatus === 'Confirmada';
        return (
          <div className="flex items-center justify-end gap-2">
            {cita.estatus === 'Pendiente' && (
              <Button
                size="sm"
                icon={CheckCircle2}
                onClick={() => void cambiarEstatus(cita, 'Confirmada')}
              >
                Confirmar
              </Button>
            )}
            {cita.estatus === 'Confirmada' && (
              <Button
                size="sm"
                icon={CheckCircle2}
                onClick={() => void cambiarEstatus(cita, 'Completada')}
              >
                Completar
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
          </div>
        );
      },
    },
  ];

  return (
    <div className="entrada p-10 xl:p-12 max-w-7xl mx-auto font-sans">
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
              <Field label="Profesional de la salud" error={errorVisible('personalId')}>
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
                  {personal.map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.nombre} · {persona.especialidad}
                    </option>
                  ))}
                </Select>
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
              <Field label="Fecha" error={errorVisible('fechaCita')}>
                <Input
                  type="date"
                  value={fechaCita}
                  min={hoyISO()}
                  onChange={(e) => {
                    setFechaCita(e.target.value);
                    marcarTocado('fechaCita');
                  }}
                  onBlur={() => marcarTocado('fechaCita')}
                  aria-invalid={errorVisible('fechaCita') ? true : undefined}
                />
              </Field>
              <Field label="Hora" error={errorVisible('hora')}>
                <Input
                  type="time"
                  value={hora}
                  onChange={(e) => {
                    setHora(e.target.value);
                    marcarTocado('hora');
                  }}
                  onBlur={() => marcarTocado('hora')}
                  className="tabular-nums"
                  aria-invalid={errorVisible('hora') ? true : undefined}
                />
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
            <div className="w-56">
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                aria-label="Fecha de la agenda"
              />
            </div>
            <Badge status="scheduled">{citas.length} citas</Badge>
            <Button variant="ghost" icon={RefreshCw} onClick={() => void cargar()}>
              Actualizar
            </Button>
          </div>

          <DataTable
            columns={columnas}
            rows={citasOrdenadas}
            rowKey={(cita) => cita.id}
            emptyMessage="No hay citas registradas para este día."
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
    </div>
  );
}
