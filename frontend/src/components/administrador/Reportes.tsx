import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Users,
  Pill,
  Clock,
  Stethoscope,
  Download,
} from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import StatCard from '../ui/StatCard';
import EstadoVista from '../ui/EstadoVista';
import { Input, Select } from '../ui/Input';
import { mensajeDeError } from '../../services/api';
import { listarRoles, type Rol } from '../../services/administracion.service';
import {
  listarMedicamentos,
  listarHorarios,
  DIAS_SEMANA,
  type Medicamento,
  type Horario,
} from '../../services/operacion.service';
import {
  listarConsultas,
  fechaCorta,
  hoyISO,
  type ConsultaResumen,
} from '../../services/atencion.service';
import { generarReportePDF, type ReportePDF } from './reportesPdf';

/* ============================================================
   VISTA: REPORTES · Selector de reportes predeterminados
   Elige un reporte y el panel muestra su visualización.

   Usuarios, inventario, horarios y actividad se leen de MySQL
   (las mismas fuentes que las secciones del sistema). El reporte
   de actividad admite un periodo y lo muestra en el PDF.
   ============================================================ */

type TipoReporte = 'actividad' | 'usuarios' | 'inventario' | 'horarios';

interface ReporteDef {
  nombre: string;
  descripcion: string;
}

const REPORTES: Record<TipoReporte, ReporteDef> = {
  actividad: {
    nombre: 'Actividad de la enfermería',
    descripcion: 'Consultas registradas y diagnósticos más frecuentes en el periodo',
  },
  usuarios: {
    nombre: 'Usuarios por rol',
    descripcion: 'Distribución de cuentas por cada rol del sistema',
  },
  inventario: {
    nombre: 'Inventario de medicamentos',
    descripcion: 'Existencias por medicamento y alertas de stock bajo',
  },
  horarios: {
    nombre: 'Carga de horarios',
    descripcion: 'Horas asignadas al personal de la clínica por día',
  },
};

/* ---------------- Constantes de los reportes ---------------- */

const STOCK_BAJO = 10;

