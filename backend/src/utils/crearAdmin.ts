import pool from '../db/pool';
import { hashearContrasena, generarContrasenaTemporal } from './contrasenas';
import { ROLES_BASE } from '../config/roles';

/* ============================================================
   UTILIDAD · crearAdmin.ts
   Bootstrap de datos iniciales: da de alta (o actualiza) al
   usuario administrador, asegura los roles base del sistema y
   siembra los tipos de paciente mínimos para poder abrir
   expedientes. Idempotente: puede ejecutarse tantas veces como
   sea necesario.

   Única excepción a la regla "ningún dato de negocio entra por
   SQL directo": estos valores son la semilla inicial del sistema
   (roles, tipos de paciente y primer administrador). Todo lo
   demás se capta desde la interfaz.

   Uso:
     npm run crear:admin
     npm run crear:admin -- --contrasena='MiClave*2026'
     npm run crear:admin -- --nombre='Ana Pérez' --correo=ana@meditec.mx \
                          --numero-control=AD-0002 --genero=Femenino

   Sin --contrasena (ni ADMIN_CONTRASENA) se genera una segura y
   se muestra una sola vez en consola. Si el administrador ya
   existe, su contraseña se conserva salvo que se pida otra.
   ============================================================ */

/** Roles que todo el sistema necesita para funcionar (ver config/roles.ts) */

/**
 * Tipos de paciente iniciales del catálogo `cat_tipo_paciente`.
 * 'Alumno' es el que exige carrera (ver `config/roles.ts`); los demás
 * valores se ajustan desde la sección Catálogos del panel de administración.
 */
const TIPOS_PACIENTE_INICIALES = ['Alumno', 'Docente', 'Administrativo'] as const;

const GENEROS = ['Masculino', 'Femenino', 'Otro'] as const;

/** Lee --clave=valor de la línea de comandos */
function leerArgumentos(): Record<string, string> {
  const opciones: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const coincidencia = arg.match(/^--([^=]+)=(.*)$/);
    if (coincidencia?.[1]) opciones[coincidencia[1].toLowerCase()] = coincidencia[2] ?? '';
  }
  return opciones;
}

/** Contraseña aleatoria segura para cuando no se proporciona una (ver utils/contrasenas.ts) */
const generarContrasena = generarContrasenaTemporal;

async function asegurarRoles(): Promise<Map<string, number>> {
  const ids = new Map<string, number>();

  for (const rol of ROLES_BASE) {
    const [filas] = await pool.query('SELECT id_rol FROM roles WHERE nombre = ? LIMIT 1', [
      rol.nombre,
    ]);
    const existente = (filas as Array<{ id_rol: number }>)[0];

    if (existente) {
      ids.set(rol.nombre, Number(existente.id_rol));
      continue;
    }

    const [resultado] = await pool.query(
      'INSERT INTO roles (nombre, descripcion) VALUES (?, ?)',
      [rol.nombre, rol.descripcion]
    );
    ids.set(rol.nombre, Number((resultado as { insertId: number }).insertId));
    console.log(`[crearAdmin] Rol creado: ${rol.nombre}`);
  }

  return ids;
}

/** Siembra los tipos de paciente mínimos del catálogo (idempotente) */
async function asegurarTiposPaciente(): Promise<void> {
  for (const nombre of TIPOS_PACIENTE_INICIALES) {
    const [filas] = await pool.query(
      'SELECT id_tipo FROM cat_tipo_paciente WHERE nombre = ? LIMIT 1',
      [nombre],
    );
    if ((filas as Array<{ id_tipo: number }>)[0]) continue;

    await pool.query('INSERT INTO cat_tipo_paciente (nombre) VALUES (?)', [nombre]);
    console.log(`[crearAdmin] Tipo de paciente creado: ${nombre}`);
  }
}

