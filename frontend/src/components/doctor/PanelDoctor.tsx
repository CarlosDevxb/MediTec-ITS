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
import { obtenerSesion, cerrarSesion, inicialesDe, sinAccion } from '../../services/sesion';
import { useProtegerSesion } from '../../hooks/useProtegerSesion';
import Atencion from '../atencion/Atencion';
import ConfiguracionPerfil from '../cuenta/ConfiguracionPerfil';
import ResumenDoctor from './ResumenDoctor';
import HistorialConsultas from '../atencion/HistorialConsultas';
import ListaPacientes from '../atencion/ListaPacientes';

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

/** Sección del menú → acción que puede ocultarla (rol con restricciones) */
const ACCION_DE: Record<string, string> = {
  'Nueva consulta': 'consultas',
  'Historial de consultas': 'historial',
  Pacientes: 'pacientes',
};

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

  // Secciones visibles según las restricciones del rol; la vista inicial es
  // la primera que queda
  const menu = MENU_DOCTOR.map((grupo) => ({
    ...grupo,
    items: grupo.items.filter((item) => !sinAccion(ACCION_DE[item.label] ?? '')),
  })).filter((grupo) => grupo.items.length > 0);

  const [vista, setVistaBase] = useState(menu[0]?.items[0]?.label ?? 'Inicio');
  /** Cambia de sección ignorando las que el rol tiene restringidas */
  const setVista = (destino: string) => {
    if (sinAccion(ACCION_DE[destino] ?? '')) return;
    setVistaBase(destino);
  };

  return (
    <AppShell
      sidebarId="menu-doctor"
      sections={menu}
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
          <ListaPacientes />
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
