import React, { useState } from 'react';
import { Plus, Search, Pencil, X } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
import IconButton from '../ui/IconButton';
import Badge from '../ui/Badge';
import DataTable from '../ui/DataTable';
import type { Column } from '../ui/DataTable';
import { Input } from '../ui/Input';
import MedicamentoForm from './MedicamentoForm';
import { MEDICAMENTOS_DEMO, type Medicamento } from './tipos';

/* ============================================================
   VISTA: MEDICAMENTOS · Lista + subpáginas de alta y edición
   (mapea a la tabla `medicamentos`)
   ============================================================ */

/** Stock por debajo del cual se marca como bajo */
const STOCK_BAJO = 10;

type Subvista =
  | { modo: 'lista' }
  | { modo: 'alta' }
  | { modo: 'editar'; medicamento: Medicamento };

export default function Medicamentos() {
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>(MEDICAMENTOS_DEMO);
  const [subvista, setSubvista] = useState<Subvista>({ modo: 'lista' });
  const { aviso, mostrar, cerrar } = useAviso();
  const [busqueda, setBusqueda] = useState('');

  /* ---------- Subpáginas (alta / edición) ---------- */
  if (subvista.modo !== 'lista') {
    return (
      <MedicamentoForm
        modo={subvista.modo}
        medicamento={subvista.modo === 'editar' ? subvista.medicamento : undefined}
        onCancelar={() => setSubvista({ modo: 'lista' })}
        onGuardar={(datos) => {
          setMedicamentos((prev) =>
            subvista.modo === 'editar'
              ? prev.map((m) => (m.id === datos.id ? datos : m))
              : [datos, ...prev]
          );
          mostrar(
            subvista.modo === 'editar'
              ? `"${datos.nombre}" actualizado.`
              : `"${datos.nombre}" agregado al inventario.`
          );
          setSubvista({ modo: 'lista' });
        }}
      />
    );
  }

  /* ---------- Filtros ---------- */
  const medicamentosFiltrados = medicamentos.filter(
    (medicamento) =>
      medicamento.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      medicamento.descripcion.toLowerCase().includes(busqueda.toLowerCase())
  );

  const columnas: Column<Medicamento>[] = [
    {
      key: 'nombre',
      header: 'Medicamento',
      render: (medicamento) => (
        <div>
          <p className="font-semibold text-gray-900">{medicamento.nombre}</p>
          <p className="text-sm text-gray-500">{medicamento.descripcion}</p>
        </div>
      ),
    },
    { key: 'unidad', header: 'Unidad de medida', className: 'w-44' },
    {
      key: 'stock',
      header: 'Stock',
      align: 'right',
      className: 'w-40',
      render: (medicamento) =>
        medicamento.stock <= STOCK_BAJO ? (
          <Badge status="pending">{medicamento.stock} · bajo</Badge>
        ) : (
          <span className="tabular-nums text-gray-800">{medicamento.stock}</span>
        ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'right',
      className: 'w-24',
      render: (medicamento) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon={Pencil}
            label="Editar medicamento"
            onClick={(e) => {
              e.stopPropagation();
              setSubvista({ modo: 'editar', medicamento });
            }}
          />
        </div>
      ),
    },
  ];

  const bajos = medicamentos.filter((m) => m.stock <= STOCK_BAJO).length;

  return (
    <div className="p-10 xl:p-12 max-w-6xl mx-auto font-sans">
      <PageHeader
        title="Medicamentos"
        subtitle="Catálogo e inventario de la clínica"
        meta={
          <Button icon={Plus} onClick={() => setSubvista({ modo: 'alta' })}>
            Nuevo medicamento
          </Button>
        }
      />

      {aviso && <Aviso mensaje={aviso} onCerrar={cerrar} />}

      {/* Búsqueda */}
      <div className="mb-6">
        <Input
          type="search"
          icon={Search}
          placeholder="Buscar medicamento por nombre o uso..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="max-w-md"
        />
      </div>

      <DataTable
        columns={columnas}
        rows={medicamentosFiltrados}
        rowKey={(medicamento) => medicamento.id}
        onRowClick={() => { /* Abrir detalle del medicamento */ }}
        emptyMessage="No hay medicamentos que coincidan con la búsqueda."
      />

      <p className="text-sm text-gray-500 mt-4 px-1">
        {medicamentosFiltrados.length} de {medicamentos.length} medicamentos
        {bajos > 0 && ` · ${bajos} con stock bajo`}
      </p>
    </div>
  );
}
