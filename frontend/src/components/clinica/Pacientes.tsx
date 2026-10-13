import React, { useState } from 'react';
import { UserPlus, Search, Eye, Pencil } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
import Badge from '../ui/Badge';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
import DataTable from '../ui/DataTable';
import type { Column } from '../ui/DataTable';
import { Input, Select } from '../ui/Input';
import PacienteForm from './PacienteForm';
import { PACIENTES, edad, fechaCorta, type Paciente } from './datos';

/* ============================================================
   VISTA: PACIENTES · Control de pacientes de odontología
   Lista, búsqueda, alertas clínicas y subpáginas de alta/edición
   ============================================================ */

type Subvista = { modo: 'lista' } | { modo: 'alta' } | { modo: 'editar'; paciente: Paciente };

interface Props {
  /** Abre el expediente del paciente en Historial clínico */
  onVerExpediente: (pacienteId: number) => void;
  /** Título y bajada de la vista (varían según especialidad) */
  titulo?: string;
  subtitulo?: string;
}

const FILTROS = [
  { value: 'todos', label: 'Todos los pacientes' },
  { value: 'alergias', label: 'Con alergias' },
  { value: 'cronicas', label: 'Con enfermedades crónicas' },
];

export default function Pacientes({
  onVerExpediente,
  titulo = 'Pacientes',
  subtitulo = 'Control de pacientes de odontología',
}: Props) {
  const { aviso, mostrar, cerrar } = useAviso();
  const [pacientes, setPacientes] = useState<Paciente[]>(PACIENTES);
  const [subvista, setSubvista] = useState<Subvista>({ modo: 'lista' });
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos');

  /* ---------- Subpáginas (alta / edición) ---------- */
  if (subvista.modo !== 'lista') {
    return (
      <PacienteForm
        modo={subvista.modo}
        paciente={subvista.modo === 'editar' ? subvista.paciente : undefined}
        onCancelar={() => setSubvista({ modo: 'lista' })}
        onGuardar={(datos) => {
          setPacientes((prev) =>
            subvista.modo === 'editar'
              ? prev.map((p) => (p.id === datos.id ? datos : p))
              : [datos, ...prev]
          );
          mostrar(
            subvista.modo === 'editar'
              ? `Expediente de ${datos.nombre} actualizado.`
              : `Paciente ${datos.nombre} dado de alta con expediente ${datos.expediente}.`
          );
          setSubvista({ modo: 'lista' });
        }}
      />
    );
  }

  /* ---------- Filtros ---------- */
  const pacientesFiltrados = pacientes.filter((paciente) => {
    const texto = busqueda.toLowerCase();
    const coincideTexto =
      paciente.nombre.toLowerCase().includes(texto) ||
      paciente.expediente.toLowerCase().includes(texto);
    const coincideFiltro =
      filtro === 'todos' ||
      (filtro === 'alergias' && paciente.alergias !== 'Ninguna') ||
      (filtro === 'cronicas' && paciente.enfermedadesCronicas !== 'Ninguna');
    return coincideTexto && coincideFiltro;
  });

  const columnas: Column<Paciente>[] = [
    {
      key: 'nombre',
      header: 'Paciente',
      render: (paciente) => (
        <div>
          <p className="font-semibold text-gray-900">{paciente.nombre}</p>
          <p className="text-sm text-gray-500 tabular-nums">{paciente.expediente}</p>
        </div>
      ),
    },
    {
      key: 'edad',
      header: 'Edad / Género',
      className: 'w-44',
      render: (paciente) => (
        <div>
          <p className="tabular-nums text-gray-900">{edad(paciente.fechaNacimiento)} años</p>
          <p className="text-sm text-gray-500">{paciente.genero}</p>
        </div>
      ),
    },
    {
      key: 'contacto',
      header: 'Contacto',
      className: 'w-56',
      render: (paciente) => (
        <div>
          <p className="tabular-nums text-gray-900">{paciente.telefono}</p>
          <p className="text-sm text-gray-500">{paciente.correo}</p>
        </div>
      ),
    },
    {
      key: 'alertas',
      header: 'Alertas clínicas',
      className: 'w-56',
      render: (paciente) =>
        paciente.alergias !== 'Ninguna' ? (
          <Badge status="pending">Alergia: {paciente.alergias}</Badge>
        ) : paciente.enfermedadesCronicas !== 'Ninguna' ? (
          <Badge status="scheduled">{paciente.enfermedadesCronicas}</Badge>
        ) : (
          <Badge status="neutral">Sin alertas</Badge>
        ),
    },
    {
      key: 'ultimaVisita',
      header: 'Última visita',
      className: 'w-44',
      render: (paciente) => (
        <span className="tabular-nums text-gray-800">{fechaCorta(paciente.ultimaVisita)}</span>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'right',
      className: 'w-32',
      render: (paciente) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon={Eye}
            label="Ver expediente"
            onClick={(e) => {
              e.stopPropagation();
              onVerExpediente(paciente.id);
            }}
          />
          <IconButton
            icon={Pencil}
            label="Editar paciente"
            onClick={(e) => {
              e.stopPropagation();
              setSubvista({ modo: 'editar', paciente });
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
        title={titulo}
        subtitle={subtitulo}
        meta={
          <Button icon={UserPlus} onClick={() => setSubvista({ modo: 'alta' })}>
            Nuevo paciente
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
            placeholder="Buscar por nombre o número de expediente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="md:w-64"
          aria-label="Filtrar pacientes"
        >
          {FILTROS.map((opcion) => (
            <option key={opcion.value} value={opcion.value}>
              {opcion.label}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columnas}
        rows={pacientesFiltrados}
        rowKey={(paciente) => paciente.id}
        onRowClick={() => { /* Abrir expediente */ }}
        emptyMessage="No hay pacientes que coincidan con la búsqueda."
      />

      <p className="text-sm text-gray-500 mt-4 px-1">
        Mostrando {pacientesFiltrados.length} de {pacientes.length} pacientes
      </p>
    </div>
  );
}
