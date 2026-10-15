import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, PackageX, TrendingDown, Pill } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
import IconButton from '../ui/IconButton';
import Badge from '../ui/Badge';
import DataTable from '../ui/DataTable';
import EstadoVista from '../ui/EstadoVista';
import StatCard from '../ui/StatCard';
import type { Column } from '../ui/DataTable';
import { Input } from '../ui/Input';
import { mensajeDeError } from '../../services/api';
import {
  listarMedicamentos,
  crearMedicamento,
  actualizarMedicamento,
  listarUnidadesMedida,
  type Medicamento,
  type DatosMedicamento,
} from '../../services/operacion.service';
import type { ValorCatalogo } from '../../services/administracion.service';
import MedicamentoForm from './MedicamentoForm';

/* ============================================================
   VISTA: MEDICAMENTOS · Inventario + subpáginas de alta y edición
   Conectada a /api/medicamentos (tabla `medicamentos`)

   Regla del inventario: los medicamentos no se eliminan. Un stock
   en 0 los deja "Agotados" y el módulo de consultas no los ofrecerá;
   para volver a usarlos basta con reponer el stock.
   ============================================================ */

/** Stock por debajo del cual se marca como bajo */
const STOCK_BAJO = 10;

type Subvista =
  | { modo: 'lista' }
  | { modo: 'alta' }
  | { modo: 'editar'; medicamento: Medicamento };

export default function Medicamentos() {
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [unidades, setUnidades] = useState<ValorCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [subvista, setSubvista] = useState<Subvista>({ modo: 'lista' });
  const { aviso, tipo, mostrar, cerrar } = useAviso();
  const [busqueda, setBusqueda] = useState('');

  /* ---------- Carga desde la API ---------- */
  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      // Inventario y unidades de medida juntos: el formulario necesita las
      // unidades y así la vista se muestra completa de una sola vez
      const [lista, listaUnidades] = await Promise.all([
        listarMedicamentos(),
        listarUnidadesMedida(),
      ]);
      setMedicamentos(lista);
      setUnidades(listaUnidades);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* ---------- Guardado (alta / edición) ---------- */
  const guardarMedicamento = async (datos: DatosMedicamento) => {
    setGuardando(true);
    try {
      if (subvista.modo === 'editar') {
        const medicamento = await actualizarMedicamento(subvista.medicamento.id, datos);
        setMedicamentos((prev) =>
          prev
            .map((m) => (m.id === medicamento.id ? medicamento : m))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
        );
        mostrar(`Medicamento "${medicamento.nombre}" actualizado.`);
      } else {
        const medicamento = await crearMedicamento(datos);
        setMedicamentos((prev) =>
          [...prev, medicamento].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
        );
        mostrar(`Medicamento "${medicamento.nombre}" agregado al inventario.`);
      }
      setSubvista({ modo: 'lista' });
    } catch (error) {
      // El formulario pinta el error en su campo o como resumen
      throw error;
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Filtros (hooks siempre antes de los return tempranos) ---------- */
  const medicamentosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return medicamentos.filter(
      (medicamento) =>
        !texto ||
        medicamento.nombre.toLowerCase().includes(texto) ||
        medicamento.descripcion.toLowerCase().includes(texto),
    );
  }, [medicamentos, busqueda]);

  /* ---------- Subpáginas (alta / edición) ---------- */
  if (subvista.modo !== 'lista') {
    return (
      <MedicamentoForm
        modo={subvista.modo}
        medicamento={subvista.modo === 'editar' ? subvista.medicamento : undefined}
        existentes={medicamentos}
        unidades={unidades}
        guardando={guardando}
        onCancelar={() => setSubvista({ modo: 'lista' })}
        onGuardar={guardarMedicamento}
      />
    );
  }

  /* ---------- Indicadores del inventario ---------- */
  const agotados = medicamentos.filter((m) => m.stock === 0).length;
  const bajos = medicamentos.filter((m) => m.stock > 0 && m.stock <= STOCK_BAJO).length;

  const columnas: Column<Medicamento>[] = [
    {
      key: 'nombre',
      header: 'Medicamento',
      render: (medicamento) => (
        <div>
          <p className="font-semibold text-gray-900">{medicamento.nombre}</p>
          <p className="text-sm text-gray-500">{medicamento.descripcion || 'Sin descripción'}</p>
        </div>
      ),
    },
    {
      key: 'unidad',
      header: 'Unidad de medida',
      className: 'w-44',
      render: (medicamento) => (
        <div>
          <p className="text-gray-800">{medicamento.unidad}</p>
          {medicamento.abreviatura && (
            <p className="text-xs text-gray-500">{medicamento.abreviatura}</p>
          )}
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Disponibilidad',
      align: 'right',
      className: 'w-56',
      render: (medicamento) =>
        !medicamento.disponible ? (
          <div className="flex flex-col items-end gap-1">
            <Badge status="cancelled">Agotado</Badge>
            <span className="text-xs text-gray-500">No disponible para consultas</span>
          </div>
        ) : medicamento.stock <= STOCK_BAJO ? (
          <div className="flex flex-col items-end gap-1">
            <Badge status="pending">{medicamento.stock} · stock bajo</Badge>
            <span className="text-xs text-gray-500 tabular-nums">Reponer pronto</span>
          </div>
        ) : (
          <span className="tabular-nums text-gray-800">{medicamento.stock}</span>
        ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'right',
      className: 'w-28',
      render: (medicamento) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon={Pencil}
            label={`Editar medicamento ${medicamento.nombre}`}
            onClick={() => setSubvista({ modo: 'editar', medicamento })}
          />
        </div>
      ),
    },
  ];

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

      {aviso && <Aviso mensaje={aviso} tipo={tipo} onCerrar={cerrar} />}

      <EstadoVista cargando={cargando} error={error} onReintentar={() => void cargar()}>
        <>
          {/* Indicadores del inventario */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              icon={Pill}
              label="Medicamentos"
              value={medicamentos.length}
              detail="productos en el inventario"
            />
            <StatCard
              icon={TrendingDown}
              label="Stock bajo"
              value={bajos}
              detail={bajos > 0 ? `por debajo de ${STOCK_BAJO} unidades` : 'todo con existencias'}
              highlight={bajos > 0}
            />
            <StatCard
              icon={PackageX}
              label="Agotados"
              value={agotados}
              detail={
                agotados > 0
                  ? 'no disponibles para consultas'
                  : 'sin faltantes en el inventario'
              }
              highlight={agotados > 0}
            />
          </div>

          {/* Búsqueda */}
          <div className="mb-6">
            <Input
              type="search"
              icon={Search}
              placeholder="Buscar medicamento por nombre o uso…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="max-w-md"
              aria-label="Buscar medicamento"
            />
          </div>

          <DataTable
            columns={columnas}
            rows={medicamentosFiltrados}
            rowKey={(medicamento) => medicamento.id}
            emptyMessage={
              medicamentos.length === 0
                ? 'Todavía no hay medicamentos en el inventario.'
                : 'No hay medicamentos que coincidan con la búsqueda.'
            }
          />

          <p className="text-sm text-gray-500 mt-4 px-1">
            Mostrando {medicamentosFiltrados.length} de {medicamentos.length} medicamentos
            {bajos > 0 && ` · ${bajos} con stock bajo`}
            {agotados > 0 && ` · ${agotados} agotados`}
          </p>

          <p className="text-sm text-gray-400 mt-2 px-1">
            Los medicamentos no se eliminan: deja su stock en 0 y dejarán de estar
            disponibles para las consultas.
          </p>
        </>
      </EstadoVista>
    </div>
  );
}
