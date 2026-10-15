import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, UserX, UserCheck, Trash2, CircleAlert } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Aviso from '../ui/Aviso';
import IconButton from '../ui/IconButton';
import Badge from '../ui/Badge';
import EstadoVista from '../ui/EstadoVista';
import DataTable from '../ui/DataTable';
import Modal from '../ui/Modal';
import type { Column } from '../ui/DataTable';
import { Input, Select } from '../ui/Input';
import { useAviso } from '../ui/useAviso';
import { mensajeDeError } from '../../services/api';
import { obtenerSesion } from '../../services/sesion';
import {
  listarUsuarios,
  listarRoles,
  crearUsuario,
  actualizarUsuario,
  cambiarEstatusUsuario,
  eliminarUsuario,
  type Rol,
  type Usuario,
} from '../../services/administracion.service';
import UsuarioForm from './UsuarioForm';

/* ============================================================
   VISTA: USUARIOS · Lista con búsqueda y filtro + acciones
   Conectada a /api/usuarios (tabla `usuarios`)
   ============================================================ */

type Subvista =
  | { modo: 'lista' }
  | { modo: 'alta' }
  | { modo: 'editar'; usuario: Usuario };

/** Acción pendiente de confirmación en un modal */
type Pendiente =
  | { tipo: 'eliminar'; usuario: Usuario }
  | { tipo: 'estatus'; usuario: Usuario; activo: boolean };

