import React, { useState } from 'react';
import { Mail, Lock, Save, KeyRound } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
import { Field, Input, PasswordInput } from '../ui/Input';

/* ============================================================
   CONFIGURACIÓN · Actualizar contacto y cambiar contraseña
   (solo datos propios del personal médico)
   ============================================================ */

interface Props {
  /** Datos de la persona que usa el panel (varía por especialidad) */
  nombre?: string;
  correoInicial?: string;
  telefonoInicial?: string;
  /** Notifica el nuevo contacto a quien contenga el estado (portal) */
  onGuardarContacto?: (datos: { correo: string; telefono: string }) => void;
}

export default function Configuracion({
  nombre = 'Dra. Paola Janeth',
  correoInicial = 'paola.janeth@meditec.mx',
  telefonoInicial = '55 9876 5432',
  onGuardarContacto,
}: Props) {
  const { aviso, mostrar, cerrar } = useAviso();

  // Datos de contacto
  const [correo, setCorreo] = useState(correoInicial);
  const [telefono, setTelefono] = useState(telefonoInicial);
  const [contactoOriginal, setContactoOriginal] = useState({
    correo: correoInicial,
    telefono: telefonoInicial,
  });

  // Contraseña
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [errorContrasena, setErrorContrasena] = useState('');

  const guardarContacto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correo.trim() || !telefono.trim()) {
      mostrar('El correo y el teléfono son obligatorios.');
      return;
    }
    setContactoOriginal({ correo, telefono });
    onGuardarContacto?.({ correo, telefono });
    mostrar('Datos de contacto actualizados.');
  };

  const restablecerContacto = () => {
    setCorreo(contactoOriginal.correo);
    setTelefono(contactoOriginal.telefono);
  };

  const cambiarContrasena = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actual || !nueva || !confirmar) {
      setErrorContrasena('Completa los tres campos de contraseña.');
      return;
    }
    if (nueva.length < 8) {
      setErrorContrasena('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (nueva !== confirmar) {
      setErrorContrasena('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    setErrorContrasena('');
    setActual('');
    setNueva('');
    setConfirmar('');
    mostrar('Contraseña actualizada correctamente.');
  };

  return (
    <div className="p-10 xl:p-12 max-w-5xl mx-auto font-sans">
      <PageHeader
        title="Configuración"
        subtitle="Actualiza tus datos de contacto y contraseña"
      />

      {aviso && <Aviso mensaje={aviso} onCerrar={cerrar} />}

      <div className="space-y-6">
        {/* ---- Datos de contacto ---- */}
        <form onSubmit={guardarContacto}>
          <Card title="Datos de contacto" icon={Mail}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nombre" className="md:col-span-2">
                <Input
                  value={nombre}
                  disabled
                  className="bg-gray-50 text-gray-500"
                  aria-readonly="true"
                />
              </Field>
              <Field label="Correo electrónico">
                <Input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="nombre@meditec.mx"
                />
              </Field>
              <Field label="Teléfono">
                <Input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="tabular-nums"
                  placeholder="55 0000 0000"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-4 pt-6">
              <Button variant="secondary" type="button" onClick={restablecerContacto}>
                Restablecer
              </Button>
              <Button type="submit" icon={Save}>
                Guardar cambios
              </Button>
            </div>
          </Card>
        </form>

        {/* ---- Cambiar contraseña ---- */}
        <form onSubmit={cambiarContrasena}>
          <Card
            title="Cambiar contraseña"
            icon={Lock}
            description="Se pedirá en el próximo inicio de sesión."
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Contraseña actual">
                <PasswordInput
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </Field>
              <Field label="Nueva contraseña" hint="Mínimo 8 caracteres.">
                <PasswordInput
                  value={nueva}
                  onChange={(e) => setNueva(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Confirmar contraseña">
                <PasswordInput
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </Field>
            </div>

            {errorContrasena && (
              <p className="text-base text-red-600 font-medium mt-4" role="alert">
                {errorContrasena}
              </p>
            )}

            <div className="flex justify-end pt-6">
              <Button type="submit" icon={KeyRound}>
                Actualizar contraseña
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
}
