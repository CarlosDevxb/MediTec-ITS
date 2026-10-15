import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, CircleAlert } from 'lucide-react';import PageHeader from '../ui/PageHeader';
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
  listarCatalogos,
  listarValoresCatalogo,
  crearValorCatalogo,
  actualizarValorCatalogo,
  eliminarValorCatalogo,
  type Catalogo,
  type ValorCatalogo,
} from '../../services/administracion.service';
import CatalogoForm from './CatalogoForm';
import { ICONOS_CATALOGO, ICONO_POR_DEFECTO } from './iconosCatalogo';

/* ============================================================
   VISTA: CATÁLOGOS · Administración de las tablas `cat_*`
   desde la interfaz, sin tocar la base de datos directamente.

   Cinco catálogos en una sola sección con pestañas; todos comparten
   el mismo formulario, que se construye a partir de los campos que
   devuelve la API.
   ============================================================ */

type Subvista =
  | { modo: 'lista' }
  | { modo: 'alta' }
  | { modo: 'editar'; valor: ValorCatalogo };

export default function Catalogos() {
  const [catalogos, setCatalogos] = useState<Catalogo[]>([]);
  const [catalogoId, setCatalogoId] = useState('');
  const [valores, setValores] = useState<ValorCatalogo[]>([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [subvista, setSubvista] = useState<Subvista>({ modo: 'lista' });
  const [aEliminar, setAEliminar] = useState<ValorCatalogo | null>(null);
  const { aviso, tipo, mostrar, cerrar } = useAviso();

  const catalogo = catalogos.find((c) => c.id === catalogoId) ?? null;

  /* ---------- Carga desde la API ---------- */
  const cargarCatalogos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await listarCatalogos();
      setCatalogos(datos);
      // Se abre en el primer catálogo disponible
      setCatalogoId((previo) => (datos.some((c) => c.id === previo) ? previo : datos[0]?.id ?? ''));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarValores = useCallback(async (id: string) => {
    setCargando(true);
    setError(null);
    try {
      setValores(await listarValoresCatalogo(id));
    } catch (e) {
      setError(mensajeDeError(e));
      setValores([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarCatalogos();
  }, [cargarCatalogos]);

  useEffect(() => {
    if (catalogoId) void cargarValores(catalogoId);
  }, [catalogoId, cargarValores]);

  /* ---------- Cambio de pestaña (con navegación por teclado) ---------- */
  const irA = (id: string) => {
    setCatalogoId(id);
    setSubvista({ modo: 'lista' });
    setAEliminar(null);
    cerrar();
  };

  const manejarTeclas = (e: React.KeyboardEvent) => {
    const indice = catalogos.findIndex((c) => c.id === catalogoId);
    if (indice < 0 || catalogos.length === 0) return;
    const ultimo = catalogos.length - 1;
    let siguiente = -1;

    if (e.key === 'ArrowRight') siguiente = indice === ultimo ? 0 : indice + 1;
    else if (e.key === 'ArrowLeft') siguiente = indice === 0 ? ultimo : indice - 1;
    else if (e.key === 'Home') siguiente = 0;
    else if (e.key === 'End') siguiente = ultimo;
    else return;

    e.preventDefault();
    irA(catalogos[siguiente].id);
  };

  /* ---------- Guardado genérico (alta y edición) ---------- */
  const guardarValor = async (datos: Record<string, string>) => {
    if (!catalogo) return;
    setGuardando(true);
    try {
      if (subvista.modo === 'editar') {
        const actualizado = await actualizarValorCatalogo(catalogo.id, subvista.valor.id, datos);
        setValores((prev) => prev.map((v) => (v.id === actualizado.id ? actualizado : v)));
        mostrar(`${catalogo.singular} "${actualizado.nombre}" actualizado.`);
      } else {
        const creado = await crearValorCatalogo(catalogo.id, datos);
        setValores((prev) =>
          [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
        );
        setCatalogos((prev) =>
          prev.map((c) => (c.id === catalogo.id ? { ...c, total: c.total + 1 } : c)),
        );
        mostrar(`${catalogo.singular} "${creado.nombre}" agregado al catálogo.`);
      }
      setSubvista({ modo: 'lista' });
    } catch (error) {
      // El formulario presenta el error: por campo si la API los detalla
      throw error;
    } finally {
      setGuardando(false);
    }
  };

  /** Elimina el valor marcado y refresca el contador del catálogo */
  const confirmarEliminar = async () => {
    if (!catalogo || !aEliminar) return;
    setGuardando(true);
    try {
      await eliminarValorCatalogo(catalogo.id, aEliminar.id);
      const nombre = aEliminar.nombre;
      setValores((prev) => prev.filter((v) => v.id !== aEliminar.id));
      setCatalogos((prev) =>
        prev.map((c) => (c.id === catalogo.id ? { ...c, total: Math.max(0, c.total - 1) } : c)),
      );
      mostrar(`${catalogo.singular} "${nombre}" eliminado del catálogo.`);
      setAEliminar(null);
    } catch (e) {
      // Se mantiene el modal abierto para que el error sea visible y se pueda reintentar
      mostrar(mensajeDeError(e), 'error');
      setAEliminar(null);
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Estado inicial: cargando o con error ---------- */
  if (!catalogo) {
    return (
      <div className="p-10 xl:p-12 max-w-6xl mx-auto font-sans">
        <PageHeader
          title="Catálogos"
          subtitle="Opciones que alimentan los formularios del sistema"
        />
        <EstadoVista
          cargando={cargando}
          error={error}
          onReintentar={() => void cargarCatalogos()}
        >
          <span />
        </EstadoVista>
      </div>
    );
  }

  /* ---------- Subpáginas (alta / edición) ---------- */
  if (subvista.modo !== 'lista') {
    return (
      <CatalogoForm
        catalogo={catalogo}
        modo={subvista.modo}
        valor={subvista.modo === 'editar' ? subvista.valor : undefined}
        existentes={valores}
        guardando={guardando}
        onCancelar={() => setSubvista({ modo: 'lista' })}
        onGuardar={guardarValor}
      />
    );
  }

  /* ---------- Columnas: una por campo del catálogo + acciones ---------- */
  const columnas: Column<ValorCatalogo>[] = [
    {
      key: 'id',
      header: 'ID',
      align: 'right',
      className: 'w-20',
      render: (valor) => (
        <span className="text-sm text-gray-400 tabular-nums">{valor.id}</span>
      ),
    },
    ...catalogo.campos.map((campo) => ({
      key: campo.columna,
      header: campo.etiqueta,
      className: campo.columna === 'nombre' ? '' : 'w-40',
      render: (valor: ValorCatalogo) =>
        campo.columna === 'nombre' ? (
          <span className="font-semibold text-gray-900">{valor.nombre}</span>
        ) : (
          <span className="font-mono text-sm text-gray-600">
            {valor.abreviatura ?? '—'}
          </span>
        ),
    })),
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'right',
      className: 'w-24',
      render: (valor) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon={Pencil}
            label={`Editar ${valor.nombre}`}
            onClick={() => setSubvista({ modo: 'editar', valor })}
          />
          <IconButton
            icon={Trash2}
            label={`Eliminar ${valor.nombre}`}
            tone="danger"
            onClick={() => setAEliminar(valor)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="p-10 xl:p-12 max-w-6xl mx-auto font-sans">
      <PageHeader
        title="Catálogos"
        subtitle="Opciones que alimentan los formularios del sistema"
        meta={
          <Button icon={Plus} onClick={() => setSubvista({ modo: 'alta' })}>
            {`Nuevo valor`}
          </Button>
        }
      />

      {aviso && <Aviso mensaje={aviso} tipo={tipo} onCerrar={cerrar} />}

      {/* Pestañas de catálogos (patrón ARIA tabs con teclado) */}
      <div
        role="tablist"
        aria-label="Catálogos disponibles"
        onKeyDown={manejarTeclas}
        className="mb-8 flex flex-wrap gap-2 border-b border-gray-200 pb-5"
      >
        {catalogos.map((c) => {
          const activa = c.id === catalogo.id;
          const Icono = ICONOS_CATALOGO[c.id] || ICONO_POR_DEFECTO;
          return (
            <button
              key={c.id}
              type="button"
              id={`pestana-${c.id}`}
              role="tab"
              aria-selected={activa}
              aria-controls={`panel-${c.id}`}
              tabIndex={activa ? 0 : -1}
              onClick={() => irA(c.id)}
              className={[
                'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-base font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40',
                activa
                  ? 'border-brand-200 bg-brand-50 text-brand-800'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <Icono size={16} aria-hidden="true" />
              {c.titulo}
              <span
                className={
                  activa
                    ? 'rounded-full bg-brand-800 px-2 py-0.5 text-xs font-semibold text-white tabular-nums'
                    : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500 tabular-nums'
                }
              >
                {c.total}
              </span>
            </button>
          );
        })}
      </div>

      <div id={`panel-${catalogo.id}`} role="tabpanel" aria-labelledby={`pestana-${catalogo.id}`}>
        <EstadoVista
          cargando={cargando}
          error={error}
          onReintentar={() => void cargarValores(catalogo.id)}
        >
          <>
            <DataTable
              columns={columnas}
              rows={valores}
              rowKey={(valor) => valor.id}
              emptyMessage={`Todavía no hay valores en el catálogo de ${catalogo.titulo.toLowerCase()}.`}
            />

            <p className="mt-4 px-1 text-sm text-gray-500">
              {valores.length} {valores.length === 1 ? 'valor' : 'valores'} en el catálogo de{' '}
              {catalogo.titulo.toLowerCase()}
            </p>
          </>
        </EstadoVista>
      </div>

      {/* Confirmación antes de eliminar */}
      {aEliminar && (
        <Modal
          titulo={`¿Eliminar ${catalogo.articulo} ${catalogo.singular}?`}
          descripcion={`Se quitará "${aEliminar.nombre}" del catálogo de ${catalogo.titulo.toLowerCase()}.`}
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
          <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Si este valor ya está asignado a pacientes, expedientes o medicamentos, no se
            podrá eliminar hasta que deje de usarse.
          </p>
        </Modal>
      )}
    </div>
  );
}
