import {
  crearDocumentoPDF,
  folioDe,
  M,
  NAVY,
  BRAND,
  GRAY,
  DARK,
  LINE,
  PANEL,
} from './documentosPdf';
import {
  fechaCorta,
  hoyISO,
  type ExpedientePaciente,
  type PlanAlimenticio,
  type RegistroSeguimiento,
  type ConsultaResumen,
} from './atencion.service';

/* ============================================================
   PDFs DE NUTRICIÓN · Avance de peso y talla y expediente del
   área de nutrición, con la identidad de MediTeC-ITS (ver
   `documentosPdf.ts`). Las mediciones provienen solo de las
   sesiones de la nutrióloga.
   ============================================================ */

/** Calcula la variación de peso entre dos mediciones */
function variacionEntre(
  anterior: RegistroSeguimiento | undefined,
  actual: RegistroSeguimiento,
): string {
  if (!anterior || anterior.peso == null || actual.peso == null) return '—';
  const delta = actual.peso - anterior.peso;
  return `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg`;
}

export interface DatosAvancePDF {
  paciente: ExpedientePaciente;
  /** Plan sobre el que se mide el avance (puede ser null si aún no hay) */
  plan: PlanAlimenticio | null;
  /** Mediciones de las sesiones de nutrición (ordenadas por fecha) */
  mediciones: RegistroSeguimiento[];
  /** Sesiones de nutrición del periodo del plan */
  sesiones: ConsultaResumen[];
}

/**
 * Avance de peso y talla desde el inicio del plan hasta hoy, en base a las
 * mediciones de las sesiones de nutrición.
 */
export async function generarAvancePesoPDF(datos: DatosAvancePDF): Promise<void> {
  const { paciente, plan, mediciones, sesiones } = datos;
  const hoy = hoyISO();
  const inicio = plan?.fechaInicio ?? mediciones[0]?.fecha.slice(0, 10) ?? hoy;

  const folio = folioDe('AVN', paciente.numeroControl);
  const documento = await crearDocumentoPDF({
    titulo: 'AVANCE DE PESO Y TALLA',
    folio,
    nombre: paciente.nombre,
  });
  const { doc, anchoUtil, saltar, seccion, campo, parrafo, portada, posicion, colocar, finalizar } =
    documento;

  portada(
    'Avance de peso y talla',
    `Del ${fechaCorta(inicio)} al ${fechaCorta(hoy)} · documento confidencial`,
  );

  seccion('Paciente y plan');
  campo('Nombre completo', paciente.nombre, 0);
  campo('Número de control', paciente.numeroControl, 1);
  if (plan) {
    campo(
      'Periodo del plan',
      `${fechaCorta(plan.fechaInicio)} – ${fechaCorta(plan.fechaFin)}`,
      0,
    );
    campo('Calorías diarias', `${plan.caloriasDiarias} kcal/día`, 1);
    campo('Estatus del plan', plan.estatus, 0);
    campo('Sesiones en el periodo', String(sesiones.length), 1);
  } else {
    campo('Plan alimenticio', 'Sin plan registrado', 0);
    campo('Sesiones registradas', String(sesiones.length), 1);
  }

  /* ---- Resumen del avance ---- */
  const pesos = mediciones.filter((registro) => registro.peso != null);
  const pesoInicio = pesos[0]?.peso ?? null;
  const pesoActual = pesos[pesos.length - 1]?.peso ?? null;
  const variacion =
    pesoInicio != null && pesoActual != null ? pesoActual - pesoInicio : null;
  const tallaInicio = mediciones.find((registro) => registro.talla != null)?.talla ?? null;
  const tallaActual = [...mediciones].reverse().find((r) => r.talla != null)?.talla ?? null;

  seccion('Resumen del avance');
  campo('Peso al iniciar', pesoInicio != null ? `${pesoInicio} kg` : '—', 0);
  campo('Peso actual', pesoActual != null ? `${pesoActual} kg` : '—', 1);
  campo('Variación de peso', variacion != null ? `${variacion > 0 ? '+' : ''}${variacion.toFixed(1)} kg` : '—', 0);
  campo('Talla actual', tallaActual != null ? `${tallaActual} m` : '—', 1);
  campo('Mediciones registradas', String(mediciones.length), 0);
  campo('Fecha de corte', fechaCorta(hoy), 1);

  /* ---- Tabla de mediciones ---- */
  seccion('Mediciones (sesiones de nutrición)');
  if (mediciones.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(...GRAY);
    doc.text('Sin mediciones registradas en las sesiones de nutrición.', M, posicion());
    colocar(posicion() + 8);
  } else {
    // Encabezado de la tabla
    saltar(14);
    let y = posicion();
    doc.setFillColor(...PANEL);
    doc.rect(M, y - 5, anchoUtil, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY);
    doc.text('Fecha de la sesión', M + 3, y);
    doc.text('Peso', M + 70, y);
    doc.text('Talla', M + 95, y);
    doc.text('Variación', anchoUtil + M - 3, y, { align: 'right' });
    colocar(y + 7);

    mediciones.forEach((registro, indice) => {
      saltar(9);
      y = posicion();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      doc.text(registro.fecha, M + 3, y);
      doc.text(registro.peso != null ? `${registro.peso} kg` : '—', M + 70, y);
      doc.text(registro.talla != null ? `${registro.talla} m` : '—', M + 95, y);
      doc.setFont('helvetica', 'bold');
      doc.text(variacionEntre(mediciones[indice - 1], registro), anchoUtil + M - 3, y, {
        align: 'right',
      });
      doc.setDrawColor(...LINE);
      doc.line(M, y + 2.5, anchoUtil + M, y + 2.5);
      colocar(y + 7);
    });
  }

  /* ---- Sesiones del periodo ---- */
  seccion('Sesiones consideradas');
  if (sesiones.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(...GRAY);
    doc.text('Sin sesiones de nutrición en el periodo.', M, posicion());
    colocar(posicion() + 8);
  } else {
    sesiones.forEach((sesion) => {
      parrafo(sesion.fechaHora, `${sesion.diagnostico || 'Sin diagnóstico'} — ${sesion.tratamiento || 'sin indicaciones'}`);
    });
  }

  /* ---- Cierre ---- */
  saltar(12);
  const yCierreAvance = posicion();
  doc.setDrawColor(...LINE);
  doc.line(M, yCierreAvance, anchoUtil + M, yCierreAvance);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(
    `Fin del documento · folio ${folio}. Contiene datos personales sensibles protegidos por la LFPDPPP.`,
    M,
    yCierreAvance + 5,
  );

  finalizar();
  doc.save(`avance-peso-talla-${paciente.numeroControl}-${folio.split('-').pop()}.pdf`);
}

