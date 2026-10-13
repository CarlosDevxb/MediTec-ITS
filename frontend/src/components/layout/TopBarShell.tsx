import React from 'react';
import { Stethoscope, type LucideIcon } from 'lucide-react';

/* ============================================================
   TOP BAR SHELL · Layout del portal del paciente
   Distinto a los paneles con sidebar: barra superior con
   navegación horizontal + contenido centrado.
   ============================================================ */

export interface TopNavItem {
  label: string;
  icon: LucideIcon;
}

export interface TopBarShellProps {
  items: TopNavItem[];
  activo: string;
  onNavigate: (label: string) => void;
  perfil: {
    iniciales: string;
    nombre: string;
    detalle: string;
  };
  children: React.ReactNode;
}

export default function TopBarShell({
  items,
  activo,
  onNavigate,
  perfil,
  children,
}: TopBarShellProps) {
  return (
    <div className="min-h-screen bg-brand-50 font-sans flex flex-col">
      
      {/* ================= BARRA SUPERIOR ================= */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 xl:px-10 h-16 flex items-center justify-between gap-6">
          
          {/* Marca */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-brand-700 border border-brand-600 flex items-center justify-center">
              <Stethoscope size={18} className="text-brand-100" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-gray-900">
              MediTec<span className="text-brand-600">-ITS</span>
            </span>
          </div>

          {/* Navegación horizontal */}
          <nav
            className="flex-1 flex items-center gap-1 overflow-x-auto"
            aria-label="Navegación del portal"
          >
            {items.map(({ label, icon: Icono }) => {
              const esActivo = activo === label;
              return (
                <button
                  key={label}
                  onClick={() => onNavigate(label)}
                  aria-current={esActivo ? 'page' : undefined}
                  className={[
                    'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium',
                    'whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40',
                    esActivo
                      ? 'bg-brand-800 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-brand-50 hover:text-brand-800',
                  ].join(' ')}
                >
                  <Icono size={17} />
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Perfil */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-brand-700 text-white flex items-center justify-center text-sm font-semibold border border-brand-600">
              {perfil.iniciales}
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-sm font-semibold text-gray-900">{perfil.nombre}</p>
              <p className="text-xs text-gray-500">{perfil.detalle}</p>
            </div>
          </div>
        </div>
      </header>

      {/* ================= CONTENIDO ================= */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
