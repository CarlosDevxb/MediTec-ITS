import React, { useEffect, useState } from 'react';
import { PasswordInput } from '../ui/Input';
import { iniciarSesion } from '../../services/auth.service';
import { obtenerSesion, rutaSegunRol } from '../../services/sesion';
import { mensajeDeError } from '../../services/api';

export default function Login() {
  const [numeroControl, setNumeroControl] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  // Si ya hay sesión iniciada, entra directo a su panel
  useEffect(() => {
    const sesion = obtenerSesion();
    if (sesion) window.location.replace(rutaSegunRol(sesion.usuario.rol));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!numeroControl.trim() || !contrasena.trim()) {
      setError('Por favor, ingresa tu número de control y contraseña.');
      return;
    }
    
    setError('');
    setCargando(true);
    try {
      const datos = await iniciarSesion(numeroControl.trim(), contrasena);
      // Entra al panel que corresponde a su rol
      window.location.href = rutaSegunRol(datos.usuario.rol);
    } catch (err) {
      // Muestra el mensaje de la API (credenciales, cuenta deshabilitada…)
      setError(mensajeDeError(err));
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen flex font-sans overflow-y-auto lg:overflow-hidden bg-white">
      
      {/* Mitad Izquierda - Formulario */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex flex-col justify-between px-6 py-10 sm:px-12 lg:px-16 xl:px-20 relative z-10">
        
        <div className="hidden lg:block h-2 xl:h-6"></div>

        {/* Contenedor central (Logo + Formulario) */}
        <div className="grow flex flex-col justify-center w-full max-w-sm sm:max-w-md xl:max-w-lg mx-auto">
          
          {/* Logo MediTec-ITS (Aún más grande) */}
          <div className="mb-8 xl:mb-12 w-full flex justify-center">
            <img 
              src="/logo-meditec.png" 
              alt="MediTec-ITS Sistema de Gestión de Enfermería" 
              className="h-28 sm:h-36 xl:h-48 w-auto object-contain transition-all" 
            />
          </div>

          {/* Caja del Formulario */}
          <div className="w-full border border-gray-200 rounded-xl p-6 sm:p-8 xl:p-12 shadow-sm bg-white">
            <form onSubmit={handleSubmit} className="space-y-6 xl:space-y-8">
              
              {error && (
                <div className="text-red-600 text-sm xl:text-base font-medium">{error}</div>
              )}
              
              <div>
                <label className="block text-gray-700 text-sm sm:text-base xl:text-lg mb-2 font-medium">
                  Numero de trabajador
                </label>
                <input 
                  type="text" 
                  value={numeroControl}
                  onChange={(e) => setNumeroControl(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 xl:py-4 text-base xl:text-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-transparent transition-colors"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm sm:text-base xl:text-lg mb-2 font-medium">
                  Contraseña
                </label>
                <PasswordInput
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  className="py-3 xl:py-4 text-base xl:text-lg"
                />
              </div>

              <button 
                type="submit" 
                disabled={cargando}
                className="w-full bg-brand-500 hover:bg-brand-700 text-white font-medium py-3 sm:py-3.5 xl:py-4 px-4 rounded-lg text-base xl:text-lg transition-colors border border-gray-600 shadow-md mt-4 xl:mt-6 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {cargando ? 'Iniciando sesión...' : 'Iniciar Sesion'}
              </button>
            </form>
          </div>
        </div>

        {/* Footer: Líneas, Logo centrado y frase presentacional */}
        <div className="w-full max-w-sm sm:max-w-md xl:max-w-lg mx-auto pb-2 mt-12 flex flex-col">
           
           {/* Fila superior: Línea - Logo - Línea */}
           <div className="flex items-center w-full mb-3">
             <div className="grow border-t border-gray-300"></div>
             
             <img 
               src="/logo-cuchipu.png" 
               alt="Cuchipu Cloud Logo" 
               className="h-10 sm:h-12 xl:h-14 w-auto shrink-0 px-4 transition-all opacity-90" 
             />
             
             <div className="grow border-t border-gray-300"></div>
           </div>
           
           {/* Fila inferior: Frase cursiva y opaca */}
           <span className="text-center text-gray-400 italic text-xs sm:text-sm xl:text-base font-serif tracking-wide">
             Sistema de Gestión de Enfermería MediTec-ITS &copy; 2026
           </span>

        </div>
      </div>

      {/* Mitad Derecha - Imagen de Fondo */}
      <div className="hidden lg:block lg:w-1/2 xl:w-[55%] relative bg-brand-400">
         <div className="absolute inset-0 bg-[#3a5d7c] opacity-60 mix-blend-multiply z-10"></div>
         <img 
           src="/bg-estetoscopio.jpg" 
           alt="Fondo Médico" 
           className="absolute inset-0 w-full h-full object-cover z-0 grayscale-30"
         />
      </div>

    </div>
  );
}