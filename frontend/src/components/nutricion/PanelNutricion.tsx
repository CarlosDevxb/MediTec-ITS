import React, { useState } from 'react';
import {
  LayoutDashboard,
  CalendarClock,
  Stethoscope,
  ClipboardCheck,
  Settings,
  FileText,
} from 'lucide-react';
import type { SidebarSection } from '../layout/Sidebar';
import AppShell from '../layout/AppShell';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { obtenerSesion, cerrarSesion, inicialesDe } from '../../services/sesion';
import { useProtegerSesion } from '../../hooks/useProtegerSesion';
import ConfiguracionPerfil from '../cuenta/ConfiguracionPerfil';
import type { Cita } from '../../services/atencion.service';
import ResumenNutricion from './ResumenNutricion';
import AgendaNutricion from './AgendaNutricion';
import AtencionNutricion from './AtencionNutricion';
import PlanesNutricion from './PlanesNutricion';

/* ================= MENÚ DE NUTRICIÓN ================= */
const MENU_NUTRICION: SidebarSection[] = [
  {
    grupo: 'Atención',
    items: [
      { label: 'Inicio', icon: LayoutDashboard },
      { label: 'Agenda', icon: CalendarClock },
      { label: 'Atención', icon: Stethoscope },
    ],
  },
  {
    grupo: 'Nutrición',
    items: [{ label: 'Planes', icon: ClipboardCheck }],
  },
  {
    grupo: 'Sistema',
    items: [{ label: 'Configuración', icon: Settings }],
  },
];

/* ============================================================
   PANEL DE NUTRICIÓN · Shell del portal de la nutrióloga
   Ruta: /nutricion (Personal médico con especialidad Nutrición)

   Su trabajo es mediante **cita agendada**: agenda con las reglas
   de espaciado (sesión de 30 min con 30 de respiro), sesiones
   ligadas a la cita, planes alimenticios por paciente, avance de
   peso y talla e historial de sesiones.
   ============================================================ */
export default function PanelNutricion() {
  // Redirige a cada usuario a su propio panel (según rol y especialidad)
  useProtegerSesion();

  const [vista, setVista] = useState('Inicio');
  /** Cita elegida para atender (Agenda / Atención → formulario de sesión) */
  const [citaAAtender, setCitaAAtender] = useState<Cita | null>(null);

  /** Cambia de vista; si no es a Atención, limpia la cita elegida */
  const navegar = (destino: string) => {
    if (destino !== 'Atención') setCitaAAtender(null);
    setVista(destino);
  };

  return (
    <AppShell
      sidebarId="menu-nutricion"
      sections={MENU_NUTRICION}
      activo={vista}
      onNavigate={navegar}
      onCerrarSesion={cerrarSesion}
      perfil={(() => {
        const sesion = obtenerSesion();
        const nombre = sesion?.usuario.nombre ?? 'Nutrición';
        return {
          iniciales: inicialesDe(nombre),
          nombre,
          rol: sesion?.usuario.rol ?? 'Personal médico',
        };
      })()}
    >
      {/* Cada sección entra con animación (la key reinicia la animación al cambiar) */}
      <div key={vista} className="entrada">
        {vista === 'Inicio' ? (
          <ResumenNutricion
            onNuevaCita={() => navegar('Agenda')}
            onVerAgenda={() => navegar('Agenda')}
            onVerPacientes={() => navegar('Planes')}
          />
        ) : vista === 'Agenda' ? (
          <AgendaNutricion
            onAtender={(cita) => {
              setCitaAAtender(cita);
              setVista('Atención');
            }}
          />
        ) : vista === 'Atención' ? (
          <AtencionNutricion
            citaInicial={citaAAtender}
            onAtenderCita={(cita) => setCitaAAtender(cita)}
            onElegirOtra={() => setCitaAAtender(null)}
            onVerAgenda={() => navegar('Agenda')}
          />
        ) : vista === 'Planes' ? (
          <PlanesNutricion />
        ) : vista === 'Configuración' ? (
          <ConfiguracionPerfil />
        ) : (
          <EmptyState
            icon={FileText}
            title={`Vista de ${vista}`}
            description="Aún no hay nada que mostrar aquí."
            action={
              <Button variant="secondary" onClick={() => navegar('Inicio')}>
                Volver al inicio
              </Button>
            }
          />
        )}
      </div>
    </AppShell>
  );
}
