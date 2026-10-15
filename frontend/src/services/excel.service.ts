import ExcelJS from 'exceljs';

/* ============================================================
   EXCEL · Lectura y descarga de libros de Excel (.xlsx)

   - `leerArchivoExcel` convierte la primera hoja en filas de texto
     (las fechas se normalizan a AAAA-MM-DD) usando los encabezados
     de la plantilla; las columnas desconocidas se ignoran y se avisán.
   - `descargarExcel` genera y descarga un libro con encabezados.
   - Todos los errores se lanzan con mensajes amables en español:
     nunca debe llegar un error técnico a la pantalla.
   ============================================================ */

export interface ColumnaExcel {
  /** Clave interna en camelCase: coincide con los campos de la API */
  clave: string;
  /** Encabezado de la columna en el archivo */
  titulo: string;
  ancho?: number;
}

export interface ArchivoLeido {
  /** Filas de datos (la primera fila del archivo son los encabezados) */
  filas: Array<Record<string, string>>;
  /** Encabezados del archivo que no corresponden a ninguna columna esperada */
  desconocidas: string[];
}

/** Resultado de una fila procesada en una importación */
export interface FilaResultadoImportacion {
  /** Número de fila en el Excel (la 1 son los encabezados) */
  fila: number;
  estado: 'creado' | 'error';
  mensaje: string;
  /** Solo cuando el sistema generó la contraseña de la cuenta */
  contrasenaTemporal?: string;
}

/** Resultado global de una importación */
export interface ResultadoImportacion {
  creados: number;
  fallidos: number;
  resultados: FilaResultadoImportacion[];
}

/** Mismo límite que valida la API (`validaciones/importacion.validacion.ts`) */
export const LIMITE_FILAS = 200;

/** Máximo de tamaño de archivo aceptado */
const LIMITE_BYTES = 5 * 1024 * 1024;

/** "Número de Control" → "numerodecontrol" (para comparar encabezados) */
export function normalizarEncabezado(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

/** Convierte cualquier celda de Excel a texto manejable */
function textoDeCelda(valor: unknown): string {
  if (valor == null) return '';
  if (valor instanceof Date) {
    // Las fechas se normalizan a AAAA-MM-DD con la fecha local de la celda
    return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(
      valor.getDate(),
    ).padStart(2, '0')}`;
  }
  if (typeof valor === 'object') {
    const celda = valor as Record<string, unknown>;
    if (Array.isArray(celda['richText'])) {
      return (celda['richText'] as Array<{ text?: string }>).map((parte) => parte.text ?? '').join('');
    }
    if (celda['text'] != null) return String(celda['text']);
    if (celda['result'] != null) return textoDeCelda(celda['result']);
    return '';
  }
  return String(valor).trim();
}

/**
 * Lee la primera hoja de un archivo de Excel y devuelve sus filas,
 * indexadas por la clave de la columna esperada.
 */
export async function leerArchivoExcel(
  archivo: File,
  columnas: ColumnaExcel[],
): Promise<ArchivoLeido> {
  if (!/\.(xlsx|xlsm)$/i.test(archivo.name)) {
    throw new Error('El formato no es compatible. Usa un archivo de Excel (.xlsx).');
  }
  if (archivo.size > LIMITE_BYTES) {
    throw new Error('El archivo es muy grande (máximo 5 MB).');
  }

  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(await archivo.arrayBuffer());
  } catch {
    throw new Error('No se pudo leer el archivo. Asegúrate de que sea un libro de Excel válido (.xlsx).');
  }

  const hoja = libro.worksheets[0];
  if (!hoja) {
    throw new Error('El libro no tiene hojas de cálculo.');
  }

  // Primera fila: encabezados
  const encabezados: string[] = [];
  hoja.getRow(1).eachCell({ includeEmpty: true }, (celda, columna) => {
    encabezados[columna - 1] = textoDeCelda(celda.value);
  });
  if (!encabezados.some((texto) => texto)) {
    throw new Error('La primera fila debe contener los encabezados de las columnas.');
  }

  const porEncabezado = new Map<string, ColumnaExcel>();
  for (const columna of columnas) {
    porEncabezado.set(normalizarEncabezado(columna.titulo), columna);
  }

  const desconocidas = new Set<string>();
  encabezados.forEach((titulo) => {
    if (titulo && !porEncabezado.has(normalizarEncabezado(titulo))) desconocidas.add(titulo);
  });

  // Filas de datos (a partir de la 2)
  const filas: Array<Record<string, string>> = [];
  for (let numero = 2; numero <= hoja.rowCount; numero++) {
    const fila: Record<string, string> = {};
    let conDatos = false;

    hoja.getRow(numero).eachCell({ includeEmpty: true }, (celda, columna) => {
      const titulo = encabezados[columna - 1];
      const definida = titulo ? porEncabezado.get(normalizarEncabezado(titulo)) : undefined;
      if (!definida) return;
      const texto = textoDeCelda(celda.value);
      if (texto) conDatos = true;
      fila[definida.clave] = texto;
    });

    if (conDatos) filas.push(fila);
    if (filas.length > LIMITE_FILAS) {
      throw new Error(
        `El archivo tiene más de ${LIMITE_FILAS} filas de datos. Divide la importación en varios archivos.`,
      );
    }
  }

  if (filas.length === 0) {
    throw new Error('El archivo no tiene filas de datos (solo encabezados).');
  }

  return { filas, desconocidas: [...desconocidas] };
}

/** Nombre de archivo con la fecha de hoy, ej. "meditec-usuarios-2026-10-15" */
export function nombreArchivo(base: string): string {
  const hoy = new Date().toISOString().slice(0, 10);
  return `meditec-${base}-${hoy}`;
}

/** Genera y descarga un libro de Excel con los datos indicados */
export async function descargarExcel(
  nombre: string,
  columnas: ColumnaExcel[],
  filas: Array<Record<string, unknown>>,
): Promise<void> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Datos');

  hoja.columns = columnas.map((columna) => ({
    key: columna.clave,
    header: columna.titulo,
    width: columna.ancho ?? 26,
  }));
  hoja.getRow(1).font = { bold: true };
  for (const fila of filas) hoja.addRow(fila);

  const buffer = await libro.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${nombre}.xlsx`;
  enlace.click();
  URL.revokeObjectURL(url);
}

/**
 * Descarga el reporte de resultados de una importación (creados y errores).
 * `incluirContrasenas` agrega la columna de contraseñas temporales: solo se
 * usa para el alta de usuarios, y el archivo debe guardarse con cuidado.
 */
export async function descargarReporteImportacion(
  nombre: string,
  resultados: FilaResultadoImportacion[],
  incluirContrasenas = false,
): Promise<void> {
  const columnas: ColumnaExcel[] = [
    { clave: 'fila', titulo: 'Fila del archivo', ancho: 18 },
    { clave: 'estado', titulo: 'Estado', ancho: 14 },
    { clave: 'mensaje', titulo: 'Detalle', ancho: 60 },
  ];
  if (incluirContrasenas) {
    columnas.push({ clave: 'contrasenaTemporal', titulo: 'Contraseña temporal', ancho: 24 });
  }

  const filas = resultados.map((resultado) => ({
    fila: resultado.fila,
    estado: resultado.estado === 'creado' ? 'Creado' : 'Error',
    mensaje: resultado.mensaje,
    contrasenaTemporal: resultado.contrasenaTemporal ?? '',
  }));

  await descargarExcel(nombre, columnas, filas);
}
