import React, { useState } from 'react';
import { FilePlus, Search, Pencil } from 'lucide-react';
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
import PlanForm from './PlanForm';
import { nombrePaciente, pacientePorId, fechaCorta } from '../clinica/datos';
import { estadoPlan, type EstadoPlan, type Plan } from './datos';

/* ============================================================
   VISTA: PLANES · Listado de planes con filtros y edición
   ============================================================ */

const BADGE_POR_ESTADO: Record<EstadoPlan, BadgeStatus> = {
  vigente: 'confirmed',
  porIniciar: 'scheduled',
  finalizado: 'completed',
};

const ETIQUETA_ESTADO: Record<EstadoPlan, string> = {
  vigente: 'Vigente',
  porIniciar: 'Por iniciar',
  finalizado: 'Finalizado',
};

const FILTROS = [
  { value: 'todos', label: 'Todos los planes' },
  { value: 'vigente', label: 'Vigentes' },
  { value: 'porIniciar', label: 'Por iniciar' },
  { value: 'finalizado', label: 'Finalizados' },
];

interface Props {
  planes: Plan[];
  onGuardarPlan: (plan: Plan) => void;
  onNuevoPlan: () => void;
}

type Subvista = { modo: 'lista' } | { modo: 'editar'; plan: Plan };

export default function Planes({ planes, onGuardarPlan, onNuevoPlan }: Props) {
  const { aviso, mostrar, cerrar } = useAviso();
  const [subvista, setSubvista] = useState<Subvista>({ modo: 'lista' });
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos');

  /* ---------- Subpágina de edición ---------- */
  if (subvista.modo === 'editar') {
    return (
      <PlanForm
        modo="editar"
        plan={subvista.plan}
        onCancelar={() => setSubvista({ modo: 'lista' })}
        onGuardar={(datos) => {
          onGuardarPlan(datos);
          mostrar(`Plan de ${nombrePaciente(datos.pacienteId)} actualizado.`);
          setSubvista({ modo: 'lista' });
        }}
      />
    );
  }

  /* ---------- Filtros ---------- */
  const planesFiltrados = planes.filter((plan) => {
    const texto = busqueda.toLowerCase();
    const coincideTexto =
      nombrePaciente(plan.pacienteId).toLowerCase().includes(texto) ||
      (pacientePorId(plan.pacienteId)?.expediente ?? '').toLowerCase().includes(texto) ||
      plan.descripcion.toLowerCase().includes(texto);
    const coincideFiltro = filtro === 'todos' || estadoPlan(plan) === filtro;
    return coincideTexto && coincideFiltro;
  });

  const columnas: Column<Plan>[] = [
    {
      key: 'paciente',
      header: 'Paciente',
      render: (plan) => (
        <div>
          <p className="font-semibold text-gray-900">{nombrePaciente(plan.pacienteId)}</p>
          <p className="text-sm text-gray-500 tabular-nums">
            {pacientePorId(plan.pacienteId)?.expediente}
          </p>
        </div>
      ),
    },
    {
      key: 'periodo',
      header: 'Periodo',
      className: 'w-64',
      render: (plan) => (
        <span className="tabular-nums text-gray-800">
          {fechaCorta(plan.fechaInicio)} → {fechaCorta(plan.fechaFin)}
        </span>
      ),
    },
    {
      key: 'calorias',
      header: 'Calorías / día',
      align: 'right',
      className: 'w-44',
      render: (plan) => (
        <span className="tabular-nums text-gray-900 font-medium">
          {plan.caloriasDiarias} kcal
        </span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      className: 'w-40',
      render: (plan) => {
        const estado = estadoPlan(plan);
        return <Badge status={BADGE_POR_ESTADO[estado]}>{ETIQUETA_ESTADO[estado]}</Badge>;
      },
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'right',
      className: 'w-24',
      render: (plan) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon={Pencil}
            label="Editar plan"
            onClick={(e) => {
              e.stopPropagation();
              setSubvista({ modo: 'editar', plan });
            }}
          />
        </div>
      ),
    },
  ];

  /* ---------- Lista ---------- */
  return (
    <div className="p-10 xl:p-12 max-w-7xl mx-auto font-sans">
      <PageHeader
        title="Planes alimenticios"
        subtitle="Planes de dieta asignados a tus pacientes"
        meta={
          <Button icon={FilePlus} onClick={onNuevoPlan}>
            Nuevo plan
          </Button>
        }
      />

      {aviso && <Aviso mensaje={aviso} onCerrar={cerrar} />}

      {/* Barra de herramientas */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="search"
            icon={Search}
            placeholder="Buscar por paciente, expediente o dieta..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="md:w-56"
          aria-label="Filtrar por estado"
        >
          {FILTROS.map((opcion) => (
            <option key={opcion.value} value={opcion.value}>
              {opcion.label}
            </option>
          ))}
        </Select>
      </div>

      {planesFiltrados.length > 0 ? (
        <>
          <DataTable
            columns={columnas}
            rows={planesFiltrados}
            rowKey={(plan) => plan.id}
            onRowClick={() => { /* Abrir detalle del plan */ }}
            emptyMessage="No hay planes que coincidan con la búsqueda."
          />
          <p className="text-sm text-gray-500 mt-4 px-1">
            Mostrando {planesFiltrados.length} de {planes.length} planes
          </p>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200">
          <EmptyState
            icon={Search}
            title="Sin planes"
            description="No se encontraron planes con los filtros seleccionados."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setBusqueda('');
                  setFiltro('todos');
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
