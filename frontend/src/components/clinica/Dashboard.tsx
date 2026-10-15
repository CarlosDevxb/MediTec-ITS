import React, { useState } from 'react';
import {
  LayoutDashboard,
  FilePlus,
  Calendar,
  Users,
  ClipboardList,
  Clock,
  Settings,
  CheckCircle,
  FileText,
} from 'lucide-react';
import type { SidebarSection } from '../layout/Sidebar';
import AppShell from '../layout/AppShell';
import NuevaConsulta from './NuevaConsulta';
import Citas from './Citas';
import Pacientes from './Pacientes';
import HistorialClinico from './HistorialClinico';
import Configuracion from './Configuracion';
import PageHeader from '../ui/PageHeader';
import StatCard from '../ui/StatCard';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import type { BadgeStatus } from '../ui/Badge';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { saludoDelDia } from './datos';
import { obtenerSesion, cerrarSesion, inicialesDe } from '../../services/sesion';
import { useProtegerSesion } from '../../hooks/useProtegerSesion';

/* ================= DATOS DEL MENÚ (agrupado por contexto) ================= */
const MENU: SidebarSection[] = [
  {
    grupo: 'Clínica',
    items: [
      { label: 'Inicio', icon: LayoutDashboard },
      { label: 'Nueva consulta', icon: FilePlus },
      { label: 'Citas', icon: Calendar },
    ],
  },
  {
    grupo: 'Expedientes',
    items: [
      { label: 'Pacientes', icon: Users },
      { label: 'Historial clínico', icon: ClipboardList },
    ],
  },
  {
    grupo: 'Sistema',
    items: [{ label: 'Configuración', icon: Settings }],
  },
];

/* ================= DATOS DE LA AGENDA (demo) ================= */
const AGENDA = [
  { hora: '09:00', paciente: 'Lucía Torres', motivo: 'Consulta de seguimiento', estatus: 'confirmed' as BadgeStatus },
  { hora: '10:30', paciente: 'Miguel Herrera', motivo: 'Valoración inicial', estatus: 'scheduled' as BadgeStatus },
  { hora: '12:00', paciente: 'Sofía Mendoza', motivo: 'Revisión de tratamiento', estatus: 'scheduled' as BadgeStatus },
];

export default function Dashboard() {
  // Sin sesión iniciada, regresa al login
  useProtegerSesion();

  // Estado para controlar qué pantalla se está viendo
  const [vistaActiva, setVistaActiva] = useState('Inicio');
  // Paciente seleccionado en Pacientes → Historial clínico
  const [expedienteId, setExpedienteId] = useState<number | null>(null);

  const verExpediente = (pacienteId: number) => {
    setExpedienteId(pacienteId);
    setVistaActiva('Historial clínico');
  };

  return (
    <AppShell
      sections={MENU}
      activo={vistaActiva}
      onNavigate={setVistaActiva}
      onCerrarSesion={cerrarSesion}
      perfil={(() => {
        const sesion = obtenerSesion();
        const nombre = sesion?.usuario.nombre ?? 'Dra. Paola Janeth';
        return {
          iniciales: inicialesDe(nombre),
          nombre,
          rol: sesion?.usuario.rol ?? 'Personal médico',
        };
      })()}
    >
      {vistaActiva === 'Inicio' ? (
          <VistaInicio onNavigate={setVistaActiva} />
        ) : vistaActiva === 'Nueva consulta' ? (
          <NuevaConsulta />
        ) : vistaActiva === 'Citas' ? (
          <Citas />
        ) : vistaActiva === 'Pacientes' ? (
          <Pacientes onVerExpediente={verExpediente} />
        ) : vistaActiva === 'Historial clínico' ? (
          <HistorialClinico
            pacienteInicial={expedienteId}
            onNuevaConsulta={() => setVistaActiva('Nueva consulta')}
          />
        ) : vistaActiva === 'Configuración' ? (
          <Configuracion />
        ) : (
          <EmptyState
            icon={FileText}
            title={`Vista de ${vistaActiva}`}
            description="Aún no hay nada que mostrar aquí."
            action={
              <Button variant="secondary" onClick={() => setVistaActiva('Inicio')}>
                Volver al inicio
              </Button>
            }
          />
        )}
    </AppShell>
  );
}

