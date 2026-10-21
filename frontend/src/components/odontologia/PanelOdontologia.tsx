import React, { useState } from 'react';
import {
  LayoutDashboard,
  CalendarClock,
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
import type { Cita } from '../../services/atencion.service';
import ConfiguracionPerfil from '../cuenta/ConfiguracionPerfil';
import AgendaEspecialista from '../atencion/AgendaEspecialista';
import AtencionEspecialista from '../atencion/AtencionEspecialista';
import HistorialConsultas from '../atencion/HistorialConsultas';
import ListaPacientes from '../atencion/ListaPacientes';
import ResumenOdontologia from './ResumenOdontologia';

/* ================= MENÚ DE ODONTOLOGÍA ================= */
const MENU_ODONTOLOGIA: SidebarSection[] = [
  {
    grupo: 'Atención',
    items: [
      { label: 'Inicio', icon: LayoutDashboard },
      { label: 'Agenda', icon: CalendarClock },
      { label: 'Atención', icon: Stethoscope },
    ],
  },
  {
    grupo: 'Clínica',
    items: [
      { label: 'Historial de consultas', icon: ClipboardList },
      { label: 'Pacientes', icon: Users },
    ],
  },
  {
    grupo: 'Sistema',
    items: [{ label: 'Configuración', icon: Settings }],
  },
];

/* ============================================================
   PANEL DE ODONTOLOGÍA · Shell del portal del odontólogo
   Ruta: /odontologia (Personal médico con especialidad Odontología)

   Igual que nutrición: sus consultas son **por cita agendada**
   (agenda con la regla de espaciado) y su contenido clínico es
   como el del doctor, pero a nivel bucal (síntomas y exploración
   bucales) e insumos dentales.
   ============================================================ */
export default function PanelOdontologia() {
  // Redirige a cada usuario a su propio panel (según rol y especialidad)
  useProtegerSesion();

  const [vista, setVista] = useState('Inicio');
  /** Cita elegida para atender (Agenda / Atención → formulario de consulta) */
  const [citaAAtender, setCitaAAtender] = useState<Cita | null>(null);

  /** Cambia de vista; si no es a Atención, limpia la cita elegida */
  const navegar = (destino: string) => {
    if (destino !== 'Atención') setCitaAAtender(null);
    setVista(destino);
  };

  return (
    <AppShell
      sidebarId="menu-odontologia"
      sections={MENU_ODONTOLOGIA}
      activo={vista}
      onNavigate={navegar}
      onCerrarSesion={cerrarSesion}
      perfil={(() => {
        const sesion = obtenerSesion();
        const nombre = sesion?.usuario.nombre ?? 'Odontología';
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
          <ResumenOdontologia
            onNuevaCita={() => navegar('Agenda')}
            onVerAgenda={() => navegar('Agenda')}
            onVerPacientes={() => navegar('Pacientes')}
          />
        ) : vista === 'Agenda' ? (
          <AgendaEspecialista
            onAtender={(cita) => {
              setCitaAAtender(cita);
              setVista('Atención');
            }}
          />
        ) : vista === 'Atención' ? (
          <AtencionEspecialista
            rol="odontologia"
            citaInicial={citaAAtender}
            onAtenderCita={(cita) => setCitaAAtender(cita)}
            onElegirOtra={() => setCitaAAtender(null)}
            onVerAgenda={() => navegar('Agenda')}
          />
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
