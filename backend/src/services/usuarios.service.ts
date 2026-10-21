import pool from '../db/pool';
import { generarContrasenaTemporal, hashearContrasena } from '../utils/contrasenas';
import { requiereCedula, esRolPaciente, requiereCarrera } from '../config/roles';
import { errorConflicto, errorNoEncontrado, errorValidacion } from '../utils/erroresHttp';

/**
 * Capa de datos de usuarios (tablas `usuarios`, `personal_medico`, `pacientes`).
 *
 * Reglas de seguridad que se cumplen aquí:
 *   · Ninguna consulta devuelve la columna `contraseña` (solo el login la lee).
 *   · Todos los valores viajan como parámetros `?`, nunca interpolados.
 *   · Alta y edición usan transacción para que `usuarios` y sus tablas hijas
 *     (`personal_medico`, `pacientes`) nunca queden en estados inconsistentes.
 *   · No se destruye información clínica: cambiar el rol o eliminar una cuenta
 *     que ya tiene expediente se rechaza pidiendo deshabilitarla.
 */

export type Genero = 'Masculino' | 'Femenino' | 'Otro';

export interface Usuario {
  id: number;
  rolId: number;
  rol: string;
  numeroControl: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  /** Fecha en formato AAAA-MM-DD */
  fechaNacimiento: string;
  genero: Genero;
  estatus: 'Activo' | 'Inactivo';
  /* Personal médico / enfermería (tabla `personal_medico`) */
  personalMedicoId?: number;
  cedula?: string;
  especialidad?: string;
  /* Expediente (tabla `pacientes`) */
  pacienteId?: number;
  tipoPacienteId?: number;
  tipoPaciente?: string;
  carreraId?: number;
  carrera?: string;
}

export interface DatosUsuario {
  nombre: string;
  numeroControl: string;
  correo: string;
  telefono?: string;
  fechaNacimiento: string;
  genero: Genero;
  rolId: number;
  estatus?: boolean;
  cedula?: string;
  especialidad?: string;
  tipoPacienteId?: number;
  carreraId?: number;
}

/** Proyección de columnas (sin `contraseña`) compartida por las consultas */
const COLUMNAS_USUARIO = `
  u.id_usuarios AS id,
  u.roles_id_rol AS rolId,
  r.nombre AS rol,
  u.numero_control AS numeroControl,
  u.nombre,
  u.correo,
  u.telefono,
  u.fecha_nacimiento AS fechaNacimiento,
  u.genero,
  u.estatus,
  pm.id_personal_medico AS personalMedicoId,
  pm.cedula,
  pm.especialidad,
  p.id_paciente AS pacienteId,
  p.cat_tipo_paciente_id_tipo AS tipoPacienteId,
  t.nombre AS tipoPaciente,
  p.cat_carreras_id_carrera AS carreraId,
  c.nombre AS carrera
`;

/** Convierte una fila de MySQL al tipo de la interfaz */
function aUsuario(fila: Record<string, unknown>): Usuario {
  const usuario: Usuario = {
    id: Number(fila['id']),
    rolId: Number(fila['rolId']),
    rol: String(fila['rol']),
    numeroControl: String(fila['numeroControl']),
    nombre: String(fila['nombre']),
    correo: String(fila['correo']),
    telefono: fila['telefono'] ? String(fila['telefono']) : null,
    fechaNacimiento: fechaISO(fila['fechaNacimiento']),
    genero: String(fila['genero']) as Genero,
    estatus: Number(fila['estatus']) === 1 ? 'Activo' : 'Inactivo',
  };
  if (fila['personalMedicoId'] != null) usuario.personalMedicoId = Number(fila['personalMedicoId']);
  if (fila['cedula'] != null) usuario.cedula = String(fila['cedula']);
  if (fila['especialidad'] != null) usuario.especialidad = String(fila['especialidad']);
  if (fila['pacienteId'] != null) {
    usuario.pacienteId = Number(fila['pacienteId']);
    usuario.tipoPacienteId = Number(fila['tipoPacienteId']);
    usuario.tipoPaciente = String(fila['tipoPaciente'] ?? '');
    if (fila['carreraId'] != null) {
      usuario.carreraId = Number(fila['carreraId']);
      usuario.carrera = String(fila['carrera'] ?? '');
    }
  }
  return usuario;
}

