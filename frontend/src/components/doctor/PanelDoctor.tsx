import React, { useState } from 'react';
import {
  LayoutDashboard,
  Stethoscope,
  ClipboardList,
  Users,
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
import ResumenDoctor from './ResumenDoctor';
import HistorialConsultas from './HistorialConsultas';
import PacientesDoctor from './PacientesDoctor';

/* ================= MENÚ DEL DOCTOR ================= */
const MENU_DOCTOR: SidebarSection[] = [
  {
    grupo: 'Atención',
    items: [
      { label: 'Inicio', icon: LayoutDashboard },
      { label: 'Nueva consulta', icon: Stethoscope },
      { label: 'Historial de consultas', icon: ClipboardList },
    ],
  },
  {
    grupo: 'Expedientes',
    items: [{ label: 'Pacientes', icon: Users }],
  },
  {
    grupo: 'Sistema',
    items: [{ label: 'Configuración', icon: Settings }],
  },
];

/* ============================================================
   PANEL DEL DOCTOR · Shell con las secciones del personal médico
   Ruta: /doctor (rol Personal médico)

   El doctor registra atenciones de llegada (estado "Atención
   directa"), consulta el historial y los expedientes. La agenda
   de citas es trabajo de enfermería, no de este panel.
   ============================================================ */
export default function PanelDoctor() {
  // Redirige a cada usuario a su propio panel (según rol y especialidad)
  useProtegerSesion();

  const [vista, setVista] = useState('Inicio');

  return (
    <AppShell
      sidebarId="menu-doctor"
      sections={MENU_DOCTOR}
      activo={vista}
      onNavigate={setVista}
      onCerrarSesion={cerrarSesion}
      perfil={(() => {
        const sesion = obtenerSesion();
        const nombre = sesion?.usuario.nombre ?? 'Doctor';
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
          <ResumenDoctor onNuevaConsulta={() => setVista('Nueva consulta')} />
        ) : vista === 'Nueva consulta' ? (
          <Atencion rol="medico" />
        ) : vista === 'Historial de consultas' ? (
          <HistorialConsultas />
        ) : vista === 'Pacientes' ? (
          <PacientesDoctor />
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
