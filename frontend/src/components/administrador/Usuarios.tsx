import React, { useState } from 'react';
import { Plus, Search, Pencil, UserX, UserCheck, KeyRound } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
import IconButton from '../ui/IconButton';
import Badge from '../ui/Badge';
import DataTable from '../ui/DataTable';
import type { Column } from '../ui/DataTable';
import { Input, Select } from '../ui/Input';
import UsuarioForm from './UsuarioForm';
import { USUARIOS_DEMO, OPCIONES_ROL, type Usuario } from './tipos';

/* ============================================================
   VISTA: USUARIOS · Lista + acciones rápidas + subpáginas
   de alta y edición (mapea a la tabla `usuarios`)
   ============================================================ */

type Subvista =
  | { modo: 'lista' }
  | { modo: 'alta' }
  | { modo: 'editar'; usuario: Usuario };

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>(USUARIOS_DEMO);
  const [subvista, setSubvista] = useState<Subvista>({ modo: 'lista' });
  const { aviso, mostrar, cerrar } = useAviso();
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');

  /* ---------- Subpáginas (alta / edición) ---------- */
  if (subvista.modo !== 'lista') {
    return (
      <UsuarioForm
        modo={subvista.modo}
        usuario={subvista.modo === 'editar' ? subvista.usuario : undefined}
        onCancelar={() => setSubvista({ modo: 'lista' })}
        onGuardar={(datos) => {
          setUsuarios((prev) =>
            subvista.modo === 'editar'
              ? prev.map((u) => (u.id === datos.id ? datos : u))
              : [datos, ...prev]
          );
          mostrar(
            subvista.modo === 'editar'
              ? `Usuario "${datos.nombre}" actualizado.`
              : `Usuario "${datos.nombre}" dado de alta.`
          );
          setSubvista({ modo: 'lista' });
        }}
      />
    );
  }

  /* ---------- Acciones rápidas ---------- */
  const editar = (usuario: Usuario) => setSubvista({ modo: 'editar', usuario });

  const alternarEstatus = (usuario: Usuario) => {
    const nuevoEstatus = usuario.estatus === 'Activo' ? 'Inactivo' : 'Activo';
    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuario.id ? { ...u, estatus: nuevoEstatus } : u))
    );
    mostrar(
      nuevoEstatus === 'Inactivo'
        ? `Cuenta de ${usuario.nombre} deshabilitada.`
        : `Cuenta de ${usuario.nombre} habilitada.`
    );
  };

  const recuperarContrasena = (usuario: Usuario) =>
    mostrar(`Enlace de recuperación enviado a ${usuario.correo}.`);

  /* ---------- Filtros ---------- */
  const usuariosFiltrados = usuarios.filter((usuario) => {
    const texto = busqueda.toLowerCase();
    const coincideTexto =
      usuario.nombre.toLowerCase().includes(texto) ||
      usuario.numeroControl.toLowerCase().includes(texto) ||
      usuario.correo.toLowerCase().includes(texto);
    const coincideRol = filtroRol === 'todos' || usuario.rol === filtroRol;
    return coincideTexto && coincideRol;
  });

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
      render: (usuario) => <Badge>{usuario.rol}</Badge>,
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
      render: (usuario) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon={Pencil}
            label="Editar usuario"
            onClick={(e) => {
              e.stopPropagation();
              editar(usuario);
            }}
          />
          <IconButton
            icon={usuario.estatus === 'Activo' ? UserX : UserCheck}
            label={usuario.estatus === 'Activo' ? 'Deshabilitar usuario' : 'Habilitar usuario'}
            tone={usuario.estatus === 'Activo' ? 'danger' : 'default'}
            onClick={(e) => {
              e.stopPropagation();
              alternarEstatus(usuario);
            }}
          />
          <IconButton
            icon={KeyRound}
            label="Recuperar contraseña"
            onClick={(e) => {
              e.stopPropagation();
              recuperarContrasena(usuario);
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
        title="Usuarios"
        subtitle="Cuentas de acceso al sistema por rol"
        meta={<Button icon={Plus} onClick={() => setSubvista({ modo: 'alta' })}>Nuevo usuario</Button>}
      />

      {aviso && <Aviso mensaje={aviso} onCerrar={cerrar} />}

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
          {OPCIONES_ROL.map((rol) => (
            <option key={rol} value={rol}>
              {rol}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columnas}
        rows={usuariosFiltrados}
        rowKey={(usuario) => usuario.id}
        onRowClick={() => { /* Abrir detalle del usuario */ }}
        emptyMessage="No hay usuarios que coincidan con la búsqueda."
      />

      <p className="text-sm text-gray-500 mt-4 px-1">
        Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios
      </p>
    </div>
  );
}
