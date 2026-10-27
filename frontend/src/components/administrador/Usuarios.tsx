import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, UserX, UserCheck, Trash2, CircleAlert, Download, Upload, KeyRound } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Aviso from '../ui/Aviso';
import IconButton from '../ui/IconButton';
import Badge from '../ui/Badge';
import EstadoVista from '../ui/EstadoVista';
import DataTable from '../ui/DataTable';
import Modal from '../ui/Modal';
import ModalResultado from '../ui/ModalResultado';
import type { Column } from '../ui/DataTable';
import { Field, Input, Select } from '../ui/Input';
import { useAviso } from '../ui/useAviso';
import { mensajeDeError } from '../../services/api';
import { descargarExcel, nombreArchivo } from '../../services/excel.service';
import { obtenerSesion } from '../../services/sesion';
import {
  listarUsuarios,
  listarRoles,
  crearUsuario,
  actualizarUsuario,
  cambiarEstatusUsuario,
  eliminarUsuario,
  importarUsuarios,
  restablecerContrasena,
  type Rol,
  type Usuario,
} from '../../services/administracion.service';
import UsuarioForm from './UsuarioForm';
import ImportadorExcel, { type ColumnaImportacion } from './ImportadorExcel';

/* ============================================================
   VISTA: USUARIOS · Lista con búsqueda y filtro + acciones
   Conectada a /api/usuarios (tabla `usuarios`)
   ============================================================ */

type Subvista =
  | { modo: 'lista' }
  | { modo: 'alta' }
  | { modo: 'editar'; usuario: Usuario }
  | { modo: 'importar' };

/** Acción pendiente de confirmación en un modal */
type Pendiente =
  | { tipo: 'eliminar'; usuario: Usuario }
  | { tipo: 'estatus'; usuario: Usuario; activo: boolean };

/* ---------------- Importación y exportación en Excel ---------------- */

/** Columnas de la plantilla de importación (orden del archivo) */
const COLUMNAS_IMPORTACION: ColumnaImportacion[] = [
  { clave: 'nombre', titulo: 'Nombre', ancho: 28 },
  { clave: 'numeroControl', titulo: 'Número de control', ancho: 20 },
  { clave: 'correo', titulo: 'Correo', ancho: 30 },
  { clave: 'telefono', titulo: 'Teléfono', ancho: 16, opcional: true },
  { clave: 'fechaNacimiento', titulo: 'Fecha de nacimiento', ancho: 20 },
  { clave: 'genero', titulo: 'Género', ancho: 14 },
  { clave: 'rol', titulo: 'Rol', ancho: 22 },
  { clave: 'cedula', titulo: 'Cédula', ancho: 18, opcional: true },
  { clave: 'especialidad', titulo: 'Especialidad', ancho: 24, opcional: true },
  { clave: 'tipoPaciente', titulo: 'Tipo de paciente', ancho: 22, opcional: true },
  { clave: 'carrera', titulo: 'Carrera', ancho: 30, opcional: true },
  { clave: 'contrasena', titulo: 'Contraseña', ancho: 20, opcional: true },
];

/** Renglón de ejemplo de la plantilla (datos ficticios) */
const PLANTILLA_USUARIOS: Array<Record<string, string>> = [
  {
    nombre: 'Ana Sofía Rivera',
    numeroControl: 'AL-0001',
    correo: 'ana.rivera@meditec.mx',
    telefono: '5512345678',
    fechaNacimiento: '2002-04-12',
    genero: 'Femenino',
    rol: 'Paciente',
    cedula: '',
    especialidad: '',
    tipoPaciente: 'Alumno',
    carrera: 'Ing. en Sistemas',
    contrasena: '',
  },
];

/** Columnas del archivo de exportación (sin contraseñas: nunca se exportan) */
const COLUMNAS_EXPORTAR = [
  { clave: 'nombre', titulo: 'Nombre', ancho: 28 },
  { clave: 'numeroControl', titulo: 'Número de control', ancho: 20 },
  { clave: 'correo', titulo: 'Correo', ancho: 30 },
  { clave: 'telefono', titulo: 'Teléfono', ancho: 16 },
  { clave: 'fechaNacimiento', titulo: 'Fecha de nacimiento', ancho: 20 },
  { clave: 'genero', titulo: 'Género', ancho: 14 },
  { clave: 'rol', titulo: 'Rol', ancho: 22 },
  { clave: 'estatus', titulo: 'Estatus', ancho: 14 },
  { clave: 'cedula', titulo: 'Cédula', ancho: 18 },
  { clave: 'especialidad', titulo: 'Especialidad', ancho: 24 },
  { clave: 'tipoPaciente', titulo: 'Tipo de paciente', ancho: 22 },
  { clave: 'carrera', titulo: 'Carrera', ancho: 30 },
];

