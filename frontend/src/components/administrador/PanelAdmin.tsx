import React, { useState } from 'react';
import { ShieldCheck, Users, Tags, Clock, Pill, BarChart3, FileText } from 'lucide-react';
import type { SidebarSection } from '../layout/Sidebar';
import AppShell from '../layout/AppShell';
import Roles from './Roles';
import Usuarios from './Usuarios';
import Catalogos from './Catalogos';
import Horarios from './Horarios';
import Medicamentos from './Medicamentos';
import Reportes from './Reportes';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { obtenerSesion, cerrarSesion, inicialesDe } from '../../services/sesion';
import { useProtegerSesion } from '../../hooks/useProtegerSesion';

/* ================= MENÚ DEL ADMINISTRADOR ================= */
const MENU_ADMIN: SidebarSection[] = [
  {
    grupo: 'Administración',
    items: [
      { label: 'Roles', icon: ShieldCheck },
      { label: 'Usuarios', icon: Users },
      { label: 'Catálogos', icon: Tags },
    ],
  },
  {
    grupo: 'Operación',
    items: [
      { label: 'Horarios', icon: Clock },
      { label: 'Medicamentos', icon: Pill },
    ],
  },
  {
    grupo: 'Análisis',
    items: [{ label: 'Reportes', icon: BarChart3 }],
  },
];

/* ============================================================
   PANEL DEL ADMINISTRADOR · Shell con las 6 secciones
   Ruta: /admin
   ============================================================ */
export default function PanelAdmin() {
  // Sin sesión iniciada, regresa al login
  useProtegerSesion();

  const [vista, setVista] = useState('Roles');

  return (
    <AppShell
      sidebarId="menu-admin"
      sections={MENU_ADMIN}
      activo={vista}
      onNavigate={setVista}
      onCerrarSesion={cerrarSesion}
      perfil={(() => {
        const sesion = obtenerSesion();
        const nombre = sesion?.usuario.nombre ?? 'Administrador';
        return {
          iniciales: inicialesDe(nombre),
          nombre,
          rol: sesion?.usuario.rol ?? 'Acceso total',
        };
      })()}
    >
      {/* Cada sección entra con animación (la key reinicia la animación al cambiar) */}
      <div key={vista} className="entrada">
        {vista === 'Roles' ? (
          <Roles />
        ) : vista === 'Usuarios' ? (
          <Usuarios />
        ) : vista === 'Catálogos' ? (
          <Catalogos />
        ) : vista === 'Horarios' ? (
          <Horarios />
        ) : vista === 'Medicamentos' ? (
          <Medicamentos />
        ) : vista === 'Reportes' ? (
          <Reportes />
        ) : (
          <EmptyState
            icon={FileText}
            title={`Vista de ${vista}`}
            description="Aún no hay nada que mostrar aquí."
            action={
              <Button variant="secondary" onClick={() => setVista('Roles')}>
                Volver a Roles
              </Button>
            }
          />
        )}
      </div>
    </AppShell>
  );
}