/**
 * MySQL entrega `DATE` como objeto Date; se normaliza a texto AAAA-MM-DD
 * usando las partes locales (como mysql2 construyó la fecha) para evitar
 * que un cambio de zona horaria mueva el día.
 */
function fechaISO(valor: unknown): string {
  if (valor instanceof Date) {
    const anio = valor.getFullYear();
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    const dia = String(valor.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
  return String(valor ?? '').slice(0, 10);
}

/** Lista todos los usuarios con su rol, sus datos de personal y de paciente */
export async function listarUsuarios(): Promise<Usuario[]> {
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS_USUARIO}
       FROM usuarios u
       JOIN roles r ON r.id_rol = u.roles_id_rol
       LEFT JOIN personal_medico pm ON pm.usuarios_id_usuarios = u.id_usuarios
       LEFT JOIN pacientes p ON p.usuarios_id_usuarios = u.id_usuarios
       LEFT JOIN cat_tipo_paciente t ON t.id_tipo = p.cat_tipo_paciente_id_tipo
       LEFT JOIN cat_carreras c ON c.id_carrera = p.cat_carreras_id_carrera
      ORDER BY u.nombre ASC`,
  );
  return (filas as Array<Record<string, unknown>>).map(aUsuario);
}

/** Busca un usuario por id */
export async function buscarUsuario(id: number): Promise<Usuario | null> {
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS_USUARIO}
       FROM usuarios u
       JOIN roles r ON r.id_rol = u.roles_id_rol
       LEFT JOIN personal_medico pm ON pm.usuarios_id_usuarios = u.id_usuarios
       LEFT JOIN pacientes p ON p.usuarios_id_usuarios = u.id_usuarios
       LEFT JOIN cat_tipo_paciente t ON t.id_tipo = p.cat_tipo_paciente_id_tipo
       LEFT JOIN cat_carreras c ON c.id_carrera = p.cat_carreras_id_carrera
      WHERE u.id_usuarios = ?
      LIMIT 1`,
    [id],
  );
  const fila = (filas as Array<Record<string, unknown>>)[0];
  return fila ? aUsuario(fila) : null;
}

/** Nombre del rol a partir de su id; `null` si no existe */
async function nombreDeRol(rolId: number): Promise<string | null> {
  const [filas] = await pool.query('SELECT nombre FROM roles WHERE id_rol = ? LIMIT 1', [rolId]);
  const fila = (filas as Array<Record<string, unknown>>)[0];
  return fila ? String(fila['nombre']) : null;
}

/** Nombre del tipo de paciente; `null` si no existe */
async function nombreDeTipoPaciente(tipoId: number): Promise<string | null> {
  const [filas] = await pool.query(
    'SELECT nombre FROM cat_tipo_paciente WHERE id_tipo = ? LIMIT 1',
    [tipoId],
  );
  const fila = (filas as Array<Record<string, unknown>>)[0];
  return fila ? String(fila['nombre']) : null;
}

/** Comprueba que una carrera exista */
async function existeCarrera(carreraId: number): Promise<boolean> {
  const [filas] = await pool.query(
    'SELECT id_carrera FROM cat_carreras WHERE id_carrera = ? LIMIT 1',
    [carreraId],
  );
  return Boolean((filas as Array<Record<string, unknown>>)[0]);
}

/** Rechaza número de control o correo ya usados por otra cuenta */
async function asegurarDatosLibres(
  numeroControl: string,
  correo: string,
  idExcluido?: number,
): Promise<void> {
  const [porControl] = await pool.query(
    'SELECT id_usuarios FROM usuarios WHERE numero_control = ? AND id_usuarios <> ? LIMIT 1',
    [numeroControl, idExcluido ?? 0],
  );
  if ((porControl as Array<Record<string, unknown>>)[0]) {
    throw errorConflicto(`El número de control "${numeroControl}" ya está registrado.`);
  }

  const [porCorreo] = await pool.query(
    'SELECT id_usuarios FROM usuarios WHERE correo = ? AND id_usuarios <> ? LIMIT 1',
    [correo, idExcluido ?? 0],
  );
  if ((porCorreo as Array<Record<string, unknown>>)[0]) {
    throw errorConflicto(`El correo "${correo}" ya está registrado.`);
  }
}

