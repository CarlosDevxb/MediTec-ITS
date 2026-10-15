import React, { useMemo, useState } from 'react';
import { Download, Upload, CircleAlert, Loader2, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Aviso from '../ui/Aviso';
import { useAviso } from '../ui/useAviso';
import Modal from '../ui/Modal';
import DataTable from '../ui/DataTable';
import StatCard from '../ui/StatCard';
import type { Column } from '../ui/DataTable';
import { Input } from '../ui/Input';
import { mensajeDeError } from '../../services/api';
import {
  descargarExcel,
  descargarReporteImportacion,
  leerArchivoExcel,
  nombreArchivo,
  type ArchivoLeido,
  type ResultadoImportacion,
} from '../../services/excel.service';

/* ============================================================
   IMPORTADOR DE EXCEL · Subpágina genérica de alta masiva

   Flujo: plantilla → archivo → vista previa con avisos previos →
   confirmación (modal) → resultados por fila, con reporte
   descargable. Todas las excepciones se muestran como avisos o
   estados gráficos: nunca un error técnico en pantalla.
   ============================================================ */

export interface ColumnaImportacion {
  /** Clave interna en camelCase (coincide con los campos de la API) */
  clave: string;
  /** Encabezado de la columna en el archivo */
  titulo: string;
  ancho?: number;
  /** Texto de ejemplo para la plantilla */
  ejemplo?: string;
  /** La columna no es obligatoria */
  opcional?: boolean;
}

export interface ImportadorExcelProps {
  titulo: string;
  descripcion: string;
  /** 'usuarios' o 'medicamentos': para textos y nombres de archivo */
  entidad: string;
  columnas: ColumnaImportacion[];
  /** Filas de ejemplo de la plantilla */
  plantilla: Array<Record<string, string>>;
  /** Validación en cliente: devuelve los avisos detectados de la fila */
  validarFila: (fila: Record<string, string>, indice: number, todas: Array<Record<string, string>>) => string[];
  /** Envía las filas a la API y devuelve el resultado por fila */
  onImportar: (filas: Array<Record<string, string>>) => Promise<ResultadoImportacion>;
  onCancelar: () => void;
  /** Vuelve a la lista (con los datos ya recargados) */
  onFinalizar: () => void;
  /** Muestra la columna de contraseñas temporales en el reporte */
  mostrarContrasenas?: boolean;
}

/** Filas que se enseñan en la vista previa */
const FILAS_VISTA_PREVIA = 10;

export default function ImportadorExcel({
  titulo,
  descripcion,
  entidad,
  columnas,
  plantilla,
  validarFila,
  onImportar,
  onCancelar,
  onFinalizar,
  mostrarContrasenas = false,
}: ImportadorExcelProps) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [datos, setDatos] = useState<ArchivoLeido | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState('');
  const [importando, setImportando] = useState(false);
  const [errorImportacion, setErrorImportacion] = useState('');
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const { aviso, tipo, mostrar, cerrar } = useAviso();

  const filas = datos?.filas ?? [];

  /* ---------- Avisos previos: se recalculan mientras se revisa ---------- */
  const avisosPorFila = useMemo(
    () => filas.map((fila, indice) => validarFila(fila, indice, filas)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [datos],
  );
  const filasConAviso = useMemo(
    () => avisosPorFila.filter((avisos) => avisos.length > 0).length,
    [avisosPorFila],
  );

  /* ---------- Lectura del archivo ---------- */
  const alSeleccionar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const elegido = e.target.files?.[0] ?? null;
    setArchivo(elegido);
    setDatos(null);
    setErrorArchivo('');
    if (!elegido) return;

    setLeyendo(true);
    try {
      const leido = await leerArchivoExcel(elegido, columnas);
      setDatos(leido);
    } catch (error) {
      // Mensaje amable del servicio de Excel (nunca un error técnico)
      setErrorArchivo(
        error instanceof Error ? error.message : 'No se pudo leer el archivo. Intenta de nuevo.',
      );
    } finally {
      setLeyendo(false);
    }
  };

  /* ---------- Importación ---------- */
  const ejecutarImportacion = async () => {
    setConfirmar(false);
    setImportando(true);
    setErrorImportacion('');
    try {
      const resumen = await onImportar(filas);
      setResultado(resumen);
      mostrar(
        resumen.fallidos === 0
          ? 'Importación terminada sin errores.'
          : `Importación terminada: ${resumen.creados} creados y ${resumen.fallidos} con errores.`,
        resumen.fallidos === 0 ? 'exito' : 'info',
      );
    } catch (error) {
      setErrorImportacion(mensajeDeError(error));
    } finally {
      setImportando(false);
    }
  };

  const descargarPlantilla = () =>
    descargarExcel(nombreArchivo(`plantilla-${entidad}`), columnas, plantilla).catch(() =>
      mostrar('No se pudo generar la plantilla. Intenta de nuevo.', 'error'),
    );

  const descargarReporte = () => {
    if (!resultado) return;
    descargarReporteImportacion(
      nombreArchivo(`reporte-importacion-${entidad}`),
      resultado.resultados,
      mostrarContrasenas,
    ).catch(() => mostrar('No se pudo generar el reporte. Intenta de nuevo.', 'error'));
  };

  /* ---------- Vista de resultados ---------- */
  if (resultado) {
    const temporales = resultado.resultados.filter((r) => r.contrasenaTemporal).length;

    const columnasResultado: Column<(typeof resultado.resultados)[number]>[] = [
      {
        key: 'fila',
        header: 'Fila',
        className: 'w-20 tabular-nums',
        render: (r) => r.fila,
      },
      {
        key: 'estado',
        header: 'Estado',
        className: 'w-32',
        render: (r) =>
          r.estado === 'creado' ? (
            <Badge status="confirmed">Creado</Badge>
          ) : (
            <Badge status="cancelled">Error</Badge>
          ),
      },
      { key: 'mensaje', header: 'Detalle' },
    ];
    if (mostrarContrasenas) {
      columnasResultado.push({
        key: 'contrasenaTemporal',
        header: 'Contraseña temporal',
        className: 'w-48',
        render: (r) =>
          r.contrasenaTemporal ? (
            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
              {r.contrasenaTemporal}
            </span>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      });
    }

    return (
      <div className="p-10 xl:p-12 max-w-6xl mx-auto font-sans">
        <PageHeader
          title="Resultado de la importación"
          subtitle={`${resultado.creados} creados · ${resultado.fallidos} con errores`}
        />

        {aviso && <Aviso mensaje={aviso} tipo={tipo} onCerrar={cerrar} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StatCard
            icon={CheckCircle2}
            label="Registros creados"
            value={resultado.creados}
            detail="ya están en el sistema"
            highlight={resultado.creados > 0}
          />
          <StatCard
            icon={CircleAlert}
            label="Filas con errores"
            value={resultado.fallidos}
            detail={
              resultado.fallidos > 0
                ? 'revisa el detalle y corrige el archivo'
                : 'todo se importó correctamente'
            }
            highlight={resultado.fallidos > 0}
          />
        </div>

        {mostrarContrasenas && temporales > 0 && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3.5 text-amber-900"
          >
            <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              Se generaron {temporales} contraseña(s) temporal(es). Guárdalas en un lugar seguro y
              entrégales a cada persona; también están en el reporte descargable.
            </p>
          </div>
        )}

        <DataTable
          columns={columnasResultado}
          rows={resultado.resultados}
          rowKey={(r) => r.fila}
          emptyMessage="No hay resultados que mostrar."
        />

        <div className="flex flex-wrap justify-end gap-4 pb-10 mt-8">
          <Button variant="secondary" icon={Download} onClick={descargarReporte}>
            Descargar reporte
          </Button>
          <Button icon={CheckCircle2} onClick={onFinalizar}>
            Finalizar
          </Button>
        </div>
      </div>
    );
  }

  /* ---------- Vista de importación ---------- */
  const filasVista = filas.slice(0, FILAS_VISTA_PREVIA).map((fila, i) => ({
    ...fila,
    __fila: i + 2,
  }));

  const columnasVista: Column<Record<string, string | number>>[] = [
    { key: '__fila', header: 'Fila', className: 'w-20 tabular-nums' },
    ...columnas.map((columna) => ({
      key: columna.clave,
      header: columna.titulo,
      render: (fila: Record<string, string | number>) =>
        fila[columna.clave] ? String(fila[columna.clave]) : <span className="text-gray-400">—</span>,
    })),
    {
      key: '__avisos',
      header: 'Avisos',
      render: (fila: Record<string, string | number>) => {
        const avisos = avisosPorFila[Number(fila['__fila']) - 2] ?? [];
        return avisos.length === 0 ? (
          <Badge status="confirmed">Listo</Badge>
        ) : (
          <span className="text-sm text-amber-800">{avisos.join(' ')}</span>
        );
      },
    },
  ];

  return (
    <div className="p-10 xl:p-12 max-w-6xl mx-auto font-sans">
      <PageHeader title={titulo} subtitle={descripcion} />

      {aviso && <Aviso mensaje={aviso} tipo={tipo} onCerrar={cerrar} />}

      <div className="space-y-6">
        {/* 1. Plantilla */}
        <Card title="1. Descarga la plantilla" icon={FileSpreadsheet}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-gray-600 max-w-2xl">
              La plantilla trae los encabezados correctos y un renglón de ejemplo.
              Las columnas marcadas como obligatorias deben traer datos en cada fila.
            </p>
            <Button variant="secondary" icon={Download} onClick={descargarPlantilla}>
              Descargar plantilla
            </Button>
          </div>
        </Card>

        {/* 2. Archivo */}
        <Card title="2. Selecciona el archivo" icon={Upload}>
          <Input
            type="file"
            accept=".xlsx,.xlsm"
            onChange={(e) => void alSeleccionar(e)}
            aria-label="Seleccionar archivo de Excel"
          />
          {leyendo && (
            <p className="mt-3 flex items-center gap-2 text-sm text-gray-600" role="status">
              <Loader2 size={16} className="animate-spin text-brand-600" aria-hidden="true" />
              Leyendo el archivo…
            </p>
          )}
          {errorArchivo && (
            <p
              role="alert"
              className="mt-3 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              {errorArchivo}
            </p>
          )}
          {datos && datos.desconocidas.length > 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              Se ignoraron estas columnas porque no forman parte de la plantilla:{' '}
              {datos.desconocidas.join(', ')}.
            </p>
          )}
        </Card>

        {/* 3. Vista previa */}
        {datos && (
          <Card title="3. Revisa la vista previa" icon={CheckCircle2}>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Badge status="confirmed">{filas.length} filas detectadas</Badge>
              {filasConAviso > 0 ? (
                <Badge status="pending">
                  {filasConAviso} con avisos que conviene corregir en el archivo
                </Badge>
              ) : (
                <Badge status="confirmed">Sin avisos de captura</Badge>
              )}
            </div>

            <DataTable
              columns={columnasVista}
              rows={filasVista}
              rowKey={(fila) => Number(fila['__fila'])}
              emptyMessage="No hay filas que mostrar."
            />

            {filas.length > FILAS_VISTA_PREVIA && (
              <p className="text-sm text-gray-500 mt-4">
                Mostrando las primeras {FILAS_VISTA_PREVIA} de {filas.length} filas.
              </p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              Los avisos son orientación previa: el sistema vuelve a validar cada fila al importar
              y el resultado final aparecerá fila por fila.
            </p>
          </Card>
        )}

        {errorImportacion && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            {errorImportacion}
          </div>
        )}

        <div className="flex justify-end gap-4 pb-10">
          <Button variant="secondary" onClick={onCancelar} disabled={importando}>
            Cancelar
          </Button>
          <Button
            icon={Upload}
            onClick={() => setConfirmar(true)}
            disabled={!datos || filas.length === 0 || importando}
            loading={importando}
          >
            Importar {filas.length > 0 ? `${filas.length} filas` : ''}
          </Button>
        </div>
      </div>

      {/* Confirmación antes de importar */}
      {confirmar && (
        <Modal
          titulo={`¿Importar ${filas.length} filas?`}
          descripcion={`Se crearán los registros válidos del archivo de ${entidad}. Cada fila se
            revisará de nuevo y los resultados se mostrarán al final.`}
          icono={CircleAlert}
          onCerrar={() => setConfirmar(false)}
          acciones={
            <>
              <Button variant="secondary" onClick={() => setConfirmar(false)}>
                Cancelar
              </Button>
              <Button icon={Upload} onClick={() => void ejecutarImportacion()}>
                Sí, importar
              </Button>
            </>
          }
        >
          <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            {filasConAviso > 0
              ? `${filasConAviso} fila(s) tienen avisos previos; esas filas pueden fallar y quedarán
                 detalladas en el reporte de resultados.`
              : 'No se detectaron avisos de captura en la vista previa.'}
          </p>
        </Modal>
      )}
    </div>
  );
}