/** Horas de un turno "08:00" – "14:00" → 6 */
const horasDe = (inicio: string, fin: string): number => {
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  return (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
};

/* ---------------- Barra horizontal reutilizable ---------------- */
function Barra({
  etiqueta,
  valor,
  max,
  tono = 'brand',
  formato = (v: number) => String(v),
}: {
  etiqueta: string;
  valor: number;
  max: number;
  tono?: 'brand' | 'alerta';
  formato?: (v: number) => string;
}) {
  return (
    <li>
      <div className="flex justify-between items-baseline gap-3 mb-1.5">
        <span className="text-base text-gray-800 truncate">{etiqueta}</span>
        <span className="text-base tabular-nums text-gray-500 shrink-0">{formato(valor)}</span>
      </div>
      <div className="h-2 bg-brand-50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${tono === 'alerta' ? 'bg-amber-500' : 'bg-brand-700'}`}
          style={{ width: `${Math.max(2, Math.round((valor / max) * 100))}%` }}
        />
      </div>
    </li>
  );
}

/* ============================================================ */

export default function Reportes() {
  const [reporte, setReporte] = useState<TipoReporte>('actividad');
  /** Todo lo que se grafica se lee de la API: roles, inventario y horarios */
  const [roles, setRoles] = useState<Rol[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [consultas, setConsultas] = useState<ConsultaResumen[]>([]);
  /** Periodo del reporte de actividad (por defecto, los últimos 6 meses) */
  const [desde, setDesde] = useState(() => {
    const fecha = new Date();
    fecha.setMonth(fecha.getMonth() - 6);
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [hasta, setHasta] = useState(() => hoyISO());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [listaRoles, listaMedicamentos, listaHorarios, listaConsultas] = await Promise.all([
        listarRoles(),
        listarMedicamentos(),
        listarHorarios(),
        listarConsultas(),
      ]);
      setRoles(listaRoles);
      setMedicamentos(listaMedicamentos);
      setHorarios(listaHorarios);
      setConsultas(listaConsultas);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const mesActual = new Date()
    .toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase());

  /* ---- Datos calculados (todos sobre información real) ---- */
  const totalCuentas = roles.reduce((suma, rol) => suma + rol.usuarios, 0);
  const maxUsuarios = Math.max(...roles.map((rol) => rol.usuarios), 1);
  const maxStock = Math.max(...medicamentos.map((m) => m.stock), 1);
  const medicamentosBajos = medicamentos.filter((m) => m.disponible && m.stock <= STOCK_BAJO).length;
  const medicamentosAgotados = medicamentos.filter((m) => !m.disponible).length;

  const horasPorDia = DIAS_SEMANA.map((dia, indice) => ({
    dia,
    horas: horarios
      .filter((h) => h.diaSemana === indice + 1)
      .reduce((suma, h) => suma + horasDe(h.horaInicio, h.horaFin), 0),
  })).filter((d) => d.horas > 0);
  const maxHoras = Math.max(...horasPorDia.map((d) => d.horas), 1);
  const totalHoras = horasPorDia.reduce((suma, d) => suma + d.horas, 0);
  const personalConHorario = new Set(horarios.map((h) => h.personalMedicoId)).size;

  /* ---- Actividad: consultas dentro del periodo seleccionado ---- */
  // El periodo se ordena por si se capturó al revés
  const inicio = desde <= hasta ? desde : hasta;
  const fin = desde <= hasta ? hasta : desde;

  const consultasPeriodo = useMemo(
    () =>
      consultas.filter((consulta) => {
        const fecha = consulta.fechaHora.slice(0, 10);
        return fecha >= inicio && fecha <= fin;
      }),
    [consultas, inicio, fin],
  );

  /** Meses del periodo con su conteo (incluye los meses en cero) */
  const consultasPorMes = useMemo(() => {
    const meses: Array<{ clave: string; mes: string; valor: number }> = [];
    const [anioInicio, mesInicio] = inicio.split('-').map(Number);
    const [anioFin, mesFin] = fin.split('-').map(Number);
    const cursor = new Date(anioInicio, mesInicio - 1, 1);
    const limite = new Date(anioFin, mesFin - 1, 1);
    while (cursor <= limite && meses.length < 24) {
      meses.push({
        clave: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
        mes: cursor.toLocaleDateString('es-MX', { month: 'short' }).replace('.', ''),
        valor: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    for (const consulta of consultasPeriodo) {
      const registro = meses.find((m) => m.clave === consulta.fechaHora.slice(0, 7));
      if (registro) registro.valor += 1;
    }
    return meses;
  }, [consultasPeriodo, inicio, fin]);

  const maxConsultas = Math.max(...consultasPorMes.map((m) => m.valor), 1);

  /** Diagnósticos más frecuentes del periodo (top 5) */
  const diagnosticosFrecuentes = useMemo(() => {
    const conteos = new Map<string, { nombre: string; casos: number }>();
    for (const consulta of consultasPeriodo) {
      const clave = consulta.diagnostico.trim().toLowerCase();
      if (!clave) continue;
      const existente = conteos.get(clave);
      if (existente) existente.casos += 1;
      else conteos.set(clave, { nombre: consulta.diagnostico.trim(), casos: 1 });
    }
    return [...conteos.values()].sort((a, b) => b.casos - a.casos).slice(0, 5);
  }, [consultasPeriodo]);

  /** Etiqueta del periodo para la interfaz y el PDF */
  const periodoTexto = `${fechaCorta(inicio)} – ${fechaCorta(fin)}`;

  /* ---- Contenido del PDF según el reporte elegido ---- */
  const resumenPDF =
    reporte === 'usuarios'
      ? [
          `Cuentas registradas: ${totalCuentas}`,
          `Roles con cuentas: ${roles.filter((rol) => rol.usuarios > 0).length} de ${roles.length}`,
          `Rol con más cuentas: ${
            roles.reduce((mayor, rol) => (rol.usuarios > (mayor?.usuarios ?? 0) ? rol : mayor), roles[0])
              ?.nombre ?? '—'
          }`,
        ]
      : reporte === 'inventario'
        ? [
            `Medicamentos en inventario: ${medicamentos.length}`,
            `Con stock bajo (≤ ${STOCK_BAJO}): ${medicamentosBajos}`,
            `Agotados (no disponibles para consultas): ${medicamentosAgotados}`,
          ]
        : reporte === 'horarios'
          ? [
              `Turnos a la semana: ${horarios.length}`,
              `Horas programadas: ${totalHoras}`,
              `Personal con horario: ${personalConHorario}`,
            ]
          : [
              `Consultas registradas en el periodo: ${consultasPeriodo.length}`,
              `Promedio mensual: ${(
                consultasPeriodo.length / Math.max(1, consultasPorMes.length)
              ).toFixed(1)} consultas`,
              diagnosticosFrecuentes[0]
                ? `Diagnóstico más frecuente: ${diagnosticosFrecuentes[0].nombre} (${diagnosticosFrecuentes[0].casos} caso${diagnosticosFrecuentes[0].casos === 1 ? '' : 's'})`
                : 'Sin diagnósticos registrados en el periodo',
              `Personal que atendió: ${
                new Set(consultasPeriodo.map((consulta) => consulta.personal.id)).size
              }`,
            ];

  const construirPDF = (): ReportePDF => {
    switch (reporte) {
      case 'usuarios':
        return {
          nombre: REPORTES.usuarios.nombre,
          resumen: resumenPDF,
          secciones: [
            {
              titulo: 'Cuentas por rol',
              items: roles.map((rol) => ({
                etiqueta: rol.nombre,
                valor: `${rol.usuarios} cuenta${rol.usuarios === 1 ? '' : 's'}`,
                proporcion: rol.usuarios / maxUsuarios,
              })),
            },
          ],
        };

      case 'inventario':
        return {
          nombre: REPORTES.inventario.nombre,
          resumen: resumenPDF,
          secciones: [
            {
              titulo: 'Existencias por medicamento',
              items: medicamentos.map((m) => ({
                etiqueta: m.nombre,
                valor: `${m.stock} ${m.unidad}${
                  !m.disponible ? ' - AGOTADO' : m.stock <= STOCK_BAJO ? ' - STOCK BAJO' : ''
                }`,
                proporcion: m.stock / maxStock,
                alerta: !m.disponible || m.stock <= STOCK_BAJO,
              })),
            },
          ],
        };

      case 'horarios':
        return {
          nombre: REPORTES.horarios.nombre,
          resumen: resumenPDF,
          secciones: [
            {
              titulo: 'Horas asignadas por dia',
              items: horasPorDia.map((d) => ({
                etiqueta: d.dia,
                valor: `${d.horas} h`,
                proporcion: d.horas / maxHoras,
              })),
            },
          ],
        };

      default:
        return {
          nombre: REPORTES.actividad.nombre,
          periodo: periodoTexto,
          resumen: resumenPDF,
          secciones: [
            {
              titulo: 'Consultas por mes',
              items: consultasPorMes.map((dato) => ({
                etiqueta: dato.mes,
                valor: `${dato.valor}`,
                proporcion: dato.valor / maxConsultas,
              })),
            },
            {
              titulo: 'Diagnósticos frecuentes',
              items: diagnosticosFrecuentes.map((diagnostico) => ({
                etiqueta: diagnostico.nombre,
                valor: `${diagnostico.casos} caso${diagnostico.casos === 1 ? '' : 's'}`,
                proporcion: diagnostico.casos / (diagnosticosFrecuentes[0]?.casos || 1),
              })),
            },
          ],
        };
    }
  };

  const descargarPDF = () =>
    generarReportePDF(
      reporte === 'actividad'
        ? `meditec-reporte-${reporte}-${inicio}_a_${fin}`
        : `meditec-reporte-${reporte}`,
      construirPDF(),
    );

  return (
    <div className="p-10 xl:p-12 max-w-7xl mx-auto font-sans">
      <PageHeader
        title="Reportes"
        subtitle={REPORTES[reporte].descripcion}
        meta={
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-lg">
              {mesActual}
            </div>
            <Select
              value={reporte}
              onChange={(e) => setReporte(e.target.value as TipoReporte)}
              className="w-72"
              aria-label="Selecciona un reporte"
            >
              {(Object.keys(REPORTES) as TipoReporte[]).map((clave) => (
                <option key={clave} value={clave}>
                  {REPORTES[clave].nombre}
                </option>
              ))}
            </Select>
            {reporte === 'actividad' && (
              <div className="flex items-center gap-2">
                <label htmlFor="periodo-desde" className="text-sm text-gray-500">
                  Del
                </label>
                <Input
                  id="periodo-desde"
                  type="date"
                  value={desde}
                  max={hasta}
                  onChange={(e) => setDesde(e.target.value)}
                  className="w-44"
                />
                <label htmlFor="periodo-hasta" className="text-sm text-gray-500">
                  al
                </label>
                <Input
                  id="periodo-hasta"
                  type="date"
                  value={hasta}
                  min={desde}
                  onChange={(e) => setHasta(e.target.value)}
                  className="w-44"
                />
              </div>
            )}
            <Button icon={Download} onClick={descargarPDF}>
              Descargar PDF
            </Button>
          </div>
        }
      />

      <EstadoVista cargando={cargando} error={error} onReintentar={() => void cargar()}>
        <>
          {/* Panel único de indicadores (información real del sistema) */}
          <div className="bg-white rounded-2xl border border-gray-200 grid grid-cols-1 md:grid-cols-3 divide-y divide-gray-100 md:divide-y-0 md:divide-x mb-8">
            <StatCard
              variant="band"
              icon={Users}
              label="Cuentas registradas"
              value={totalCuentas}
              detail={`${roles.length} roles en el sistema`}
            />
            <StatCard
              variant="band"
              icon={Pill}
              label="Medicamentos"
              value={medicamentos.length}
              detail={
                medicamentosAgotados > 0
                  ? `${medicamentosAgotados} agotados`
                  : 'inventario sin faltantes'
              }
              highlight={medicamentosAgotados > 0}
            />
            <StatCard
              variant="band"
              icon={Clock}
              label="Turnos a la semana"
              value={horarios.length}
              detail={`${totalHoras} horas programadas`}
            />
          </div>

      {/* ============ REPORTES PREDETERMINADOS ============ */}

      {/* 1. Actividad de la enfermería (consultas del periodo) */}
      {reporte === 'actividad' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card
              title="Consultas por mes"
              icon={Activity}
              description={`${periodoTexto} · ${consultasPeriodo.length} consultas registradas`}
            >
              {consultasPorMes.some((dato) => dato.valor > 0) ? (
                <div className="flex items-end gap-3 sm:gap-5 pt-4">
                  {consultasPorMes.map((dato) => (
                    <div key={dato.clave} className="flex-1 flex flex-col items-center gap-2">
                      <span
                        className={`text-xs tabular-nums ${
                          dato.valor > 0 ? 'text-brand-800 font-semibold' : 'text-gray-400'
                        }`}
                      >
                        {dato.valor}
                      </span>
                      <div
                        className={`w-full rounded-t-md ${
                          dato.valor > 0 ? 'bg-brand-800' : 'bg-brand-100'
                        }`}
                        style={{
                          height: `${Math.max(
                            dato.valor > 0 ? 6 : 2,
                            Math.round((dato.valor / maxConsultas) * 140),
                          )}px`,
                        }}
                        role="img"
                        aria-label={`${dato.mes}: ${dato.valor} consultas`}
                      />
                      <span className="text-xs text-gray-500 capitalize">{dato.mes}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-10 text-center text-gray-500">
                  Sin consultas registradas en el periodo seleccionado.
                </p>
              )}
            </Card>
          </div>

          <div>
            <Card title="Diagnósticos frecuentes" icon={Stethoscope} description="Top 5 del periodo">
              {diagnosticosFrecuentes.length > 0 ? (
                <ul className="space-y-5 pt-2">
                  {diagnosticosFrecuentes.map((diagnostico) => (
                    <Barra
                      key={diagnostico.nombre}
                      etiqueta={diagnostico.nombre}
                      valor={diagnostico.casos}
                      max={diagnosticosFrecuentes[0].casos}
                      formato={(v) => `${v} caso${v === 1 ? '' : 's'}`}
                    />
                  ))}
                </ul>
              ) : (
                <p className="py-10 text-center text-gray-500">
                  Sin diagnósticos registrados en el periodo seleccionado.
                </p>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* 2. Usuarios por rol */}
      {reporte === 'usuarios' && (
        <Card
          title="Cuentas por rol"
          icon={Users}
          description={`${roles.reduce((suma, rol) => suma + rol.usuarios, 0)} cuentas registradas en el sistema`}
        >
          <ul className="space-y-5 pt-2">
            {roles.map((rol) => (
              <Barra
                key={rol.id}
                etiqueta={rol.nombre}
                valor={rol.usuarios}
                max={maxUsuarios}
                formato={(v) => `${v} cuenta${v === 1 ? '' : 's'}`}
              />
            ))}
          </ul>
        </Card>
      )}

      {/* 3. Inventario de medicamentos */}
      {reporte === 'inventario' && (
        <Card
          title="Existencias por medicamento"
          icon={Pill}
          description={
            medicamentosBajos > 0
              ? `${medicamentosBajos} medicamento${medicamentosBajos === 1 ? '' : 's'} con stock bajo (≤ ${STOCK_BAJO})`
              : 'Todos los medicamentos por encima del mínimo'
          }
        >
          <ul className="space-y-5 pt-2">
            {medicamentos.map((medicamento) => (
              <Barra
                key={medicamento.id}
                etiqueta={medicamento.nombre}
                valor={medicamento.stock}
                max={maxStock}
                tono={!medicamento.disponible || medicamento.stock <= STOCK_BAJO ? 'alerta' : 'brand'}
                formato={(v) =>
                  `${v} ${medicamento.unidad}${!medicamento.disponible ? ' · agotado' : ''}`
                }
              />
            ))}
          </ul>
        </Card>
      )}

      {/* 4. Carga de horarios */}
      {reporte === 'horarios' && (
        <Card
          title="Horas asignadas por día"
          icon={Clock}
          description={`${horasPorDia.reduce((suma, d) => suma + d.horas, 0)} horas en la semana`}
        >
          <ul className="space-y-5 pt-2">
            {horasPorDia.map((dia) => (
              <Barra
                key={dia.dia}
                etiqueta={dia.dia}
                valor={dia.horas}
                max={maxHoras}
                formato={(v) => `${v} h`}
              />
            ))}
          </ul>
        </Card>
      )}
        </>
      </EstadoVista>
    </div>
  );
}
