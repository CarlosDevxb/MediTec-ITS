import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Users,
  Pill,
  Clock,
  Stethoscope,
  Download,
  CircleAlert,
} from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Card from '../ui/Card';
import Button from '../ui/Button';
import StatCard from '../ui/StatCard';
import EstadoVista from '../ui/EstadoVista';
import { Select } from '../ui/Input';
import { mensajeDeError } from '../../services/api';
import { listarRoles, type Rol } from '../../services/administracion.service';
import {
  listarMedicamentos,
  listarHorarios,
  DIAS_SEMANA,
  type Medicamento,
  type Horario,
} from '../../services/operacion.service';
import { generarReportePDF, type ReportePDF } from './reportesPdf';

/* ============================================================
   VISTA: REPORTES · Selector de reportes predeterminados
   Elige un reporte y el panel muestra su visualización.

   Usuarios, inventario y horarios se leen de MySQL (las mismas
   fuentes que las secciones de administración). El reporte de
   actividad sigue con datos de demostración hasta que exista el
   módulo de consultas.
   ============================================================ */

type TipoReporte = 'actividad' | 'usuarios' | 'inventario' | 'horarios';

interface ReporteDef {
  nombre: string;
  descripcion: string;
}

const REPORTES: Record<TipoReporte, ReporteDef> = {
  actividad: {
    nombre: 'Actividad de la clínica',
    descripcion: 'Consultas por mes y diagnósticos más frecuentes',
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

/* ---------------- Datos de los reportes ---------------- */

/** Consultas por mes (los últimos 6 meses) */
const CONSULTAS_MES = [
  { mes: 'Abr', valor: 96 },
  { mes: 'May', valor: 112 },
  { mes: 'Jun', valor: 104 },
  { mes: 'Jul', valor: 130 },
  { mes: 'Ago', valor: 121 },
  { mes: 'Sep', valor: 142 },
];

/** Diagnósticos más registrados del mes */
const DIAGNOSTICOS = [
  { nombre: 'Faringitis aguda', casos: 38 },
  { nombre: 'Gripe influenza', casos: 27 },
  { nombre: 'Hipertensión leve', casos: 19 },
  { nombre: 'Diabetes tipo 2', casos: 14 },
  { nombre: 'Ansiedad', casos: 9 },
];

const MAX_CONSULTAS = 150;
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
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [listaRoles, listaMedicamentos, listaHorarios] = await Promise.all([
        listarRoles(),
        listarMedicamentos(),
        listarHorarios(),
      ]);
      setRoles(listaRoles);
      setMedicamentos(listaMedicamentos);
      setHorarios(listaHorarios);
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

  /* ---- Contenido del PDF según el reporte elegido ---- */
  // El reporte de actividad es el único con datos de demostración:
  // falta el módulo de consultas para calcularlo con información real
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
              'Consultas este mes: 142  (+18% vs. agosto)',
              'Citas completadas: 89 de 104 agendadas',
              'Pacientes nuevos en el mes: 23',
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
          resumen: resumenPDF,
          secciones: [
            {
              titulo: 'Consultas por mes',
              items: CONSULTAS_MES.map((d) => ({
                etiqueta: d.mes,
                valor: String(d.valor),
                proporcion: d.valor / MAX_CONSULTAS,
              })),
            },
            {
              titulo: 'Diagnosticos frecuentes',
              items: DIAGNOSTICOS.map((d) => ({
                etiqueta: d.nombre,
                valor: `${d.casos} casos`,
                proporcion: d.casos / DIAGNOSTICOS[0].casos,
              })),
            },
          ],
        };
    }
  };

  const descargarPDF = () =>
    generarReportePDF(`meditec-reporte-${reporte}`, construirPDF());

  return (
    <div className="p-10 xl:p-12 max-w-7xl mx-auto font-sans">
      <PageHeader
        title="Reportes"
        subtitle={REPORTES[reporte].descripcion}
        meta={
          <div className="flex items-center gap-3">
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

      {/* 1. Actividad de la clínica (datos de demostración) */}
      {reporte === 'actividad' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card
              title="Consultas por mes"
              icon={Activity}
              description="Abril – septiembre · el mes en curso se resalta"
            >
              <p className="mb-4 flex items-start gap-2.5 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                Datos de demostración: el módulo de consultas todavía no está conectado,
                así que estos números son de ejemplo.
              </p>
              <div className="flex items-end gap-3 sm:gap-5 pt-4">
                {CONSULTAS_MES.map((dato, i) => {
                  const esActual = i === CONSULTAS_MES.length - 1;
                  return (
                    <div key={dato.mes} className="flex-1 flex flex-col items-center gap-2">
                      <span
                        className={`text-xs tabular-nums ${
                          esActual ? 'text-brand-800 font-semibold' : 'text-gray-500'
                        }`}
                      >
                        {dato.valor}
                      </span>
                      <div
                        className={`w-full rounded-t-md ${
                          esActual ? 'bg-brand-800' : 'bg-brand-400/60'
                        }`}
                        style={{ height: `${Math.round((dato.valor / MAX_CONSULTAS) * 140)}px` }}
                        role="img"
                        aria-label={`${dato.mes}: ${dato.valor} consultas`}
                      />
                      <span
                        className={`text-xs ${
                          esActual ? 'text-gray-900 font-semibold' : 'text-gray-500'
                        }`}
                      >
                        {dato.mes}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <div>
            <Card title="Diagnósticos frecuentes" icon={Stethoscope}>
              <ul className="space-y-5 pt-2">
                {DIAGNOSTICOS.map((diagnostico) => (
                  <Barra
                    key={diagnostico.nombre}
                    etiqueta={diagnostico.nombre}
                    valor={diagnostico.casos}
                    max={DIAGNOSTICOS[0].casos}
                    formato={(v) => `${v} casos`}
                  />
                ))}
              </ul>
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
