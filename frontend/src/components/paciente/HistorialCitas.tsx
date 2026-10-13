import React, { useState } from 'react';
import { History } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Badge from '../ui/Badge';
import DataTable from '../ui/DataTable';
import type { Column } from '../ui/DataTable';
import EmptyState from '../ui/EmptyState';
import {
  esProxima,
  fechaConAnio,
  AREA_BADGE,
  BADGE_POR_ESTATUS,
  type Area,
  type CitaPaciente,
} from './datos';

/* ============================================================
   HISTORIAL DE CITAS · Citas pasadas filtradas por área
   (Odontología / Nutrición)
   ============================================================ */

const FILTROS: Array<{ value: 'todas' | Area; label: string }> = [
  { value: 'todas', label: 'Todas' },
  { value: 'Odontología', label: 'Odontología' },
  { value: 'Nutrición', label: 'Nutrición' },
];

interface Props {
  citas: CitaPaciente[];
}

export default function HistorialCitas({ citas }: Props) {
  const [filtro, setFiltro] = useState<'todas' | Area>('todas');

  // Pasadas = ya ocurrieron o no se concretaron (canceladas)
  const historial = citas
    .filter((cita) => !esProxima(cita))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .filter((cita) => filtro === 'todas' || cita.area === filtro);

  const columnas: Column<CitaPaciente>[] = [
    {
      key: 'fecha',
      header: 'Fecha',
      className: 'w-56',
      render: (cita) => (
        <div>
          <p className="font-semibold text-gray-900 tabular-nums">{fechaConAnio(cita.fecha)}</p>
          <p className="text-sm text-gray-500 tabular-nums">{cita.hora}</p>
        </div>
      ),
    },
    {
      key: 'area',
      header: 'Área',
      className: 'w-44',
      render: (cita) => {
        const area = AREA_BADGE[cita.area];
        return <Badge status={area.status}>{area.label}</Badge>;
      },
    },
    { key: 'motivo', header: 'Motivo' },
    {
      key: 'profesional',
      header: 'Atendió',
      className: 'w-56',
      render: (cita) => <span className="text-gray-800">{cita.profesional}</span>,
    },
    {
      key: 'estatus',
      header: 'Estatus',
      className: 'w-40',
      render: (cita) => <Badge status={BADGE_POR_ESTATUS[cita.estatus]} />,
    },
  ];

  return (
    <div className="p-8 xl:p-10 max-w-6xl mx-auto">
      <PageHeader
        title="Historial de citas"
        subtitle="Tus citas en odontología y nutrición"
      />

      {/* Filtro segmentado por área */}
      <div className="mb-6 inline-flex bg-white border border-gray-200 rounded-lg p-1 gap-1">
        {FILTROS.map((opcion) => {
          const activo = filtro === opcion.value;
          return (
            <button
              key={opcion.value}
              type="button"
              onClick={() => setFiltro(opcion.value)}
              aria-pressed={activo}
              className={[
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40',
                activo ? 'bg-brand-800 text-white' : 'text-gray-600 hover:bg-brand-50',
              ].join(' ')}
            >
              {opcion.label}
            </button>
          );
        })}
      </div>

      {historial.length > 0 ? (
        <>
          <DataTable
            columns={columnas}
            rows={historial}
            rowKey={(cita) => cita.id}
            emptyMessage="No hay citas en esta área."
          />
          <p className="text-sm text-gray-500 mt-4 px-1">
            {historial.length} cita{historial.length === 1 ? '' : 's'} en el historial
          </p>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200">
          <EmptyState
            icon={History}
            title="Sin citas en esta área"
            description="Cuando asistas a una cita aparecerá aquí."
          />
        </div>
      )}
    </div>
  );
}
