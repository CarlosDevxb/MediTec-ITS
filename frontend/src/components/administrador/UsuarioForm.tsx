import React, { useEffect, useMemo, useState } from 'react';
import { User, ShieldCheck, Save, X, Info, GraduationCap } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Field, Input, PasswordInput, Select } from '../ui/Input';
import { detallesDe, mensajeDeError } from '../../services/api';
import { useOpcionUnica } from '../../hooks/useOpcionUnica';
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

   El rol Paciente no se puede elegir si el catálogo de tipos de
   paciente está vacío: sin tipos no se abre expediente.

   El servidor vuelve a validar todo: aquí es comodidad de captura.
   ============================================================ */

/** Roles cuyo personal necesita cédula (regla de presentación en el cliente) */
const ROLES_CON_CEDULA = ['Personal médico', 'Enfermería'];

/** Rol que además abre un expediente en la tabla `pacientes` */
const ROL_PACIENTE = 'Paciente';

/** Rol del personal de enfermería */
const ROL_ENFERMERIA = 'Enfermería';

/**
 * Especialidades del personal médico. 'Enfermería' no aparece aquí: la
 * enfermería es un rol (así lo decide también el servidor), para no duplicar
 * identidades ni permisos.
 */
const ESPECIALIDADES_MEDICO = ['Odontología', 'Medicina general', 'Nutrición'];

/** Especialidad fija del personal de enfermería (mismo criterio que el backend) */
const ESPECIALIDAD_ENFERMERIA = 'Enfermería';

/** Tipos de paciente que exigen carrera (mismo criterio que el backend) */
const TIPOS_CON_CARRERA = ['Alumno'];

/** Formato aceptado para el teléfono (mismo criterio que el servidor) */
const FORMATO_TELEFONO = /^[0-9+\-() ]{7,20}$/;

export interface UsuarioFormProps {
  modo: 'alta' | 'editar';
  usuario?: Usuario;
  roles: Rol[];
  /** Usuarios ya cargados: para avisar de duplicados mientras se escribe */
  existentes?: Usuario[];
  cargandoRoles: boolean;
  guardando: boolean;
  onCancelar: () => void;
  onGuardar: (datos: Record<string, unknown>) => void | Promise<void>;
}

