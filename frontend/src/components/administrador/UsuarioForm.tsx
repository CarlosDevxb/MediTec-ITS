import React, { useState } from 'react';
import { User, ShieldCheck, KeyRound, Save, X, MailCheck } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Field, Input, PasswordInput, Select } from '../ui/Input';
import { OPCIONES_ROL, type Usuario } from './tipos';

/* ============================================================
   FORMULARIO DE USUARIO · alta y edición (subpágina)
   ============================================================ */

export interface UsuarioFormProps {
  modo: 'alta' | 'editar';
  usuario?: Usuario;
  onCancelar: () => void;
  onGuardar: (datos: Usuario) => void;
}

export default function UsuarioForm({
  modo,
  usuario,
  onCancelar,
  onGuardar,
}: UsuarioFormProps) {
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [numeroControl, setNumeroControl] = useState(usuario?.numeroControl ?? '');
  const [correo, setCorreo] = useState(usuario?.correo ?? '');
  const [fechaNacimiento, setFechaNacimiento] = useState(usuario?.fechaNacimiento ?? '');
  const [genero, setGenero] = useState<'Femenino' | 'Masculino' | 'Otro'>(usuario?.genero ?? 'Femenino');
  const [rol, setRol] = useState(usuario?.rol ?? OPCIONES_ROL[1]);
  const [cedula, setCedula] = useState(usuario?.cedula ?? '');
  const [especialidad, setEspecialidad] = useState(usuario?.especialidad ?? 'Odontología');
  const [estatus, setEstatus] = useState<'Activo' | 'Inactivo'>(usuario?.estatus ?? 'Activo');
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim() || !numeroControl.trim() || !correo.trim()) {
      setError('Completa nombre, número de control y correo institucional.');
      return;
    }
    if (!fechaNacimiento) {
      setError('Registra la fecha de nacimiento.');
      return;
    }
    const esPersonal = rol === 'Personal médico' || rol === 'Enfermería';
    if (esPersonal && !cedula.trim()) {
      setError('Captura la cédula profesional del personal médico.');
      return;
    }
    if (modo === 'alta') {
      if (!contrasena.trim()) {
        setError('Define una contraseña inicial para la cuenta.');
        return;
      }
      if (contrasena.length < 8) {
        setError('La contraseña inicial debe tener al menos 8 caracteres.');
        return;
      }
      if (contrasena !== confirmarContrasena) {
        setError('La confirmación no coincide con la contraseña inicial.');
        return;
      }
    }

    setError('');
    onGuardar({
      id: usuario?.id ?? Date.now(),
      nombre: nombre.trim(),
      numeroControl: numeroControl.trim(),
      correo: correo.trim(),
      fechaNacimiento,
      genero,
      rol,
      estatus,
      cedula: rol === 'Personal médico' || rol === 'Enfermería' ? cedula.trim() : undefined,
      especialidad: rol === 'Personal médico' || rol === 'Enfermería' ? especialidad : undefined,
    });
  };

  return (
    <div className="p-10 xl:p-12 max-w-5xl mx-auto font-sans">
      <PageHeader
        title={modo === 'alta' ? 'Nuevo usuario' : 'Editar usuario'}
        subtitle={
          modo === 'alta'
            ? 'Da de alta una cuenta de acceso al sistema'
            : `Editando la cuenta de ${usuario?.nombre ?? ''}`
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos personales */}
        <Card title="Datos personales" icon={User}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre completo" className="md:col-span-2">
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Dra. Paola Janeth"
              />
            </Field>
            <Field label="Número de control">
              <Input
                value={numeroControl}
                onChange={(e) => setNumeroControl(e.target.value)}
                placeholder="Ej. PM-0012"
              />
            </Field>
            <Field label="Correo institucional">
              <Input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="nombre@meditec.mx"
              />
            </Field>
            <Field label="Fecha de nacimiento">
              <Input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                className="tabular-nums"
              />
            </Field>
            <Field label="Género">
              <Select value={genero} onChange={(e) => setGenero(e.target.value as 'Femenino' | 'Masculino' | 'Otro')}>
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
                <option value="Otro">Otro</option>
              </Select>
            </Field>
          </div>
        </Card>

        {/* Acceso al sistema */}
        <Card title="Acceso al sistema" icon={ShieldCheck}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Rol">
              <Select value={rol} onChange={(e) => setRol(e.target.value)}>
                {OPCIONES_ROL.map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {opcion}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Estatus">
              <Select
                value={estatus}
                onChange={(e) => setEstatus(e.target.value as 'Activo' | 'Inactivo')}
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </Select>
            </Field>

            {/* Datos del personal médico (tabla `personal_medico`) */}
            {(rol === 'Personal médico' || rol === 'Enfermería') && (
              <>
                <Field label="Cédula profesional" hint="Requerida para el personal médico.">
                  <Input
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    placeholder="Ej. CED-1234567"
                  />
                </Field>
                <Field label="Especialidad">
                  <Select value={especialidad} onChange={(e) => setEspecialidad(e.target.value)}>
                    <option>Odontología</option>
                    <option>Medicina general</option>
                    <option>Nutrición</option>
                    <option>Enfermería</option>
                  </Select>
                </Field>
              </>
            )}

            {modo === 'alta' ? (
              <>
                <Field label="Contraseña inicial" hint="Mínimo 8 caracteres.">
                  <PasswordInput
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </Field>
                <Field
                  label="Confirmar contraseña"
                  hint="El usuario deberá cambiarla en su primer inicio de sesión."
                >
                  <PasswordInput
                    value={confirmarContrasena}
                    onChange={(e) => setConfirmarContrasena(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </Field>
              </>
            ) : (
              <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-4 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Contraseña</p>
                  <p className="text-sm text-gray-500">
                    Envía un enlace de recuperación al correo del usuario.
                  </p>
                </div>
                {enviado ? (
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-brand-800">
                    <MailCheck size={16} />
                    Correo enviado
                  </span>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={KeyRound}
                    onClick={() => setEnviado(true)}
                  >
                    Recuperar por correo
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>

        {error && (
          <p className="text-sm text-red-600 font-medium" role="alert">
            {error}
          </p>
        )}

        {/* Acciones */}
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
