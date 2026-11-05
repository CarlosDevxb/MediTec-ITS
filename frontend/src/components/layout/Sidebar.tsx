import React, { useEffect, useState } from 'react';
import {
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  type LucideIcon,
} from 'lucide-react';

/* ============================================================
   SIDEBAR · Layout compartido (clínica y administrador)
   - Marca con monograma + logotipo a dos tonos
   - Secciones agrupadas; colapsable a iconos con preferencia
     guardada en localStorage
   - En móvil es un cajón deslizable (drawer): se abre desde la
     barra superior del AppShell y se cierra al elegir una sección
     o al tocar el fondo
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
  /** Acción del botón de cerrar sesión */
  onCerrarSesion?: () => void;
  id?: string;
  /** En móvil: si el cajón deslizable está abierto */
  movilAbierto?: boolean;
  /** En móvil: cierra el cajón deslizable */
  onCerrarMovil?: () => void;
}

export default function Sidebar({
  sections,
  activo,
  onNavigate,
  perfil,
  onCerrarSesion,
  id = 'menu-lateral',
  movilAbierto = false,
  onCerrarMovil,
}: SidebarProps) {
  const [colapsado, setColapsado] = useState(false);

  // Al montar, restaura la preferencia guardada (sin diferencias de hidratación)
  useEffect(() => {
    setColapsado(localStorage.getItem('meditec:menu') === 'colapsado');
  }, []);

  // En móvil el menú es un cajón siempre expandido: el colapso a iconos es
  // una comodidad de escritorio
  useEffect(() => {
    const consulta = window.matchMedia('(max-width: 767px)');
    const ajustar = () => {
      if (consulta.matches) setColapsado(false);
    };
    ajustar();
    consulta.addEventListener('change', ajustar);
    return () => consulta.removeEventListener('change', ajustar);
  }, []);

  useEffect(() => {
    localStorage.setItem('meditec:menu', colapsado ? 'colapsado' : 'abierto');
  }, [colapsado]);

  return (
    <aside
      id={id}
      className={[
        'fixed inset-y-0 left-0 z-50 w-72 shrink-0 flex flex-col justify-between',
        'bg-brand-950 text-white transition-[transform,width] duration-200 ease-in-out',
        // Móvil: cajón deslizable · Escritorio: columna fija (colapsable)
        movilAbierto ? 'translate-x-0' : '-translate-x-full',
        'md:relative md:z-auto md:translate-x-0',
        colapsado ? 'md:w-24' : 'md:w-72',
      ].join(' ')}
    >
      {/* Botón de colapso flotante sobre el borde (solo escritorio) */}
      <button
        type="button"
        onClick={() => setColapsado(!colapsado)}
        aria-expanded={!colapsado}
        aria-controls={id}
        aria-label={colapsado ? 'Expandir menú lateral' : 'Contraer menú lateral'}
        className="absolute -right-3 top-7 z-20 w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 shadow-sm hidden md:flex items-center justify-center hover:text-brand-800 hover:border-brand-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
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
          {onCerrarMovil && (
            <button
              type="button"
              onClick={onCerrarMovil}
              aria-label="Cerrar menú"
              className="md:hidden ml-auto w-9 h-9 flex items-center justify-center rounded-lg text-brand-200 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/60"
            >
              <X size={18} />
            </button>
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
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold truncate">{perfil.nombre}</p>
                <p className="text-sm text-brand-300 truncate">{perfil.rol}</p>
              </div>
            )}
            {onCerrarSesion && (
              <button
                type="button"
                onClick={onCerrarSesion}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
                className="w-9 h-9 flex items-center justify-center rounded-lg text-brand-300 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/60 shrink-0"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
