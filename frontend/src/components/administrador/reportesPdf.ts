import { jsPDF } from 'jspdf';

/* ============================================================
   GENERADOR DE PDF · Reportes del administrador
   Documento A4 con la identidad MediTec-ITS (azul institucional),
   secciones con barras proporcionales y pie de páginas.
   ============================================================ */

export interface ItemPDF {
  etiqueta: string;
  valor: string;
  /** Proporción 0–1 para dibujar la barra */
  proporcion?: number;
  alerta?: boolean;
}

export interface SeccionPDF {
  titulo: string;
  items: ItemPDF[];
}

export interface ReportePDF {
  /** Nombre del reporte (título del documento) */
  nombre: string;
  /** Líneas de resumen bajo el título */
  resumen: string[];
  secciones: SeccionPDF[];
}

type RGB = [number, number, number];

const NAVY: RGB = [10, 51, 92];
const BRAND: RGB = [30, 79, 138];
const AMBER: RGB = [217, 119, 6];
const GRAY: RGB = [107, 114, 128];
const DARK: RGB = [31, 41, 55];
const LINE: RGB = [220, 228, 236];
const TRACK: RGB = [239, 244, 249];

export function generarReportePDF(tipoArchivo: string, reporte: ReportePDF) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const M = 16;
  const anchoUtil = ancho - M * 2;

  let y = 0;

  const saltar = (espacio: number) => {
    if (y + espacio > alto - 24) {
      doc.addPage();
      y = 26;
    }
  };

  /* ---------- Encabezado del documento ---------- */
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, ancho, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...NAVY);
  doc.text('MediTec-ITS', M, 24);

  doc.setFontSize(13);
  doc.setTextColor(...BRAND);
  doc.text(reporte.nombre, M, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  const fecha = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Sistema de gestion - generado el ${fecha}`, M, 38);
  y = 46;

  /* ---------- Resumen (indicadores) ---------- */
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  reporte.resumen.forEach((linea) => {
    doc.text(linea, M, y);
    y += 5;
  });
  y += 3;
  doc.setDrawColor(...LINE);
  doc.line(M, y, ancho - M, y);
  y += 9;

  /* ---------- Secciones ---------- */
  reporte.secciones.forEach((seccion) => {
    saltar(24);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text(seccion.titulo, M, y);
    y += 2.5;
    doc.setDrawColor(...NAVY);
    doc.line(M, y, ancho - M, y);
    y += 7;

    seccion.items.forEach((item) => {
      saltar(item.proporcion !== undefined ? 14 : 9);

      // Etiqueta (izquierda) + valor (derecha)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...DARK);
      doc.text(item.etiqueta, M, y);

      doc.setFont('helvetica', 'bold');
      if (item.alerta) doc.setTextColor(...AMBER);
      else doc.setTextColor(...NAVY);
      doc.text(item.valor, ancho - M, y, { align: 'right' });

      // Barra proporcional
      if (item.proporcion !== undefined) {
        const prop = Math.max(0.02, Math.min(1, item.proporcion));
        doc.setFillColor(...TRACK);
        doc.rect(M, y + 2, anchoUtil, 2.4, 'F');
        doc.setFillColor(...(item.alerta ? AMBER : BRAND));
        doc.rect(M, y + 2, anchoUtil * prop, 2.4, 'F');
        y += 8;
      } else {
        y += 6;
      }
    });

    y += 6;
  });

  /* ---------- Pie de página en todas las hojas ---------- */
  const total = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= total; pagina++) {
    doc.setPage(pagina);
    doc.setDrawColor(...LINE);
    doc.line(M, alto - 15, ancho - M, alto - 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('MediTec-ITS - Reportes del administrador', M, alto - 10);
    doc.text(`Pagina ${pagina} de ${total}`, ancho - M, alto - 10, { align: 'right' });
  }

  doc.save(`${tipoArchivo}.pdf`);
}
