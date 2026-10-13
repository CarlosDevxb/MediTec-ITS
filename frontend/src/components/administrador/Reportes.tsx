import React, { useState } from 'react';
import {
  Activity,
  CalendarCheck,
  UserPlus,
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
import { Select } from '../ui/Input';
import { ROLES_DEMO, MEDICAMENTOS_DEMO, HORARIOS_DEMO } from './tipos';
import { generarReportePDF, type ReportePDF } from './reportesPdf';

/* ============================================================
   VISTA: REPORTES · Selector de reportes predeterminados
   Elige un reporte y el panel muestra su visualización.
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
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

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

  const mesActual = new Date()
    .toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase());

  /* ---- Datos calculados ---- */
  const maxUsuarios = Math.max(...ROLES_DEMO.map((rol) => rol.usuarios));
  const maxStock = Math.max(...MEDICAMENTOS_DEMO.map((m) => m.stock));
  const medicamentosBajos = MEDICAMENTOS_DEMO.filter((m) => m.stock <= STOCK_BAJO).length;

  const horasPorDia = DIAS_SEMANA.map((dia) => ({
    dia,
    horas: HORARIOS_DEMO.filter((h) => h.dia === dia)
      .reduce((suma, h) => suma + horasDe(h.inicio, h.fin), 0),
  })).filter((d) => d.horas > 0);
  const maxHoras = Math.max(...horasPorDia.map((d) => d.horas), 1);

  /* ---- Contenido del PDF según el reporte elegido ---- */
  const resumenPDF = [
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
              items: ROLES_DEMO.map((rol) => ({
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
              items: MEDICAMENTOS_DEMO.map((m) => ({
                etiqueta: m.nombre,
                valor: `${m.stock} ${m.unidad}${m.stock <= STOCK_BAJO ? ' - STOCK BAJO' : ''}`,
                proporcion: m.stock / maxStock,
                alerta: m.stock <= STOCK_BAJO,
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

      {/* Panel único de indicadores */}
      <div className="bg-white rounded-2xl border border-gray-200 grid grid-cols-1 md:grid-cols-3 divide-y divide-gray-100 md:divide-y-0 md:divide-x mb-8">
        <StatCard
          variant="band"
          icon={Stethoscope}
          label="Consultas este mes"
          value="142"
          detail="+18% vs. agosto"
          highlight
        />
        <StatCard
          variant="band"
          icon={CalendarCheck}
          label="Citas completadas"
          value="89"
          detail="de 104 agendadas"
        />
        <StatCard
          variant="band"
          icon={UserPlus}
          label="Pacientes nuevos"
          value="23"
          detail="Altas en el mes"
        />
      </div>

      {/* ============ REPORTES PREDETERMINADOS ============ */}

      {/* 1. Actividad de la clínica */}
      {reporte === 'actividad' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card
              title="Consultas por mes"
              icon={Activity}
              description="Abril – septiembre · el mes en curso se resalta"
            >
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
          description={`${ROLES_DEMO.reduce((suma, rol) => suma + rol.usuarios, 0)} cuentas registradas en el sistema`}
        >
          <ul className="space-y-5 pt-2">
            {ROLES_DEMO.map((rol) => (
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
            {MEDICAMENTOS_DEMO.map((medicamento) => (
              <Barra
                key={medicamento.id}
                etiqueta={medicamento.nombre}
                valor={medicamento.stock}
                max={maxStock}
                tono={medicamento.stock <= STOCK_BAJO ? 'alerta' : 'brand'}
                formato={(v) => `${v} ${medicamento.unidad}`}
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
    </div>
  );
}