export default function Usuarios() {
  /** Sesión abierta: nunca se actúa sobre la propia cuenta desde aquí */
  const idSesion = obtenerSesion()?.usuario.id ?? 0;

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [subvista, setSubvista] = useState<Subvista>({ modo: 'lista' });
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const { aviso, tipo, mostrar, cerrar } = useAviso();

  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');

  /* ---------- Carga desde la API ---------- */
  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      // Los usuarios y los roles se piden juntos: el filtro y el formulario
      // necesitan ambos, y así la vista se muestra completa de una sola vez
      const [lista, listaRoles] = await Promise.all([listarUsuarios(), listarRoles()]);
      setUsuarios(lista);
      setRoles(listaRoles);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* ---------- Filtros ---------- */
  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return usuarios.filter((usuario) => {
      const coincideTexto =
        !texto ||
        usuario.nombre.toLowerCase().includes(texto) ||
        usuario.numeroControl.toLowerCase().includes(texto) ||
        usuario.correo.toLowerCase().includes(texto);
      const coincideRol = filtroRol === 'todos' || usuario.rol === filtroRol;
      return coincideTexto && coincideRol;
    });
  }, [usuarios, busqueda, filtroRol]);

  /* ---------- Guardado ---------- */
  const guardarUsuario = async (datos: Record<string, unknown>) => {
    setGuardando(true);
    try {
      if (subvista.modo === 'editar') {
        const usuario = await actualizarUsuario(
          subvista.usuario.id,
          datos as unknown as Parameters<typeof actualizarUsuario>[1],
        );
        setUsuarios((prev) => prev.map((u) => (u.id === usuario.id ? usuario : u)));
        mostrar(`Usuario "${usuario.nombre}" actualizado.`);
      } else {
        const usuario = await crearUsuario(datos as unknown as Parameters<typeof crearUsuario>[0]);
        setUsuarios((prev) =>
          [...prev, usuario].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
        );
        mostrar(`Usuario "${usuario.nombre}" dado de alta.`);
      }
      setSubvista({ modo: 'lista' });
    } catch (error) {
      throw error;
    } finally {
      setGuardando(false);
    }
  };

  /** Ejecuta la acción confirmada en el modal */
  const ejecutarPendiente = async () => {
    if (!pendiente) return;
    setGuardando(true);
    try {
      if (pendiente.tipo === 'eliminar') {
        await eliminarUsuario(pendiente.usuario.id);
        mostrar(`Usuario "${pendiente.usuario.nombre}" eliminado.`);
        setUsuarios((prev) => prev.filter((u) => u.id !== pendiente.usuario.id));
      } else {
        const usuario = await cambiarEstatusUsuario(pendiente.usuario.id, pendiente.activo);
        mostrar(
          pendiente.activo
            ? `Cuenta de ${usuario.nombre} habilitada.`
            : `Cuenta de ${usuario.nombre} deshabilitada.`,
        );
        setUsuarios((prev) => prev.map((u) => (u.id === usuario.id ? usuario : u)));
      }
      setPendiente(null);
    } catch (e) {
      mostrar(mensajeDeError(e), 'error');
      setPendiente(null);
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Subpáginas (alta / edición) ---------- */
  if (subvista.modo !== 'lista') {
    return (
      <UsuarioForm
        modo={subvista.modo}
        usuario={subvista.modo === 'editar' ? subvista.usuario : undefined}
        roles={roles}
        cargandoRoles={cargando}
        guardando={guardando}
        onCancelar={() => setSubvista({ modo: 'lista' })}
        onGuardar={guardarUsuario}
      />
    );
  }

  const columnas: Column<Usuario>[] = [
    {
      key: 'nombre',
      header: 'Usuario',
      render: (usuario) => (
        <div>
          <p className="font-semibold text-gray-900">{usuario.nombre}</p>
          <p className="text-sm text-gray-500 tabular-nums">{usuario.numeroControl}</p>
        </div>
      ),
    },
    { key: 'correo', header: 'Correo' },
    {
      key: 'rol',
      header: 'Rol',
      className: 'w-44',
      render: (usuario) => (
        <div>
          <Badge>{usuario.rol}</Badge>
          {usuario.especialidad && (
            <p className="mt-1 text-xs text-gray-500">{usuario.especialidad}</p>
          )}
          {usuario.tipoPaciente && (
            <p className="mt-1 text-xs text-gray-500">
              {usuario.tipoPaciente}
              {usuario.carrera ? ` · ${usuario.carrera}` : ''}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'estatus',
      header: 'Estatus',
      className: 'w-36',
      render: (usuario) =>
        usuario.estatus === 'Activo' ? (
          <Badge status="confirmed">Activo</Badge>
        ) : (
          <Badge status="neutral">Inactivo</Badge>
        ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'right',
      className: 'w-40',
      render: (usuario) => {
        const esMiCuenta = usuario.id === idSesion;
        const esPaciente = usuario.pacienteId != null;
        return (
          <div className="flex items-center justify-end gap-1">
            <IconButton
              icon={Pencil}
              label={`Editar usuario ${usuario.nombre}`}
              onClick={() => setSubvista({ modo: 'editar', usuario })}
            />
            <IconButton
              icon={usuario.estatus === 'Activo' ? UserX : UserCheck}
              label={
                esMiCuenta
                  ? 'No puedes deshabilitar tu propia cuenta'
                  : usuario.estatus === 'Activo'
                    ? `Deshabilitar cuenta de ${usuario.nombre}`
                    : `Habilitar cuenta de ${usuario.nombre}`
              }
              tone={usuario.estatus === 'Activo' ? 'danger' : 'default'}
              disabled={esMiCuenta}
              onClick={() =>
                setPendiente({ tipo: 'estatus', usuario, activo: usuario.estatus !== 'Activo' })
              }
            />
            <IconButton
              icon={Trash2}
              label={
                esMiCuenta
                  ? 'No puedes eliminar tu propia cuenta'
                  : esPaciente
                    ? `${usuario.nombre} tiene expediente: solo se puede deshabilitar`
                    : `Eliminar usuario ${usuario.nombre}`
              }
              tone="danger"
              disabled={esMiCuenta}
              onClick={() => setPendiente({ tipo: 'eliminar', usuario })}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-10 xl:p-12 max-w-7xl mx-auto font-sans">
      <PageHeader
        title="Usuarios"
        subtitle="Cuentas de acceso al sistema por rol"
        meta={
          <Button icon={Plus} onClick={() => setSubvista({ modo: 'alta' })}>
            Nuevo usuario
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
          {/* Barra de herramientas: búsqueda + filtro de rol */}
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="search"
                icon={Search}
                placeholder="Buscar por nombre, número de control o correo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <Select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              className="md:w-56"
              aria-label="Filtrar por rol"
            >
              <option value="todos">Todos los roles</option>
              {roles.map((rol) => (
                <option key={rol.id} value={rol.nombre}>
                  {rol.nombre}
                </option>
              ))}
            </Select>
          </div>

          <DataTable
            columns={columnas}
            rows={usuariosFiltrados}
            rowKey={(usuario) => usuario.id}
            emptyMessage={
              usuarios.length === 0
                ? 'Todavía no hay usuarios registrados.'
                : 'No hay usuarios que coincidan con la búsqueda.'
            }
          />

          <p className="text-sm text-gray-500 mt-4 px-1">
            Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios
          </p>
        </>
      </EstadoVista>

      {/* Confirmación de habilitar / deshabilitar / eliminar */}
      {pendiente && (
        <Modal
          titulo={
            pendiente.tipo === 'eliminar'
              ? `¿Eliminar a ${pendiente.usuario.nombre}?`
              : pendiente.activo
                ? `¿Habilitar la cuenta de ${pendiente.usuario.nombre}?`
                : `¿Deshabilitar la cuenta de ${pendiente.usuario.nombre}?`
          }
          descripcion={
            pendiente.tipo === 'eliminar'
              ? 'La cuenta se borrará definitivamente del sistema.'
              : pendiente.activo
                ? 'La persona podrá volver a iniciar sesión.'
                : 'La persona no podrá iniciar sesión, pero sus registros se conservan.'
          }
          icono={CircleAlert}
          onCerrar={() => setPendiente(null)}
          acciones={
            <>
              <Button
                variant="secondary"
                onClick={() => setPendiente(null)}
                disabled={guardando}
              >
                Cancelar
              </Button>
              <Button
                variant={pendiente.tipo === 'eliminar' ? 'danger' : 'primary'}
                icon={pendiente.tipo === 'eliminar' ? Trash2 : pendiente.activo ? UserCheck : UserX}
                loading={guardando}
                onClick={() => void ejecutarPendiente()}
              >
                {pendiente.tipo === 'eliminar'
                  ? 'Eliminar'
                  : pendiente.activo
                    ? 'Habilitar'
                    : 'Deshabilitar'}
              </Button>
            </>
          }
        >
          {pendiente.tipo === 'eliminar' ? (
            pendiente.usuario.pacienteId != null ? (
              <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                {pendiente.usuario.nombre} tiene expediente de paciente, así que no se puede
                eliminar sin borrar su historial clínico. Deshabilita la cuenta para bloquear
                el acceso conservando sus registros.
              </p>
            ) : (
              <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Si la persona tiene expediente, horarios o planes asignados, el sistema
                impedirá la eliminación y te sugerirá deshabilitarla.
              </p>
            )
          ) : pendiente.activo ? null : (
            <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Recomendado cuando alguien deja la institución: bloquea el acceso sin perder
              información.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
