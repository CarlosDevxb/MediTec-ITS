import { jsPDF } from 'jspdf';
import {
  fechaCorta,
  hoyISO,
  edadDe,
  type ExpedientePaciente,
  type ConsultaDetalle,
} from './atencion.service';

/* ============================================================
   EXPEDIENTE EN PDF · Documento clínico tipo expediente
   Encabezado con la marca MediTeC-ITS en cada página y pie con
   los logotipos de la empresa (Cuchipu Cloud) y del software
   (MediTeC-ITS). Contiene identificación, alertas clínicas,
   antecedentes, cuestionario de salud e historial de consultas.

   Los logotipos se cargan de `public/` en tiempo de generación;
   si no estuvieran disponibles, se dibuja el nombre en texto.
   ============================================================ */

type RGB = [number, number, number];

const NAVY: RGB = [10, 51, 92];
const BRAND: RGB = [30, 79, 138];
const AMBER: RGB = [217, 119, 6];
const GRAY: RGB = [107, 114, 128];
const DARK: RGB = [31, 41, 55];
const LINE: RGB = [220, 228, 236];
const PANEL: RGB = [244, 247, 251];
const AMBER_BG: RGB = [255, 247, 230];

const M = 16; // margen lateral (mm)
const ALTO_ENCABEZADO = 26; // espacio reservado del encabezado (mm)
const ALTO_PIE = 22; // espacio reservado del pie (mm)

interface LogoPDF {
  dataUrl: string;
  /** ancho / alto de la imagen */
  relacion: number;
}

/** Carga un logotipo de `public/` como data URL y calcula su proporción */
async function cargarLogo(ruta: string): Promise<LogoPDF | null> {
  try {
    const respuesta = await fetch(ruta);
    if (!respuesta.ok) return null;
    const blob = await respuesta.blob();
    const dataUrl = await new Promise<string>((resolver, rechazar) => {
      const lector = new FileReader();
      lector.onload = () => resolver(String(lector.result));
      lector.onerror = () => rechazar(new Error('No se pudo leer la imagen.'));
      lector.readAsDataURL(blob);
    });
    const imagen = await new Promise<HTMLImageElement>((resolver, rechazar) => {
      const img = new Image();
      img.onload = () => resolver(img);
      img.onerror = () => rechazar(new Error('No se pudo abrir la imagen.'));
      img.src = dataUrl;
    });
    return { dataUrl, relacion: imagen.naturalWidth / Math.max(1, imagen.naturalHeight) };
  } catch {
    // Sin logotipo el documento se genera igual, con el nombre en texto
    return null;
  }
}

export interface DatosExpedientePDF {
  expediente: ExpedientePaciente;
  /** Historial completo (con signos vitales e insumos) */
  consultas: ConsultaDetalle[];
}

