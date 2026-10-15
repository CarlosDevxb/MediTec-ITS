import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, CircleAlert, Users } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Aviso from '../ui/Aviso';
import IconButton from '../ui/IconButton';
import EstadoVista from '../ui/EstadoVista';
import DataTable from '../ui/DataTable';
import Modal from '../ui/Modal';
import type { Column } from '../ui/DataTable';
import { useAviso } from '../ui/useAviso';
import { mensajeDeError } from '../../services/api';
import {
  listarRoles,
  crearRol,
  actualizarRol,
  eliminarRol,
  type Rol,
} from '../../services/administracion.service';
import RolForm from './RolForm';

/* ============================================================
   VISTA: ROLES · Lista + subpáginas de alta y edición
   Conectada a GET/POST/PUT/DELETE /api/roles (tabla `roles`)
   ============================================================ */

type Subvista = { modo: 'lista' } | { modo: 'alta' } | { modo: 'editar'; rol: Rol };

export default function Roles() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [subvista, setSubvista] = useState<Subvista>({ modo: 'lista' });
  const [aEliminar, setAEliminar] = useState<Rol | null>(null);
  const { aviso, tipo, mostrar, cerrar } = useAviso();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setRoles(await listarRoles());
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* ---------- Guardado ---------- */
  const guardarRol = async (datos: { nombre: string; descripcion: string }) => {
    setGuardando(true);
    try {
      if (subvista.modo === 'editar') {
        const rol = await actualizarRol(subvista.rol.id, datos);
        setRoles((prev) => prev.map((r) => (r.id === rol.id ? rol : r)));
        mostrar(`Rol "${rol.nombre}" actualizado.`);
      } else {
        const rol = await crearRol(datos);
        setRoles((prev) =>
          [...prev, rol].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
        );
        mostrar(`Rol "${rol.nombre}" creado.`);
      }
      setSubvista({ modo: 'lista' });
    } catch (error) {
      // El formulario presenta el error junto al campo que corresponde
      throw error;
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!aEliminar) return;
    setGuardando(true);
    try {
      await eliminarRol(aEliminar.id);
      const nombre = aEliminar.nombre;
      setRoles((prev) => prev.filter((r) => r.id !== aEliminar.id));
      mostrar(`Rol "${nombre}" eliminado.`);
      setAEliminar(null);
    } catch (e) {
      mostrar(mensajeDeError(e), 'error');
      setAEliminar(null);
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Subpáginas (alta / edición) ---------- */
  if (subvista.modo !== 'lista') {
    return (
      <RolForm
        modo={subvista.modo}
        rol={subvista.modo === 'editar' ? subvista.rol : undefined}
        guardando={guardando}
        onCancelar={() => setSubvista({ modo: 'lista' })}
        onGuardar={guardarRol}
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
          <p className="text-sm text-gray-500">{rol.descripcion || 'Sin descripción'}</p>
        </div>
      ),
    },
    {
      key: 'usuarios',
      header: 'Cuentas',
      align: 'right',
      className: 'w-32',
      render: (rol) => (
        <span className="inline-flex items-center gap-1.5 text-gray-700 tabular-nums">
          <Users size={15} className="text-gray-400" aria-hidden="true" />
          {rol.usuarios}
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
            label={`Editar rol ${rol.nombre}`}
            onClick={() => setSubvista({ modo: 'editar', rol })}
          />
          <IconButton
            icon={Trash2}
            label={`Eliminar rol ${rol.nombre}`}
            tone="danger"
            onClick={() => setAEliminar(rol)}
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

      {aviso && <Aviso mensaje={aviso} tipo={tipo} onCerrar={cerrar} />}

      <EstadoVista
        cargando={cargando}
        error={error}
        onReintentar={() => void cargar()}
      >
        <>
          <DataTable
            columns={columnas}
            rows={roles}
            rowKey={(rol) => rol.id}
            emptyMessage="No hay roles registrados."
          />

          <p className="text-sm text-gray-500 mt-4 px-1">
            {roles.length} {roles.length === 1 ? 'rol' : 'roles'} registrados
          </p>
        </>
      </EstadoVista>

      {/* Confirmación antes de eliminar */}
      {aEliminar && (
        <Modal
          titulo={`¿Eliminar el rol "${aEliminar.nombre}"?`}
          descripcion="El rol dejará de estar disponible para asignar cuentas."
          icono={CircleAlert}
          onCerrar={() => setAEliminar(null)}
          acciones={
            <>
              <Button
                variant="secondary"
                onClick={() => setAEliminar(null)}
                disabled={guardando}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                icon={Trash2}
                loading={guardando}
                onClick={() => void confirmarEliminar()}
              >
                Eliminar
              </Button>
            </>
          }
        >
          {aEliminar.usuarios > 0 ? (
            <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              No se puede eliminar: hay {aEliminar.usuarios} cuenta(s) con este rol. Reasígnalas
              primero.
            </p>
          ) : (
            <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Los roles base del sistema no se pueden eliminar.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
