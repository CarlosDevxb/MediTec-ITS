import React, { useState } from 'react';
import { UserPlus, Save, X } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/Input';
import {
  PACIENTES,
  TIPOS_SANGRE,
  TIPOS_PACIENTE,
  CARRERAS,
  type Paciente,
  type TipoSangre,
  type TipoPaciente,
} from './datos';

/* ============================================================
   FORMULARIO DE PACIENTE · alta y edición (subpágina)
   ============================================================ */

export interface PacienteFormProps {
  modo: 'alta' | 'editar';
  paciente?: Paciente;
  onCancelar: () => void;
  onGuardar: (paciente: Paciente) => void;
}

const hoyISO = () => new Date().toISOString().slice(0, 10);

export default function PacienteForm({
  modo,
  paciente,
  onCancelar,
  onGuardar,
}: PacienteFormProps) {
  // En alta el expediente se genera automáticamente
  const [expediente] = useState(
    paciente?.expediente ?? `EXP-${1024 + PACIENTES.length}`
  );
  const [nombre, setNombre] = useState(paciente?.nombre ?? '');
  const [fechaNacimiento, setFechaNacimiento] = useState(paciente?.fechaNacimiento ?? '');
  const [genero, setGenero] = useState<'Femenino' | 'Masculino' | 'Otro'>(paciente?.genero ?? 'Femenino');
  const [tipoPaciente, setTipoPaciente] = useState<TipoPaciente>(paciente?.tipoPaciente ?? 'Alumno');
  const [carrera, setCarrera] = useState(paciente?.carrera ?? '');
  const [tipoSangre, setTipoSangre] = useState<TipoSangre>(paciente?.tipoSangre ?? 'O+');
  const [telefono, setTelefono] = useState(paciente?.telefono ?? '');
  const [correo, setCorreo] = useState(paciente?.correo ?? '');
  const [alergias, setAlergias] = useState(paciente?.alergias ?? 'Ninguna');
  const [enfermedadesCronicas, setEnfermedadesCronicas] = useState(
    paciente?.enfermedadesCronicas ?? 'Ninguna'
  );
  const [antecedentes, setAntecedentes] = useState(paciente?.antecedentes ?? '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('Escribe el nombre completo del paciente.');
      return;
    }
    if (!fechaNacimiento) {
      setError('Registra la fecha de nacimiento.');
      return;
    }
    if (!telefono.trim()) {
      setError('Agrega un teléfono de contacto.');
      return;
    }
    if (tipoPaciente === 'Alumno' && !carrera) {
      setError('Selecciona la carrera del alumno.');
      return;
    }
    setError('');
    onGuardar({
      id: paciente?.id ?? Date.now(),
      expediente,
      nombre: nombre.trim(),
      fechaNacimiento,
      genero,
      tipoPaciente,
      carrera: tipoPaciente === 'Alumno' ? carrera : undefined,
      telefono: telefono.trim(),
      correo: correo.trim(),
      alergias: alergias.trim() || 'Ninguna',
      enfermedadesCronicas: enfermedadesCronicas.trim() || 'Ninguna',
      tipoSangre,
      antecedentes: antecedentes.trim(),
      ultimaVisita: paciente?.ultimaVisita ?? hoyISO(),
    });
  };

  return (
    <div className="entrada p-10 xl:p-12 max-w-5xl mx-auto font-sans">
      <PageHeader
        title={modo === 'alta' ? 'Nuevo paciente' : 'Editar paciente'}
        subtitle={
          modo === 'alta'
            ? 'Abre un expediente nuevo en odontología'
            : `Editando el expediente de ${paciente?.nombre ?? ''}`
        }
        meta={
          <div className="text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-lg tabular-nums">
            {expediente}
          </div>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos personales */}
        <Card title="Datos personales" icon={UserPlus}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre completo" className="md:col-span-2">
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Lucía Torres Hernández" />
            </Field>
            <Field label="Fecha de nacimiento">
              <Input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} className="tabular-nums" />
            </Field>
            <Field label="Género">
              <Select
                value={genero}
                onChange={(e) => setGenero(e.target.value as 'Femenino' | 'Masculino' | 'Otro')}
              >
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
                <option value="Otro">Otro</option>
              </Select>
            </Field>
            <Field label="Tipo de paciente">
              <Select
                value={tipoPaciente}
                onChange={(e) => {
                  const nuevo = e.target.value as TipoPaciente;
                  setTipoPaciente(nuevo);
                  if (nuevo !== 'Alumno') setCarrera('');
                }}
              >
                {TIPOS_PACIENTE.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tipo de sangre">
              <Select value={tipoSangre} onChange={(e) => setTipoSangre(e.target.value as TipoSangre)}>
                {TIPOS_SANGRE.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </Select>
            </Field>
            {tipoPaciente === 'Alumno' && (
              <Field label="Carrera" hint="Obligatoria para alumnos.">
                <Select value={carrera} onChange={(e) => setCarrera(e.target.value)}>
                  <option value="">Selecciona una carrera...</option>
                  {CARRERAS.map((opcion) => (
                    <option key={opcion} value={opcion}>
                      {opcion}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
        </Card>

        {/* Contacto */}
        <Card title="Contacto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Teléfono">
              <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej. 55 1234 5678" className="tabular-nums" />
            </Field>
            <Field label="Correo electrónico">
              <Input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="paciente@correo.mx" />
            </Field>
          </div>
        </Card>

        {/* Información clínica */}
        <Card title="Información clínica" description="Esto se mostrará como alerta en cada consulta.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Alergias" hint='Escribe "Ninguna" si no tiene alergias.'>
              <Input value={alergias} onChange={(e) => setAlergias(e.target.value)} placeholder="Ej. Penicilina" />
            </Field>
            <Field label="Enfermedades crónicas" hint='Escribe "Ninguna" si no aplica.'>
              <Input value={enfermedadesCronicas} onChange={(e) => setEnfermedadesCronicas(e.target.value)} placeholder="Ej. Diabetes tipo 2" />
            </Field>
            <Field label="Antecedentes" className="md:col-span-2">
              <Textarea rows={3} value={antecedentes} onChange={(e) => setAntecedentes(e.target.value)} placeholder="Cirugías, tratamientos previos, aparatos..." />
            </Field>
          </div>
        </Card>

        {error && (
          <p className="text-base text-red-600 font-medium" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-4 pb-10">
          <Button variant="secondary" icon={X} onClick={onCancelar}>
            Cancelar
          </Button>
          <Button type="submit" icon={Save}>
            {modo === 'alta' ? 'Dar de alta' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}
