import { jsPDF } from 'jspdf';

/* ============================================================
   GENERADOR DE PDF · Reportes del administrador
   Documento A4 con la identidad MediTec-ITS: portada de bloque
   azul, periodo del reporte, resumen destacado, secciones con
   barras proporcionales y pie de páginas.
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
  /** Periodo cubierto por el reporte (se muestra en la portada) */
  periodo?: string;
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
const TRACK: RGB = [235, 240, 246];
const PANEL: RGB = [244, 247, 251];

export function generarReportePDF(tipoArchivo: string, reporte: ReportePDF) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const M = 16;
  const anchoUtil = ancho - M * 2;

  let y = 0;

  const saltar = (espacio: number) => {
    if (y + espacio > alto - 26) {
      doc.addPage();
      y = 26;
    }
  };

  /* ---------- Portada: bloque de identidad ---------- */
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, ancho, 30, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('MediTec-ITS', M, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(210, 222, 236);
  doc.text('Sistema de gestion clinica', M, 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Reporte del administrador', ancho - M, 15, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Documento confidencial', ancho - M, 21, { align: 'right' });

  /* ---------- Título del reporte y periodo ---------- */
  y = 42;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text(reporte.nombre, M, y);
  y += 8;

  const fecha = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(`Generado el ${fecha}`, M, y);
  y += 7;

  // Periodo del reporte en un panel destacado
  if (reporte.periodo) {
    doc.setFillColor(...PANEL);
    doc.setDrawColor(...LINE);
    doc.rect(M, y - 4.5, anchoUtil, 9, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...BRAND);
    doc.text('Periodo del reporte:', M + 4, y + 1);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(reporte.periodo, M + 42, y + 1);
    y += 12;
  }

  /* ---------- Resumen (indicadores) ---------- */
  if (reporte.resumen.length > 0) {
    const altoResumen = reporte.resumen.length * 5.4 + 7;
    doc.setFillColor(...PANEL);
    doc.rect(M, y - 4, anchoUtil, altoResumen, 'F');
    doc.setFillColor(...BRAND);
    doc.rect(M, y - 4, 1.6, altoResumen, 'F');

    doc.setFontSize(10);
    reporte.resumen.forEach((linea) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK);
      doc.text(linea, M + 5, y + 1.2);
      y += 5.4;
    });
    y += 6;
  }

  /* ---------- Secciones ---------- */
  reporte.secciones.forEach((seccion) => {
    saltar(26);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text(seccion.titulo, M, y);
    y += 2;
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.5);
    doc.line(M, y, ancho - M, y);
    doc.setLineWidth(0.2);
    y += 7;

    if (seccion.items.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(...GRAY);
      doc.text('Sin datos en el periodo seleccionado.', M, y);
      y += 9;
      return;
    }

    seccion.items.forEach((item) => {
      const conBarra = item.proporcion !== undefined;
      saltar(conBarra ? 14 : 10);

      // Etiqueta (izquierda) + valor (derecha)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...DARK);
      doc.text(item.etiqueta, M, y);

      doc.setFont('helvetica', 'bold');
      if (item.alerta) doc.setTextColor(...AMBER);
      else doc.setTextColor(...NAVY);
      doc.text(item.valor, ancho - M, y, { align: 'right' });

      if (conBarra) {
        const prop = Math.max(0.02, Math.min(1, item.proporcion ?? 0));
        doc.setFillColor(...TRACK);
        doc.rect(M, y + 2, anchoUtil, 2.6, 'F');
        doc.setFillColor(...(item.alerta ? AMBER : BRAND));
        doc.rect(M, y + 2, anchoUtil * prop, 2.6, 'F');
        y += 9;
      } else {
        y += 7;
      }
      // Separación ligera entre renglones
      doc.setDrawColor(...LINE);
      doc.line(M, y - 2, ancho - M, y - 2);
      y += 1.5;
    });

    y += 5;
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
    doc.text('MediTec-ITS · Reportes del administrador · Documento confidencial', M, alto - 10);
    doc.text(`Pagina ${pagina} de ${total}`, ancho - M, alto - 10, { align: 'right' });
  }

  doc.save(`${tipoArchivo}.pdf`);
}