/** Valida la cédula cuando el rol la exige */
function validarCedula(nombreRol: string, datos: DatosUsuario): void {
  if (!requiereCedula(nombreRol)) return;

  if (!datos.cedula?.trim()) {
    throw errorValidacion(
      'La cédula profesional es obligatoria para el personal médico y de enfermería.',
      [{ campo: 'cedula', mensaje: 'Captura la cédula profesional.' }],
    );
  }
  if (!datos.especialidad?.trim()) {
    throw errorValidacion('Indica la especialidad del personal.', [
      { campo: 'especialidad', mensaje: 'Selecciona la especialidad.' },
    ]);
  }
}

/**
 * Valida los datos del expediente cuando el rol es Paciente:
 * el tipo de paciente es obligatorio, y la carrera también lo es para los
 * tipos que la requieren (ver `config/roles.ts`).
 */
async function validarPaciente(nombreRol: string, datos: DatosUsuario): Promise<{
  tipoId: number;
  carreraId: number | null;
  nombreTipo: string;
} | null> {
  if (!esRolPaciente(nombreRol)) return null;

  const tipoId = Number(datos.tipoPacienteId ?? 0);
  if (!tipoId) {
    throw errorValidacion('Indica el tipo de paciente del expediente.', [
      { campo: 'tipoPacienteId', mensaje: 'Selecciona el tipo de paciente.' },
    ]);
  }

  const nombreTipo = await nombreDeTipoPaciente(tipoId);
  if (!nombreTipo) {
    throw errorValidacion('El tipo de paciente seleccionado no existe.', [
      { campo: 'tipoPacienteId', mensaje: 'Selecciona un tipo válido.' },
    ]);
  }

  const carreraId = Number(datos.carreraId ?? 0);

  if (requiereCarrera(nombreTipo)) {
    if (!carreraId) {
      throw errorValidacion(
        `Los pacientes de tipo "${nombreTipo}" deben tener una carrera asignada.`,
        [{ campo: 'carreraId', mensaje: 'Selecciona la carrera.' }],
      );
    }
    if (!(await existeCarrera(carreraId))) {
      throw errorValidacion('La carrera seleccionada no existe.', [
        { campo: 'carreraId', mensaje: 'Selecciona una carrera válida.' },
      ]);
    }
  }

  return { tipoId, carreraId: carreraId || null, nombreTipo };
}

/**
 * Da de alta un usuario y, según su rol, su ficha de personal médico o su
 * expediente de paciente. Todo dentro de una transacción.
 */
