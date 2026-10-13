import React, { useEffect, useState } from 'react';
import { Search, ClipboardList, History, FilePlus } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { Input } from '../ui/Input';
import ExpedientePaciente from './ExpedientePaciente';
import {
  PACIENTES,
  CONSULTAS,
  fechaCorta,
  horaDeFecha,
  type Paciente,
} from './datos';

/* ============================================================
   HISTORIAL CLÍNICO · Buscador que carga el expediente completo
   Datos del paciente + alertas + línea de tiempo de consultas
   ============================================================ */

interface Props {
  /** Paciente precargado (desde el botón "Ver expediente" de Pacientes) */
  pacienteInicial?: number | null;
  onNuevaConsulta?: () => void;
}

export default function HistorialClinico({ pacienteInicial, onNuevaConsulta }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [sel, setSel] = useState<Paciente | null>(() =>
    pacienteInicial
      ? PACIENTES.find((p) => p.id === pacienteInicial) ?? null
      : null
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

  const consultas = sel
    ? CONSULTAS.filter((c) => c.pacienteId === sel.id).sort((a, b) =>
        b.fecha.localeCompare(a.fecha)
      )
    : [];

  return (
    <div className="p-10 xl:p-12 max-w-6xl mx-auto font-sans">
      <PageHeader
        title="Historial clínico"
        subtitle={sel ? `Expediente de ${sel.nombre}` : 'Busca y carga el expediente médico de un paciente'}
        meta={
          sel && onNuevaConsulta ? (
            <Button icon={FilePlus} onClick={onNuevaConsulta}>
              Nueva consulta
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
            description="Escribe el nombre o el número de expediente para ver el historial del paciente."
          />
        </div>
      )}

      {/* ============ EXPEDIENTE CARGADO ============ */}
      {sel && (
        <>
          <ExpedientePaciente paciente={sel} />

          {/* Línea de tiempo de consultas */}
          <Card
            title="Consultas registradas"
            icon={History}
            description={`${consultas.length} consulta${consultas.length === 1 ? '' : 's'} en el expediente`}
          >
            {consultas.length === 0 ? (
              <p className="text-base text-gray-500">
                Este paciente aún no tiene consultas registradas.
              </p>
            ) : (
              <ol>
                {consultas.map((cita, i) => {
                  const esPrimero = i === 0;
                  const esUltimo = i === consultas.length - 1;
                  return (
                    <li key={cita.id} className="relative flex gap-5 py-5">
                      {/* Fecha */}
                      <div className="w-28 shrink-0 text-right pt-0.5">
                        <p className="text-sm font-semibold tabular-nums text-gray-900">
                          {fechaCorta(cita.fecha)}
                        </p>
                        <p className="text-sm tabular-nums text-gray-500">{horaDeFecha(cita.fecha)}</p>
                      </div>

                      {/* Riel + marcador */}
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
                        <span className="relative w-2.5 h-2.5 rounded-full bg-brand-800" />
                      </div>

                      {/* Contenido de la consulta */}
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-gray-900">{cita.motivo}</p>
                        <p className="text-base text-gray-600 mt-1">{cita.exploracion}</p>
                        <p className="text-base text-gray-900 mt-2">
                          <strong>Diagnóstico:</strong> {cita.diagnostico}
                        </p>
                        <p className="text-base text-gray-700 mt-1">
                          <strong>Tratamiento:</strong> {cita.tratamiento}
                        </p>

                        {/* Signos vitales de esa consulta */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="bg-brand-50 border border-brand-100 text-brand-800 text-sm px-2.5 py-1 rounded-md tabular-nums">
                            TA {cita.vitales.ta}
                          </span>
                          <span className="bg-brand-50 border border-brand-100 text-brand-800 text-sm px-2.5 py-1 rounded-md tabular-nums">
                            FC {cita.vitales.fc}
                          </span>
                          <span className="bg-brand-50 border border-brand-100 text-brand-800 text-sm px-2.5 py-1 rounded-md tabular-nums">
                            FR {cita.vitales.fr}
                          </span>
                          <span className="bg-brand-50 border border-brand-100 text-brand-800 text-sm px-2.5 py-1 rounded-md tabular-nums">
                            Temp {cita.vitales.temp} °C
                          </span>
                          <span className="bg-brand-50 border border-brand-100 text-brand-800 text-sm px-2.5 py-1 rounded-md tabular-nums">
                            {cita.vitales.peso} kg
                          </span>
                          <span className="bg-brand-50 border border-brand-100 text-brand-800 text-sm px-2.5 py-1 rounded-md tabular-nums">
                            {cita.vitales.talla} m
                          </span>
                        </div>
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