export async function generarExpedientePDF(datos: DatosExpedientePDF): Promise<void> {
  const { expediente, consultas } = datos;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const anchoUtil = ancho - M * 2;

  const [logoSoftware, logoEmpresa] = await Promise.all([
    cargarLogo('/logo-meditec.png'),
    cargarLogo('/logo-cuchipu.png'),
  ]);

  /* ---------- Encabezado (todas las páginas) ---------- */
  const dibujarEncabezado = () => {
    // Marca del proyecto: logotipo del software a la izquierda
    const altoLogo = 11;
    if (logoSoftware) {
      doc.addImage(
        logoSoftware.dataUrl,
        'PNG',
        M,
        8,
        altoLogo * logoSoftware.relacion,
        altoLogo,
      );
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(...NAVY);
      doc.text('MediTec-ITS', M, 15);
    }

    // Título del documento y folio del expediente
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text('EXPEDIENTE CLÍNICO', ancho - M, 12, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text(`Folio ${expediente.numeroControl}`, ancho - M, 17, { align: 'right' });
    doc.text(`${expediente.nombre}`, ancho - M, 21, { align: 'right' });

    doc.setDrawColor(...LINE);
    doc.line(M, ALTO_ENCABEZADO - 3, ancho - M, ALTO_ENCABEZADO - 3);
  };

  /* ---------- Pie (todas las páginas): empresa + software ---------- */
  const dibujarPie = () => {
    const base = alto - ALTO_PIE + 6;
    doc.setDrawColor(...LINE);
    doc.line(M, base - 4, ancho - M, base - 4);

    const altoPieLogo = 6.5;
    // Logotipo de la empresa (izquierda)
    if (logoEmpresa) {
      doc.addImage(logoEmpresa.dataUrl, 'PNG', M, base, altoPieLogo * logoEmpresa.relacion, altoPieLogo);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      doc.text('Cuchipu Cloud', M, base + 5);
    }
    // Logotipo del software (derecha)
    if (logoSoftware) {
      const anchoLogo = altoPieLogo * logoSoftware.relacion;
      doc.addImage(logoSoftware.dataUrl, 'PNG', ancho - M - anchoLogo, base, anchoLogo, altoPieLogo);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...NAVY);
      doc.text('MediTec-ITS', ancho - M, base + 5, { align: 'right' });
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text('MediTec-ITS · Sistema de gestión de enfermería · Documento confidencial', M, base + 11);
    doc.text(
      `Página ${doc.getCurrentPageInfo().pageNumber} · ${hoyISO()}`,
      ancho - M,
      base + 11,
      { align: 'right' },
    );
  };

  /* ---------- Flujo de página ---------- */
  let y = 0;
  const saltar = (espacio: number) => {
    if (y + espacio > alto - ALTO_PIE) {
      doc.addPage();
      dibujarEncabezado();
      y = ALTO_ENCABEZADO + 4;
    }
  };

  const seccion = (titulo: string) => {
    saltar(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text(titulo, M, y);
    y += 2;
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.5);
    doc.line(M, y, ancho - M, y);
    doc.setLineWidth(0.2);
    y += 7;
  };

  /** Renglón etiqueta / valor en dos columnas */
  const campo = (etiqueta: string, valor: string, columna: 0 | 1) => {
    const x = M + columna * (anchoUtil / 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(etiqueta, x, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(valor || '—', x, y + 5);
    if (columna === 1) y += 11;
  };

  /** Texto largo con ajuste de línea */
  const parrafo = (etiqueta: string, texto: string) => {
    saltar(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND);
    doc.text(etiqueta, M, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK);
    const lineas = doc.splitTextToSize(texto || 'Sin información registrada.', anchoUtil);
    for (const linea of lineas) {
      saltar(5);
      doc.text(linea, M, y);
      y += 4.6;
    }
    y += 2;
  };

  /* ================= PORTADA / IDENTIFICACIÓN ================= */
  dibujarEncabezado();
  y = ALTO_ENCABEZADO + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.text('Expediente clínico del paciente', M, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text(`Generado el ${fechaCorta(hoyISO())} · documento confidencial`, M, y);
  y += 10;

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
  y += 4;

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
    doc.text('Este paciente aún no tiene cuestionario de salud registrado.', M, y);
    y += 8;
  } else {
    const imc =
      cuestionario.peso && cuestionario.talla
        ? (cuestionario.peso / (cuestionario.talla * cuestionario.talla)).toFixed(1)
        : '—';
    campo('Peso', `${cuestionario.peso} kg`, 0);
    campo('Talla', `${cuestionario.talla} m`, 1);
    campo('Índice de masa corporal', imc, 0);
    campo('Horas de sueño', cuestionario.horasSueno != null ? `${cuestionario.horasSueno} h` : '—', 1);
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
    doc.text('Este paciente aún no tiene consultas registradas.', M, y);
    y += 8;
  }

  consultas.forEach((consulta) => {
    saltar(30);

    // Renglón de encabezado de la consulta
    doc.setFillColor(...PANEL);
    doc.rect(M, y - 4.5, anchoUtil, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    doc.text(`${consulta.cita.fecha} · ${consulta.cita.motivo}`, M + 3, y + 0.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(
      `${consulta.cita.tipo} · atendió ${consulta.personal.nombre}`,
      ancho - M - 3,
      y + 0.5,
      { align: 'right' },
    );
    y += 8;

    parrafo('Diagnóstico', consulta.diagnostico);
    parrafo('Tratamiento', consulta.tratamiento);
    parrafo('Síntomas', consulta.sintomas);
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
    if (consulta.insumos.length > 0) {
      parrafo(
        'Insumos utilizados',
        consulta.insumos
          .map((insumo) => `${insumo.nombre} (${insumo.cantidad} ${insumo.abreviatura || insumo.unidad})`)
          .join(' · '),
      );
    }
    y += 3;
  });

  /* ================= CIERRE Y FIRMAS ================= */
  saltar(34);
  doc.setDrawColor(...LINE);
  doc.line(M, y, ancho - M, y);
  y += 12;
  const anchoFirma = anchoUtil / 2 - 10;
  doc.setDrawColor(...GRAY);
  doc.line(M, y, M + anchoFirma, y);
  doc.line(ancho - M - anchoFirma, y, ancho - M, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text('Responsable del expediente', M, y + 5);
  doc.text('Paciente o tutor', ancho - M - anchoFirma, y + 5);
  y += 12;
  doc.setFontSize(7.5);
  doc.text(
    'Documento generado por MediTeC-ITS. Contiene datos personales sensibles protegidos por la LFPDPPP.',
    M,
    y,
  );

  /* ---------- Pies de página en todas las hojas ---------- */
  const total = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= total; pagina++) {
    doc.setPage(pagina);
    dibujarPie();
  }

  doc.save(`expediente-${expediente.numeroControl}.pdf`);
}