export async function crearUsuario(
  datos: DatosUsuario,
  contrasena: string,
): Promise<Usuario> {
  const nombreRol = await nombreDeRol(datos.rolId);
  if (!nombreRol) throw errorValidacion('El rol seleccionado no existe.');

  validarCedula(nombreRol, datos);
  const paciente = await validarPaciente(nombreRol, datos);
  await asegurarDatosLibres(datos.numeroControl, datos.correo);

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();

    const hash = await hashearContrasena(contrasena);
    const [resultado] = await conexion.query(
      `INSERT INTO usuarios
         (roles_id_rol, numero_control, nombre, correo, telefono, contraseña,
          fecha_nacimiento, genero, estatus)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        datos.rolId,
        datos.numeroControl,
        datos.nombre,
        datos.correo,
        datos.telefono?.trim() || null,
        hash,
        datos.fechaNacimiento,
        datos.genero,
        datos.estatus === false ? 0 : 1,
      ],
    );
    const id = Number((resultado as { insertId: number }).insertId);

    if (requiereCedula(nombreRol)) {
      await conexion.query(
        `INSERT INTO personal_medico (usuarios_id_usuarios, cedula, especialidad)
         VALUES (?, ?, ?)`,
        [id, datos.cedula?.trim() ?? '', datos.especialidad?.trim() ?? ''],
      );
    }

    // La tabla `pacientes` exige tipo de paciente: sin expediente, una cuenta
    // con rol Paciente no podría atender ningún flujo clínico
    if (paciente) {
      await conexion.query(
        `INSERT INTO pacientes (usuarios_id_usuarios, cat_tipo_paciente_id_tipo, cat_carreras_id_carrera)
         VALUES (?, ?, ?)`,
        [id, paciente.tipoId, paciente.carreraId],
      );
    }

    await conexion.commit();
    return (await buscarUsuario(id)) as Usuario;
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

/**
 * Actualiza un usuario y sincroniza sus tablas hijas según el rol.
 *
 * Si la cuenta ya tiene expediente de paciente, no se le puede cambiar el rol:
 * `pacientes` borra en cascada todo el historial clínico y eso no debe ocurrir
 * desde el panel administrativo.
 */
export async function actualizarUsuario(
  id: number,
  datos: DatosUsuario,
): Promise<Usuario> {
  const actual = await buscarUsuario(id);
  if (!actual) throw errorNoEncontrado('El usuario no existe.');

  const nombreRol = await nombreDeRol(datos.rolId);
  if (!nombreRol) throw errorValidacion('El rol seleccionado no existe.');

  validarCedula(nombreRol, datos);
  const paciente = await validarPaciente(nombreRol, datos);
  await asegurarDatosLibres(datos.numeroControl, datos.correo, id);

  const teniaExpediente = actual.pacienteId != null;
  const tendraExpediente = esRolPaciente(nombreRol);

  if (teniaExpediente && !tendraExpediente) {
    throw errorConflicto(
      `"${actual.nombre}" tiene expediente de paciente. No se puede cambiar su rol porque eso borraría su historial clínico.`,
    );
  }
  if (!teniaExpediente && tendraExpediente) {
    // Pasar de otro rol a Paciente está permitido: se crea el expediente
  }

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();

    // El estatus solo cambia si la petición lo indica; al editar sin enviarlo
    // se conserva el que ya tenía la cuenta
    const nuevoEstatus =
      datos.estatus === undefined
        ? actual.estatus === 'Activo'
          ? 1
          : 0
        : datos.estatus === false
          ? 0
          : 1;

    await conexion.query(
      `UPDATE usuarios
          SET roles_id_rol = ?, numero_control = ?, nombre = ?, correo = ?,
              telefono = ?, fecha_nacimiento = ?, genero = ?, estatus = ?
        WHERE id_usuarios = ?`,
      [
        datos.rolId,
        datos.numeroControl,
        datos.nombre,
        datos.correo,
        datos.telefono?.trim() || null,
        datos.fechaNacimiento,
        datos.genero,
        nuevoEstatus,
        id,
      ],
    );

    /* ---- Tabla hija: personal_medico ---- */
    if (requiereCedula(nombreRol)) {
      await conexion.query(
        `INSERT INTO personal_medico (usuarios_id_usuarios, cedula, especialidad)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE cedula = VALUES(cedula), especialidad = VALUES(especialidad)`,
        [id, datos.cedula?.trim() ?? '', datos.especialidad?.trim() ?? ''],
      );
    } else {
      await conexion.query('DELETE FROM personal_medico WHERE usuarios_id_usuarios = ?', [id]);
    }

    /* ---- Tabla hija: pacientes ---- */
    if (paciente) {
      await conexion.query(
        `INSERT INTO pacientes (usuarios_id_usuarios, cat_tipo_paciente_id_tipo, cat_carreras_id_carrera)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           cat_tipo_paciente_id_tipo = VALUES(cat_tipo_paciente_id_tipo),
           cat_carreras_id_carrera = VALUES(cat_carreras_id_carrera)`,
        [id, paciente.tipoId, paciente.carreraId],
      );
    } else if (teniaExpediente) {
      // No debería llegar aquí: el cambio de rol con expediente se rechaza arriba
      throw errorConflicto('No se puede quitar el expediente de un paciente desde esta vista.');
    }

    await conexion.commit();
    return (await buscarUsuario(id)) as Usuario;
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

/**
 * Habilita o deshabilita una cuenta (baja lógica).
 *
 * No se puede deshabilitar la propia cuenta: el administrador se quedaría
 * fuera del sistema. Tampoco se puede desactivar al último administrador
 * activo, o nadie podría volver a administrar el sistema.
 */
/**
 * Restablece la contraseña de una cuenta (contraseñas perdidas).
 * Si no se proporciona contraseña, se genera una temporal que se devuelve
 * una sola vez para entregársela a la persona.
 */
export async function restablecerContrasena(
  id: number,
  contrasena?: string,
): Promise<{ nombre: string; contrasenaTemporal?: string }> {
  const actual = await buscarUsuario(id);
  if (!actual) throw errorNoEncontrado('El usuario no existe.');

  const contrasenaPropia = contrasena?.trim();
  const nueva = contrasenaPropia || generarContrasenaTemporal();
  const hash = await hashearContrasena(nueva);
  await pool.query('UPDATE usuarios SET contraseña = ? WHERE id_usuarios = ?', [hash, id]);

  return {
    nombre: actual.nombre,
    // Solo se muestra la temporal: una contraseña capturada por el
    // administrador nunca se devuelve en las respuestas
    ...(contrasenaPropia ? {} : { contrasenaTemporal: nueva }),
  };
}

export async function cambiarEstatus(
  id: number,
  activo: boolean,
  idSolicitante: number,
): Promise<Usuario> {
  const actual = await buscarUsuario(id);
  if (!actual) throw errorNoEncontrado('El usuario no existe.');

  if (!activo) {
    if (id === idSolicitante) {
      throw errorConflicto('No puedes deshabilitar tu propia cuenta.');
    }
    if (actual.rol === 'Administrador') {
      const [filas] = await pool.query(
        'SELECT COUNT(*) AS total FROM usuarios WHERE roles_id_rol = ? AND estatus = 1',
        [actual.rolId],
      );
      const activos = Number((filas as Array<{ total: number }>)[0]?.total ?? 0);
      if (activos <= 1) {
        throw errorConflicto(
          'No puedes deshabilitar al último administrador activo: el sistema se quedaría sin quién lo administre.',
        );
      }
    }
  }

  await pool.query('UPDATE usuarios SET estatus = ? WHERE id_usuarios = ?', [
    activo ? 1 : 0,
    id,
  ]);
  return (await buscarUsuario(id)) as Usuario;
}

/**
 * Elimina definitivamente un usuario.
 *
 * Se bloquea si la cuenta tiene información clínica, porque las llaves foráneas
 * borran en cascada y ese historial no debe desaparecer desde el panel
 * administrativo: en esos casos se sugiere deshabilitar la cuenta.
 */
export async function eliminarUsuario(
  id: number,
  idSolicitante: number,
): Promise<{ nombre: string }> {
  const actual = await buscarUsuario(id);
  if (!actual) throw errorNoEncontrado('El usuario no existe.');

  if (id === idSolicitante) {
    throw errorConflicto('No puedes eliminar tu propia cuenta.');
  }

  // 1) Expediente de paciente (arrastra alergias, planes, citas, consultas…)
  const [pacientes] = await pool.query(
    'SELECT id_paciente FROM pacientes WHERE usuarios_id_usuarios = ? LIMIT 1',
    [id],
  );
  if ((pacientes as Array<Record<string, unknown>>)[0]) {
    throw errorConflicto(
      `"${actual.nombre}" tiene expediente de paciente. Deshabilita la cuenta en lugar de eliminarla.`,
    );
  }

  // 2) El personal médico borra en cascada junto con sus horarios y planes
  const [horarios] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM horarios h
       JOIN personal_medico pm ON pm.id_personal_medico = h.personal_medico_id_personal_medico
      WHERE pm.usuarios_id_usuarios = ?`,
    [id],
  );
  const totalHorarios = Number((horarios as Array<{ total: number }>)[0]?.total ?? 0);
  if (totalHorarios > 0) {
    throw errorConflicto(
      `"${actual.nombre}" tiene ${totalHorarios} horario(s) asignado(s). Deshabilita la cuenta en lugar de eliminarla.`,
    );
  }

  const [planes] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM plan_alimenticio pa
       JOIN personal_medico pm ON pm.id_personal_medico = pa.personal_medico_id_personal_medico
      WHERE pm.usuarios_id_usuarios = ?`,
    [id],
  );
  const totalPlanes = Number((planes as Array<{ total: number }>)[0]?.total ?? 0);
  if (totalPlanes > 0) {
    throw errorConflicto(
      `"${actual.nombre}" tiene ${totalPlanes} plan(es) alimenticio(s) a su cargo. Deshabilita la cuenta en lugar de eliminarla.`,
    );
  }

  await pool.query('DELETE FROM usuarios WHERE id_usuarios = ?', [id]);
  return { nombre: actual.nombre };
}
