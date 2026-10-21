import React, { useState } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  History,
  UserRound,
  Settings,
  ClipboardCheck,
  FileText,
} from 'lucide-react';
import TopBarShell from '../layout/TopBarShell';
import type { TopNavItem } from '../layout/TopBarShell';
import InicioPaciente from './InicioPaciente';
import MisCitas from './MisCitas';
import CuestionarioSalud from './CuestionarioSalud';
import HistorialCitas from './HistorialCitas';
import MiInformacion from './MiInformacion';
import Configuracion from '../clinica/Configuracion';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { obtenerSesion, cerrarSesion, inicialesDe } from '../../services/sesion';
import { useProtegerSesion } from '../../hooks/useProtegerSesion';
import { PACIENTE_ACTUAL, CITAS_PACIENTE, type CitaPaciente } from './datos';
import type { Paciente } from '../clinica/datos';

/* ================= NAVEGACIÓN DEL PORTAL ================= */
const MENU: TopNavItem[] = [
  { label: 'Inicio', icon: LayoutDashboard },
  { label: 'Mis citas', icon: CalendarDays },
  { label: 'Cuestionario', icon: ClipboardCheck },
  { label: 'Historial de citas', icon: History },
  { label: 'Mi información', icon: UserRound },
  { label: 'Configuración', icon: Settings },
];

/* ============================================================
   PORTAL DEL PACIENTE · Consulta de información, gestión de
   citas en Odontología/Nutrición y actualización de datos
   Ruta: /paciente
   ============================================================ */
export default function PanelPaciente() {
  // Redirige a cada usuario a su propio panel (según rol y especialidad)
  useProtegerSesion();

  const [vista, setVista] = useState('Inicio');
  const [paciente, setPaciente] = useState<Paciente>(PACIENTE_ACTUAL);
  const [citas, setCitas] = useState<CitaPaciente[]>(CITAS_PACIENTE);

  /* ---- Gestión de citas ---- */
  const altaCita = (cita: CitaPaciente) => {
    setCitas((prev) => [cita, ...prev]);
  };

  const cancelarCita = (id: number) => {
    setCitas((prev) =>
      prev.map((c) => (c.id === id ? { ...c, estatus: 'Cancelada' } : c))
    );
  };

  /* ---- Actualización de datos ---- */
  const actualizarAutoReporte = (datos: Partial<Paciente>) => {
    setPaciente((prev) => ({ ...prev, ...datos }));
  };

  return (
    <TopBarShell
      items={MENU}
      activo={vista}
      onNavigate={setVista}
      onCerrarSesion={cerrarSesion}
      perfil={(() => {
        const sesion = obtenerSesion();
        const nombre = paciente.nombre;
        return {
          iniciales: inicialesDe(nombre),
          nombre: sesion?.usuario.nombre ?? nombre,
          detalle: `Paciente · ${paciente.expediente}`,
        };
      })()}
    >
      {vista === 'Inicio' ? (
        <InicioPaciente paciente={paciente} citas={citas} onNavigate={setVista} />
      ) : vista === 'Mis citas' ? (
        <MisCitas citas={citas} onAlta={altaCita} onCancelar={cancelarCita} />
      ) : vista === 'Cuestionario' ? (
        <CuestionarioSalud paciente={paciente} />
      ) : vista === 'Historial de citas' ? (
        <HistorialCitas citas={citas} />
      ) : vista === 'Mi información' ? (
        <MiInformacion paciente={paciente} onActualizar={actualizarAutoReporte} />
      ) : vista === 'Configuración' ? (
        <Configuracion
          nombre={paciente.nombre}
          correoInicial={paciente.correo}
          telefonoInicial={paciente.telefono}
          onGuardarContacto={({ correo, telefono }) =>
            setPaciente((prev) => ({ ...prev, correo, telefono }))
          }
        />
      ) : (
        <div className="p-8 xl:p-10 max-w-6xl mx-auto">
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
        </div>
      )}
    </TopBarShell>
  );
}
