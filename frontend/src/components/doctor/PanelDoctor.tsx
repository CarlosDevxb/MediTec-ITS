import React, { useState } from 'react';
import { LayoutDashboard, Stethoscope, CalendarClock, Users, FileText } from 'lucide-react';
import type { SidebarSection } from '../layout/Sidebar';
import AppShell from '../layout/AppShell';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { obtenerSesion, cerrarSesion, inicialesDe } from '../../services/sesion';
import { useProtegerSesion } from '../../hooks/useProtegerSesion';
import type { Cita } from '../../services/atencion.service';
import ResumenDoctor from './ResumenDoctor';
import Atencion from './Atencion';
import Agenda from './Agenda';
import PacientesDoctor from './PacientesDoctor';

/* ================= MENÚ DEL DOCTOR ================= */
const MENU_DOCTOR: SidebarSection[] = [
  {
    grupo: 'Atención',
    items: [
      { label: 'Inicio', icon: LayoutDashboard },
      { label: 'Nueva consulta', icon: Stethoscope },
      { label: 'Agenda', icon: CalendarClock },
    ],
  },
  {
    grupo: 'Expedientes',
    items: [{ label: 'Pacientes', icon: Users }],
  },
];

/* ============================================================
   PANEL DEL DOCTOR · Shell con las secciones del personal médico
   Ruta: /doctor (rol Personal médico)

   Su opción estrella es la Nueva consulta: al atender sin cita
   previa, el sistema registra primero la auto-cita 'Atención
   directa' y enseguida la consulta.
   ============================================================ */
export default function PanelDoctor() {
  // Sin sesión iniciada, regresa al login
  useProtegerSesion();

  const [vista, setVista] = useState('Inicio');
  /** Cita agendada que se está atendiendo (vista Agenda → Nueva consulta) */
  const [citaAAtender, setCitaAAtender] = useState<Cita | null>(null);

  /** Cambia de vista y limpia la cita pendiente de atención */
  const navegar = (destino: string) => {
    setCitaAAtender(null);
    setVista(destino);
  };

  return (
    <AppShell
      sidebarId="menu-doctor"
      sections={MENU_DOCTOR}
      activo={vista}
      onNavigate={navegar}
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
      {vista === 'Inicio' ? (
        <ResumenDoctor onNuevaConsulta={() => navegar('Nueva consulta')} />
      ) : vista === 'Nueva consulta' ? (
        <Atencion
          citaInicial={citaAAtender}
          onVerAgenda={() => navegar('Agenda')}
          onNuevaAtencion={() => setCitaAAtender(null)}
        />
      ) : vista === 'Agenda' ? (
        <Agenda
          onAtender={(cita) => {
            setCitaAAtender(cita);
            setVista('Nueva consulta');
          }}
        />
      ) : vista === 'Pacientes' ? (
        <PacientesDoctor />
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
    </AppShell>
  );
}
