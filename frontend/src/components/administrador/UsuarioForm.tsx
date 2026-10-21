import React, { useEffect, useState } from 'react';
import { User, ShieldCheck, Save, X, Info, GraduationCap } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Field, Input, PasswordInput, Select } from '../ui/Input';
import { detallesDe, mensajeDeError } from '../../services/api';
import {
  listarTiposPaciente,
  listarCarreras,
  type Rol,
  type Usuario,
  type ValorCatalogo,
} from '../../services/administracion.service';

/* ============================================================
   FORMULARIO DE USUARIO · alta y edición (subpágina)
   Conectado a POST/PUT /api/usuarios

   Los roles llegan de la API y, según el rol elegido, se piden
   también los datos que el servidor exige:
     · Personal médico / Enfermería → cédula y especialidad
     · Paciente                    → tipo de paciente, y carrera
                                      si el tipo la requiere (Alumno)

   El servidor vuelve a validar todo: aquí es comodidad de captura.
   ============================================================ */

/** Roles cuyo personal necesita cédula (regla de presentación en el cliente) */
const ROLES_CON_CEDULA = ['Personal médico', 'Enfermería'];

/** Rol que además abre un expediente en la tabla `pacientes` */
const ROL_PACIENTE = 'Paciente';

/** Tipos de paciente que exigen carrera (mismo criterio que el backend) */
const TIPOS_CON_CARRERA = ['Alumno'];

const ESPECIALIDADES = ['Odontología', 'Medicina general', 'Nutrición', 'Enfermería'];

export interface UsuarioFormProps {
  modo: 'alta' | 'editar';
  usuario?: Usuario;
  roles: Rol[];
  cargandoRoles: boolean;
  guardando: boolean;
  onCancelar: () => void;
  onGuardar: (datos: Record<string, unknown>) => void | Promise<void>;
}

