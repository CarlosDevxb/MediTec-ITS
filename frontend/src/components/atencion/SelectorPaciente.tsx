import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, Loader2, CircleAlert } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Input } from '../ui/Input';
import { mensajeDeError } from '../../services/api';
import {
  listarPacientes,
  obtenerExpediente,
  edadDe,
  type PacienteResumen,
  type ExpedientePaciente,
} from '../../services/atencion.service';
import FichaPaciente from './FichaPaciente';

/* ============================================================
   SELECTOR DE PACIENTE · Buscador + ficha con alertas clínicas
   Compartido por los paneles del doctor y de la enfermería.
   Carga el listado y el expediente desde la API.
   ============================================================ */

export interface SelectorPacienteProps {
  paciente: ExpedientePaciente | null;
  onChange: (paciente: ExpedientePaciente | null) => void;
}

export default function SelectorPaciente({ paciente, onChange }: SelectorPacienteProps) {
  const [pacientes, setPacientes] = useState<PacienteResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  /** Carga del expediente al elegir un paciente (trae las alertas) */
  const [cargandoExpediente, setCargandoExpediente] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setPacientes(await listarPacientes());
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const encontrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return [];
    return pacientes
      .filter(
        (p) =>
          p.nombre.toLowerCase().includes(texto) || p.numeroControl.toLowerCase().includes(texto),
      )
      .slice(0, 6);
  }, [pacientes, busqueda]);

  const seleccionar = async (resumen: PacienteResumen) => {
    setBusqueda('');
    setCargandoExpediente(true);
    try {
      onChange(await obtenerExpediente(resumen.id));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargandoExpediente(false);
    }
  };

  return (
    <Card title="Datos del paciente" icon={Search}>
      {paciente ? (
        <div className="-mx-2">
          <FichaPaciente
            expediente={paciente}
            accion={
              <Button
                variant="ghost"
                size="sm"
                icon={RefreshCw}
                onClick={() => {
                  setBusqueda('');
                  onChange(null);
                }}
              >
                Cambiar
              </Button>
            }
          />
        </div>
      ) : cargando ? (
        <p className="flex items-center gap-2 text-gray-600 py-4" role="status">
          <Loader2 size={18} className="animate-spin text-brand-600" aria-hidden="true" />
          Cargando pacientes…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span className="flex items-start gap-2.5">
            <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            {error}
          </span>
          <Button variant="secondary" size="sm" onClick={() => void cargar()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Input
            type="search"
            icon={Search}
            placeholder="Buscar paciente por nombre o número de control…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            autoFocus
            aria-label="Buscar paciente"
          />

          {cargandoExpediente && (
            <p className="mt-3 flex items-center gap-2 text-sm text-gray-600" role="status">
              <Loader2 size={16} className="animate-spin text-brand-600" aria-hidden="true" />
              Cargando el expediente del paciente…
            </p>
          )}

          {busqueda.trim().length > 0 && !cargandoExpediente && (
            <ul className="mt-3 border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
              {encontrados.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => void seleccionar(p)}
                    className="w-full text-left px-5 py-3.5 hover:bg-brand-50 transition-colors flex items-center justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
                  >
                    <span>
                      <span className="font-medium text-gray-900">{p.nombre}</span>
                      <span className="block text-sm text-gray-500">
                        {p.tipoPaciente} · {edadDe(p.fechaNacimiento)} años
                        {p.tipoSangre ? ` · Sangre ${p.tipoSangre}` : ''}
                      </span>
                    </span>
                    <span className="text-sm text-gray-500 tabular-nums shrink-0">
                      {p.numeroControl}
                    </span>
                  </button>
                </li>
              ))}
              {encontrados.length === 0 && (
                <li className="px-5 py-4 text-base text-gray-500">
                  Sin coincidencias. Verifica el nombre o el número de control.
                </li>
              )}
            </ul>
          )}

          {pacientes.length === 0 && busqueda.trim().length === 0 && (
            <p className="mt-3 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
              Todavía no hay pacientes registrados. Da de alta primero a un paciente en el panel
              de enfermería.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
