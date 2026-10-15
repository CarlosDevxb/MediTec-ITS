import { errorValidacion, ErrorHttp } from '../utils/erroresHttp';
import { generarContrasenaTemporal } from '../utils/contrasenas';
import { buscarCatalogo } from '../config/catalogos';
import { listarValores, type ValorCatalogo } from './catalogos.service';
import { listarRoles } from './roles.service';
import { crearUsuario, type DatosUsuario } from './usuarios.service';
import { crearMedicamento } from './medicamentos.service';
import type { DatosFilaImportarUsuario } from '../validaciones/usuarios.validacion';
import type { DatosFilaImportarMedicamento } from '../validaciones/medicamentos.validacion';

/**
 * Capa de negocio de la importación masiva (alta desde archivos de Excel).
 *
 * No contiene SQL: reutiliza los servicios de usuarios y medicamentos, de modo
 * que las reglas (unificación de duplicados, fichas de personal, expedientes,
 * unidades de medida) son exactamente las mismas que en el alta manual.
 *
 * La importación es **por fila**: cada fila se crea por separado y sus errores
 * se reportan en su lugar, sin detener el resto del archivo.
 */

export interface ResultadoFilaImportacion {
  /** Número de fila en el Excel (la 1 son los encabezados) */
  fila: number;
  estado: 'creado' | 'error';
  mensaje: string;
  /** Solo cuando el sistema generó la contraseña (no venía en el archivo) */
  contrasenaTemporal?: string;
}

/** Mensaje amable de una fila fallida: nunca se filtran errores internos */
function mensajeDeFila(error: unknown): string {
  if (error instanceof ErrorHttp) return error.message;
  // El detalle técnico se registra en el servidor, no se envía al cliente
  console.error('[importacion] Error inesperado al crear un registro:', error);
  return 'No se pudo crear el registro por un error inesperado.';
}

/** Busca un valor de catálogo por nombre, tolerando mayúsculas y acentos */
function porNombre(lista: ValorCatalogo[], nombre: string): ValorCatalogo | undefined {
  const buscado = nombre.trim().toLowerCase();
  return lista.find(
    (valor) => valor.nombre.trim().toLowerCase() === buscado || valor.abreviatura?.toLowerCase() === buscado,
  );
}

/** Carga un catálogo completo (debe existir en `config/catalogos.ts`) */
async function valoresDeCatalogo(clave: string): Promise<ValorCatalogo[]> {
  const def = buscarCatalogo(clave);
  if (!def) return [];
  return listarValores(def);
}

/**
 * Crea las cuentas de usuario de un archivo importado.
 * `filas` ya pasó la validación de formato (Zod) en el controlador.
 */
export async function importarUsuarios(
  filas: Array<{ fila: number; datos: DatosFilaImportarUsuario }>,
): Promise<ResultadoFilaImportacion[]> {
  // Catálogos una sola vez: se resuelven los nombres del archivo a ids
  const roles = await listarRoles();
  const tiposPaciente = await valoresDeCatalogo('tipo_paciente');
  const carreras = await valoresDeCatalogo('carreras');

  const resultados: ResultadoFilaImportacion[] = [];

  for (const { fila, datos } of filas) {
    try {
      const rol = porNombre(roles, datos.rol);
      if (!rol) {
        throw errorValidacion(`El rol "${datos.rol}" no existe en el sistema.`, [
          { campo: 'rol', mensaje: 'Escribe el nombre de un rol registrado.' },
        ]);
      }

      let tipoPacienteId: number | undefined;
      if (datos.tipoPaciente?.trim()) {
        const tipo = porNombre(tiposPaciente, datos.tipoPaciente);
        if (!tipo) {
          throw errorValidacion(`El tipo de paciente "${datos.tipoPaciente}" no existe.`, [
            { campo: 'tipoPaciente', mensaje: 'Regístralo en Catálogos o corrige el nombre.' },
          ]);
        }
        tipoPacienteId = tipo.id;
      }

      let carreraId: number | undefined;
      if (datos.carrera?.trim()) {
        const carrera = porNombre(carreras, datos.carrera);
        if (!carrera) {
          throw errorValidacion(`La carrera "${datos.carrera}" no existe.`, [
            { campo: 'carrera', mensaje: 'Regístrala en Catálogos o corrige el nombre.' },
          ]);
        }
        carreraId = carrera.id;
      }

      // Sin contraseña en el archivo se genera una temporal y se reporta
      // una sola vez, para que se entregue a la persona
      const contrasenaPropia = datos.contrasena?.trim();
      const contrasena = contrasenaPropia || generarContrasenaTemporal();

      const usuario: DatosUsuario = {
        nombre: datos.nombre,
        numeroControl: datos.numeroControl,
        correo: datos.correo,
        telefono: datos.telefono?.trim() || undefined,
        fechaNacimiento: datos.fechaNacimiento,
        genero: datos.genero,
        rolId: rol.id,
        cedula: datos.cedula?.trim() || undefined,
        especialidad: datos.especialidad?.trim() || undefined,
        tipoPacienteId,
        carreraId,
      };

      const creado = await crearUsuario(usuario, contrasena);
      resultados.push({
        fila,
        estado: 'creado',
        mensaje: `Cuenta creada para ${creado.nombre} (${creado.numeroControl}).`,
        ...(contrasenaPropia ? {} : { contrasenaTemporal: contrasena }),
      });
    } catch (error) {
      resultados.push({ fila, estado: 'error', mensaje: mensajeDeFila(error) });
    }
  }

  return resultados;
}

/**
 * Crea los medicamentos de un archivo importado.
 * `filas` ya pasó la validación de formato (Zod) en el controlador.
 */
export async function importarMedicamentos(
  filas: Array<{ fila: number; datos: DatosFilaImportarMedicamento }>,
): Promise<ResultadoFilaImportacion[]> {
  const unidades = await valoresDeCatalogo('unidades_medida');
  const resultados: ResultadoFilaImportacion[] = [];

  for (const { fila, datos } of filas) {
    try {
      // La unidad llega como nombre (o abreviatura): se resuelve a su id
      const unidad = porNombre(unidades, datos.unidad);
      if (!unidad) {
        throw errorValidacion(`La unidad de medida "${datos.unidad}" no existe.`, [
          { campo: 'unidad', mensaje: 'Regístrala en Catálogos → Unidades de medida.' },
        ]);
      }

      const creado = await crearMedicamento({
        nombre: datos.nombre,
        unidadId: unidad.id,
        stock: datos.stock,
        descripcion: datos.descripcion,
      });
      resultados.push({
        fila,
        estado: 'creado',
        mensaje: `"${creado.nombre}" agregado al inventario (${creado.stock} ${creado.abreviatura || creado.unidad}).`,
      });
    } catch (error) {
      resultados.push({ fila, estado: 'error', mensaje: mensajeDeFila(error) });
    }
  }

  return resultados;
}