/** Roles que exigen cédula y especialidad (igual que en el alta manual) */
const ROLES_CON_CEDULA = ['Personal médico', 'Enfermería'];

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
  /** Resultado visible de la última acción (modal de confirmación) */
  const [resultado, setResultado] = useState<{
    titulo: string;
    mensaje: string;
    tipo: 'exito' | 'error';
  } | null>(null);
  /** Restablecimiento de contraseña en curso */
  const [pendienteReset, setPendienteReset] = useState<Usuario | null>(null);
  const [resetContrasena, setResetContrasena] = useState('');
  /** Contraseña temporal generada (se muestra una sola vez) */
  const [temporal, setTemporal] = useState<{ nombre: string; contrasena: string } | null>(null);
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
        setUsuarios((prev) => prev.filter((u) => u.id !== pendiente.usuario.id));
        setResultado({
          titulo: 'Usuario eliminado',
          mensaje: `La cuenta de ${pendiente.usuario.nombre} se eliminó del sistema.`,
          tipo: 'exito',
        });
      } else {
        const usuario = await cambiarEstatusUsuario(pendiente.usuario.id, pendiente.activo);
        setUsuarios((prev) => prev.map((u) => (u.id === usuario.id ? usuario : u)));
        setResultado({
          titulo: pendiente.activo ? 'Cuenta habilitada' : 'Cuenta deshabilitada',
          mensaje: pendiente.activo
            ? `${usuario.nombre} ya puede volver a iniciar sesión.`
            : `${usuario.nombre} ya no puede iniciar sesión; sus registros se conservan.`,
          tipo: 'exito',
        });
      }
      setPendiente(null);
    } catch (e) {
      mostrar(mensajeDeError(e), 'error');
      setPendiente(null);
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Restablecimiento de contraseña ---------- */
  const ejecutarReset = async () => {
    if (!pendienteReset) return;
    setGuardando(true);
    try {
      const datos = await restablecerContrasena(pendienteReset.id, resetContrasena || undefined);
      setPendienteReset(null);
      setResetContrasena('');
      if (datos.contrasenaTemporal) {
        // Se muestra una sola vez, para entregársela a la persona
        setTemporal({ nombre: datos.nombre, contrasena: datos.contrasenaTemporal });
      } else {
        setResultado({
          titulo: 'Contraseña actualizada',
          mensaje: `Se definió una nueva contraseña para ${datos.nombre}.`,
          tipo: 'exito',
        });
      }
    } catch (e) {
      mostrar(mensajeDeError(e), 'error');
      setPendienteReset(null);
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Exportación a Excel ---------- */
  const exportarExcel = () => {
    const filas = usuariosFiltrados.map((usuario) => ({
      nombre: usuario.nombre,
      numeroControl: usuario.numeroControl,
      correo: usuario.correo,
      telefono: usuario.telefono ?? '',
      fechaNacimiento: usuario.fechaNacimiento,
      genero: usuario.genero,
      rol: usuario.rol,
      estatus: usuario.estatus,
      cedula: usuario.cedula ?? '',
      especialidad: usuario.especialidad ?? '',
      tipoPaciente: usuario.tipoPaciente ?? '',
      carrera: usuario.carrera ?? '',
    }));

    // Nunca se exportan contraseñas ni datos que no vea el administrador
    descargarExcel(nombreArchivo('usuarios'), COLUMNAS_EXPORTAR, filas)
      .then(() => mostrar(`Se exportaron ${filas.length} usuario(s) a Excel.`))
      .catch(() => mostrar('No se pudo generar el archivo. Intenta de nuevo.', 'error'));
  };

  /* ---------- Avisos previos de la importación (antes de enviar) ---------- */
  const validarFilaUsuario = (
    fila: Record<string, string>,
    indice: number,
    todas: Array<Record<string, string>>,
  ): string[] => {
    const avisos: string[] = [];
    const texto = (clave: string) => (fila[clave] ?? '').trim();

    if (texto('nombre').length < 3) avisos.push('Falta el nombre (mínimo 3 caracteres).');
    if (!texto('numeroControl')) avisos.push('Falta el número de control.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto('correo'))) avisos.push('El correo no es válido.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto('fechaNacimiento'))) {
      avisos.push('La fecha de nacimiento debe ser AAAA-MM-DD.');
    }
    const genero = texto('genero');
    if (genero && !['masculino', 'femenino', 'otro'].includes(genero.toLowerCase())) {
      avisos.push('El género debe ser Masculino, Femenino u Otro.');
    }

    const rol = texto('rol');
    if (!rol) {
      avisos.push('Falta el rol.');
    } else if (roles.length > 0 && !roles.some((r) => r.nombre.toLowerCase() === rol.toLowerCase())) {
      avisos.push(`El rol "${rol}" no existe en el sistema.`);
    } else if (ROLES_CON_CEDULA.some((r) => r.toLowerCase() === rol.toLowerCase())) {
      if (!texto('cedula')) avisos.push('Falta la cédula (obligatoria para ese rol).');
      if (!texto('especialidad')) avisos.push('Falta la especialidad (obligatoria para ese rol).');
    } else if (rol.toLowerCase() === 'paciente' && !texto('tipoPaciente')) {
      avisos.push('Falta el tipo de paciente (obligatorio para Paciente).');
    }

    if (texto('contrasena') && texto('contrasena').length < 8) {
      avisos.push('La contraseña debe tener al menos 8 caracteres.');
    }

    // Duplicados dentro del mismo archivo (contra las filas anteriores)
    const repetido = (clave: string, etiqueta: string) => {
      const valor = texto(clave).toLowerCase();
      if (!valor) return;
      const otra = todas.findIndex((f, i) => i < indice && (f[clave] ?? '').trim().toLowerCase() === valor);
      if (otra >= 0) avisos.push(`${etiqueta} repetido en el archivo (fila ${otra + 2}).`);
    };
    repetido('numeroControl', 'El número de control');
    repetido('correo', 'El correo');

    // Duplicados contra el sistema (lo confirma la API al importar)
    const numeroControl = texto('numeroControl').toLowerCase();
    const correo = texto('correo').toLowerCase();
    if (numeroControl && usuarios.some((u) => u.numeroControl.toLowerCase() === numeroControl)) {
      avisos.push('Ese número de control ya está registrado.');
    }
    if (correo && usuarios.some((u) => u.correo.toLowerCase() === correo)) {
      avisos.push('Ese correo ya está registrado.');
    }

    return avisos;
  };

  /* ---------- Subpágina de importación (Excel) ---------- */
  if (subvista.modo === 'importar') {
    return (
      <ImportadorExcel
        titulo="Importar usuarios"
        descripcion="Alta masiva de cuentas desde un archivo de Excel"
        entidad="usuarios"
        columnas={COLUMNAS_IMPORTACION}
        plantilla={PLANTILLA_USUARIOS}
        validarFila={validarFilaUsuario}
        onImportar={(filas) => importarUsuarios(filas)}
        onCancelar={() => setSubvista({ modo: 'lista' })}
        onFinalizar={() => {
          setSubvista({ modo: 'lista' });
          void cargar();
        }}
        mostrarContrasenas
      />
    );
  }

  /* ---------- Subpáginas (alta / edición) ---------- */
  if (subvista.modo !== 'lista') {
    return (
      <UsuarioForm
        modo={subvista.modo}
        usuario={subvista.modo === 'editar' ? subvista.usuario : undefined}
        roles={roles}
        existentes={usuarios}
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
              icon={KeyRound}
              label={`Restablecer contraseña de ${usuario.nombre}`}
              onClick={() => {
                setResetContrasena('');
                setPendienteReset(usuario);
              }}
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
    <div className="entrada p-10 xl:p-12 max-w-7xl mx-auto font-sans">
      <PageHeader
        title="Usuarios"
        subtitle="Cuentas de acceso al sistema por rol"
        meta={
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" icon={Download} onClick={exportarExcel}>
              Exportar Excel
            </Button>
            <Button
              variant="secondary"
              icon={Upload}
              onClick={() => setSubvista({ modo: 'importar' })}
            >
              Importar Excel
            </Button>
            <Button icon={Plus} onClick={() => setSubvista({ modo: 'alta' })}>
              Nuevo usuario
            </Button>
          </div>
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

      {/* Restablecimiento de contraseña (contraseñas perdidas) */}
      {pendienteReset && (
        <Modal
          titulo={`¿Restablecer la contraseña de ${pendienteReset.nombre}?`}
          descripcion="Útil cuando la persona olvidó su contraseña y necesita volver a entrar."
          icono={KeyRound}
          onCerrar={() => setPendienteReset(null)}
          acciones={
            <>
              <Button
                variant="secondary"
                onClick={() => setPendienteReset(null)}
                disabled={guardando}
              >
                Cancelar
              </Button>
              <Button icon={KeyRound} loading={guardando} onClick={() => void ejecutarReset()}>
                Restablecer
              </Button>
            </>
          }
        >
          <Field label="Nueva contraseña" hint="Opcional: si la dejas vacía, se genera una temporal que se mostrará una sola vez.">
            <Input
              type="text"
              value={resetContrasena}
              onChange={(e) => setResetContrasena(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              minLength={8}
            />
          </Field>
        </Modal>
      )}

      {/* Contraseña temporal generada (se muestra una sola vez) */}
      {temporal && (
        <Modal
          titulo={`Contraseña temporal de ${temporal.nombre}`}
          icono={KeyRound}
          onCerrar={() => setTemporal(null)}
          acciones={
            <Button icon={KeyRound} onClick={() => setTemporal(null)}>
              Entendido
            </Button>
          }
        >
          <p className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900 mb-4">
            Guárdala ahora y entrégasela a la persona: no se volverá a mostrar.
          </p>
          <p className="font-mono text-lg bg-gray-100 px-4 py-3 rounded-lg text-center">
            {temporal.contrasena}
          </p>
        </Modal>
      )}

      {/* Confirmación visible de la última acción */}
      {resultado && (
        <ModalResultado
          titulo={resultado.titulo}
          mensaje={resultado.mensaje}
          tipo={resultado.tipo}
          onCerrar={() => setResultado(null)}
        />
      )}
    </div>
  );
}
