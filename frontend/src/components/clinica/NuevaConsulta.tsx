import React, { useState } from 'react';
import { Activity, Stethoscope, FileSignature, Save, X } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
import { Field, Input, Textarea } from '../ui/Input';
import { type Paciente, type SignosVitales } from './datos';
import SelectorPaciente from './SelectorPaciente';

/* ============================================================
   NUEVA CONSULA · Alta de consulta (flujo directo al formulario)
   1) Seleccionar paciente  2) Signos vitales
   3) Evaluación clínica    4) Diagnóstico y receta
   ============================================================ */

const VITALES_VACIOS: SignosVitales = {
  ta: '', fc: '', fr: '', temp: '', peso: '', talla: '',
};

export default function NuevaConsulta() {
  const { aviso, mostrar, cerrar } = useAviso();

  // Paciente
  const [paciente, setPaciente] = useState<Paciente | null>(null);

  // Contenido clínico
  const [vitales, setVitales] = useState<SignosVitales>(VITALES_VACIOS);
  const [motivo, setMotivo] = useState('');
  const [exploracion, setExploracion] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [tratamiento, setTratamiento] = useState('');
  const [error, setError] = useState('');

  const limpiar = () => {
    setPaciente(null);
    setVitales(VITALES_VACIOS);
    setMotivo('');
    setExploracion('');
    setDiagnostico('');
    setTratamiento('');
    setError('');
  };

  const setVital = (campo: keyof SignosVitales, valor: string) =>
    setVitales((prev) => ({ ...prev, [campo]: valor }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paciente) {
      setError('Selecciona el paciente de la consulta.');
      return;
    }
    if (!motivo.trim()) {
      setError('Escribe el motivo de la consulta.');
      return;
    }
    if (!diagnostico.trim()) {
      setError('Registra el diagnóstico antes de guardar.');
      return;
    }
    setError('');
    mostrar(`Consulta de ${paciente.nombre} registrada en su expediente.`);
    limpiar();
  };

  return (
    <div className="p-10 xl:p-12 max-w-6xl mx-auto font-sans">
      
      {/* Cabecera */}
      <PageHeader
        title="Nueva consulta"
        subtitle="Registra los datos clínicos del paciente"
        meta={
          <div className="text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-lg">
            Fecha: {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        }
      />

      {aviso && <Aviso mensaje={aviso} onCerrar={cerrar} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        
                <SelectorPaciente
          paciente={paciente}
          onChange={(p) => {
            setPaciente(p);
            setError("");
          }}
        />

        {/* TARJETA 2: Signos Vitales */}
        <Card title="Signos vitales" icon={Activity}>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <Field label="T. Arterial (mmHg)" variant="compact">
              <Input type="text" placeholder="120/80" value={vitales.ta} onChange={(e) => setVital('ta', e.target.value)} />
            </Field>
            <Field label="F. Cardíaca (lpm)" variant="compact">
              <Input type="number" placeholder="75" value={vitales.fc} onChange={(e) => setVital('fc', e.target.value)} />
            </Field>
            <Field label="F. Resp. (rpm)" variant="compact">
              <Input type="number" placeholder="18" value={vitales.fr} onChange={(e) => setVital('fr', e.target.value)} />
            </Field>
            <Field label="Temperatura (°C)" variant="compact">
              <Input type="number" step="0.1" placeholder="36.5" value={vitales.temp} onChange={(e) => setVital('temp', e.target.value)} />
            </Field>
            <Field label="Peso (kg)" variant="compact">
              <Input type="number" step="0.1" placeholder="70.5" value={vitales.peso} onChange={(e) => setVital('peso', e.target.value)} />
            </Field>
            <Field label="Talla (m)" variant="compact">
              <Input type="number" step="0.01" placeholder="1.75" value={vitales.talla} onChange={(e) => setVital('talla', e.target.value)} />
            </Field>
          </div>
        </Card>

        {/* TARJETA 3: Evaluación Clínica */}
        <Card title="Evaluación clínica" icon={Stethoscope}>
          <div className="space-y-4">
            <Field label="Motivo de la consulta">
              <Textarea rows={2} placeholder="Describa brevemente el síntoma principal..." value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </Field>
            <Field label="Exploración física y síntomas detallados">
              <Textarea rows={4} placeholder="Detalles de la evaluación..." value={exploracion} onChange={(e) => setExploracion(e.target.value)} />
            </Field>
          </div>
        </Card>

        {/* TARJETA 4: Diagnóstico y Tratamiento */}
        <Card title="Diagnóstico y receta" icon={FileSignature}>
          <div className="space-y-4">
            <Field label="Diagnóstico (CIE-10 o descripción)">
              <Input type="text" placeholder="Ej. Faringitis aguda..." value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />
            </Field>
            <Field label="Tratamiento / receta médica">
              <Textarea rows={4} placeholder="Medicamentos, dosis y recomendaciones..." value={tratamiento} onChange={(e) => setTratamiento(e.target.value)} />
            </Field>
          </div>
        </Card>

        {error && (
          <p className="text-base text-red-600 font-medium" role="alert">
            {error}
          </p>
        )}

        {/* Botones de Acción */}
        <div className="flex justify-end gap-4 pt-4 pb-10">
          <Button variant="secondary" icon={X} onClick={limpiar}>
            Cancelar
          </Button>
          <Button type="submit" icon={Save}>
            Guardar consulta
          </Button>
        </div>

      </form>
    </div>
  );
}
