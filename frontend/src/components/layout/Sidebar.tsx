import React, { useEffect, useState } from 'react';
import { Stethoscope, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';

/* ============================================================
   SIDEBAR · Layout compartido (clínica y administrador)
   - Marca con monograma + logotipo a dos tonos
   - Secciones agrupadas; colapsable a iconos con preferencia
     guardada en localStorage
   ============================================================ */

export interface SidebarItem {
  label: string;
  icon: LucideIcon;
}

export interface SidebarSection {
  grupo: string;
  items: SidebarItem[];
}

export interface SidebarPerfil {
  iniciales: string;
  nombre: string;
  rol: string;
}

export interface SidebarProps {
  sections: SidebarSection[];
  activo: string;
  onNavigate: (label: string) => void;
  perfil?: SidebarPerfil;
  id?: string;
}

export default function Sidebar({
  sections,
  activo,
  onNavigate,
  perfil,
  id = 'menu-lateral',
}: SidebarProps) {
  const [colapsado, setColapsado] = useState(false);

  // Al montar, restaura la preferencia guardada (sin diferencias de hidratación)
  useEffect(() => {
    setColapsado(localStorage.getItem('meditec:menu') === 'colapsado');
  }, []);

  useEffect(() => {
    localStorage.setItem('meditec:menu', colapsado ? 'colapsado' : 'abierto');
  }, [colapsado]);

  return (
    <aside
      id={id}
      className={`relative ${colapsado ? 'w-24' : 'w-72'} bg-brand-950 text-white flex flex-col justify-between flex-shrink-0 transition-[width] duration-200 ease-in-out`}
    >
      {/* Botón de colapso flotante sobre el borde */}
      <button
        type="button"
        onClick={() => setColapsado(!colapsado)}
        aria-expanded={!colapsado}
        aria-controls={id}
        aria-label={colapsado ? 'Expandir menú lateral' : 'Contraer menú lateral'}
        className="absolute -right-3 top-7 z-20 w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 shadow-sm flex items-center justify-center hover:text-brand-800 hover:border-brand-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
      >
        {colapsado ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div>
        {/* Marca: monograma + logotipo (sin bajada) */}
        <div
          className={`pt-6 pb-5 ${
            colapsado ? 'px-3 flex justify-center' : 'px-5 flex items-center gap-3'
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-brand-700 border border-brand-600 flex items-center justify-center shrink-0">
            <Stethoscope size={20} className="text-brand-100" />
          </div>
          {!colapsado && (
            <span className="text-xl font-semibold tracking-tight whitespace-nowrap leading-none">
              MediTec<span className="text-brand-300">-ITS</span>
            </span>
          )}
        </div>

        {/* Navegación agrupada */}
        <nav className="px-3 flex flex-col">
          {sections.map((seccion, i) => (
            <div key={seccion.grupo}>
              {colapsado ? (
                i > 0 && <div className="my-3 mx-2 border-t border-white/10" />
              ) : (
                <p className="px-3 mb-2 mt-5 text-sm font-semibold text-brand-300">
                  {seccion.grupo}
                </p>
              )}

              <div className="flex flex-col gap-1">
                {seccion.items.map(({ label, icon: Icono }) => {
                  const esActivo = activo === label;
                  return (
                    <button
                      key={label}
                      onClick={() => onNavigate(label)}
                      aria-current={esActivo ? 'page' : undefined}
                      title={colapsado ? label : undefined}
                      className={[
                        'flex items-center rounded-lg text-base font-medium transition-colors border-l-2',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/60',
                        colapsado ? 'justify-center px-0 py-3' : 'px-4 gap-3 py-3',
                        esActivo
                          ? 'bg-brand-800 text-white border-brand-300'
                          : 'text-brand-100 hover:bg-brand-900 border-transparent',
                      ].join(' ')}
                    >
                      <Icono
                        size={17}
                        className={`shrink-0 ${esActivo ? 'text-white' : 'text-brand-300'}`}
                      />
                      {!colapsado && label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Perfil del Usuario */}
      {perfil && (
        <div className="p-4 border-t border-white/10">
          <div
            className={`flex items-center gap-3 ${colapsado ? 'justify-center' : ''}`}
            title={colapsado ? perfil.nombre : undefined}
          >
            <div className="w-10 h-10 rounded-full bg-brand-700 flex items-center justify-center text-sm font-semibold border border-brand-600 shrink-0">
              {perfil.iniciales}
            </div>
            {!colapsado && (
              <div>
                <p className="text-base font-semibold">{perfil.nombre}</p>
                <p className="text-sm text-brand-300">{perfil.rol}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
