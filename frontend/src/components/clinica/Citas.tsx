import React, { useState } from 'react';
import { CalendarPlus, Search, Pencil, Check, XCircle } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
import Badge from '../ui/Badge';
import type { BadgeStatus } from '../ui/Badge';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
import DataTable from '../ui/DataTable';
import type { Column } from '../ui/DataTable';
import EmptyState from '../ui/EmptyState';
import { Input, Select } from '../ui/Input';
import CitaForm from './CitaForm';
import { CITAS_DEMO, pacientePorId, nombrePaciente, type Cita, type EstatusCita } from './datos';

/* ============================================================
   VISTA: CITAS · Carga del día + acciones rápidas + subpáginas
   de nueva cita y edición
   ============================================================ */

/** Traduce el estatus de la BD al lenguaje visual del Badge */
const BADGE_POR_ESTATUS: Record<EstatusCita, BadgeStatus> = {
  Pendiente: 'pending',
  Confirmada: 'confirmed',
  Cancelada: 'cancelled',
  Completada: 'completed',
};

const FILTROS_ESTATUS = [
  { value: 'todos', label: 'Todos los estatus' },
  { value: 'Pendiente', label: 'Pendientes' },
  { value: 'Confirmada', label: 'Confirmadas' },
  { value: 'Completada', label: 'Completadas' },
  { value: 'Cancelada', label: 'Canceladas' },
];

type Subvista = { modo: 'lista' } | { modo: 'alta' } | { modo: 'editar'; cita: Cita };

export default function Citas() {
  const { aviso, mostrar, cerrar } = useAviso();
  const [citas, setCitas] = useState<Cita[]>(CITAS_DEMO);
  const [subvista, setSubvista] = useState<Subvista>({ modo: 'lista' });
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('todos');

  /* ---------- Subpáginas (nueva / edición) ---------- */
  if (subvista.modo !== 'lista') {
    return (
      <CitaForm
        modo={subvista.modo}
        cita={subvista.modo === 'editar' ? subvista.cita : undefined}
        onCancelar={() => setSubvista({ modo: 'lista' })}
        onGuardar={(datos) => {
          setCitas((prev) => {
            const siguiente = subvista.modo === 'editar'
              ? prev.map((c) => (c.id === datos.id ? datos : c))
              : [...prev, datos];
            return siguiente.sort((a, b) => a.hora.localeCompare(b.hora));
          });
          mostrar(
            subvista.modo === 'editar'
              ? `Cita de ${nombrePaciente(datos.pacienteId)} actualizada.`
              : `Cita de ${nombrePaciente(datos.pacienteId)} agendada.`
          );
          setSubvista({ modo: 'lista' });
        }}
      />
    );
  }

  /* ---------- Acciones rápidas ---------- */
  const cambiarEstatus = (cita: Cita, estatus: EstatusCita, mensaje: string) => {
    setCitas((prev) => prev.map((c) => (c.id === cita.id ? { ...c, estatus } : c)));
    mostrar(mensaje);
  };

  /* ---------- Filtrado ---------- */
  const citasFiltradas = citas.filter((cita) => {
    const texto = busqueda.toLowerCase();
    const coincideTexto =
      nombrePaciente(cita.pacienteId).toLowerCase().includes(texto) ||
      (pacientePorId(cita.pacienteId)?.expediente ?? '').toLowerCase().includes(texto);
    const coincideEstatus = filtroEstatus === 'todos' || cita.estatus === filtroEstatus;
    return coincideTexto && coincideEstatus;
  });

  const columnas: Column<Cita>[] = [
    {
      key: 'hora',
      header: 'Hora',
      className: 'w-32',
      render: (cita) => (
        <span className="font-semibold tabular-nums text-gray-900">{cita.hora}</span>
      ),
    },
    {
      key: 'paciente',
      header: 'Paciente',
      render: (cita) => (
        <div>
          <p className="font-semibold text-gray-900">{nombrePaciente(cita.pacienteId)}</p>
          <p className="text-sm text-gray-500 tabular-nums">
            {pacientePorId(cita.pacienteId)?.expediente}
          </p>
        </div>
      ),
    },
    { key: 'motivo', header: 'Motivo' },
    {
      key: 'estatus',
      header: 'Estatus',
      className: 'w-40',
      render: (cita) => <Badge status={BADGE_POR_ESTATUS[cita.estatus]} />,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'right',
      className: 'w-40',
      render: (cita) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon={Pencil}
            label="Editar cita"
            onClick={(e) => {
              e.stopPropagation();
              setSubvista({ modo: 'editar', cita });
            }}
          />
          {cita.estatus === 'Pendiente' && (
            <IconButton
              icon={Check}
              label="Confirmar cita"
              onClick={(e) => {
                e.stopPropagation();
                cambiarEstatus(cita, 'Confirmada', `Cita de ${nombrePaciente(cita.pacienteId)} confirmada.`);
              }}
            />
          )}
          {(cita.estatus === 'Pendiente' || cita.estatus === 'Confirmada') && (
            <IconButton
              icon={XCircle}
              label="Cancelar cita"
              tone="danger"
              onClick={(e) => {
                e.stopPropagation();
                cambiarEstatus(cita, 'Cancelada', `Cita de ${nombrePaciente(cita.pacienteId)} cancelada.`);
              }}
            />
          )}
        </div>
      ),
    },
  ];

  /* ---------- Lista ---------- */
  return (
    <div className="p-10 xl:p-12 max-w-7xl mx-auto font-sans">
      
      {/* Cabecera */}
      <PageHeader
        title="Citas"
        subtitle="Consulta y organiza la agenda del día"
        meta={
          <div className="flex items-center gap-3">
            <div className="text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-lg">
              {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <Button icon={CalendarPlus} onClick={() => setSubvista({ modo: 'alta' })}>
              Nueva cita
            </Button>
          </div>
        }
      />

      {aviso && <Aviso mensaje={aviso} onCerrar={cerrar} />}

      {/* Barra de herramientas: búsqueda + filtro de estatus */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="search"
            icon={Search}
            placeholder="Buscar por paciente o número de expediente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Select
          value={filtroEstatus}
          onChange={(e) => setFiltroEstatus(e.target.value)}
          className="md:w-56"
          aria-label="Filtrar por estatus"
        >
          {FILTROS_ESTATUS.map((filtro) => (
            <option key={filtro.value} value={filtro.value}>
              {filtro.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Tabla de citas */}
      {citasFiltradas.length > 0 ? (
        <>
          <DataTable
            columns={columnas}
            rows={citasFiltradas}
            rowKey={(cita) => cita.id}
            onRowClick={() => { /* Abrir detalle de la cita */ }}
            emptyMessage="No hay citas que coincidan con la búsqueda."
          />
          <p className="text-sm text-gray-500 mt-4 px-1">
            Mostrando {citasFiltradas.length} de {citas.length} citas
          </p>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200">
          <EmptyState
            icon={Search}
            title="Sin citas"
            description="No se encontraron citas con los filtros seleccionados."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setBusqueda('');
                  setFiltroEstatus('todos');
                }}
              >
                Limpiar filtros
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}