export default function UsuarioForm({
  modo,
  usuario,
  roles,
  cargandoRoles,
  guardando,
  onCancelar,
  onGuardar,
}: UsuarioFormProps) {
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [numeroControl, setNumeroControl] = useState(usuario?.numeroControl ?? '');
  const [correo, setCorreo] = useState(usuario?.correo ?? '');
  const [telefono, setTelefono] = useState(usuario?.telefono ?? '');
  const [fechaNacimiento, setFechaNacimiento] = useState(usuario?.fechaNacimiento ?? '');
  const [genero, setGenero] = useState<Usuario['genero']>(usuario?.genero ?? 'Femenino');
  const [rolId, setRolId] = useState(usuario?.rolId ?? roles[0]?.id ?? 0);
  const [cedula, setCedula] = useState(usuario?.cedula ?? '');
  const [especialidad, setEspecialidad] = useState(usuario?.especialidad ?? ESPECIALIDADES[0]);
  const [tipoPacienteId, setTipoPacienteId] = useState(usuario?.tipoPacienteId ?? 0);
  const [carreraId, setCarreraId] = useState(usuario?.carreraId ?? 0);
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState('');

  /* Catálogos que necesita el expediente del paciente */
  const [tiposPaciente, setTiposPaciente] = useState<ValorCatalogo[]>([]);
  const [carreras, setCarreras] = useState<ValorCatalogo[]>([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false);
  const [errorCatalogos, setErrorCatalogos] = useState('');

  const rolSeleccionado = roles.find((r) => r.id === rolId);
  const esPersonal = ROLES_CON_CEDULA.includes(rolSeleccionado?.nombre ?? '');
  const esPaciente = (rolSeleccionado?.nombre ?? '') === ROL_PACIENTE;

  const tipoSeleccionado = tiposPaciente.find((t) => t.id === tipoPacienteId);
  const requiereCarrera = TIPOS_CON_CARRERA.includes(tipoSeleccionado?.nombre ?? '');

  // Los catálogos solo se piden cuando el rol es Paciente
  useEffect(() => {
    if (!esPaciente) return;
    let vigente = true;
    setCargandoCatalogos(true);
    setErrorCatalogos('');

    Promise.all([listarTiposPaciente(), listarCarreras()])
      .then(([tipos, listaCarreras]) => {
        if (!vigente) return;
        setTiposPaciente(tipos);
        setCarreras(listaCarreras);
      })
      .catch((e) => {
        if (vigente) setErrorCatalogos(mensajeDeError(e));
      })
      .finally(() => {
        if (vigente) setCargandoCatalogos(false);
      });

    return () => {
      vigente = false;
    };
  }, [esPaciente]);

  // Al cambiar de tipo, si el nuevo no requiere carrera se limpia la selección
  useEffect(() => {
    if (tipoPacienteId && !requiereCarrera) setCarreraId(0);
  }, [tipoPacienteId, requiereCarrera]);

  /** Validación rápida en cliente; el servidor siempre vuelve a validar */
  const validar = (): boolean => {
    const nuevos: Record<string, string> = {};

    if (nombre.trim().length < 3) {
      nuevos.nombre = 'El nombre debe tener al menos 3 caracteres.';
    }
    if (numeroControl.trim().length < 3) {
      nuevos.numeroControl = 'Mínimo 3 caracteres.';
    } else if (!/^[A-Za-z0-9-]+$/.test(numeroControl.trim())) {
      nuevos.numeroControl = 'Solo letras, números y guiones.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      nuevos.correo = 'Escribe un correo electrónico válido.';
    }
    if (!fechaNacimiento) {
      nuevos.fechaNacimiento = 'Indica la fecha de nacimiento.';
    }
    if (!rolId) {
      nuevos.rolId = 'Selecciona un rol.';
    }
    if (esPersonal && !cedula.trim()) {
      nuevos.cedula = 'La cédula es obligatoria para este personal.';
    }
    if (esPaciente) {
      if (!tipoPacienteId) {
        nuevos.tipoPacienteId = 'Selecciona el tipo de paciente.';
      } else if (requiereCarrera && !carreraId) {
        nuevos.carreraId = 'Este tipo de paciente requiere una carrera.';
      }
    }
    if (modo === 'alta') {
      if (contrasena.length < 8) {
        nuevos.contrasena = 'La contraseña debe tener al menos 8 caracteres.';
      } else if (contrasena !== confirmarContrasena) {
        nuevos.confirmarContrasena = 'Las contraseñas no coinciden.';
      }
    }

    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGeneral('');
    if (!validar()) return;

    try {
      await onGuardar({
        nombre: nombre.trim(),
        numeroControl: numeroControl.trim(),
        correo: correo.trim(),
        telefono: telefono.trim(),
        fechaNacimiento,
        genero,
        rolId,
        estatus: true,
        cedula: esPersonal ? cedula.trim() : '',
        especialidad: esPersonal ? especialidad : '',
        tipoPacienteId: esPaciente ? tipoPacienteId : 0,
        carreraId: esPaciente && requiereCarrera ? carreraId : 0,
        ...(modo === 'alta' ? { contrasena } : {}),
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
    <div className="entrada p-10 xl:p-12 max-w-5xl mx-auto font-sans">
      <PageHeader
        title={modo === 'alta' ? 'Nuevo usuario' : 'Editar usuario'}
        subtitle={
          modo === 'alta'
            ? 'Da de alta una cuenta de acceso al sistema'
            : `Editando la cuenta de ${usuario?.nombre ?? ''}`
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Datos personales */}
        <Card title="Datos personales" icon={User}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre completo" className="md:col-span-2" error={errores.nombre}>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Dra. Paola Janeth"
                maxLength={100}
                disabled={guardando}
                aria-invalid={errores.nombre ? true : undefined}
              />
            </Field>
            <Field label="Número de control" error={errores.numeroControl}>
              <Input
                value={numeroControl}
                onChange={(e) => setNumeroControl(e.target.value)}
                placeholder="Ej. PM-0012"
                maxLength={20}
                disabled={guardando}
                aria-invalid={errores.numeroControl ? true : undefined}
              />
            </Field>
            <Field label="Correo institucional" error={errores.correo}>
              <Input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="nombre@meditec.mx"
                maxLength={150}
                disabled={guardando}
                aria-invalid={errores.correo ? true : undefined}
              />
            </Field>
            <Field label="Teléfono" hint="Opcional. Para contacto en urgencias.">
              <Input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej. 4811234567"
                maxLength={20}
                disabled={guardando}
              />
            </Field>
            <Field label="Fecha de nacimiento" error={errores.fechaNacimiento}>
              <Input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                className="tabular-nums"
                disabled={guardando}
                aria-invalid={errores.fechaNacimiento ? true : undefined}
              />
            </Field>
            <Field label="Género">
              <Select
                value={genero}
                onChange={(e) => setGenero(e.target.value as Usuario['genero'])}
                disabled={guardando}
              >
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
            <Field
              label="Rol"
              error={errores.rolId}
              hint={cargandoRoles ? 'Cargando roles…' : 'Define lo que la cuenta puede hacer.'}
            >
              <Select
                value={rolId || ''}
                onChange={(e) => setRolId(Number(e.target.value))}
                disabled={guardando || cargandoRoles || roles.length === 0}
                aria-invalid={errores.rolId ? true : undefined}
              >
                {roles.length === 0 && <option value="">Sin roles disponibles</option>}
                {roles.map((rol) => (
                  <option key={rol.id} value={rol.id}>
                    {rol.nombre}
                    {rol.usuarios > 0 ? ` (${rol.usuarios})` : ''}
                  </option>
                ))}
              </Select>
            </Field>

            {/* Datos del personal médico (tabla `personal_medico`) */}
            {esPersonal && (
              <>
                <Field label="Especialidad">
                  <Select
                    value={especialidad}
                    onChange={(e) => setEspecialidad(e.target.value)}
                    disabled={guardando}
                  >
                    {ESPECIALIDADES.map((opcion) => (
                      <option key={opcion} value={opcion}>
                        {opcion}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Cédula profesional"
                  className="md:col-span-2"
                  error={errores.cedula}
                  hint="Requerida para el personal médico y de enfermería."
                >
                  <Input
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    placeholder="Ej. CED-1234567"
                    maxLength={50}
                    disabled={guardando}
                    aria-invalid={errores.cedula ? true : undefined}
                  />
                </Field>
              </>
            )}

            {/* Datos del paciente (tabla `pacientes`) */}
            {esPaciente && (
              <div className="md:col-span-2 rounded-lg border border-brand-200 bg-brand-50/60 p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-900">
                  <GraduationCap size={16} aria-hidden="true" />
                  Datos del paciente
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field
                    label="Tipo de paciente"
                    error={errores.tipoPacienteId}
                    hint={
                      cargandoCatalogos
                        ? 'Cargando tipos…'
                        : 'Clasificación institucional con la que se abre el expediente.'
                    }
                  >
                    <Select
                      value={tipoPacienteId || ''}
                      onChange={(e) => setTipoPacienteId(Number(e.target.value))}
                      disabled={guardando || cargandoCatalogos || tiposPaciente.length === 0}
                      aria-invalid={errores.tipoPacienteId ? true : undefined}
                    >
                      {tiposPaciente.length === 0 && <option value="">Sin tipos disponibles</option>}
                      {tiposPaciente.map((tipo) => (
                        <option key={tipo.id} value={tipo.id}>
                          {tipo.nombre}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  {requiereCarrera && (
                    <Field
                      label="Carrera"
                      error={errores.carreraId}
                      hint="Los alumnos deben tener carrera asignada."
                    >
                      <Select
                        value={carreraId || ''}
                        onChange={(e) => setCarreraId(Number(e.target.value))}
                        disabled={guardando || cargandoCatalogos || carreras.length === 0}
                        aria-invalid={errores.carreraId ? true : undefined}
                      >
                        {carreras.length === 0 && <option value="">Sin carreras disponibles</option>}
                        {carreras.map((carrera) => (
                          <option key={carrera.id} value={carrera.id}>
                            {carrera.nombre}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}
                </div>

                {errorCatalogos && (
                  <p className="mt-3 text-sm text-red-600" role="alert">
                    {errorCatalogos} Puedes agregarlos desde la sección Catálogos.
                  </p>
                )}
              </div>
            )}

            {/* La contraseña solo se define al dar de alta */}
            {modo === 'alta' ? (
              <>
                <Field
                  label="Contraseña inicial"
                  error={errores.contrasena}
                  hint="Mínimo 8 caracteres. El usuario deberá cambiarla."
                >
                  <PasswordInput
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    maxLength={72}
                    disabled={guardando}
                  />
                </Field>
                <Field label="Confirmar contraseña" error={errores.confirmarContrasena}>
                  <PasswordInput
                    value={confirmarContrasena}
                    onChange={(e) => setConfirmarContrasena(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    maxLength={72}
                    disabled={guardando}
                  />
                </Field>
              </>
            ) : (
              <div className="md:col-span-2 flex items-start gap-3 bg-brand-50 border border-brand-200 rounded-lg px-4 py-3">
                <Info size={18} className="mt-0.5 shrink-0 text-brand-700" aria-hidden="true" />
                <p className="text-sm text-brand-900">
                  La contraseña no se modifica desde este formulario. Para restablecerla,
                  usa la acción de la cuenta en el listado de usuarios.
                </p>
              </div>
            )}
          </div>
        </Card>

        {errorGeneral && (
          <p className="text-sm text-red-600 font-medium" role="alert">
            {errorGeneral}
          </p>
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-4 pb-10">
          <Button variant="secondary" icon={X} onClick={onCancelar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" icon={Save} loading={guardando}>
            {modo === 'alta' ? 'Dar de alta' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}