export interface DatosExpedienteNutricionPDF {
  paciente: ExpedientePaciente;
  /** Plan vigente o el último registrado */
  plan: PlanAlimenticio | null;
  /** Todos los planes del paciente */
  planes: PlanAlimenticio[];
  /** Mediciones de las sesiones de nutrición */
  mediciones: RegistroSeguimiento[];
  /** Sesiones de nutrición */
  sesiones: ConsultaResumen[];
}

/**
 * Expediente del área de nutrición: identificación, plan alimenticio,
 * avance de peso y talla e historial de sesiones de nutrición.
 */
export async function generarExpedienteNutricionPDF(
  datos: DatosExpedienteNutricionPDF,
): Promise<void> {
  const { paciente, plan, planes, mediciones, sesiones } = datos;

  const folio = folioDe('NUT', paciente.numeroControl);
  const documento = await crearDocumentoPDF({
    titulo: 'EXPEDIENTE DE NUTRICIÓN',
    folio,
    nombre: paciente.nombre,
  });
  const { doc, anchoUtil, saltar, seccion, campo, parrafo, portada, posicion, colocar, finalizar } =
    documento;

  portada(
    'Expediente de nutrición',
    `Generado el ${fechaCorta(hoyISO())} · documento confidencial`,
  );

  seccion('Identificación del paciente');
  campo('Nombre completo', paciente.nombre, 0);
  campo('Número de control', paciente.numeroControl, 1);
  campo('Tipo de paciente', paciente.tipoPaciente, 0);
  campo('Carrera', paciente.carrera || 'No aplica', 1);
  campo('Fecha de nacimiento', fechaCorta(paciente.fechaNacimiento), 0);
  campo('Tipo de sangre', paciente.tipoSangre || 'Sin registrar', 1);

  seccion('Plan alimenticio');
  if (plan) {
    campo(
      'Periodo',
      `${fechaCorta(plan.fechaInicio)} – ${fechaCorta(plan.fechaFin)}`,
      0,
    );
    campo('Calorías diarias', `${plan.caloriasDiarias} kcal/día`, 1);
    campo('Estatus', plan.estatus, 0);
    campo('Planes registrados', String(planes.length), 1);
    parrafo('Dieta', plan.descripcionDieta);
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(...GRAY);
    doc.text('Sin plan alimenticio registrado.', M, posicion());
    colocar(posicion() + 8);
  }

  seccion('Avance de peso y talla (sesiones de nutrición)');
  const pesos = mediciones.filter((registro) => registro.peso != null);
  const pesoInicio = pesos[0]?.peso ?? null;
  const pesoActual = pesos[pesos.length - 1]?.peso ?? null;
  const variacion =
    pesoInicio != null && pesoActual != null ? pesoActual - pesoInicio : null;
  campo('Peso al iniciar', pesoInicio != null ? `${pesoInicio} kg` : '—', 0);
  campo('Peso actual', pesoActual != null ? `${pesoActual} kg` : '—', 1);
  campo(
    'Variación acumulada',
    variacion != null ? `${variacion > 0 ? '+' : ''}${variacion.toFixed(1)} kg` : '—',
    0,
  );
  campo('Mediciones', String(mediciones.length), 1);
  parrafo(
    'Mediciones registradas',
    mediciones.length === 0
      ? 'Sin mediciones registradas.'
      : mediciones
          .map((registro) => `${registro.fecha}: ${registro.peso ?? '—'} kg / ${registro.talla ?? '—'} m`)
          .join(' · '),
  );

  seccion('Historial de sesiones de nutrición');
  if (sesiones.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(...GRAY);
    doc.text('Sin sesiones de nutrición registradas.', M, posicion());
    colocar(posicion() + 8);
  }
  sesiones.forEach((sesion) => {
    parrafo(
      sesion.fechaHora,
      `${sesion.cita.motivo} · atendió ${sesion.personal.nombre}. Diagnóstico: ${sesion.diagnostico || '—'}. Indicaciones: ${sesion.tratamiento || '—'}`,
    );
  });

  /* ---- Cierre ---- */
  saltar(12);
  const yCierre = posicion();
  doc.setDrawColor(...LINE);
  doc.line(M, yCierre, anchoUtil + M, yCierre);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(
    `Fin del expediente · documento generado por MediTeC-ITS (folio ${folio}). Contiene datos personales sensibles protegidos por la LFPDPPP.`,
    M,
    yCierre + 5,
  );

  finalizar();
  doc.save(`expediente-nutricion-${paciente.numeroControl}-${folio.split('-').pop()}.pdf`);
}
