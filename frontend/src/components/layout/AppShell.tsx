import React from 'react';
import Sidebar from './Sidebar';
import type { SidebarPerfil, SidebarSection } from './Sidebar';

/* ============================================================
   APP SHELL · Layout base de todos los paneles
   (odontología, nutrición, administrador)
   sidebar + área de contenido con scroll propio
   ============================================================ */

export interface AppShellProps {
  sections: SidebarSection[];
  activo: string;
  onNavigate: (label: string) => void;
  perfil: SidebarPerfil;
  /** Acción del botón de cerrar sesión */
  onCerrarSesion?: () => void;
  sidebarId?: string;
  children: React.ReactNode;
}

export default function AppShell({
  sections,
  activo,
  onNavigate,
  perfil,
  onCerrarSesion,
  sidebarId,
  children,
}: AppShellProps) {
  return (
    <div className="flex h-screen bg-brand-50 font-sans overflow-hidden">
      <Sidebar
        id={sidebarId}
        sections={sections}
        activo={activo}
        onNavigate={onNavigate}
        perfil={perfil}
        onCerrarSesion={onCerrarSesion}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