/* ================= COMPONENTE: VISTA INICIO ================= */
function VistaInicio({ onNavigate }: { onNavigate: (vista: string) => void }) {
  const fecha = new Date()
    .toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="p-10 xl:p-12 max-w-7xl mx-auto">
      
      {/* Cabecera */}
      <PageHeader
        title={`${saludoDelDia()}, Dra. Paola Janeth`}
        subtitle={fecha}
        meta={
          <div className="text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-lg">
            Odontología
          </div>
        }
      />

      {/* Panel único de indicadores (hairlines en lugar de tarjetas gemelas) */}
      <div className="bg-white rounded-2xl border border-gray-200 grid grid-cols-1 md:grid-cols-3 divide-y divide-gray-100 md:divide-y-0 md:divide-x mb-8">
        <StatCard
          variant="band"
          icon={Calendar}
          label="Citas de hoy"
          value="8"
          detail="2 pendientes"
          highlight
        />
        <StatCard
          variant="band"
          icon={CheckCircle}
          label="Pacientes atendidos"
          value="3"
          detail="Última a las 11:15"
        />
        <StatCard
          variant="band"
          icon={Clock}
          label="Próxima cita"
          value="12:00"
          detail="Sofía Mendoza"
        />
      </div>

      {/* Layout de 2 Columnas (Agenda y Accesos Rápidos) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Agenda (Ocupa 2 espacios) */}
        <div className="lg:col-span-2">
          <Card
            title="Agenda de hoy"
            description="3 próximas citas"
            divided
            action={
              <Button variant="ghost" size="sm" onClick={() => onNavigate('Citas')}>
                Ver todas
              </Button>
            }
            bodyClassName="px-7 py-2"
          >
            {/* Riel de tiempo: punto relleno = confirmada · hueco = programada */}
            <ol>
              {AGENDA.map((cita, i) => {
                const esPrimero = i === 0;
                const esUltimo = i === AGENDA.length - 1;
                return (
                  <li key={cita.hora} className="relative flex gap-4 py-4">
                    <time className="w-14 shrink-0 text-right text-base font-semibold tabular-nums text-gray-600 pt-0.5">
                      {cita.hora}
                    </time>

                    {/* Riel vertical + marcador de estatus */}
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
                          cita.estatus === 'confirmed'
                            ? 'bg-brand-800'
                            : 'bg-white border-2 border-gray-300'
                        }`}
                      />
                    </div>

                    {/* Contenido de la cita */}
                    <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-base font-semibold text-gray-900">{cita.paciente}</h4>
                        <p className="text-base text-gray-500">{cita.motivo}</p>
                      </div>
                      <Badge status={cita.estatus} />
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        {/* Columna Derecha: Accesos rápidos */}
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-gray-900 mb-4 px-1">
            Accesos rápidos
          </h3>
          <div className="flex flex-col gap-4">
            
            {/* Acceso principal */}
            <button 
              onClick={() => onNavigate('Nueva consulta')}
              className="bg-brand-800 hover:bg-brand-950 text-left p-7 rounded-2xl text-white transition-colors relative group"
            >
              <div className="bg-white/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                <FilePlus size={20} className="text-white" />
              </div>
              <h4 className="font-semibold text-lg tracking-tight mb-1">Nueva consulta</h4>
              <p className="text-brand-200 text-sm">Registra una atención y actualiza el expediente.</p>
              <span className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                ›
              </span>
            </button>

            {/* Acceso secundario 1 */}
            <button
              onClick={() => onNavigate('Citas')}
              className="bg-white hover:border-brand-300 border border-gray-200 text-left p-7 rounded-2xl transition-colors"
            >
              <div className="bg-brand-50 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                <Calendar size={20} className="text-brand-700" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Citas</h4>
              <p className="text-gray-500 text-sm">Consulta y organiza la agenda del día.</p>
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
              <p className="text-gray-500 text-sm">Busca pacientes y revisa sus datos.</p>
            </button>
            
          </div>
        </div>

      </div>
    </div>
  );
}
