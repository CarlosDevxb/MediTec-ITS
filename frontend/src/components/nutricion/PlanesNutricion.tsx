import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, ClipboardCheck, Loader2, CircleAlert } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import DataTable from '../ui/DataTable';
import EstadoVista from '../ui/EstadoVista';
import type { Column } from '../ui/DataTable';
import { Input } from '../ui/Input';
import { mensajeDeError } from '../../services/api';
import { obtenerPerfil } from '../../services/auth.service';
import {
  listarPlanes,
  obtenerExpediente,
  fechaCorta,
  type PlanAlimenticio,
  type ExpedientePaciente,
} from '../../services/atencion.service';
import FichaNutricion from './FichaNutricion';

/* ============================================================
   PLANES (NUTRICIÓN) · Pacientes con plan de nutrición activo
   (vigente o por iniciar). Desde la lista se abre la **ficha de
   nutrición** del paciente: plan alimenticio, avance de peso y
   talla (solo mediciones de las sesiones de nutrición), sesiones
   y descarga del avance y del expediente de nutrición en PDF.
   ============================================================ */

const ESTILOS_PLAN: Record<string, 'pending' | 'confirmed' | 'scheduled' | 'cancelled'> = {
  'Por iniciar': 'pending',
  Vigente: 'confirmed',
  Finalizado: 'scheduled',
  Cancelado: 'cancelled',
};

/** Un plan está activo si aún está vigente o por iniciar */
const planActivo = (plan: PlanAlimenticio): boolean =>
  plan.estatus === 'Vigente' || plan.estatus === 'Por iniciar';

interface ResumenPlan {
  pacienteId: number;
  paciente: string;
  numeroControl: string;
  plan: PlanAlimenticio;
  planesActivos: number;
}

type Vista = { modo: 'lista' } | { modo: 'ficha'; paciente: ExpedientePaciente };

export default function PlanesNutricion() {
  const [planes, setPlanes] = useState<PlanAlimenticio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useState<Vista>({ modo: 'lista' });
  /** Apertura de la ficha de nutrición */
  const [cargandoFicha, setCargandoFicha] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [perfil, lista] = await Promise.all([
        obtenerPerfil().catch(() => null),
        listarPlanes(),
      ]);
      setPlanes(
        perfil?.personalMedicoId
          ? lista.filter((plan) => plan.personalMedicoId === perfil.personalMedicoId)
          : lista,
      );
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* Un renglón por paciente con plan activo (el plan activo más reciente) */
  const pacientesConPlan = useMemo(() => {
    const porPaciente = new Map<number, ResumenPlan>();
    for (const plan of planes.filter(planActivo)) {
      const actual = porPaciente.get(plan.pacienteId);
      if (!actual) {
        porPaciente.set(plan.pacienteId, {
          pacienteId: plan.pacienteId,
          paciente: plan.paciente,
          numeroControl: plan.numeroControl,
          plan,
          planesActivos: 1,
        });
      } else {
        actual.planesActivos += 1;
        if (plan.fechaInicio > actual.plan.fechaInicio) actual.plan = plan;
      }
    }
    return [...porPaciente.values()].sort((a, b) => a.paciente.localeCompare(b.paciente, 'es'));
  }, [planes]);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return pacientesConPlan;
    return pacientesConPlan.filter(
      (resumen) =>
        resumen.paciente.toLowerCase().includes(texto) ||
        resumen.numeroControl.toLowerCase().includes(texto),
    );
  }, [pacientesConPlan, busqueda]);

  /* ---------- Apertura de la ficha de nutrición ---------- */
  const abrirFicha = async (resumen: ResumenPlan) => {
    setCargandoFicha(true);
    setError('');
    try {
      setVista({ modo: 'ficha', paciente: await obtenerExpediente(resumen.pacienteId) });
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargandoFicha(false);
    }
  };

  /* ---------- Ficha de nutrición ---------- */
  if (vista.modo === 'ficha') {
    return <FichaNutricion paciente={vista.paciente} onVolver={() => setVista({ modo: 'lista' })} />;
  }

  /* ---------- Lista de pacientes con plan activo ---------- */
  const columnas: Column<ResumenPlan>[] = [
    {
      key: 'paciente',
      header: 'Paciente',
      render: (resumen) => (
        <div>
          <p className="font-semibold text-gray-900">{resumen.paciente}</p>
          <p className="text-sm text-gray-500 tabular-nums">{resumen.numeroControl}</p>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan activo',
      className: 'w-64',
      render: (resumen) => (
        <div>
          <p className="text-gray-800 tabular-nums">
            {fechaCorta(resumen.plan.fechaInicio)} – {fechaCorta(resumen.plan.fechaFin)}
          </p>
          <p className="text-sm text-gray-500 tabular-nums">
            {resumen.plan.caloriasDiarias} kcal/día
          </p>
        </div>
      ),
    },
    {
      key: 'estatus',
      header: 'Estatus',
      className: 'w-36',
      render: (resumen) => (
        <Badge status={ESTILOS_PLAN[resumen.plan.estatus] ?? 'neutral'}>
          {resumen.plan.estatus}
        </Badge>
      ),
    },
    {
      key: 'planesActivos',
      header: 'Planes activos',
      align: 'right',
      className: 'w-32 tabular-nums',
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'right',
      className: 'w-48',
      render: (resumen) => (
        <Button
          size="sm"
          variant="secondary"
          icon={ClipboardCheck}
          onClick={() => void abrirFicha(resumen)}
        >
          Ficha de nutrición
        </Button>
      ),
    },
  ];

  return (
    <div className="entrada p-10 xl:p-12 max-w-7xl mx-auto font-sans">
      <PageHeader
        title="Planes alimenticios"
        subtitle="Pacientes con plan de nutrición activo y su avance"
      />

      {error && (
        <p
          role="alert"
          className="mb-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <EstadoVista cargando={cargando} error={error} onReintentar={() => void cargar()}>
        <>
          <div className="mb-6">
            <Input
              type="search"
              icon={Search}
              placeholder="Buscar paciente con plan por nombre o número de control…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="max-w-lg"
              aria-label="Buscar paciente con plan"
            />
          </div>

          <DataTable
            columns={columnas}
            rows={filtrados}
            rowKey={(resumen) => resumen.pacienteId}
            emptyMessage="Aún no hay pacientes con plan activo: los planes se dan de alta al atender una sesión de nutrición."
          />

          {cargandoFicha && (
            <p className="mt-4 flex items-center gap-2 text-sm text-gray-600" role="status">
              <Loader2 size={16} className="animate-spin text-brand-600" aria-hidden="true" />
              Abriendo la ficha de nutrición…
            </p>
          )}
        </>
      </EstadoVista>
    </div>
  );
}
