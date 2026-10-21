import React, { useState } from 'react';
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  CalendarClock,
  Settings,
  FileText,
} from 'lucide-react';
import type { SidebarSection } from '../layout/Sidebar';
import AppShell from '../layout/AppShell';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { obtenerSesion, cerrarSesion, inicialesDe } from '../../services/sesion';
import { useProtegerSesion } from '../../hooks/useProtegerSesion';
import Atencion from '../atencion/Atencion';
import ConfiguracionPerfil from '../cuenta/ConfiguracionPerfil';
import ResumenEnfermeria from './ResumenEnfermeria';
import PacientesEnfermeria from './PacientesEnfermeria';
import AgendaEnfermeria from './AgendaEnfermeria';

/* ================= MENÚ DE ENFERMERÍA ================= */
const MENU_ENFERMERIA: SidebarSection[] = [
  {
    grupo: 'Atención',
    items: [
      { label: 'Inicio', icon: LayoutDashboard },
      { label: 'Nueva consulta', icon: Stethoscope },
    ],
  },
  {
    grupo: 'Pacientes',
    items: [
      { label: 'Pacientes', icon: Users },
      { label: 'Agenda', icon: CalendarClock },
    ],
  },
  {
    grupo: 'Sistema',
    items: [{ label: 'Configuración', icon: Settings }],
  },
];

/* ============================================================
   PANEL DE ENFERMERÍA · Shell con las secciones de apoyo
   Ruta: /enfermeria (rol Enfermería)

   Opciones distintas a las del doctor: consultas de enfermería
   (intervención e insumos comunes), altas de pacientes, agenda
   de citas con Odontología y Nutrición, expedientes en solo
   lectura y configuración de la propia cuenta.
   ============================================================ */
export default function PanelEnfermeria() {
  // Redirige a cada usuario a su propio panel (según rol y especialidad)
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
      {/* Cada sección entra con animación (la key reinicia la animación al cambiar) */}
      <div key={vista} className="entrada">
        {vista === 'Inicio' ? (
          <ResumenEnfermeria
            onNuevaConsulta={() => setVista('Nueva consulta')}
            onNuevaCita={() => setVista('Agenda')}
            onNuevoPaciente={() => setVista('Pacientes')}
          />
        ) : vista === 'Nueva consulta' ? (
          <Atencion rol="enfermeria" />
        ) : vista === 'Pacientes' ? (
          <PacientesEnfermeria />
        ) : vista === 'Agenda' ? (
          <AgendaEnfermeria />
        ) : vista === 'Configuración' ? (
          <ConfiguracionPerfil />
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
      </div>
    </AppShell>
  );
}