export default function UsuarioForm({
  modo,
  usuario,
  roles,
  existentes = [],
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
  const [genero, setGenero] = useState<string>(usuario?.genero ?? '');
  const [rolId, setRolId] = useState(usuario?.rolId ?? 0);
  const [cedula, setCedula] = useState(usuario?.cedula ?? '');
  const [especialidad, setEspecialidad] = useState(usuario?.especialidad ?? '');
  const [tipoPacienteId, setTipoPacienteId] = useState(usuario?.tipoPacienteId ?? 0);
  const [carreraId, setCarreraId] = useState(usuario?.carreraId ?? 0);
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState('');

  /* Catálogos que necesita el expediente del paciente. Se cargan siempre:
     sin tipos de paciente el rol Paciente no se puede elegir, y eso solo se
     sabe habiendo consultado el catálogo. */
  const [tiposPaciente, setTiposPaciente] = useState<ValorCatalogo[]>([]);
  const [carreras, setCarreras] = useState<ValorCatalogo[]>([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false);
  const [errorCatalogos, setErrorCatalogos] = useState('');

  const rolSeleccionado = roles.find((r) => r.id === rolId);
  const esPersonal = ROLES_CON_CEDULA.includes(rolSeleccionado?.nombre ?? '');
  const esPaciente = (rolSeleccionado?.nombre ?? '') === ROL_PACIENTE;
  const esRolEnfermeria = (rolSeleccionado?.nombre ?? '') === ROL_ENFERMERIA;
  const esPersonalMedico = (rolSeleccionado?.nombre ?? '') === 'Personal médico';

  // La enfermería es un rol: su especialidad es fija y no se elige. Al pasar
  // a personal médico se limpia si traía la especialidad de enfermería.
  useEffect(() => {
    if (esRolEnfermeria) {
      setEspecialidad(ESPECIALIDAD_ENFERMERIA);
    } else if (esPersonalMedico && !ESPECIALIDADES_MEDICO.includes(especialidad)) {
      setEspecialidad('');
    }
    // Solo al cambiar de rol: el resto lo decide quien captura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esRolEnfermeria, esPersonalMedico]);

  const tipoSeleccionado = tiposPaciente.find((t) => t.id === tipoPacienteId);
  const requiereCarrera = TIPOS_CON_CARRERA.includes(tipoSeleccionado?.nombre ?? '');
  const hayTipos = tiposPaciente.length > 0;
  const hayCarreras = carreras.length > 0;

  useEffect(() => {
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
  }, []);

  // Al cambiar de tipo, si el nuevo no requiere carrera se limpia la selección
  useEffect(() => {
    if (tipoPacienteId && !requiereCarrera) setCarreraId(0);
  }, [tipoPacienteId, requiereCarrera]);

  /* ---------- Duplicados en tiempo real ----------
     El número de control y el correo deben ser únicos: se comparan mientras
     se escribe contra los usuarios ya cargados (el servidor vuelve a
     comprobarlo y responde 409 si algo se cruza de todos modos). */
  const numeroRepetido = useMemo(
    () =>
      numeroControl.trim().length > 0 &&
      existentes.some(
        (u) =>
          u.id !== usuario?.id &&
          u.numeroControl.trim().toLowerCase() === numeroControl.trim().toLowerCase(),
      ),
    [existentes, numeroControl, usuario?.id],
  );
  const correoRepetido = useMemo(
    () =>
      correo.trim().length > 0 &&
      existentes.some(
        (u) => u.id !== usuario?.id && u.correo.trim().toLowerCase() === correo.trim().toLowerCase(),
      ),
    [correo, existentes, usuario?.id],
  );

  /* ---------- Selectores: opción única y rol Paciente ---------- */
  /** El rol Paciente se bloquea si no hay tipos de paciente registrados
   *  (sin tipo no se abre expediente). Una cuenta que ya es Paciente
   *  conserva su rol para no bloquear la edición. */
  const rolPacienteBloqueado = (rol: Rol): boolean =>
    rol.nombre === ROL_PACIENTE && !hayTipos && usuario?.rolId !== rol.id;

  const rolesDisponibles = useMemo(
    () => roles.filter((rol) => !rolPacienteBloqueado(rol)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roles, hayTipos, usuario?.rolId],
  );

  // Con una sola opción el selector la elige solo: evita el campo que "se ve
  // seleccionado" pero no lo está (o queda en blanco) al cargar el catálogo.
  // La carrera solo se auto-elegiría cuando el tipo la exige: nunca se asigna
  // una carrera a quien no es alumno.
  useOpcionUnica(rolesDisponibles, rolId, (id) => setRolId(Number(id)));
  useOpcionUnica(tiposPaciente, tipoPacienteId, (id) => setTipoPacienteId(Number(id)));
  useOpcionUnica(requiereCarrera ? carreras : [], carreraId, (id) => setCarreraId(Number(id)));

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
    } else if (numeroRepetido) {
      nuevos.numeroControl = 'Ese número de control ya está registrado.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      nuevos.correo = 'Escribe un correo electrónico válido.';
    } else if (correoRepetido) {
      nuevos.correo = 'Ese correo ya está registrado.';
    }
    if (telefono.trim() && !FORMATO_TELEFONO.test(telefono.trim())) {
      nuevos.telefono = 'Escribe un teléfono válido (solo números, espacios, +, - o paréntesis).';
    }
    if (!fechaNacimiento) {
      nuevos.fechaNacimiento = 'Indica la fecha de nacimiento.';
    } else if (fechaNacimiento > new Date().toISOString().slice(0, 10)) {
      nuevos.fechaNacimiento = 'La fecha de nacimiento no puede ser futura.';
    }
    if (!genero) {
      nuevos.genero = 'Selecciona un género.';
    }
    if (!rolId) {
      nuevos.rolId = 'Selecciona un rol.';
    } else if (roles.length > 0 && !roles.some((rol) => rol.id === rolId)) {
      nuevos.rolId = 'Selecciona un rol válido.';
    } else {
      const elegido = roles.find((rol) => rol.id === rolId);
      if (elegido && rolPacienteBloqueado(elegido)) {
        nuevos.rolId = 'Para usar el rol Paciente primero registra tipos de paciente en Catálogos.';
      }
    }
    if (esPersonal) {
      if (!cedula.trim()) {
        nuevos.cedula = 'La cédula es obligatoria para este personal.';
      }
      // La especialidad solo se elige en el personal médico: la de enfermería es fija
      if (esPersonalMedico && !especialidad) {
        nuevos.especialidad = 'Selecciona la especialidad.';
      }
    }
    if (esPaciente) {
      if (!tipoPacienteId) {
        nuevos.tipoPacienteId = hayTipos
          ? 'Selecciona el tipo de paciente.'
          : 'No hay tipos de paciente registrados. Regístralos en la sección Catálogos.';
      } else if (tiposPaciente.length > 0 && !tiposPaciente.some((t) => t.id === tipoPacienteId)) {
        nuevos.tipoPacienteId = 'Selecciona un tipo de paciente válido.';
      } else if (requiereCarrera && !carreraId) {
        nuevos.carreraId = hayCarreras
          ? 'Este tipo de paciente requiere una carrera.'
          : 'No hay carreras registradas. Regístralas en la sección Catálogos.';
      } else if (requiereCarrera && carreras.length > 0 && !carreras.some((c) => c.id === carreraId)) {
        nuevos.carreraId = 'Selecciona una carrera válida.';
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

      <form
        onSubmit={handleSubmit}
        // Al editar se descartan los avisos ya mostrados (incluidos los del
        // servidor): el formulario se revalida completo al guardar. Así un
        // campo corregido deja de quedar "marcado" como pendiente.
        onChange={() => setErrores((prev) => (Object.keys(prev).length ? {} : prev))}
        className="space-y-6"
        noValidate
      >
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
            <Field
              label="Teléfono"
              hint="Opcional. Para contacto en urgencias."
              error={errores.telefono}
            >
              <Input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej. 4811234567"
                maxLength={20}
                disabled={guardando}
                aria-invalid={errores.telefono ? true : undefined}
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
            <Field label="Género" error={errores.genero}>
              <Select
                value={genero}
                onChange={(e) => setGenero(e.target.value)}
                disabled={guardando}
                aria-invalid={errores.genero ? true : undefined}
              >
                <option value="">Selecciona…</option>
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
              hint={
                cargandoRoles || cargandoCatalogos
                  ? 'Cargando roles…'
                  : !hayTipos
                    ? 'El rol Paciente necesita tipos de paciente: regístralos en Catálogos.'
                    : 'Define lo que la cuenta puede hacer.'
              }
            >
              <Select
                value={rolId || ''}
                onChange={(e) => setRolId(Number(e.target.value))}
                disabled={guardando || cargandoRoles || roles.length === 0}
                aria-invalid={errores.rolId ? true : undefined}
              >
                {roles.length === 0 ? (
                  <option value="">Sin roles disponibles</option>
                ) : (
                  <option value="">Selecciona un rol…</option>
                )}
                {roles.map((rol) => {
                  const bloqueado = rolPacienteBloqueado(rol);
                  return (
                    <option key={rol.id} value={rol.id} disabled={bloqueado}>
                      {rol.nombre}
                      {rol.usuarios > 0 ? ` (${rol.usuarios})` : ''}
                      {bloqueado ? ' — requiere tipos de paciente' : ''}
                    </option>
                  );
                })}
              </Select>
            </Field>

            {/* Datos del personal médico (tabla `personal_medico`) */}
            {esPersonal && (
              <>
                {esRolEnfermeria ? (
                  <Field
                    label="Especialidad"
                    hint="La enfermería es un rol: su especialidad es fija y no se elige."
                  >
                    <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5 text-base text-gray-800">
                      {ESPECIALIDAD_ENFERMERIA}
                    </p>
                  </Field>
                ) : (
                  <Field label="Especialidad" error={errores.especialidad}>
                    <Select
                      value={especialidad}
                      onChange={(e) => setEspecialidad(e.target.value)}
                      disabled={guardando}
                      aria-invalid={errores.especialidad ? true : undefined}
                    >
                      <option value="">Selecciona…</option>
                      {ESPECIALIDADES_MEDICO.map((opcion) => (
                        <option key={opcion} value={opcion}>
                          {opcion}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
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
                        : tiposPaciente.length === 1 && tipoPacienteId
                          ? 'Solo hay un tipo registrado: quedó seleccionado automáticamente.'
                          : 'Clasificación institucional con la que se abre el expediente.'
                    }
                  >
                    {!cargandoCatalogos && !hayTipos ? (
                      <p className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                        Todavía no hay tipos de paciente. Regístralos en la sección
                        Catálogos → Tipos de paciente y vuelve a intentarlo.
                      </p>
                    ) : (
                      <Select
                        value={tipoPacienteId || ''}
                        onChange={(e) => setTipoPacienteId(Number(e.target.value))}
                        disabled={guardando || cargandoCatalogos || tiposPaciente.length === 0}
                        aria-invalid={errores.tipoPacienteId ? true : undefined}
                      >
                        {tiposPaciente.length === 0 ? (
                          <option value="">Cargando tipos…</option>
                        ) : (
                          <option value="">Selecciona el tipo…</option>
                        )}
                        {tiposPaciente.map((tipo) => {
                          const sinCarreras = TIPOS_CON_CARRERA.includes(tipo.nombre) && !hayCarreras;
                          return (
                            <option key={tipo.id} value={tipo.id} disabled={sinCarreras}>
                              {tipo.nombre}
                              {sinCarreras ? ' — sin carreras registradas' : ''}
                            </option>
                          );
                        })}
                      </Select>
                    )}
                  </Field>

                  {requiereCarrera && (
                    <Field
                      label="Carrera"
                      error={errores.carreraId}
                      hint={
                        carreras.length === 1 && carreraId
                          ? 'Solo hay una carrera registrada: quedó seleccionada automáticamente.'
                          : 'Los alumnos deben tener carrera asignada.'
                      }
                    >
                      {!cargandoCatalogos && !hayCarreras ? (
                        <p className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                          Todavía no hay carreras. Regístralas en la sección
                          Catálogos → Carreras: los pacientes de tipo Alumno la necesitan.
                        </p>
                      ) : (
                        <Select
                          value={carreraId || ''}
                          onChange={(e) => setCarreraId(Number(e.target.value))}
                          disabled={guardando || cargandoCatalogos || carreras.length === 0}
                          aria-invalid={errores.carreraId ? true : undefined}
                        >
                          {carreras.length === 0 ? (
                            <option value="">Cargando carreras…</option>
                          ) : (
                            <option value="">Selecciona la carrera…</option>
                          )}
                          {carreras.map((carrera) => (
                            <option key={carrera.id} value={carrera.id}>
                              {carrera.nombre}
                            </option>
                          ))}
                        </Select>
                      )}
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
