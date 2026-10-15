import React, { useState } from 'react';
import { LayoutDashboard, FilePlus, ClipboardList, Users, History, Settings, FileText } from 'lucide-react';
import AppShell from '../layout/AppShell';
import type { SidebarSection } from '../layout/Sidebar';
import InicioNutricion from './InicioNutricion';
import NuevoPlan from './NuevoPlan';
import Planes from './Planes';
import HistorialNutricion from './HistorialNutricion';
import Pacientes from '../clinica/Pacientes';
import Configuracion from '../clinica/Configuracion';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { obtenerSesion, cerrarSesion, inicialesDe } from '../../services/sesion';
import { useProtegerSesion } from '../../hooks/useProtegerSesion';
import { PLANES_DEMO, type Plan } from './datos';

/* ================= MENÚ DE NUTRICIÓN ================= */
const MENU: SidebarSection[] = [
  {
    grupo: 'Nutrición',
    items: [
      { label: 'Inicio', icon: LayoutDashboard },
      { label: 'Nuevo plan', icon: FilePlus },
      { label: 'Planes', icon: ClipboardList },
    ],
  },
  {
    grupo: 'Pacientes',
    items: [
      { label: 'Pacientes', icon: Users },
      { label: 'Historial nutricional', icon: History },
    ],
  },
  {
    grupo: 'Sistema',
    items: [{ label: 'Configuración', icon: Settings }],
  },
];

/* ============================================================
   PANEL DE NUTRICIÓN · Shell con las vistas de plan alimenticio
   Ruta: /nutricion
   ============================================================ */
export default function PanelNutricion() {
  // Sin sesión iniciada, regresa al login
  useProtegerSesion();

  const [vista, setVista] = useState('Inicio');
  const [planes, setPlanes] = useState<Plan[]>(PLANES_DEMO);
  // Paciente seleccionado en Pacientes → Historial nutricional
  const [expedienteId, setExpedienteId] = useState<number | null>(null);

  const altaPlan = (plan: Plan) => {
    setPlanes((prev) =>
      [...prev, plan].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))
    );
  };

  const editarPlan = (plan: Plan) => {
    setPlanes((prev) => prev.map((p) => (p.id === plan.id ? plan : p)));
  };

  const verExpediente = (pacienteId: number) => {
    setExpedienteId(pacienteId);
    setVista('Historial nutricional');
  };

  return (
    <AppShell
      sidebarId="menu-nutricion"
      sections={MENU}
      activo={vista}
      onNavigate={setVista}
      onCerrarSesion={cerrarSesion}
      perfil={(() => {
        const sesion = obtenerSesion();
        const nombre = sesion?.usuario.nombre ?? 'Nut. Sofia Star';
        return {
          iniciales: inicialesDe(nombre),
          nombre,
          rol: sesion?.usuario.rol ?? 'Nutrición y dietética',
        };
      })()}
    >
      {vista === 'Inicio' ? (
        <InicioNutricion planes={planes} onNavigate={setVista} />
      ) : vista === 'Nuevo plan' ? (
        <NuevoPlan
          onAlta={altaPlan}
          onCancelar={() => setVista('Inicio')}
        />
      ) : vista === 'Planes' ? (
        <Planes
          planes={planes}
          onGuardarPlan={editarPlan}
          onNuevoPlan={() => setVista('Nuevo plan')}
        />
      ) : vista === 'Pacientes' ? (
        <Pacientes
          subtitulo="Control de pacientes en nutrición"
          onVerExpediente={verExpediente}
        />
      ) : vista === 'Historial nutricional' ? (
        <HistorialNutricion
          pacienteInicial={expedienteId}
          planes={planes}
          onNuevoPlan={() => setVista('Nuevo plan')}
        />
      ) : vista === 'Configuración' ? (
        <Configuracion
          nombre="Nut. Sofia Star"
          correoInicial="sofia.star@meditec.mx"
          telefonoInicial="55 4433 2211"
        />
      ) : (
        <EmptyState
          icon={FileText}
          title={`Vista de ${vista}`}
          description="Aún no hay nada que mostrar aquí."
          action={
            <Button variant="secondary" onClick={() => setVista('Inicio')}>
              Volver al inicio
            </Button>
          }
        />
      )}
    </AppShell>
  );
}
