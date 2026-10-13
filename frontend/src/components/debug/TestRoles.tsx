import { useState, useEffect } from 'react';

// Definimos la estructura esperada de la respuesta
interface RolesResponse {
  mensaje: string;
  datos: any[];
}

export default function TestRoles() {
  const [respuesta, setRespuesta] = useState<RolesResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Hacemos el fetch al puerto 3000 de tu backend
    fetch('http://localhost:3000/api/roles')
      .then((res) => {
        if (!res.ok) throw new Error('Error en la petición de red');
        return res.json();
      })
      .then((data) => {
        setRespuesta(data);
        setCargando(false);
      })
      .catch((err) => {
        setError(err.message);
        setCargando(false);
      });
  }, []);

  if (cargando) return <div className="animate-pulse p-4 text-gray-500">Conectando con el servidor...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Estado de la Base de Datos</h2>
      <p className="text-emerald-600 font-medium mb-4">{respuesta?.mensaje}</p>
      
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
        <span className="text-sm text-gray-500 uppercase font-semibold tracking-wider">Tabla Roles:</span>
        {respuesta?.datos.length === 0 ? (
          <p className="text-gray-600 mt-2 font-mono text-sm">[] (La tabla existe pero está vacía)</p>
        ) : (
          <pre className="mt-2 text-sm text-gray-700 overflow-x-auto">
            {JSON.stringify(respuesta?.datos, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}