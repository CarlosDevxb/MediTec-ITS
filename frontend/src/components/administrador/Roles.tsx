import React, { useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
import IconButton from '../ui/IconButton';
import DataTable from '../ui/DataTable';
import type { Column } from '../ui/DataTable';
import RolForm from './RolForm';
import { ROLES_DEMO, type Rol } from './tipos';

/* ============================================================
   VISTA: ROLES · Lista + subpáginas de alta y edición
   (mapea a la tabla `roles`)
   ============================================================ */

type Subvista = { modo: 'lista' } | { modo: 'alta' } | { modo: 'editar'; rol: Rol };

export default function Roles() {
  const [roles, setRoles] = useState<Rol[]>(ROLES_DEMO);
  const [subvista, setSubvista] = useState<Subvista>({ modo: 'lista' });
  const { aviso, mostrar, cerrar } = useAviso();

  /* ---------- Subpáginas (alta / edición) ---------- */
  if (subvista.modo !== 'lista') {
    return (
      <RolForm
        modo={subvista.modo}
        rol={subvista.modo === 'editar' ? subvista.rol : undefined}
        onCancelar={() => setSubvista({ modo: 'lista' })}
        onGuardar={(datos) => {
          setRoles((prev) =>
            subvista.modo === 'editar'
              ? prev.map((r) => (r.id === datos.id ? datos : r))
              : [...prev, datos]
          );
          mostrar(
            subvista.modo === 'editar'
              ? `Rol "${datos.nombre}" actualizado.`
              : `Rol "${datos.nombre}" creado.`
          );
          setSubvista({ modo: 'lista' });
        }}
      />
    );
  }

  const columnas: Column<Rol>[] = [
    {
      key: 'nombre',
      header: 'Rol',
      render: (rol) => (
        <div>
          <p className="font-semibold text-gray-900">{rol.nombre}</p>
          <p className="text-sm text-gray-500">{rol.descripcion}</p>
        </div>
      ),
    },
    {
      key: 'usuarios',
      header: 'Usuarios',
      align: 'right',
      className: 'w-40',
      render: (rol) => (
        <span className="tabular-nums text-gray-800">
          {rol.usuarios} cuenta{rol.usuarios === 1 ? '' : 's'}
        </span>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'right',
      className: 'w-24',
      render: (rol) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon={Pencil}
            label="Editar rol"
            onClick={(e) => {
              e.stopPropagation();
              setSubvista({ modo: 'editar', rol });
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="p-10 xl:p-12 max-w-6xl mx-auto font-sans">
      <PageHeader
        title="Roles"
        subtitle="Permisos y perfiles de acceso del sistema"
        meta={
          <Button icon={Plus} onClick={() => setSubvista({ modo: 'alta' })}>
            Nuevo rol
          </Button>
        }
      />

      {aviso && <Aviso mensaje={aviso} onCerrar={cerrar} />}

      <DataTable
        columns={columnas}
        rows={roles}
        rowKey={(rol) => rol.id}
        onRowClick={() => { /* Abrir detalle del rol */ }}
        emptyMessage="No hay roles registrados."
      />

      <p className="text-sm text-gray-500 mt-4 px-1">
        {roles.length} roles registrados
      </p>
    </div>
  );
}
