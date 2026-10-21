import React from 'react';
import ExpedienteVista from '../atencion/ExpedienteVista';
import type { ExpedientePaciente } from '../../services/atencion.service';

/* ============================================================
   MI EXPEDIENTE (PACIENTE) · Vista en solo lectura de su
   expediente clínico: ficha con alertas, historial de consultas
   con detalle y descarga del PDF.
   ============================================================ */

export interface MiExpedienteProps {
  expediente: ExpedientePaciente;
  onVolver: () => void;
}

export default function MiExpediente({ expediente, onVolver }: MiExpedienteProps) {
  return <ExpedienteVista expediente={expediente} onVolver={onVolver} />;
}
