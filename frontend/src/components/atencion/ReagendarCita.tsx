import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CircleAlert, Loader2, Save } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Field, Select } from '../ui/Input';
import { detallesDe, mensajeDeError } from '../../services/api';
import {
  reagendarCita,
  obtenerDisponibilidad,
  rangosDeDia,
  horasDisponiblesPara,
  diasDisponiblesPara,
  fechaCorta,
  diaDeSemana,
  hoyISO,
  SEPARACION_MINIMA,
  type Cita,
} from '../../services/atencion.service';
import { listarHorarios, nombreDeDia, type Horario } from '../../services/operacion.service';

/* ============================================================
   REAGENDAR CITA · Diálogo para cambiar la fecha y la hora de
   una cita respetando las reglas de la agenda: solo días con
   horario de atención del especialista, horas futuras y libres
   (sesión de 30 min con 30 de respiro).
   ============================================================ */

export interface ReagendarCitaProps {
  cita: Cita;
  /** Se llama con la cita ya reagendada (para refrescar la lista) */
  onGuardada: (cita: Cita) => void;
  onCerrar: () => void;
}

export default function ReagendarCita({ cita, onGuardada, onCerrar }: ReagendarCitaProps) {
  const [fecha, setFecha] = useState(cita.fecha);
  const [hora, setHora] = useState(cita.hora);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [ocupadas, setOcupadas] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [tocado, setTocado] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');

  /* Horario de atención del especialista de la cita */
  useEffect(() => {
    let vigente = true;
    listarHorarios({ personalMedicoId: cita.personalMedicoId })
      .then((lista) => {
        if (vigente) setHorarios(lista);
      })
      .catch((e) => {
        if (vigente) setErrorGeneral(mensajeDeError(e));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [cita.personalMedicoId]);

  /* Horas ocupadas del especialista en la fecha elegida */
  useEffect(() => {
    let vigente = true;
    obtenerDisponibilidad(cita.personalMedicoId, fecha)
      .then((datos) => {
        if (!vigente) return;
        // La propia cita no se considera ocupación al reagendarla
        setOcupadas(
          datos.horasOcupadas.filter(
            (ocupada) => !(cita.fecha === fecha && ocupada === cita.hora),
          ),
        );
      })
      .catch(() => {
        if (vigente) setOcupadas([]);
      });
    return () => {
      vigente = false;
    };
  }, [cita.fecha, cita.hora, cita.personalMedicoId, fecha]);

  /* Opciones disponibles según las reglas de la agenda */
  const fechasDisponibles = useMemo(() => diasDisponiblesPara(horarios), [horarios]);
  const rangos = useMemo(() => rangosDeDia(horarios, fecha), [horarios, fecha]);
  const horasDisponibles = useMemo(
    () =>
      horasDisponiblesPara(
        rangos,
        ocupadas.map((ocupada) => ({ hora: ocupada, estatus: 'Pendiente' })),
        fecha,
      ),
    [rangos, ocupadas, fecha],
  );

  // Si la hora elegida no está disponible, se selecciona la primera libre
  useEffect(() => {
    if (horasDisponibles.length > 0 && !horasDisponibles.includes(hora)) {
      setHora(horasDisponibles[0] ?? '');
    }
    if (horasDisponibles.length === 0) setHora('');
  }, [horasDisponibles, hora]);

  /* Validación en tiempo real */
  const errorFecha =
    fechasDisponibles.length === 0
      ? 'El especialista no tiene horario registrado.'
      : !fechasDisponibles.includes(fecha)
        ? 'Elige un día con horario de atención.'
        : '';
  const errorHora =
    rangos.length === 0
      ? 'No hay horario de atención ese día.'
      : !horasDisponibles.includes(hora)
        ? 'Elige una hora disponible (las citas duran 30 min con 30 de respiro).'
        : '';
  const hayErrores = Boolean(errorFecha || errorHora);

  const guardar = async () => {
    setTocado(true);
    setErrorGeneral('');
    if (hayErrores) return;

    setGuardando(true);
    try {
      onGuardada(await reagendarCita(cita.id, { fecha, hora }));
    } catch (error) {
      const porCampo = detallesDe(error);
      const mensajes = Object.values(porCampo);
      setErrorGeneral(mensajes.length > 0 ? mensajes.join(' ') : mensajeDeError(error));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      titulo="Reagendar cita"
      descripcion={`Cita actual: ${fechaCorta(cita.fecha)} a las ${cita.hora} · ${cita.motivo}`}
      icono={CalendarClock}
      onCerrar={onCerrar}
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button icon={Save} loading={guardando} disabled={guardando || cargando} onClick={() => void guardar()}>
            Guardar cambios
          </Button>
        </>
      }
    >
      {cargando ? (
        <p className="flex items-center gap-2 text-gray-600 py-2" role="status">
          <Loader2 size={18} className="animate-spin text-brand-600" aria-hidden="true" />
          Cargando la disponibilidad del especialista…
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Nueva fecha"
              error={tocado ? errorFecha : undefined}
              hint="Solo días con horario de atención."
            >
              <Select
                value={fechasDisponibles.includes(fecha) ? fecha : ''}
                disabled={fechasDisponibles.length === 0}
                onChange={(e) => {
                  setFecha(e.target.value);
                  setTocado(true);
                }}
                aria-label="Nueva fecha de la cita"
              >
                <option value="">
                  {fechasDisponibles.length === 0 ? 'Sin días con horario…' : 'Selecciona un día…'}
                </option>
                {fechasDisponibles.map((fechaOpcion) => (
                  <option key={fechaOpcion} value={fechaOpcion}>
                    {nombreDeDia(diaDeSemana(fechaOpcion))} {fechaCorta(fechaOpcion)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Nueva hora"
              error={tocado ? errorHora : undefined}
              hint={`Cada ${SEPARACION_MINIMA} minutos (sesión de 30 min + respiro).`}
            >
              <Select
                value={horasDisponibles.includes(hora) ? hora : ''}
                disabled={horasDisponibles.length === 0}
                onChange={(e) => {
                  setHora(e.target.value);
                  setTocado(true);
                }}
                aria-label="Nueva hora de la cita"
              >
                <option value="">
                  {horasDisponibles.length === 0 ? 'Sin horas disponibles…' : 'Selecciona una hora…'}
                </option>
                {horasDisponibles.map((horaOpcion) => (
                  <option key={horaOpcion} value={horaOpcion}>
                    {horaOpcion}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Disponibilidad del día elegido */}
          {rangos.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">
                Horario de atención del especialista ese día:
              </p>
              <ul className="flex flex-wrap gap-2">
                {rangos.map((rango) => (
                  <li key={`${rango.inicio}-${rango.fin}`}>
                    <Badge status="confirmed">
                      {rango.inicio} – {rango.fin}
                    </Badge>
                  </li>
                ))}
                {ocupadas.length > 0 && (
                  <li>
                    <Badge status="pending">{ocupadas.length} hora(s) ocupada(s)</Badge>
                  </li>
                )}
              </ul>
            </div>
          )}

          {errorGeneral && (
            <p
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              {errorGeneral}
            </p>
          )}

          <p className="text-xs text-gray-400">
            Al reagendar, la cita vuelve a estar pendiente de confirmación salvo que la mueva el
            propio especialista.
          </p>
        </div>
      )}
    </Modal>
  );
}
