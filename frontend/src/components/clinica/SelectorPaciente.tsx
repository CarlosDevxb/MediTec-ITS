import React, { useState } from 'react';
import { Search, RefreshCw, AlertTriangle, Activity } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Input } from '../ui/Input';
import { PACIENTES, type Paciente } from './datos';

/* ============================================================
   SELECTOR DE PACIENTE · Buscador + ficha con alertas clínicas
   Reutilizado por Nueva consulta (odontología) y Nuevo plan
   (nutrición).
   ============================================================ */

export interface SelectorPacienteProps {
  paciente: Paciente | null;
  onChange: (paciente: Paciente | null) => void;
}

export default function SelectorPaciente({ paciente, onChange }: SelectorPacienteProps) {
  const [busqueda, setBusqueda] = useState('');

  const encontrados = PACIENTES.filter(
    (p) =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.expediente.toLowerCase().includes(busqueda.toLowerCase())
  ).slice(0, 5);

  const seleccionar = (p: Paciente) => {
    setBusqueda('');
    onChange(p);
  };

  const cambiar = () => {
    setBusqueda('');
    onChange(null);
  };

  return (
    <Card title="Datos del paciente" icon={Search}>
      {paciente ? (
        <div>
          {/* Ficha del paciente seleccionado */}
          <div className="flex flex-wrap items-start justify-between gap-4 bg-brand-50 border border-brand-200 rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-brand-700 text-white flex items-center justify-center font-semibold shrink-0">
                {paciente.nombre.split(' ').map((p) => p[0]).slice(0, 2).join('')}
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{paciente.nombre}</p>
                <p className="text-sm text-gray-600 tabular-nums">
                  {paciente.expediente} · {paciente.tipoSangre} · {paciente.genero}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={cambiar}>
              Cambiar
            </Button>
          </div>

          {/* Alertas clínicas del paciente */}
          {paciente.alergias !== 'Ninguna' && (
            <div className="mt-4 flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-base">
              <AlertTriangle size={18} className="shrink-0" />
              <span><strong>Alergias:</strong> {paciente.alergias}</span>
            </div>
          )}
          {paciente.enfermedadesCronicas !== 'Ninguna' && (
            <div className="mt-4 flex items-center gap-3 bg-brand-50 border border-brand-200 text-brand-800 rounded-lg px-4 py-3 text-base">
              <Activity size={18} className="shrink-0" />
              <span><strong>Enfermedades crónicas:</strong> {paciente.enfermedadesCronicas}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <Input
            type="search"
            icon={Search}
            placeholder="Buscar paciente por nombre o número de expediente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            autoFocus
          />

          {busqueda.trim().length > 0 && (
            <ul className="mt-3 border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
              {encontrados.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => seleccionar(p)}
                    className="w-full text-left px-5 py-3.5 hover:bg-brand-50 transition-colors flex items-center justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
                  >
                    <span>
                      <span className="font-medium text-gray-900">{p.nombre}</span>
                      <span className="block text-sm text-gray-500">
                        {p.genero} · Sangre {p.tipoSangre}
                      </span>
                    </span>
                    <span className="text-sm text-gray-500 tabular-nums shrink-0">{p.expediente}</span>
                  </button>
                </li>
              ))}
              {encontrados.length === 0 && (
                <li className="px-5 py-4 text-base text-gray-500">
                  Sin coincidencias. Verifica el nombre o el expediente.
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
