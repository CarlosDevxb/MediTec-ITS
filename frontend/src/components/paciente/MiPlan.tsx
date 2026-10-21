import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, TrendingUp, FileText, CircleAlert } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import DataTable from '../ui/DataTable';
import EstadoVista from '../ui/EstadoVista';
import StatCard from '../ui/StatCard';
import type { Column } from '../ui/DataTable';
import { mensajeDeError } from '../../services/api';
import { obtenerPerfil } from '../../services/auth.service';
import {
  listarPlanes,
  listarSeguimiento,
  listarConsultas,
  fechaCorta,
  type PlanAlimenticio,
  type RegistroSeguimiento,
  type ConsultaResumen,
} from '../../services/atencion.service';

/* ============================================================
   MI PLAN ALIMENTICIO (PACIENTE) · Solo lectura: su plan vigente
   y el avance de peso y talla en base a sus sesiones de
   nutrición.
   ============================================================ */

const ESTILOS_PLAN: Record<string, 'pending' | 'confirmed' | 'scheduled' | 'cancelled'> = {
  'Por iniciar': 'pending',
  Vigente: 'confirmed',
  Finalizado: 'scheduled',
  Cancelado: 'cancelled',
};

export default function MiPlan() {
  const [planes, setPlanes] = useState<PlanAlimenticio[]>([]);
  const [seguimiento, setSeguimiento] = useState<RegistroSeguimiento[]>([]);
  const [sesiones, setSesiones] = useState<ConsultaResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [perfil, listaPlanes, consultas] = await Promise.all([
        obtenerPerfil().catch(() => null),
        listarPlanes(),
        listarConsultas(),
      ]);
      const miFicha = perfil?.personalMedicoId ?? null;
      setPlanes(listaPlanes);
      // Solo las mediciones de las sesiones de mi nutrióloga
      const misSesiones = consultas.filter(
        (consulta) =>
          consulta.tipo === 'Nutrición' && (!miFicha || consulta.personal.id === miFicha),
      );
      setSesiones(misSesiones);
      const pacienteId = perfil?.pacienteId;
      setSeguimiento(
        pacienteId ? await listarSeguimiento(pacienteId, miFicha ?? undefined) : [],
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

  const planVigente = useMemo(
    () => planes.find((plan) => plan.estatus === 'Vigente') ?? planes[0] ?? null,
    [planes],
  );
  const pesos = seguimiento.filter((registro) => registro.peso != null);
  const pesoInicio = pesos[0]?.peso ?? null;
  const pesoActual = pesos[pesos.length - 1]?.peso ?? null;
  const variacion =
    pesoInicio != null && pesoActual != null ? pesoActual - pesoInicio : null;

  const columnas: Column<RegistroSeguimiento>[] = [
    {
      key: 'fecha',
      header: 'Fecha de la sesión',
      className: 'w-56',
      render: (registro) => <span className="text-gray-900">{registro.fecha}</span>,
    },
    {
      key: 'peso',
      header: 'Peso',
      align: 'right',
      className: 'w-32 tabular-nums',
      render: (registro) => (registro.peso != null ? `${registro.peso} kg` : '—'),
    },
    {
      key: 'talla',
      header: 'Talla',
      align: 'right',
      className: 'w-32 tabular-nums',
      render: (registro) => (registro.talla != null ? `${registro.talla} m` : '—'),
    },
  ];

  return (
    <div className="entrada p-10 xl:p-12 max-w-6xl mx-auto font-sans">
      <PageHeader
        title="Mi plan alimenticio"
        subtitle="Tu plan vigente y tu avance de peso y talla"
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
        <div className="space-y-6">
          {/* Plan vigente */}
          <Card title="Mi plan" icon={ClipboardCheck}>
            {planVigente ? (
              <div className="rounded-xl border border-gray-200 p-5">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge status={ESTILOS_PLAN[planVigente.estatus] ?? 'neutral'}>
                    {planVigente.estatus}
                  </Badge>
                  <span className="text-sm text-gray-500 tabular-nums">
                    {fechaCorta(planVigente.fechaInicio)} – {fechaCorta(planVigente.fechaFin)}
                  </span>
                  <span className="text-sm font-medium text-brand-700 tabular-nums">
                    {planVigente.caloriasDiarias} kcal/día
                  </span>
                </div>
                <p className="text-gray-800 whitespace-pre-line">{planVigente.descripcionDieta}</p>
                <p className="text-xs text-gray-400 mt-2">Plan de {planVigente.personal}</p>
              </div>
            ) : (
              <p className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
                Aún no tienes un plan alimenticio: tu nutrióloga lo registrará durante una
                sesión.
              </p>
            )}
          </Card>

          {/* Avance de peso y talla */}
          <Card
            title="Mi avance"
            icon={TrendingUp}
            description="Mediciones capturadas en tus sesiones de nutrición"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <StatCard
                icon={TrendingUp}
                label="Peso al iniciar"
                value={pesoInicio != null ? `${pesoInicio} kg` : '—'}
              />
              <StatCard
                icon={TrendingUp}
                label="Peso actual"
                value={pesoActual != null ? `${pesoActual} kg` : '—'}
              />
              <StatCard
                icon={TrendingUp}
                label="Variación"
                value={
                  variacion != null
                    ? `${variacion > 0 ? '+' : ''}${variacion.toFixed(1)} kg`
                    : '—'
                }
                detail={`${pesos.length} medición(es)`}
                highlight={variacion != null && variacion !== 0}
              />
            </div>

            <DataTable
              columns={columnas}
              rows={seguimiento}
              rowKey={(registro) => registro.fecha}
              emptyMessage="Aún no hay mediciones: aparecerán al asistir a tus sesiones de nutrición."
            />
          </Card>

          {/* Sesiones de nutrición */}
          <Card title="Mis sesiones de nutrición" icon={FileText}>
            {sesiones.length === 0 ? (
              <p className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
                Aún no tienes sesiones de nutrición registradas.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {sesiones.map((sesion) => (
                  <li key={sesion.id} className="py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge status="scheduled">{sesion.fechaHora}</Badge>
                      <span className="text-gray-600 text-sm">{sesion.cita.motivo}</span>
                    </div>
                    <p className="text-gray-900 mt-1">{sesion.diagnostico}</p>
                    <p className="text-sm text-gray-500">{sesion.tratamiento}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </EstadoVista>
    </div>
  );
}
