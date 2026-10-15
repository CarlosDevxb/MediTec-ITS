import React, { useState } from 'react';
import { LayoutDashboard, Users, CalendarClock, FileText } from 'lucide-react';
import type { SidebarSection } from '../layout/Sidebar';
import AppShell from '../layout/AppShell';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { obtenerSesion, cerrarSesion, inicialesDe } from '../../services/sesion';
import { useProtegerSesion } from '../../hooks/useProtegerSesion';
import ResumenEnfermeria from './ResumenEnfermeria';
import PacientesEnfermeria from './PacientesEnfermeria';
import AgendaEnfermeria from './AgendaEnfermeria';

/* ================= MENÚ DE ENFERMERÍA ================= */
const MENU_ENFERMERIA: SidebarSection[] = [
  {
    grupo: 'Apoyo clínico',
    items: [
      { label: 'Inicio', icon: LayoutDashboard },
      { label: 'Pacientes', icon: Users },
      { label: 'Agenda', icon: CalendarClock },
    ],
  },
];

/* ============================================================
   PANEL DE ENFERMERÍA · Shell con las secciones de apoyo
   Ruta: /enfermeria (rol Enfermería)

   Opciones distintas a las del doctor: registro y actualización
   de pacientes y agenda de citas. La consulta con diagnóstico y
   tratamiento se registra en el panel del doctor.
   ============================================================ */
export default function PanelEnfermeria() {
  // Sin sesión iniciada, regresa al login
  useProtegerSesion();

  const [vista, setVista] = useState('Inicio');

  return (
    <AppShell
      sidebarId="menu-enfermeria"
      sections={MENU_ENFERMERIA}
      activo={vista}
      onNavigate={setVista}
      onCerrarSesion={cerrarSesion}
      perfil={(() => {
        const sesion = obtenerSesion();
        const nombre = sesion?.usuario.nombre ?? 'Enfermería';
        return {
          iniciales: inicialesDe(nombre),
          nombre,
          rol: sesion?.usuario.rol ?? 'Enfermería',
        };
      })()}
    >
      {vista === 'Inicio' ? (
        <ResumenEnfermeria
          onNuevaCita={() => setVista('Agenda')}
          onNuevoPaciente={() => setVista('Pacientes')}
        />
      ) : vista === 'Pacientes' ? (
        <PacientesEnfermeria />
      ) : vista === 'Agenda' ? (
        <AgendaEnfermeria />
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
