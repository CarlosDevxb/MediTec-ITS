import React, { useEffect, useMemo, useState } from 'react';
import { Settings, KeyRound, Save, CircleAlert, Lock, User } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import ModalResultado from '../ui/ModalResultado';
import { Field, Input } from '../ui/Input';
import { detallesDe, mensajeDeError } from '../../services/api';
import { obtenerSesion } from '../../services/sesion';
import { obtenerPerfil, actualizarPerfil } from '../../services/auth.service';
import type { Usuario } from '../../services/administracion.service';

/* ============================================================
   CONFIGURACIÓN (DOCTOR) · Perfil de la cuenta: datos de
   contacto (teléfono) y cambio de contraseña.

   El correo no se puede modificar: es el identificador de la
   cuenta. Para cambiar la contraseña se exige la actual.
   ============================================================ */

export default function ConfiguracionPerfil() {
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [telefono, setTelefono] = useState('');
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [contrasenaNueva, setContrasenaNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [tocado, setTocado] = useState<Record<string, boolean>>({});
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [resultado, setResultado] = useState<{
    titulo: string;
    mensaje: string;
    tipo: 'exito' | 'error';
  } | null>(null);

  /* ---------- Carga del perfil ---------- */
  useEffect(() => {
    let vigente = true;
    setCargando(true);
    obtenerPerfil()
      .then((datos) => {
        if (!vigente) return;
        setPerfil(datos);
        setTelefono(datos.telefono ?? '');
      })
      .catch((e) => {
        if (vigente) setError(mensajeDeError(e));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  /* ---------- Validación en tiempo real ---------- */
  const errores = useMemo(() => {
    const calculados: Record<string, string> = {};
    calculados.contrasenaActual =
      contrasenaNueva && !contrasenaActual
        ? 'Escribe tu contraseña actual para poder cambiarla.'
        : '';
    calculados.contrasenaNueva = !contrasenaNueva
      ? ''
      : contrasenaNueva.length < 8
        ? 'La contraseña nueva debe tener al menos 8 caracteres.'
        : contrasenaNueva === contrasenaActual
          ? 'La contraseña nueva debe ser distinta a la actual.'
          : '';
    calculados.confirmar =
      contrasenaNueva && confirmar !== contrasenaNueva
        ? 'Las contraseñas no coinciden.'
        : '';
    calculados.telefono =
      telefono && !/^\d{7,10}$/.test(telefono)
        ? 'Escribe un teléfono válido: solo números, entre 7 y 10 dígitos.'
        : '';
    return calculados;
  }, [telefono, contrasenaActual, contrasenaNueva, confirmar]);

  const errorVisible = (campo: string): string | undefined => {
    const propio = errores[campo];
    if (propio) return tocado[campo] ? propio : erroresServidor[campo] || undefined;
    return erroresServidor[campo] || undefined;
  };
  const hayErrores = Object.values(errores).some(Boolean);
  const marcarTocado = (campo: string) => setTocado((prev) => ({ ...prev, [campo]: true }));

  /* ---------- Guardado ---------- */
  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setTocado({
      telefono: true,
      contrasenaActual: true,
      contrasenaNueva: true,
      confirmar: true,
    });
    setErroresServidor({});
    setErrorGeneral('');
    if (hayErrores) return;

    setGuardando(true);
    try {
      const hayCambioContrasena = Boolean(contrasenaNueva);
      const actualizado = await actualizarPerfil({
        telefono,
        ...(hayCambioContrasena
          ? { contrasenaActual, contrasenaNueva }
          : {}),
      });
      setPerfil(actualizado);
      setContrasenaActual('');
      setContrasenaNueva('');
      setConfirmar('');
      setTocado({});
      setResultado({
        titulo: hayCambioContrasena ? 'Perfil y contraseña actualizados' : 'Perfil actualizado',
        mensaje: hayCambioContrasena
          ? 'Tus datos de contacto se guardaron y tu contraseña cambió correctamente.'
          : 'Tus datos de contacto se guardaron correctamente.',
        tipo: 'exito',
      });
    } catch (error) {
      const porCampo = detallesDe(error);
      if (Object.keys(porCampo).length > 0) setErroresServidor(porCampo);
      else setErrorGeneral(mensajeDeError(error));
    } finally {
      setGuardando(false);
    }
  };

  const nombre = perfil?.nombre ?? obtenerSesion()?.usuario.nombre ?? '';

  return (
    <div className="entrada p-10 xl:p-12 max-w-5xl mx-auto font-sans">
      <PageHeader
        title="Configuración"
        subtitle="Datos de contacto y contraseña de tu cuenta"
      />

      {error && (
        <p
          role="alert"
          className="mb-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <form onSubmit={(e) => void guardar(e)} className="space-y-6" noValidate>
        {/* Datos de la cuenta */}
        <Card title="Datos de la cuenta" icon={User}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre">
              <Input value={nombre} readOnly disabled className="bg-gray-50" />
            </Field>
            <Field label="Número de control">
              <Input
                value={perfil?.numeroControl ?? ''}
                readOnly
                disabled
                className="bg-gray-50 tabular-nums"
              />
            </Field>
            <Field
              label="Correo electrónico"
              hint="El correo es el identificador de la cuenta y no se puede cambiar."
            >
              <Input
                value={perfil?.correo ?? ''}
                readOnly
                disabled
                className="bg-gray-50"
              />
            </Field>
            <Field label="Teléfono" error={errorVisible('telefono')} hint="Dato de contacto.">
              <Input
                value={telefono}
                onChange={(e) => {
                  setTelefono(e.target.value.replace(/\D/g, ''));
                  marcarTocado('telefono');
                }}
                onBlur={() => marcarTocado('telefono')}
                placeholder="Ej. 5512345678"
                inputMode="numeric"
                maxLength={10}
                aria-invalid={errorVisible('telefono') ? true : undefined}
              />
            </Field>
          </div>
        </Card>

        {/* Cambio de contraseña */}
        <Card title="Cambiar contraseña" icon={KeyRound}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Contraseña actual" error={errorVisible('contrasenaActual')}>
              <Input
                type="password"
                value={contrasenaActual}
                onChange={(e) => {
                  setContrasenaActual(e.target.value);
                  marcarTocado('contrasenaActual');
                }}
                onBlur={() => marcarTocado('contrasenaActual')}
                placeholder="Tu contraseña actual"
                aria-invalid={errorVisible('contrasenaActual') ? true : undefined}
              />
            </Field>
            <Field
              label="Contraseña nueva"
              hint="Mínimo 8 caracteres."
              error={errorVisible('contrasenaNueva')}
            >
              <Input
                type="password"
                value={contrasenaNueva}
                onChange={(e) => {
                  setContrasenaNueva(e.target.value);
                  marcarTocado('contrasenaNueva');
                }}
                onBlur={() => marcarTocado('contrasenaNueva')}
                placeholder="Nueva contraseña"
                aria-invalid={errorVisible('contrasenaNueva') ? true : undefined}
              />
            </Field>
            <Field label="Confirmar contraseña" error={errorVisible('confirmar')}>
              <Input
                type="password"
                value={confirmar}
                onChange={(e) => {
                  setConfirmar(e.target.value);
                  marcarTocado('confirmar');
                }}
                onBlur={() => marcarTocado('confirmar')}
                placeholder="Repite la nueva contraseña"
                aria-invalid={errorVisible('confirmar') ? true : undefined}
              />
            </Field>
          </div>
          {!contrasenaNueva && !contrasenaActual && (
            <p className="mt-4 flex items-center gap-2.5 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
              <Lock size={16} className="shrink-0 text-gray-400" aria-hidden="true" />
              Si solo necesitas actualizar tu teléfono, deja vacíos los campos de contraseña.
            </p>
          )}
        </Card>

        {(errorGeneral || hayErrores) && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              {errorGeneral ||
                'Revisa los campos marcados antes de guardar: hay datos inválidos.'}
            </span>
          </div>
        )}

        <div className="flex justify-end gap-4 pb-10">
          <Button type="submit" icon={Save} loading={guardando} disabled={guardando || cargando}>
            Guardar cambios
          </Button>
        </div>
      </form>

      {resultado && (
        <ModalResultado
          titulo={resultado.titulo}
          mensaje={resultado.mensaje}
          tipo={resultado.tipo}
          onCerrar={() => setResultado(null)}
        />
      )}
    </div>
  );
}
