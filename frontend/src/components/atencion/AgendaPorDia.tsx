import React, { useMemo } from 'react';
import { CalendarClock, History } from 'lucide-react';
import Badge from '../ui/Badge';
import { fechaCorta, hoyISO, type Cita } from '../../services/atencion.service';

/* ============================================================
   AGENDA POR DÍA · Vista agrupada de la agenda de los
   especialistas: las citas por venir (de hoy en adelante)
   divididas por día, con la sección de **citas anteriores**
   (completadas o canceladas) hasta el final.
   ============================================================ */

const ESTILOS_ESTATUS: Record<string, 'pending' | 'confirmed' | 'cancelled' | 'completed'> = {
  Pendiente: 'pending',
  Confirmada: 'confirmed',
  Cancelada: 'cancelled',
  Completada: 'completed',
};

const ESTILOS_TIPO: Record<string, 'confirmed' | 'scheduled' | 'neutral'> = {
  'Atención directa': 'confirmed',
  Programada: 'scheduled',
  Emergencia: 'neutral',
};

export interface AgendaPorDiaProps {
  /** Citas de la agenda (el componente las agrupa por día) */
  citas: Cita[];
  /** Acciones de cada cita; recibe la cita y si es del día de hoy */
  acciones: (cita: Cita, esHoy: boolean) => React.ReactNode;
  /** Mensaje cuando no hay citas por venir */
  vacio?: string;
}

interface GrupoDia {
  fecha: string;
  esHoy: boolean;
  citas: Cita[];
}

/** Agrupa las citas por día, ordenadas de la más próxima a la más lejana */
function agruparPorDia(citas: Cita[]): GrupoDia[] {
  const porDia = new Map<string, Cita[]>();
  for (const cita of citas) {
    const grupo = porDia.get(cita.fecha);
    if (grupo) grupo.push(cita);
    else porDia.set(cita.fecha, [cita]);
  }
  return [...porDia.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([fecha, delDia]) => ({
      fecha,
      esHoy: fecha === hoyISO(),
      citas: delDia.sort((a, b) => a.hora.localeCompare(b.hora)),
    }));
}

function RenglonCita({
  cita,
  acciones,
  anterior = false,
}: {
  cita: Cita;
  acciones?: React.ReactNode;
  anterior?: boolean;
}) {
  return (
    <li
      className={[
        'flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5',
        anterior ? 'opacity-80' : '',
      ].join(' ')}
    >
      <span className="w-16 shrink-0 text-sm font-semibold text-gray-900 tabular-nums">
        {cita.hora}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-gray-900 truncate">{cita.paciente}</span>
        <span className="block text-sm text-gray-500 tabular-nums truncate">
          {cita.numeroControl} · {cita.motivo}
        </span>
      </span>
      <Badge status={ESTILOS_TIPO[cita.tipo] ?? 'neutral'}>{cita.tipo}</Badge>
      <Badge status={ESTILOS_ESTATUS[cita.estatus] ?? 'neutral'}>{cita.estatus}</Badge>
      {acciones && <span className="flex items-center gap-2 shrink-0">{acciones}</span>}
    </li>
  );
}

export default function AgendaPorDia({ citas, acciones, vacio }: AgendaPorDiaProps) {
  const hoy = hoyISO();

  const porVenir = useMemo(() => agruparPorDia(citas.filter((cita) => cita.fecha >= hoy)), [citas, hoy]);
  const anteriores = useMemo(
    () =>
      citas
        .filter((cita) => cita.fecha < hoy)
        .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora)),
    [citas, hoy],
  );

  return (
    <div className="space-y-6">
      {/* Citas por venir, divididas por día */}
      {porVenir.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200">
          <p className="py-12 text-center text-gray-500">
            {vacio ?? 'No hay citas programadas.'}
          </p>
        </div>
      ) : (
        porVenir.map((grupo) => (
          <section
            key={grupo.fecha}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
          >
            {/* Encabezado del día */}
            <header
              className={[
                'flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b',
                grupo.esHoy
                  ? 'bg-brand-50 border-brand-200'
                  : 'bg-gray-50 border-gray-200',
              ].join(' ')}
            >
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <CalendarClock size={17} className="text-brand-600" aria-hidden="true" />
                {grupo.esHoy ? 'Hoy · ' : ''}
                {fechaCorta(grupo.fecha)}
              </h3>
              <Badge status={grupo.esHoy ? 'confirmed' : 'scheduled'}>
                {grupo.citas.length} cita{grupo.citas.length === 1 ? '' : 's'}
              </Badge>
            </header>

            <ul className="divide-y divide-gray-100">
              {grupo.citas.map((cita) => (
                <RenglonCita
                  key={cita.id}
                  cita={cita}
                  acciones={acciones(cita, grupo.esHoy)}
                />
              ))}
            </ul>
          </section>
        ))
      )}

      {/* Citas anteriores, hasta el final */}
      {anteriores.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-gray-200 bg-gray-50">
            <h3 className="flex items-center gap-2 text-base font-semibold text-gray-700">
              <History size={17} className="text-gray-400" aria-hidden="true" />
              Citas anteriores (completadas o canceladas)
            </h3>
            <Badge status="neutral">{anteriores.length}</Badge>
          </header>

          <ul className="divide-y divide-gray-100">
            {anteriores.map((cita) => (
              <RenglonCita key={cita.id} cita={cita} anterior />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
