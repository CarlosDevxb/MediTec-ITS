import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import type { SidebarPerfil, SidebarSection } from './Sidebar';

/* ============================================================
   APP SHELL · Layout base de todos los paneles
   (odontología, nutrición, administrador)
   sidebar + área de contenido con scroll propio

   En móvil (<768px) el sidebar se oculta como cajón deslizable y
   aparece una barra superior con el botón de menú, la sección
   activa y el perfil.
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
  /** Cajón del menú en móvil */
  const [movilAbierto, setMovilAbierto] = useState(false);

  /** Navega y cierra el cajón móvil */
  const navegar = (destino: string) => {
    onNavigate(destino);
    setMovilAbierto(false);
  };

  return (
    <div className="flex flex-col h-screen bg-brand-50 font-sans overflow-hidden">
      {/* Barra superior: solo en móvil */}
      <header className="md:hidden flex items-center gap-3 bg-brand-950 text-white px-4 h-14 shrink-0">
        <button
          type="button"
          onClick={() => setMovilAbierto(true)}
          aria-label="Abrir menú"
          aria-controls={sidebarId}
          aria-expanded={movilAbierto}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <Menu size={20} />
        </button>
        <span className="font-semibold truncate">{activo}</span>
        <span className="ml-auto text-sm text-brand-200 truncate">{perfil.nombre}</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Fondo del cajón móvil: al tocarlo se cierra */}
        {movilAbierto && (
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            aria-hidden="true"
            onClick={() => setMovilAbierto(false)}
          />
        )}
        <Sidebar
          id={sidebarId}
          sections={sections}
          activo={activo}
          onNavigate={navegar}
          perfil={perfil}
          onCerrarSesion={onCerrarSesion}
          movilAbierto={movilAbierto}
          onCerrarMovil={() => setMovilAbierto(false)}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