async function main() {
  const opciones = leerArgumentos();

  const numeroControl = opciones['numero-control'] ?? process.env.ADMIN_NUMERO_CONTROL ?? 'AD-0001';
  const nombre = opciones['nombre'] ?? process.env.ADMIN_NOMBRE ?? 'Administrador';
  const correo = opciones['correo'] ?? process.env.ADMIN_CORREO ?? 'admin@meditec.mx';
  const fechaNacimiento = opciones['fecha-nacimiento'] ?? process.env.ADMIN_FECHA_NACIMIENTO ?? '1985-01-01';
  const genero = (opciones['genero'] ?? process.env.ADMIN_GENERO ?? 'Otro') as (typeof GENEROS)[number];
  const contrasenaPropia = opciones['contrasena'] ?? process.env.ADMIN_CONTRASENA;

  // ---- Validaciones ----
  if (!GENEROS.includes(genero)) {
    console.error(`[crearAdmin] Género inválido: "${genero}". Usa uno de: ${GENEROS.join(', ')}`);
    process.exit(1);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) {
    console.error('[crearAdmin] La fecha de nacimiento debe tener formato AAAA-MM-DD.');
    process.exit(1);
  }
  if (contrasenaPropia && contrasenaPropia.length < 8) {
    console.error('[crearAdmin] La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  const contrasenaGenerada = !contrasenaPropia;
  const contrasena = contrasenaPropia ?? generarContrasena();
  try {
    // ---- 1) Roles base y tipos de paciente ----
    const roles = await asegurarRoles();
    await asegurarTiposPaciente();
    const idRolAdmin = roles.get('Administrador');
    if (!idRolAdmin) throw new Error('No se pudo determinar el rol Administrador.');

    // ---- 2) Alta o actualización del usuario administrador ----
    const [filas] = await pool.query(
      'SELECT id_usuarios FROM usuarios WHERE numero_control = ? LIMIT 1',
      [numeroControl]
    );
    const existente = (filas as Array<{ id_usuarios: number }>)[0];

    if (existente) {
      // Sin --contrasena se conserva la que ya tiene: el bootstrap debe poder
      // re-ejecutarse sin romper el acceso de quien ya usa el sistema.
      if (contrasenaGenerada) {
        await pool.query(
          `UPDATE usuarios
              SET roles_id_rol = ?, nombre = ?, correo = ?,
                  fecha_nacimiento = ?, genero = ?, estatus = 1
            WHERE id_usuarios = ?`,
          [idRolAdmin, nombre, correo, fechaNacimiento, genero, existente.id_usuarios]
        );
        console.log(`[crearAdmin] Usuario actualizado: ${nombre} (${numeroControl})`);
        console.log('[crearAdmin] Contraseña: se conserva la actual (usa --contrasena para cambiarla).');
      } else {
        const hash = await hashearContrasena(contrasena);
        await pool.query(
          `UPDATE usuarios
              SET roles_id_rol = ?, nombre = ?, correo = ?, contrasena = ?,
                  fecha_nacimiento = ?, genero = ?, estatus = 1
            WHERE id_usuarios = ?`,
          [idRolAdmin, nombre, correo, hash, fechaNacimiento, genero, existente.id_usuarios]
        );
        console.log(`[crearAdmin] Usuario actualizado: ${nombre} (${numeroControl})`);
        console.log('[crearAdmin] Contraseña: la que proporcionaste.');
      }
    } else {
      const hash = await hashearContrasena(contrasena);
      await pool.query(
        `INSERT INTO usuarios
           (roles_id_rol, numero_control, nombre, correo, contrasena, fecha_nacimiento, genero, estatus)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [idRolAdmin, numeroControl, nombre, correo, hash, fechaNacimiento, genero]
      );
      console.log(`[crearAdmin] Usuario creado: ${nombre} (${numeroControl})`);
      console.log(`[crearAdmin] Rol: Administrador · Correo: ${correo}`);
      if (contrasenaGenerada) {
        console.log('');
        console.log('[crearAdmin] Contraseña generada (guárdala ahora, no se volverá a mostrar):');
        console.log(`             ${contrasena}`);
      } else {
        console.log('[crearAdmin] Contraseña: la que proporcionaste.');
      }
    }
  } catch (error) {
    console.error('[crearAdmin] Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
