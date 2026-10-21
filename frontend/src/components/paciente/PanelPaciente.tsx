import React, { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  CalendarClock,
  FileText,
  ClipboardCheck,
  UserCog,
  Loader2,
  CircleAlert,
} from 'lucide-react';
import type { SidebarSection } from '../layout/Sidebar';
import AppShell from '../layout/AppShell';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import ModalResultado from '../ui/ModalResultado';
import EmptyState from '../ui/EmptyState';
import { obtenerSesion, cerrarSesion, inicialesDe } from '../../services/sesion';
import { useProtegerSesion } from '../../hooks/useProtegerSesion';
import { obtenerPerfil } from '../../services/auth.service';
import {
  obtenerExpediente,
  type ExpedientePaciente,
} from '../../services/atencion.service';
import CuestionarioSalud from '../atencion/CuestionarioSalud';
import InicioPaciente from './InicioPaciente';
import MisCitas from './MisCitas';
import MiExpediente from './MiExpediente';
import MiPlan from './MiPlan';
import MiInformacion from './MiInformacion';

/* ================= MENÚ DEL PACIENTE ================= */
const MENU_PACIENTE: SidebarSection[] = [
  {
    grupo: 'Mi salud',
    items: [
      { label: 'Inicio', icon: LayoutDashboard },
      { label: 'Mis citas', icon: CalendarClock },
      { label: 'Mi expediente', icon: FileText },
      { label: 'Mi plan alimenticio', icon: ClipboardCheck },
    ],
  },
  {
    grupo: 'Mi cuenta',
    items: [{ label: 'Mi información', icon: UserCog }],
  },
];

/* ============================================================
   PORTAL DEL PACIENTE · Shell del portal
   Ruta: /paciente (rol Paciente)

   Acciones del paciente: agendar sus citas (con las mismas reglas
   de la agenda), ver su expediente médico y el avance de su plan
   alimenticio y actualizar sus datos.

   **Cuestionario obligatorio:** si el paciente no tiene su
   cuestionario de salud inicial, se presenta antes que el portal;
   al guardarlo se entra al portal (solo aplica si no lo tiene).
   ============================================================ */
export default function PanelPaciente() {
  // Redirige a cada usuario a su propio panel (según rol y especialidad)
  useProtegerSesion();

  const [expediente, setExpediente] = useState<ExpedientePaciente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [vista, setVista] = useState('Inicio');
  /** Confirmación del cuestionario guardado (entrada al portal) */
  const [bienvenida, setBienvenida] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const perfil = await obtenerPerfil();
      const pacienteId = perfil.pacienteId;
      if (!pacienteId) {
        setError('Tu cuenta no tiene expediente de paciente vinculado.');
        return;
      }
      setExpediente(await obtenerExpediente(pacienteId));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'No se pudo cargar tu información. Intenta de nuevo.',
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /* ---------- Cargando / error ---------- */
  if (cargando || error || !expediente) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center" role="status">
          {cargando ? (
            <>
              <Loader2 size={32} className="animate-spin text-brand-600 mx-auto" aria-hidden="true" />
              <p className="mt-3 text-gray-600">Cargando tu información…</p>
            </>
          ) : (
            <>
              <CircleAlert size={32} className="text-amber-500 mx-auto" aria-hidden="true" />
              <p className="mt-3 text-gray-700 max-w-md">{error || 'No se pudo cargar tu información.'}</p>
              <Button className="mt-4" variant="secondary" onClick={() => void cargar()}>
                Reintentar
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ---------- Cuestionario obligatorio antes del portal ---------- */
  if (expediente.cuestionario?.estatus !== 'Completado') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="entrada p-10 xl:p-12 max-w-5xl mx-auto font-sans">
          <PageHeader
            title="Cuestionario de salud inicial"
            subtitle="Bienvenido(a): completa tu cuestionario para entrar a tu portal"
          />
          <CuestionarioSalud
            expediente={expediente}
            contexto="portal"
            onGuardado={(actualizado) => {
              setExpediente(actualizado);
              setBienvenida(true);
            }}
          />
        </div>

        {bienvenida && (
          <ModalResultado
            titulo="¡Cuestionario completado!"
            mensaje="Tu cuestionario de salud quedó registrado. Ya puedes usar tu portal."
            onCerrar={() => setBienvenida(false)}
          />
        )}
      </div>
    );
  }

  /* ---------- Portal del paciente ---------- */
  return (
    <AppShell
      sidebarId="menu-paciente"
      sections={MENU_PACIENTE}
      activo={vista}
      onNavigate={setVista}
      onCerrarSesion={cerrarSesion}
      perfil={(() => {
        const sesion = obtenerSesion();
        const nombre = sesion?.usuario.nombre ?? 'Paciente';
        return {
          iniciales: inicialesDe(nombre),
          nombre,
          rol: sesion?.usuario.rol ?? 'Paciente',
        };
      })()}
    >
      {/* Cada sección entra con animación (la key reinicia la animación al cambiar) */}
      <div key={vista} className="entrada">
        {vista === 'Inicio' ? (
          <InicioPaciente
            expediente={expediente}
            onVerCitas={() => setVista('Mis citas')}
            onVerExpediente={() => setVista('Mi expediente')}
            onVerPlan={() => setVista('Mi plan alimenticio')}
          />
        ) : vista === 'Mis citas' ? (
          <MisCitas expediente={expediente} />
        ) : vista === 'Mi expediente' ? (
          <MiExpediente expediente={expediente} onVolver={() => setVista('Inicio')} />
        ) : vista === 'Mi plan alimenticio' ? (
          <MiPlan />
        ) : vista === 'Mi información' ? (
          <MiInformacion expediente={expediente} onActualizado={setExpediente} />
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
