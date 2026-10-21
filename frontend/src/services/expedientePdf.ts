import {
  crearDocumentoPDF,
  M,
  NAVY,
  BRAND,
  AMBER,
  GRAY,
  DARK,
  LINE,
  AMBER_BG,
} from './documentosPdf';
import {
  fechaCorta,
  hoyISO,
  edadDe,
  type ExpedientePaciente,
  type ConsultaDetalle,
} from './atencion.service';

/* ============================================================
   EXPEDIENTE EN PDF · Documento clínico tipo expediente
   Identificación, alertas clínicas, antecedentes, cuestionario
   de salud e historial de consultas, con la identidad de
   MediTeC-ITS (ver `documentosPdf.ts`).
   ============================================================ */

export interface DatosExpedientePDF {
  expediente: ExpedientePaciente;
  /** Historial completo (con signos vitales e insumos) */
  consultas: ConsultaDetalle[];
}

export async function generarExpedientePDF(datos: DatosExpedientePDF): Promise<void> {
  const { expediente, consultas } = datos;

  const documento = await crearDocumentoPDF({
    titulo: 'EXPEDIENTE CLÍNICO',
    folio: expediente.numeroControl,
    nombre: expediente.nombre,
  });
  const { doc, anchoUtil, saltar, seccion, campo, parrafo, portada, posicion, colocar, finalizar } =
    documento;

  /* ================= PORTADA / IDENTIFICACIÓN ================= */
  portada(
    'Expediente clínico del paciente',
    `Generado el ${fechaCorta(hoyISO())} · documento confidencial`,
  );

  seccion('Identificación del paciente');
  campo('Nombre completo', expediente.nombre, 0);
  campo('Número de control', expediente.numeroControl, 1);
  campo('Tipo de paciente', expediente.tipoPaciente, 0);
  campo('Carrera', expediente.carrera || 'No aplica', 1);
  campo('Fecha de nacimiento', fechaCorta(expediente.fechaNacimiento), 0);
  campo('Edad', `${edadDe(expediente.fechaNacimiento)} años`, 1);
  campo('Teléfono', expediente.telefono || 'Sin registrar', 0);
  campo('Tipo de sangre', expediente.tipoSangre || 'Sin registrar', 1);
  campo('Apertura del expediente', expediente.aperturaExpediente || '—', 0);
  campo('Consultas registradas', String(consultas.length), 1);

  /* ================= ALERTAS CLÍNICAS ================= */
  seccion('Alertas clínicas');
  const alergias = [
    ...expediente.alergias,
    ...(expediente.cuestionario?.alergiaOtra ? [expediente.cuestionario.alergiaOtra] : []),
  ];
  const enfermedades = [
    ...expediente.enfermedades,
    ...(expediente.cuestionario?.enfermedadOtra ? [expediente.cuestionario.enfermedadOtra] : []),
  ];
  const medicamentos = expediente.cuestionario?.medicamentosActuales?.trim() ?? '';

  saltar(28);
  let y = posicion();
  doc.setFillColor(...AMBER_BG);
  doc.setDrawColor(...AMBER);
  const altoAlertas = 6 + (alergias.length ? 6 : 5) + (enfermedades.length ? 6 : 5) + (medicamentos ? 6 : 0);
  doc.rect(M, y - 4, anchoUtil, altoAlertas, 'FD');
  doc.setDrawColor(...LINE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...AMBER);
  doc.text('Alergias:', M + 4, y + 1.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK);
  doc.text(alergias.length ? alergias.join(', ') : 'Ninguna registrada', M + 22, y + 1.5);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND);
  doc.text('Enfermedades crónicas:', M + 4, y + 1.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK);
  doc.text(enfermedades.length ? enfermedades.join(', ') : 'Ninguna registrada', M + 38, y + 1.5);
  y += 6;
  if (medicamentos) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND);
    doc.text('Medicamentos actuales:', M + 4, y + 1.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(medicamentos, M + 38, y + 1.5);
    y += 6;
  }
  colocar(y + 4);

  /* ================= ANTECEDENTES ================= */
  seccion('Antecedentes');
  parrafo('Antecedentes relevantes', expediente.antecedentes || 'Sin antecedentes registrados.');

  /* ================= CUESTIONARIO DE SALUD ================= */
  seccion('Cuestionario de salud');
  const cuestionario = expediente.cuestionario;
  if (!cuestionario) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(...GRAY);
    doc.text('Este paciente aún no tiene cuestionario de salud registrado.', M, posicion());
    colocar(posicion() + 8);
  } else {
    const imc =
      cuestionario.peso && cuestionario.talla
        ? (cuestionario.peso / (cuestionario.talla * cuestionario.talla)).toFixed(1)
        : '—';
    campo('Peso', `${cuestionario.peso} kg`, 0);
    campo('Talla', `${cuestionario.talla} m`, 1);
    campo('Índice de masa corporal', imc, 0);
    campo(
      'Horas de sueño',
      cuestionario.horasSueno != null ? `${cuestionario.horasSueno} h` : '—',
      1,
    );
    campo('Actividad física', cuestionario.actividadFisica, 0);
    campo('Tabaco', cuestionario.tabaco, 1);
    campo('Alcohol', cuestionario.alcohol, 0);
    campo('Fecha de llenado', cuestionario.fechaLlenado, 1);
    parrafo('Medicamentos actuales', cuestionario.medicamentosActuales || 'Ninguno registrado.');
    parrafo('Cirugías previas', cuestionario.cirugiasPrevias || 'Ninguna registrada.');
    parrafo('Síntomas al llenar', cuestionario.sintomasActuales || 'Sin síntomas reportados.');
    parrafo('Comentarios', cuestionario.comentarios || 'Sin comentarios.');
  }

  /* ================= HISTORIAL DE CONSULTAS ================= */
  seccion('Historial de consultas');
  if (consultas.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(...GRAY);
    doc.text('Este paciente aún no tiene consultas registradas.', M, posicion());
    colocar(posicion() + 8);
  }

  consultas.forEach((consulta) => {
    saltar(30);

    // Renglón de encabezado de la consulta
    let yConsulta = posicion();
    doc.setFillColor(...LINE);
    doc.setFillColor(244, 247, 251);
    doc.rect(M, yConsulta - 4.5, anchoUtil, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    doc.text(`${consulta.cita.fecha} · ${consulta.cita.motivo}`, M + 3, yConsulta + 0.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(
      `${consulta.cita.tipo} · consulta de ${consulta.tipo.toLowerCase()} · atendió ${consulta.personal.nombre}`,
      anchoUtil + M - 3,
      yConsulta + 0.5,
      { align: 'right' },
    );
    colocar(yConsulta + 8);

    if (consulta.tipo === 'Enfermería') {
      parrafo('Intervención de enfermería', consulta.intervencionEnfermeria || 'Sin registrar.');
    } else {
      parrafo('Diagnóstico', consulta.diagnostico || 'Sin registrar.');
      parrafo('Tratamiento', consulta.tratamiento || 'Sin registrar.');
    }
    if (consulta.tipo !== 'Nutrición') {
      parrafo('Síntomas', consulta.sintomas || 'Sin registrar.');
    }
    if (consulta.exploracion) parrafo('Exploración', consulta.exploracion);
    if (consulta.signosVitales) {
      const s = consulta.signosVitales;
      parrafo(
        'Signos vitales',
        [
          s.ta && `TA ${s.ta}`,
          s.fc && `FC ${s.fc} lpm`,
          s.fr && `FR ${s.fr} rpm`,
          s.temp && `Temp ${s.temp} °C`,
          s.peso && `Peso ${s.peso} kg`,
          s.talla && `Talla ${s.talla} m`,
        ]
          .filter(Boolean)
          .join(' · ') || 'Sin registrar.',
      );
    }
    if (consulta.planAlimenticio) {
      parrafo(
        'Plan alimenticio',
        `${consulta.planAlimenticio.caloriasDiarias} kcal/día (del ${consulta.planAlimenticio.fechaInicio} al ${consulta.planAlimenticio.fechaFin}). ${consulta.planAlimenticio.descripcionDieta}`,
      );
    }
    if (consulta.insumos.length > 0) {
      parrafo(
        'Insumos utilizados',
        consulta.insumos
          .map(
            (insumo) => `${insumo.nombre} (${insumo.cantidad} ${insumo.abreviatura || insumo.unidad})`,
          )
          .join(' · '),
      );
    }
    colocar(posicion() + 3);
  });

  /* ================= CIERRE Y FIRMAS ================= */
  saltar(34);
  let yCierre = posicion();
  doc.setDrawColor(...LINE);
  doc.line(M, yCierre, anchoUtil + M, yCierre);
  yCierre += 12;
  const anchoFirma = anchoUtil / 2 - 10;
  doc.setDrawColor(...GRAY);
  doc.line(M, yCierre, M + anchoFirma, yCierre);
  doc.line(anchoUtil + M - anchoFirma, yCierre, anchoUtil + M, yCierre);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text('Responsable del expediente', M, yCierre + 5);
  doc.text('Paciente o tutor', anchoUtil + M - anchoFirma, yCierre + 5);
  yCierre += 12;
  doc.setFontSize(7.5);
  doc.text(
    'Documento generado por MediTeC-ITS. Contiene datos personales sensibles protegidos por la LFPDPPP.',
    M,
    yCierre,
  );

  /* ---------- Pies de página en todas las hojas ---------- */
  finalizar();
  doc.save(`expediente-${expediente.numeroControl}.pdf`);
}
