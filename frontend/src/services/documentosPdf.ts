import { jsPDF } from 'jspdf';
import { fechaCorta, hoyISO } from './atencion.service';

/* ============================================================
   DOCUMENTOS EN PDF · Base compartida de los reportes clínicos
   (expediente, expediente de nutrición, avance de peso y talla).

   Todos los documentos comparten la misma identidad: encabezado
   con el logotipo de MediTeC-ITS, título, folio y nombre del
   paciente; pie con los logotipos de la empresa (Cuchipu Cloud)
   y del software (MediTec-ITS) y la nota de confidencialidad.
   ============================================================ */

export type RGB = [number, number, number];

export const NAVY: RGB = [10, 51, 92];
export const BRAND: RGB = [30, 79, 138];
export const AMBER: RGB = [217, 119, 6];
export const GRAY: RGB = [107, 114, 128];
export const DARK: RGB = [31, 41, 55];
export const LINE: RGB = [220, 228, 236];
export const PANEL: RGB = [244, 247, 251];
export const AMBER_BG: RGB = [255, 247, 230];

export const M = 16; // margen lateral (mm)
const ALTO_ENCABEZADO = 26;
const ALTO_PIE = 22;

export interface LogoPDF {
  dataUrl: string;
  /** ancho / alto de la imagen */
  relacion: number;
}

/** Carga un logotipo de `public/` como data URL y calcula su proporción */
export async function cargarLogo(ruta: string): Promise<LogoPDF | null> {
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

/** Documento A4 con encabezado, flujo de contenido y pies de página */
export interface DocumentoPDF {
  doc: jsPDF;
  ancho: number;
  alto: number;
  anchoUtil: number;
  /** Mueve el cursor vertical */
  avanzar(distancia: number): void;
  /** Posición vertical actual (para dibujos personalizados) */
  posicion(): number;
  /** Fija la posición vertical (para dibujos personalizados) */
  colocar(valor: number): void;
  /** Asegura espacio; si no cabe, abre página nueva con su encabezado */
  saltar(espacio: number): void;
  /** Título de sección con regla */
  seccion(titulo: string): void;
  /** Título de portada bajo el encabezado (con detalle opcional) */
  portada(titulo: string, detalle?: string): void;
  /** Renglón etiqueta/valor en dos columnas */
  campo(etiqueta: string, valor: string, columna: 0 | 1): void;
  /** Texto largo con ajuste de línea */
  parrafo(etiqueta: string, texto: string): void;
  /** Dibuja los pies con los logotipos en todas las hojas */
  finalizar(): void;
}

export interface OpcionesDocumento {
  /** Título del documento (aparece en el encabezado) */
  titulo: string;
  /** Folio del expediente (número de control) */
  folio: string;
  /** Nombre del paciente (aparece en el encabezado) */
  nombre: string;
}

/** Crea el documento A4 con el encabezado de la marca ya dibujado */
export async function crearDocumentoPDF(opciones: OpcionesDocumento): Promise<DocumentoPDF> {
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
    const altoLogo = 11;
    if (logoSoftware) {
      doc.addImage(logoSoftware.dataUrl, 'PNG', M, 8, altoLogo * logoSoftware.relacion, altoLogo);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(...NAVY);
      doc.text('MediTec-ITS', M, 15);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(opciones.titulo, ancho - M, 12, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text(`Folio ${opciones.folio}`, ancho - M, 17, { align: 'right' });
    doc.text(opciones.nombre, ancho - M, 21, { align: 'right' });

    doc.setDrawColor(...LINE);
    doc.line(M, ALTO_ENCABEZADO - 3, ancho - M, ALTO_ENCABEZADO - 3);
  };

  /* ---------- Pie (todas las páginas): empresa + software ---------- */
  const dibujarPie = () => {
    const base = alto - ALTO_PIE + 6;
    doc.setDrawColor(...LINE);
    doc.line(M, base - 4, ancho - M, base - 4);

    const altoPieLogo = 6.5;
    if (logoEmpresa) {
      doc.addImage(
        logoEmpresa.dataUrl,
        'PNG',
        M,
        base,
        altoPieLogo * logoEmpresa.relacion,
        altoPieLogo,
      );
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      doc.text('Cuchipu Cloud', M, base + 5);
    }
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

  dibujarEncabezado();
  let y = ALTO_ENCABEZADO + 6;

  /** Asegura espacio; si no cabe, abre página nueva con su encabezado */
  const saltar = (espacio: number) => {
    if (y + espacio > alto - ALTO_PIE) {
      doc.addPage();
      dibujarEncabezado();
      y = ALTO_ENCABEZADO + 4;
    }
  };

  return {
    doc,
    ancho,
    alto,
    anchoUtil,

    avanzar(distancia: number) {
      y += distancia;
    },

    posicion() {
      return y;
    },

    colocar(valor: number) {
      y = valor;
    },

    saltar,

    portada(titulo: string, detalle?: string) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(...NAVY);
      doc.text(titulo, M, y);
      y += 7;
      if (detalle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...GRAY);
        doc.text(detalle, M, y);
        y += 7;
      }
      y += 3;
    },

    seccion(titulo: string) {
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
    },

    campo(etiqueta: string, valor: string, columna: 0 | 1) {
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
    },

    parrafo(etiqueta: string, texto: string) {
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
    },

    finalizar() {
      const total = doc.getNumberOfPages();
      for (let pagina = 1; pagina <= total; pagina++) {
        doc.setPage(pagina);
        dibujarPie();
      }
    },
  };
}
