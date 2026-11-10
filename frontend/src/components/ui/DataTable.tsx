import React from 'react';

/* ============================================================
   DATA TABLE · Tabla genérica para listados (Citas, Pacientes,
   Horarios, Historial clínico, Medicamentos...)

   <DataTable
     columns={[
       { key: 'paciente', header: 'Paciente' },
       { key: 'hora', header: 'Hora' },
       { key: 'estatus', header: 'Estatus', render: (r) => <Badge status={r.estatus} /> },
     ]}
     rows={citas}
     rowKey={(cita) => cita.id}
   />

   En escritorio se renderiza como tabla; en móvil (<768px) cada
   fila se convierte en una **tarjeta** (título + pares
   etiqueta/valor + acciones), que se lee mucho mejor que una
   tabla con scroll horizontal.
   ============================================================ */

export interface Column<T> {
  /** Clave única de la columna (también se usa como key de render por defecto) */
  key: string;
  header: string;
  /** Renderizado personalizado de la celda */
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Clases extra para la columna (ej. "w-32") */
  className?: string;
  /**
   * En el modo tarjeta (móvil): columna que encabeza la tarjeta.
   * Por defecto lo es la primera columna llamada 'nombre' (o la primera).
   */
  tituloTarjeta?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

const ALIGN: Record<NonNullable<Column<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyMessage = 'No hay registros por mostrar.',
}: DataTableProps<T>) {
  const valor = (col: Column<T>, row: T): React.ReactNode =>
    col.render ? col.render(row) : (row as Record<string, React.ReactNode>)[col.key];

  /* Modo tarjeta (móvil): la columna de acciones se va al pie y la de
     título encabeza; el resto son pares etiqueta/valor. El título es la
     columna marcada, o en su defecto la de nombre, paciente o personal */
  const colTitulo =
    columns.find((col) => col.tituloTarjeta) ??
    columns.find((col) => col.key === 'nombre') ??
    columns.find((col) => col.key === 'paciente') ??
    columns.find((col) => col.key === 'personal') ??
    columns[0];
  const colAccion = columns.find((col) => col.key === 'acciones');
  const colPares = columns.filter((col) => col !== colTitulo && col !== colAccion);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* ===== Escritorio: tabla ===== */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm sm:text-base">
          <thead>
            <tr className="bg-brand-50 text-gray-500 text-sm border-b border-gray-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={[
                    'px-4 sm:px-7 py-3 sm:py-3.5 font-semibold',
                    ALIGN[col.align ?? 'left'],
                    col.className ?? '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-10 text-center text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={[
                    'transition-colors',
                    onRowClick ? 'cursor-pointer hover:bg-brand-50/60' : '',
                  ].join(' ')}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={[
                        'px-4 sm:px-7 py-3.5 sm:py-4.5 text-gray-800',
                        ALIGN[col.align ?? 'left'],
                        col.className ?? '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {valor(col, row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ===== Móvil: una tarjeta por registro ===== */}
      <ul className="md:hidden divide-y divide-gray-100">
        {rows.length === 0 ? (
          <li className="px-6 py-10 text-center text-gray-400">{emptyMessage}</li>
        ) : (
          rows.map((row) => (
            <li
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={[
                'px-4 py-4 transition-colors',
                onRowClick ? 'cursor-pointer hover:bg-brand-50/60' : '',
              ].join(' ')}
            >
              {/* Título de la tarjeta */}
              <div className="text-base font-semibold text-gray-900">
                {valor(colTitulo, row)}
              </div>

              {/* Pares etiqueta/valor */}
              <dl className="mt-2 space-y-1.5">
                {colPares.map((col) => (
                  <div key={col.key} className="flex items-start justify-between gap-4 text-sm">
                    <dt className="text-gray-500 shrink-0">{col.header}</dt>
                    <dd className="text-gray-800 text-right min-w-0">{valor(col, row)}</dd>
                  </div>
                ))}
              </dl>

              {/* Acciones al pie de la tarjeta */}
              {colAccion && (
                <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-3">
                  {valor(colAccion, row)}
                </div>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
