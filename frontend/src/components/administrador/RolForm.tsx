import React, { useState } from 'react';
import { Save, X, ShieldCheck, CircleAlert } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/Input';
import { detallesDe, mensajeDeError } from '../../services/api';
import type { AccionPermiso, DatosRol, Rol } from '../../services/administracion.service';

/* ============================================================
   FORMULARIO DE ROL · alta y edición (subpágina)
   Conectado a POST/PUT /api/roles

   Todo rol declara un **perfil base** (Administrador, Personal
   médico, Enfermería o Paciente): de él hereda su panel y todos
   sus permisos. Sobre esa herencia se pueden marcar
   **restricciones**: acciones concretas que el rol NO podrá
   realizar. Los roles base del sistema solo se editan en su
   descripción: son la referencia de permisos.
   ============================================================ */

/** Perfiles base del sistema (mismo catálogo que backend/src/config/permisos.ts) */
const PERFILES = ['Administrador', 'Personal médico', 'Enfermería', 'Paciente'] as const;

export interface RolFormProps {
  modo: 'alta' | 'editar';
  rol?: Rol;
  /** Catálogo de acciones restringibles (GET /api/roles/acciones) */
  acciones: AccionPermiso[];
  guardando: boolean;
  onCancelar: () => void;
  onGuardar: (datos: DatosRol) => void | Promise<void>;
}

export default function RolForm({
  modo,
  rol,
  acciones,
  guardando,
  onCancelar,
  onGuardar,
}: RolFormProps) {
  const [nombre, setNombre] = useState(rol?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(rol?.descripcion ?? '');
  const [perfil, setPerfil] = useState(rol?.perfil ?? '');
  const [restricciones, setRestricciones] = useState<string[]>(rol?.restricciones ?? []);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState('');

  /** Los roles base del sistema conservan sus permisos completos */
  const esBase = rol?.esBase ?? false;

  /** Acciones heredables del perfil elegido */
  const accionesDelPerfil = acciones.filter((accion) => accion.perfiles.includes(perfil));

  const cambiarPerfil = (nuevo: string) => {
    setPerfil(nuevo);
    // Las restricciones que ya no pertenecen al perfil se descartan
    const validas = acciones
      .filter((accion) => accion.perfiles.includes(nuevo))
      .map((accion) => accion.id);
    setRestricciones((prev) => prev.filter((id) => validas.includes(id)));
  };

  const alternarRestriccion = (id: string) => {
    setRestricciones((prev) =>
      prev.includes(id) ? prev.filter((restriccion) => restriccion !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGeneral('');

    // Validación rápida en cliente; el servidor vuelve a validar
    const nuevos: Record<string, string> = {};
    if (!nombre.trim()) {
      nuevos.nombre = 'Escribe un nombre para el rol.';
    } else if (nombre.trim().length < 3) {
      nuevos.nombre = 'El nombre debe tener al menos 3 caracteres.';
    } else if (nombre.length > 50) {
      nuevos.nombre = 'Máximo 50 caracteres.';
    }
    if (descripcion.length > 255) {
      nuevos.descripcion = 'Máximo 255 caracteres.';
    }
    if (!perfil) {
      nuevos.perfil = 'Selecciona el perfil base del rol.';
    }
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    try {
      await onGuardar({
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        perfil,
        restricciones: esBase ? [] : restricciones,
      });
      setErrores({});
    } catch (error) {
      const porCampo = detallesDe(error);
      if (Object.keys(porCampo).length > 0) {
        setErrores(porCampo);
      } else {
        setErrorGeneral(mensajeDeError(error));
      }
    }
  };

  return (
    <div className="entrada p-4 sm:p-6 lg:p-10 xl:p-12 max-w-5xl mx-auto font-sans">
      <PageHeader
        title={modo === 'alta' ? 'Nuevo rol' : 'Editar rol'}
        subtitle={
          modo === 'alta'
            ? 'Crea un rol que herede el panel y los permisos de un perfil base'
            : `Editando el rol ${rol?.nombre ?? ''}`
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <Card title="Datos del rol" icon={ShieldCheck}>
          <div className="space-y-4">
            <Field label="Nombre del rol" error={errores.nombre}>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Auxiliar de enfermería"
                maxLength={50}
                disabled={guardando || esBase}
                aria-invalid={errores.nombre ? true : undefined}
              />
            </Field>
            <Field
              label="Perfil base"
              hint="Define el panel al que entra la cuenta y los permisos que hereda el rol."
              error={errores.perfil}
            >
              <Select
                value={perfil}
                onChange={(e) => cambiarPerfil(e.target.value)}
                disabled={guardando || esBase}
                aria-invalid={errores.perfil ? true : undefined}
              >
                <option value="">Selecciona un perfil…</option>
                {PERFILES.map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {opcion}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Descripción"
              hint="Qué puede hacer esta cuenta en el sistema."
              error={errores.descripcion}
            >
              <Textarea
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej. Apoya la atención y la agenda, sin acceso al inventario..."
                maxLength={255}
                disabled={guardando}
              />
            </Field>
          </div>
        </Card>

        {/* Restricciones: acciones que el rol NO hereda del perfil */}
        <Card title="Acciones a restringir">
          {esBase ? (
            <p className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
              "{rol?.nombre}" es un rol del sistema: hereda todos los permisos de su perfil y no
              acepta restricciones. Su nombre y perfil tampoco se modifican.
            </p>
          ) : !perfil ? (
            <p className="flex items-start gap-2.5 rounded-lg bg-brand-50 border border-brand-200 px-4 py-3 text-sm text-brand-800">
              <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              Elige primero el perfil base: sus acciones aparecerán aquí para que marques las que
              este rol no podrá realizar.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                El rol hereda <strong>todo</strong> lo de su perfil {perfil}. Marca solo las
                acciones que <strong>no</strong> podrá realizar (quedan bloqueadas en el servidor y
                ocultas en su panel).
              </p>
              <ul className="space-y-2">
                {accionesDelPerfil.map((accion) => {
                  const marcada = restricciones.includes(accion.id);
                  return (
                    <li key={accion.id}>
                      <label
                        className={[
                          'flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors',
                          'focus-within:ring-2 focus-within:ring-brand-600/40',
                          marcada
                            ? 'border-red-200 bg-red-50'
                            : 'border-gray-200 bg-white hover:border-brand-300',
                        ].join(' ')}
                      >
                        <input
                          type="checkbox"
                          checked={marcada}
                          onChange={() => alternarRestriccion(accion.id)}
                          disabled={guardando}
                          className="mt-1 h-4 w-4 accent-red-600"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-gray-900">
                            {accion.etiqueta}
                            {marcada && (
                              <span className="ml-2 text-xs font-medium text-red-600">
                                restringida
                              </span>
                            )}
                          </span>
                          <span className="block text-xs text-gray-500">{accion.descripcion}</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>

        {errorGeneral && (
          <p className="text-sm text-red-600 font-medium" role="alert">
            {errorGeneral}
          </p>
        )}

        <div className="flex justify-end gap-4 pb-10">
          <Button variant="secondary" icon={X} onClick={onCancelar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" icon={Save} loading={guardando}>
            {modo === 'alta' ? 'Crear rol' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}
