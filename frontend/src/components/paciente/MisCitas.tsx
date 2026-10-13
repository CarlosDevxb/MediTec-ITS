import React, { useState } from 'react';
import { CalendarPlus, XCircle, CalendarDays } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
import EmptyState from '../ui/EmptyState';
import NuevaCitaForm from './NuevaCitaForm';
import {
  esProxima,
  fechaLarga,
  AREA_BADGE,
  BADGE_POR_ESTATUS,
  type CitaPaciente,
} from './datos';

/* ============================================================
   MIS CITAS · Próximas citas en tarjetas con gestión
   (solicitar y cancelar)
   ============================================================ */

interface Props {
  citas: CitaPaciente[];
  onAlta: (cita: CitaPaciente) => void;
  onCancelar: (id: number) => void;
}

export default function MisCitas({ citas, onAlta, onCancelar }: Props) {
  const { aviso, mostrar, cerrar } = useAviso();
  const [nueva, setNueva] = useState(false);

  /* ---------- Subpágina: solicitar cita ---------- */
  if (nueva) {
    return (
      <NuevaCitaForm
        onCancelar={() => setNueva(false)}
        onGuardar={(cita) => {
          onAlta(cita);
          setNueva(false);
          mostrar(
            `Cita solicitada en ${cita.area} para el ${fechaLarga(cita.fecha)}. Recibirás confirmación.`
          );
        }}
      />
    );
  }

  const proximas = citas
    .filter((cita) => esProxima(cita))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return (
    <div className="p-8 xl:p-10 max-w-6xl mx-auto">
      <PageHeader
        title="Mis citas"
        subtitle="Gestiona tus citas en odontología y nutrición"
        meta={
          <Button icon={CalendarPlus} onClick={() => setNueva(true)}>
            Nueva cita
          </Button>
        }
      />

      {aviso && <Aviso mensaje={aviso} onCerrar={cerrar} />}

      {proximas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200">
          <EmptyState
            icon={CalendarDays}
            title="No tienes citas programadas"
            description="Solicita una cita en el área de odontología o nutrición cuando la necesites."
            action={<Button icon={CalendarPlus} onClick={() => setNueva(true)}>Nueva cita</Button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {proximas.map((cita) => {
            const area = AREA_BADGE[cita.area];
            const puedeCancelar = cita.estatus === 'Pendiente' || cita.estatus === 'Confirmada';
            return (
              <article
                key={cita.id}
                className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-4"
              >
                {/* Encabezado: área + estatus */}
                <div className="flex items-center justify-between gap-3">
                  <Badge status={area.status}>{area.label}</Badge>
                  <Badge status={BADGE_POR_ESTATUS[cita.estatus]} />
                </div>

                {/* Fecha y motivo */}
                <div>
                  <p className="text-xl font-semibold tracking-tight text-gray-900 capitalize">
                    {fechaLarga(cita.fecha)}
                  </p>
                  <p className="text-base text-brand-700 font-medium tabular-nums mt-0.5">
                    {cita.hora}
                  </p>
                </div>

                <div className="flex-1">
                  <p className="text-base font-semibold text-gray-900">{cita.motivo}</p>
                  <p className="text-sm text-gray-500 mt-1">{cita.profesional}</p>
                </div>

                {/* Acciones */}
                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  {puedeCancelar ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={XCircle}
                      onClick={() => onCancelar(cita.id)}
                    >
                      Cancelar cita
                    </Button>
                  ) : (
                    <span className="text-sm text-gray-400">Sin acciones disponibles</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
