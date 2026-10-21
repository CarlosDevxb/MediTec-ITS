import React, { useEffect, useState } from 'react';
import { Search, ClipboardList, History, FilePlus } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import type { BadgeStatus } from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import { Input } from '../ui/Input';
import ExpedientePaciente from '../clinica/ExpedientePaciente';
import {
  PACIENTES,
  fechaCorta,
  type Paciente,
} from '../clinica/datos';
import {
  estadoPlan,
  fechaCortaSinAnio,
  type EstadoPlan,
  type Plan,
} from './datos';

/* ============================================================
   HISTORIAL NUTRICIONAL · Buscador de expedientes con la
   línea de tiempo de planes alimenticios asignados
   ============================================================ */

const BADGE_POR_ESTADO: Record<EstadoPlan, BadgeStatus> = {
  vigente: 'confirmed',
  porIniciar: 'scheduled',
  finalizado: 'completed',
};

const ETIQUETA_ESTADO: Record<EstadoPlan, string> = {
  vigente: 'Vigente',
  porIniciar: 'Por iniciar',
  finalizado: 'Finalizado',
};

interface Props {
  pacienteInicial?: number | null;
  planes: Plan[];
  onNuevoPlan?: () => void;
}

export default function HistorialNutricion({ pacienteInicial, planes, onNuevoPlan }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [sel, setSel] = useState<Paciente | null>(() =>
    pacienteInicial ? PACIENTES.find((p) => p.id === pacienteInicial) ?? null : null
  );

  // Cuando llega un paciente desde la vista de Pacientes
  useEffect(() => {
    if (!pacienteInicial) return;
    const encontrado = PACIENTES.find((p) => p.id === pacienteInicial);
    if (encontrado) {
      setSel(encontrado);
      setBusqueda('');
    }
  }, [pacienteInicial]);

  const encontrados = PACIENTES.filter(
    (p) =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.expediente.toLowerCase().includes(busqueda.toLowerCase())
  );

  const planesDelPaciente = sel
    ? planes
        .filter((plan) => plan.pacienteId === sel.id)
        .sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio))
    : [];

  return (
    <div className="entrada p-10 xl:p-12 max-w-6xl mx-auto font-sans">
      <PageHeader
        title="Historial nutricional"
        subtitle={sel ? `Expediente de ${sel.nombre}` : 'Busca y carga el expediente del paciente'}
        meta={
          sel && onNuevoPlan ? (
            <Button icon={FilePlus} onClick={onNuevoPlan}>
              Nuevo plan
            </Button>
          ) : undefined
        }
      />

      {/* Buscador siempre visible */}
      <div className="mb-6 max-w-2xl">
        <Input
          type="search"
          icon={Search}
          placeholder="Buscar por nombre o número de expediente..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* Resultados de búsqueda (sin paciente cargado) */}
      {!sel && busqueda.trim().length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
          {encontrados.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {encontrados.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSel(p);
                      setBusqueda('');
                    }}
                    className="w-full text-left px-7 py-4 hover:bg-brand-50 transition-colors flex items-center justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
                  >
                    <span>
                      <span className="font-semibold text-gray-900">{p.nombre}</span>
                      <span className="block text-sm text-gray-500">
                        Última visita {fechaCorta(p.ultimaVisita)}
                      </span>
                    </span>
                    <span className="text-sm text-gray-500 tabular-nums shrink-0">{p.expediente}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-7 py-5 text-base text-gray-500">
              Sin coincidencias. Verifica el nombre o el expediente.
            </p>
          )}
        </div>
      )}

      {/* Sin paciente cargado */}
      {!sel && busqueda.trim().length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200">
          <EmptyState
            icon={ClipboardList}
            title="Carga un expediente"
            description="Escribe el nombre o el número de expediente para ver los planes del paciente."
          />
        </div>
      )}

      {/* ============ EXPEDIENTE CARGADO ============ */}
      {sel && (
        <>
          {/* Ficha del paciente (componente compartido) */}
          <ExpedientePaciente paciente={sel} />

          {/* Línea de tiempo de planes */}
          <Card
            title="Planes asignados"
            icon={History}
            description={`${planesDelPaciente.length} plan${planesDelPaciente.length === 1 ? '' : 'es'} en el expediente`}
          >
            {planesDelPaciente.length === 0 ? (
              <p className="text-base text-gray-500">
                Este paciente aún no tiene planes alimenticios. Crea uno desde “Nuevo plan”.
              </p>
            ) : (
              <ol>
                {planesDelPaciente.map((plan, i) => {
                  const esPrimero = i === 0;
                  const esUltimo = i === planesDelPaciente.length - 1;
                  const estado = estadoPlan(plan);
                  return (
                    <li key={plan.id} className="relative flex gap-5 py-5">
                      {/* Periodo */}
                      <div className="w-32 shrink-0 text-right pt-0.5">
                        <p className="text-sm font-semibold tabular-nums text-gray-900">
                          {fechaCorta(plan.fechaInicio)}
                        </p>
                        <p className="text-sm tabular-nums text-gray-500">
                          hasta {fechaCortaSinAnio(plan.fechaFin)}
                        </p>
                      </div>

                      {/* Riel + marcador (relleno = vigente) */}
                      <div className="relative shrink-0 w-3 flex justify-center pt-1.5">
                        {!esPrimero && !esUltimo && (
                          <span className="absolute left-1/2 -translate-x-1/2 w-px bg-gray-200 top-0 bottom-0" />
                        )}
                        {esPrimero && !esUltimo && (
                          <span className="absolute left-1/2 -translate-x-1/2 w-px bg-gray-200 top-7 bottom-0" />
                        )}
                        {esUltimo && !esPrimero && (
                          <span className="absolute left-1/2 -translate-x-1/2 w-px bg-gray-200 top-0 h-7" />
                        )}
                        <span
                          className={`relative w-2.5 h-2.5 rounded-full ${
                            estado === 'vigente'
                              ? 'bg-brand-800'
                              : 'bg-white border-2 border-gray-300'
                          }`}
                        />
                      </div>

                      {/* Contenido del plan */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-1.5">
                          <Badge status={BADGE_POR_ESTADO[estado]}>
                            {ETIQUETA_ESTADO[estado]}
                          </Badge>
                          <span className="text-sm tabular-nums text-gray-600 font-medium">
                            {plan.caloriasDiarias} kcal/día
                          </span>
                        </div>
                        <p className="text-base text-gray-700">{plan.descripcion}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
