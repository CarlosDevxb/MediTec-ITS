import React from 'react';
import { CalendarDays, FileText, AlertTriangle, CalendarPlus } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import StatCard from '../ui/StatCard';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { saludoDelDia, fechaCorta } from '../clinica/datos';
import {
  esProxima,
  fechaLarga,
  AREA_BADGE,
  BADGE_POR_ESTATUS,
  type CitaPaciente,
} from './datos';
import type { Paciente } from '../clinica/datos';

/* ============================================================
   INICIO (PORTAL) · Saludo + próxima cita, indicadores y
   resumen. El hero oscuro es la pieza destacada del portal.
   ============================================================ */

interface Props {
  paciente: Paciente;
  citas: CitaPaciente[];
  onNavigate: (vista: string) => void;
}

export default function InicioPaciente({ paciente, citas, onNavigate }: Props) {
  const proximas = citas
    .filter((cita) => esProxima(cita))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const atendidas = citas.filter((cita) => cita.estatus === 'Completada');

  const ultima = atendidas
    .slice()
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];

  const proxima = proximas[0];

  const iniciales = paciente.nombre.split(' ').map((p) => p[0]).slice(0, 2).join('');

  return (
    <div className="p-8 xl:p-10 max-w-6xl mx-auto">
      
      {/* ================= HERO: saludo + próxima cita ================= */}
      <section className="bg-brand-950 text-white rounded-2xl p-8 xl:p-10 mb-8 flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="text-brand-300 text-sm font-medium mb-2">
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-3xl xl:text-4xl font-semibold tracking-tight">
            {saludoDelDia()}, {paciente.nombre}
          </h1>
          <p className="text-brand-200 mt-3 text-base max-w-xl">
            {proxima
              ? `Tu próxima cita es el ${fechaLarga(proxima.fecha)} a las ${proxima.hora} en ${proxima.area}.`
              : 'No tienes citas programadas. Puedes solicitar una cuando lo necesites.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            icon={CalendarPlus}
            onClick={() => onNavigate('Mis citas')}
          >
            Nueva cita
          </Button>
        </div>
      </section>

      {/* ================= Indicadores ================= */}
      <div className="bg-white rounded-2xl border border-gray-200 grid grid-cols-1 md:grid-cols-3 divide-y divide-gray-100 md:divide-y-0 md:divide-x mb-8">
        <StatCard
          variant="band"
          icon={CalendarDays}
          label="Próximas citas"
          value={proximas.length}
          detail={proxima ? `Primera: ${fechaCorta(proxima.fecha)}` : 'Sin citas programadas'}
          highlight
        />
        <StatCard
          variant="band"
          icon={FileText}
          label="Citas atendidas"
          value={atendidas.length}
          detail="En odontología y nutrición"
        />
        <StatCard
          variant="band"
          icon={CalendarDays}
          label="Última visita"
          value={ultima ? fechaCorta(ultima.fecha) : '—'}
          detail={ultima ? ultima.area : 'Aún sin visitas'}
        />
      </div>

      {/* ================= Alerta de alergias ================= */}
      {paciente.alergias !== 'Ninguna' && (
        <div className="mb-8 flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-5 py-4 text-base">
          <AlertTriangle size={18} className="shrink-0" />
          <span>
            <strong>Alergias registradas:</strong> {paciente.alergias}. Infóralas siempre al
            personal médico.
          </span>
        </div>
      )}

      {/* ================= Dos columnas ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Próximas citas */}
        <div className="lg:col-span-2">
          <Card
            title="Próximas citas"
            description={proximas.length ? `${proximas.length} programadas` : undefined}
            divided
            action={
              <Button variant="ghost" size="sm" onClick={() => onNavigate('Mis citas')}>
                Gestionar
              </Button>
            }
            bodyClassName="px-7 py-2"
          >
            {proximas.length === 0 ? (
              <p className="py-6 text-base text-gray-500">
                No tienes citas programadas.
              </p>
            ) : (
              <ul>
                {proximas.slice(0, 3).map((cita) => {
                  const area = AREA_BADGE[cita.area];
                  return (
                    <li key={cita.id} className="py-4 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                          <Badge status={area.status}>{area.label}</Badge>
                          <Badge status={BADGE_POR_ESTATUS[cita.estatus]} />
                        </div>
                        <p className="text-base font-semibold text-gray-900">{cita.motivo}</p>
                        <p className="text-sm text-gray-500 tabular-nums">
                          {fechaLarga(cita.fecha)} · {cita.hora}
                        </p>
                      </div>
                      <span className="text-sm text-gray-400 shrink-0 hidden sm:block">
                        {cita.profesional}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Resumen personal */}
        <div>
          <Card title="Mi información" icon={FileText}>
            <dl className="space-y-4">
              <div className="flex justify-between gap-4">
                <dt className="text-sm text-gray-500">Expediente</dt>
                <dd className="text-base font-medium text-gray-900 tabular-nums">
                  {paciente.expediente}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sm text-gray-500">Tipo de sangre</dt>
                <dd className="text-base font-medium text-gray-900">{paciente.tipoSangre}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sm text-gray-500">Teléfono</dt>
                <dd className="text-base font-medium text-gray-900 tabular-nums">
                  {paciente.telefono}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sm text-gray-500">Género</dt>
                <dd className="text-base font-medium text-gray-900">{paciente.genero}</dd>
              </div>
            </dl>
            <div className="pt-5 mt-5 border-t border-gray-100">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => onNavigate('Mi información')}
              >
                Ver mi información
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
