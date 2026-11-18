import React, { useState } from 'react';
import { CalendarClock, CircleAlert, Save } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { detallesDe, mensajeDeError } from '../../services/api';
import { reagendarCita, fechaCorta, type Cita } from '../../services/atencion.service';
import SelectorCita from './SelectorCita';

/* ============================================================
   REAGENDAR CITA · Diálogo para cambiar la fecha y la hora de
   una cita.

   La elección se hace con `SelectorCita` (días útiles y rejilla de
   horas), que excluye el hueco de esta misma cita: la disponibilidad
   la calcula el servidor.
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
  const [guardando, setGuardando] = useState(false);
  const [tocado, setTocado] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');

  /* El selector siempre deja una elección válida; aquí solo se comprueba
     que haya llegado una (p. ej. si el especialista ya no tiene huecos) */
  const errorHora = !hora ? 'Elige una hora disponible.' : '';
  const hayErrores = Boolean(errorHora);

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
          <Button icon={Save} loading={guardando} onClick={() => void guardar()}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <SelectorCita
          personalMedicoId={cita.personalMedicoId}
          fecha={fecha}
          hora={hora}
          onFechaChange={(nueva) => {
            setFecha(nueva);
            setTocado(true);
          }}
          onHoraChange={(nueva) => {
            setHora(nueva);
            setTocado(true);
          }}
          excluirCitaId={cita.id}
        />

        {tocado && errorHora && (
          <p role="alert" className="text-sm text-red-600 font-medium">
            {errorHora}
          </p>
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
    </Modal>
  );
}
