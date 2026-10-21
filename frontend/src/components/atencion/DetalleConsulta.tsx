import React from 'react';
import { FileText, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { type ConsultaDetalle } from '../../services/atencion.service';

/* ============================================================
   DETALLE DE CONSULTA · Modal con la atención completa
   (síntomas, exploración, diagnóstico, tratamiento, signos
   vitales e insumos). Compartido por el historial de consultas
   y los expedientes de pacientes.
   ============================================================ */

export interface DetalleConsultaProps {
  consulta: ConsultaDetalle | null;
  /** Mientras se carga el detalle */
  cargando?: boolean;
  onCerrar: () => void;
}

export default function DetalleConsulta({ consulta, cargando = false, onCerrar }: DetalleConsultaProps) {
  if (!consulta && !cargando) return null;

  return (
    <Modal
      titulo={consulta ? `Consulta del ${consulta.cita.fecha}` : 'Cargando consulta…'}
      icono={FileText}
      onCerrar={onCerrar}
      acciones={
        <Button variant="secondary" onClick={onCerrar}>
          Cerrar
        </Button>
      }
    >
      {consulta ? (
        <div className="space-y-3 text-sm">
          <p className="flex items-center gap-2">
            <Badge status="scheduled">{consulta.cita.tipo}</Badge>
            <span className="text-gray-600">
              {consulta.cita.motivo} · atendió {consulta.personal.nombre}
            </span>
          </p>
          <div>
            <p className="font-semibold text-gray-700">Síntomas</p>
            <p className="text-gray-600">{consulta.sintomas}</p>
          </div>
          {consulta.exploracion && (
            <div>
              <p className="font-semibold text-gray-700">Exploración</p>
              <p className="text-gray-600">{consulta.exploracion}</p>
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-700">Diagnóstico</p>
            <p className="text-gray-600">{consulta.diagnostico}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Tratamiento</p>
            <p className="text-gray-600">{consulta.tratamiento}</p>
          </div>
          {consulta.signosVitales && (
            <div>
              <p className="font-semibold text-gray-700">Signos vitales</p>
              <p className="text-gray-600 tabular-nums">
                {[
                  consulta.signosVitales.ta && `TA ${consulta.signosVitales.ta}`,
                  consulta.signosVitales.fc && `FC ${consulta.signosVitales.fc} lpm`,
                  consulta.signosVitales.fr && `FR ${consulta.signosVitales.fr} rpm`,
                  consulta.signosVitales.temp && `Temp ${consulta.signosVitales.temp} °C`,
                  consulta.signosVitales.peso && `Peso ${consulta.signosVitales.peso} kg`,
                  consulta.signosVitales.talla && `Talla ${consulta.signosVitales.talla} m`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          )}
          {consulta.insumos.length > 0 && (
            <div>
              <p className="font-semibold text-gray-700">Insumos usados</p>
              <ul className="text-gray-600">
                {consulta.insumos.map((insumo) => (
                  <li key={insumo.medicamentoId}>
                    {insumo.nombre} · {insumo.cantidad} {insumo.abreviatura || insumo.unidad}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="flex items-center gap-2 text-gray-600">
          <Loader2 size={18} className="animate-spin text-brand-600" aria-hidden="true" />
          Cargando el detalle…
        </p>
      )}
    </Modal>
  );
}
