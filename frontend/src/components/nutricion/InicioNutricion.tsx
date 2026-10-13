import React from 'react';
import { ClipboardList, Users, Activity, FilePlus } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import StatCard from '../ui/StatCard';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { saludoDelDia, fechaCorta, nombrePaciente } from '../clinica/datos';
import { estadoPlan, fechaCortaSinAnio, type Plan } from './datos';

/* ============================================================
   INICIO (NUTRICIÓN) · KPIs + planes vigentes + accesos rápidos
   ============================================================ */

interface Props {
  planes: Plan[];
  onNavigate: (vista: string) => void;
}

export default function InicioNutricion({ planes, onNavigate }: Props) {
  const fecha = new Date()
    .toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^\w/, (c) => c.toUpperCase());

  const vigentes = planes
    .filter((plan) => estadoPlan(plan) === 'vigente')
    .sort((a, b) => a.fechaFin.localeCompare(b.fechaFin));

  const pacientesEnControl = new Set(vigentes.map((plan) => plan.pacienteId)).size;

  const caloriasPromedio = vigentes.length
    ? Math.round(
        vigentes.reduce((suma, plan) => suma + plan.caloriasDiarias, 0) / vigentes.length
      )
    : 0;

  const destacados = vigentes.slice(0, 3);

  return (
    <div className="p-10 xl:p-12 max-w-7xl mx-auto">
      
      {/* Cabecera */}
      <PageHeader
        title={`${saludoDelDia()}, Nut. Sofia Star`}
        subtitle={fecha}
        meta={
          <div className="text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-lg">
            Nutrición y dietética
          </div>
        }
      />

      {/* Panel único de indicadores */}
      <div className="bg-white rounded-2xl border border-gray-200 grid grid-cols-1 md:grid-cols-3 divide-y divide-gray-100 md:divide-y-0 md:divide-x mb-8">
        <StatCard
          variant="band"
          icon={ClipboardList}
          label="Planes activos"
          value={vigentes.length}
          detail={`de ${planes.length} planes registrados`}
          highlight
        />
        <StatCard
          variant="band"
          icon={Activity}
          label="Calorías promedio"
          value={`${caloriasPromedio} kcal`}
          detail="en planes vigentes"
        />
        <StatCard
          variant="band"
          icon={Users}
          label="Pacientes en control"
          value={pacientesEnControl}
          detail="con plan en vigencia"
        />
      </div>

      {/* Layout de 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Planes vigentes (riel de fechas) */}
        <div className="lg:col-span-2">
          <Card
            title="Planes vigentes"
            description={`${vigentes.length} planes en seguimiento`}
            divided
            action={
              <Button variant="ghost" size="sm" onClick={() => onNavigate('Planes')}>
                Ver todos
              </Button>
            }
            bodyClassName="px-7 py-2"
          >
            <ol>
              {destacados.map((plan, i) => {
                const esPrimero = i === 0;
                const esUltimo = i === destacados.length - 1;
                return (
                  <li key={plan.id} className="relative flex gap-4 py-4">
                    {/* Vencimiento */}
                    <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-600 pt-0.5">
                      {fechaCortaSinAnio(plan.fechaFin)}
                    </span>

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
                      <span className="relative w-2.5 h-2.5 rounded-full bg-brand-800" />
                    </div>

                    {/* Contenido del plan */}
                    <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-base font-semibold text-gray-900">
                          {nombrePaciente(plan.pacienteId)}
                        </h4>
                        <p className="text-base text-gray-500 tabular-nums">
                          {plan.caloriasDiarias} kcal diarias · vence {fechaCorta(plan.fechaFin)}
                        </p>
                      </div>
                      <Badge status="confirmed">Vigente</Badge>
                    </div>
                  </li>
                );
              })}

              {destacados.length === 0 && (
                <li className="py-6 text-base text-gray-500">
                  No hay planes vigentes. Crea uno desde “Nuevo plan”.
                </li>
              )}
            </ol>
          </Card>
        </div>

        {/* Accesos rápidos */}
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-gray-900 mb-4 px-1">
            Accesos rápidos
          </h3>
          <div className="flex flex-col gap-4">
            
            {/* Acceso principal */}
            <button
              onClick={() => onNavigate('Nuevo plan')}
              className="bg-brand-800 hover:bg-brand-950 text-left p-7 rounded-2xl text-white transition-colors relative group"
            >
              <div className="bg-white/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                <FilePlus size={20} className="text-white" />
              </div>
              <h4 className="font-semibold text-lg tracking-tight mb-1">Nuevo plan</h4>
              <p className="text-brand-200 text-sm">
                Define la dieta, calorías y duración del seguimiento.
              </p>
              <span
                className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-hidden="true"
              >
                ›
              </span>
            </button>

            {/* Acceso secundario 1 */}
            <button
              onClick={() => onNavigate('Planes')}
              className="bg-white hover:border-brand-300 border border-gray-200 text-left p-7 rounded-2xl transition-colors"
            >
              <div className="bg-brand-50 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                <ClipboardList size={20} className="text-brand-700" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Planes</h4>
              <p className="text-gray-500 text-sm">
                Revisa los planes asignados y su vigencia.
              </p>
            </button>

            {/* Acceso secundario 2 */}
            <button
              onClick={() => onNavigate('Pacientes')}
              className="bg-white hover:border-brand-300 border border-gray-200 text-left p-7 rounded-2xl transition-colors"
            >
              <div className="bg-brand-50 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                <Users size={20} className="text-brand-700" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Pacientes</h4>
              <p className="text-gray-500 text-sm">
                Control y alertas clínicas de tus pacientes.
              </p>
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}
