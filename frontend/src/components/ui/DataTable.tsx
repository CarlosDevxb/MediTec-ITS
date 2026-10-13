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
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="bg-brand-50 text-gray-500 text-sm border-b border-gray-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={[
                    'px-7 py-3.5 font-semibold',
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
                        'px-7 py-4.5 text-gray-800',
                        ALIGN[col.align ?? 'left'],
                        col.className ?? '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {col.render
                        ? col.render(row)
                        : (row as Record<string, React.ReactNode>)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
