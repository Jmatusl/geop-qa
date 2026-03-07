/**
 * MÓDULO: Informe de Entrega — Solicitudes Internas de Bodega
 * PROPÓSITO: Genera el PDF de comprobante de retiro/entrega, incluyendo:
 *  - Encabezado con logo corporativo y folio
 *  - Ficha de metadatos (receptor, bodeguero, fechas)
 *  - Tabla de artículos (solicitado vs. entregado)
 *  - Bloque de firmas: bodeguero (firma digital del sistema) + receptor (canvas)
 *  - Evidencia fotográfica en thumbnails (si existe)
 *  - Footer con paginación y fecha de generación
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// ── Constantes de diseño ────────────────────────────────────────────────────
const PRIMARY: [number, number, number] = [40, 60, 127]; // #283c7f
const LIGHT_GRAY: [number, number, number] = [240, 240, 245];
const TEXT_COLOR = 50;
const MUTED_COLOR = 120;

// ── Tipos de entrada ────────────────────────────────────────────────────────

export interface InformeEntregaData {
  folio: string;
  title: string;
  warehouseName: string;
  requesterName: string;
  bodegueroName: string;
  /** ISO string */
  deliveredAt: string;
  receptorNombre: string;
  receptorRut?: string | null;
  observaciones?: string | null;
  /** Base64 PNG de firma del receptor capturada en el canvas */
  firmaReceptorBase64?: string | null;
  /** Base64 PNG/JPG imagen de firma del sistema (/mantenedores/firmas) */
  firmaBodegueroBase64?: string | null;
  /** Base64 de foto de evidencia (opcional) */
  fotoEvidenciaBase64?: string | null;
  items: {
    articleCode: string;
    articleName: string;
    /** Cantidad solicitada (string numérico) */
    quantity: string;
    /** Cantidad entregada (string numérico) */
    deliveredQuantity: string;
    unit: string;
    warehouseName?: string | null;
  }[];
  logs: {
    action: string;
    description: string;
    createdAt: string;
    creatorName?: string | null;
  }[];
  /** Base64 del logo corporativo (opcional; se toma de la BD en el endpoint) */
  logoBase64?: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Calcula dimensiones proporcionales para imágenes */
function fitDimensions(srcW: number, srcH: number, maxW: number, maxH: number) {
  const ratio = Math.min(maxW / srcW, maxH / srcH);
  return { w: srcW * ratio, h: srcH * ratio };
}

/** Inserta imagen base64 de forma segura */
function addImageSafe(doc: jsPDF, data: string, x: number, y: number, w: number, h: number) {
  try {
    const fmt = data.includes("data:image/jpeg") || data.includes("data:image/jpg") ? "JPEG" : "PNG";
    doc.addImage(data, fmt, x, y, w, h);
    return true;
  } catch {
    return false;
  }
}

// ── Generador principal ──────────────────────────────────────────────────────

export async function generateInformeEntrega(data: InformeEntregaData): Promise<Buffer> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const ML = 15; // margen izquierdo
  const MR = 15; // margen derecho
  const CW = PW - ML - MR; // ancho de contenido

  let y = 12;

  // ── 1. Logo corporativo ──────────────────────────────────────────────────
  if (data.logoBase64) {
    try {
      // Posicionar logo izquierda
      addImageSafe(doc, data.logoBase64, ML, y, 35, 14);
    } catch {
      /* ignorar si falla */
    }
  }

  // ── 2. Título alineado a la derecha ─────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...PRIMARY);
  doc.text("INFORME DE ENTREGA", PW - MR, y + 5, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(MUTED_COLOR);
  doc.text("SOLICITUD INTERNA DE BODEGA", PW - MR, y + 11, { align: "right" });

  // Línea separadora
  y += 18;
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.6);
  doc.line(ML, y, PW - MR, y);
  y += 5;

  // ── 3. Ficha de metadatos ────────────────────────────────────────────────
  const fechaEntrega = format(new Date(data.deliveredAt), "dd/MM/yyyy HH:mm", { locale: es });
  const fechaGen = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });

  const metaBody: any[][] = [
    [
      { content: "FOLIO:", styles: { fontStyle: "bold" as const, textColor: PRIMARY } },
      { content: data.folio, styles: { fontStyle: "bold" as const } },
      { content: "FECHA ENTREGA:", styles: { fontStyle: "bold" as const, textColor: PRIMARY } },
      fechaEntrega,
    ],
    [
      { content: "BODEGA:", styles: { fontStyle: "bold" as const, textColor: PRIMARY } },
      data.warehouseName,
      { content: "ENTREGADO POR:", styles: { fontStyle: "bold" as const, textColor: PRIMARY } },
      data.bodegueroName.toUpperCase(),
    ],
    [
      { content: "SOLICITANTE:", styles: { fontStyle: "bold" as const, textColor: PRIMARY } },
      data.requesterName.toUpperCase(),
      { content: "RECEPTOR:", styles: { fontStyle: "bold" as const, textColor: PRIMARY } },
      `${data.receptorNombre.toUpperCase()}${data.receptorRut ? ` (${data.receptorRut})` : ""}`,
    ],
    [
      { content: "TÍTULO:", styles: { fontStyle: "bold" as const, textColor: PRIMARY } },
      { content: data.title, colSpan: 3 },
    ],
  ];

  autoTable(doc, {
    startY: y,
    body: metaBody,
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 1.8, overflow: "linebreak", textColor: TEXT_COLOR },
    columnStyles: {
      0: { cellWidth: 33 },
      1: { cellWidth: CW / 2 - 33 },
      2: { cellWidth: 33 },
      3: { cellWidth: CW / 2 - 33 },
    },
    margin: { left: ML, right: MR },
  });

  // @ts-ignore
  y = doc.lastAutoTable.finalY + 3;

  // Observaciones
  if (data.observaciones) {
    autoTable(doc, {
      startY: y,
      body: [[{ content: "OBSERVACIONES:", styles: { fontStyle: "bold" as const, cellWidth: 33 } }, data.observaciones]],
      theme: "plain",
      styles: { fontSize: 8.5, cellPadding: 1.8 },
      columnStyles: { 1: { cellWidth: "auto" } },
      margin: { left: ML, right: MR },
    });
    // @ts-ignore
    y = doc.lastAutoTable.finalY + 3;
  }

  y += 4;

  // ── 4. Tabla de artículos ────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY);
  doc.text("DETALLE DE ARTÍCULOS", ML, y);
  y += 3;

  const GREEN: [number, number, number] = [30, 100, 60];
  const itemsBody: any[][] = data.items.map((it, idx) => [
    (idx + 1).toString(),
    it.articleCode,
    it.articleName,
    it.warehouseName || "-",
    `${it.quantity} ${it.unit}`,
    { content: `${it.deliveredQuantity} ${it.unit}`, styles: { fontStyle: "bold" as const, textColor: GREEN } },
  ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "CÓDIGO", "DESCRIPCIÓN", "BODEGA ORIGEN", "SOLICITADO", "ENTREGADO"]],
    body: itemsBody,
    theme: "grid",
    headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontStyle: "bold", halign: "center", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: TEXT_COLOR, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 25 },
      2: { cellWidth: "auto" },
      3: { cellWidth: 35 },
      4: { cellWidth: 22, halign: "center" },
      5: { cellWidth: 22, halign: "center" },
    },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    margin: { left: ML, right: MR },
  });

  // @ts-ignore
  y = doc.lastAutoTable.finalY + 8;

  // ── 5. Trazabilidad / Historial ──────────────────────────────────────────
  if (data.logs && data.logs.length > 0) {
    if (y > PH - 70) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...PRIMARY);
    doc.text("TRAZABILIDAD", ML, y);
    y += 3;

    const histBody = data.logs.map((l) => [format(new Date(l.createdAt), "dd/MM/yy HH:mm", { locale: es }), l.creatorName || "Sistema", l.action, l.description]);

    autoTable(doc, {
      startY: y,
      head: [["FECHA", "USUARIO", "ACCIÓN", "DESCRIPCIÓN"]],
      body: histBody,
      theme: "striped",
      headStyles: { fillColor: [80, 80, 80], textColor: [255, 255, 255], fontSize: 7 },
      bodyStyles: { fontSize: 7, textColor: TEXT_COLOR, cellPadding: 1.5 },
      columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 35 }, 2: { cellWidth: 28 }, 3: { cellWidth: "auto" } },
      margin: { left: ML, right: MR },
    });

    // @ts-ignore
    y = doc.lastAutoTable.finalY + 10;
  }

  // ── 6. Bloque de firmas ──────────────────────────────────────────────────
  // Cada bloque: 70mm ancho, 35mm alto, separados por 20mm
  const SIG_W = 70;
  const SIG_H = 35;
  const SIG_GAP = 20;
  const leftX = (PW - (SIG_W * 2 + SIG_GAP)) / 2;
  const rightX = leftX + SIG_W + SIG_GAP;
  const sigLineY = y + SIG_H; // línea en la base del bloque

  // Verificar que cabe en la página (firmas + margen)
  if (sigLineY + 25 > PH - 15) {
    doc.addPage();
    y = 20;
  }

  const lineY = y + SIG_H;

  // Líneas de firma
  doc.setDrawColor(150);
  doc.setLineWidth(0.4);
  doc.line(leftX, lineY, leftX + SIG_W, lineY);
  doc.line(rightX, lineY, rightX + SIG_W, lineY);

  // ── Firma bodeguero (imagen del sistema si existe) ─────────────────────
  if (data.firmaBodegueroBase64) {
    addImageSafe(doc, data.firmaBodegueroBase64, leftX + 10, y + 2, SIG_W - 20, SIG_H - 8);
  }

  // ── Firma receptor (canvas del modal) ─────────────────────────────────
  if (data.firmaReceptorBase64) {
    addImageSafe(doc, data.firmaReceptorBase64, rightX + 10, y + 2, SIG_W - 20, SIG_H - 8);
  }

  // Etiquetas
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(MUTED_COLOR);
  doc.text("ENTREGADO POR", leftX + SIG_W / 2, lineY + 5, { align: "center" });
  doc.text("RECIBIDO CONFORME", rightX + SIG_W / 2, lineY + 5, { align: "center" });

  // Nombres
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(data.bodegueroName.toUpperCase(), leftX + SIG_W / 2, lineY + 11, { align: "center" });
  doc.text(data.receptorNombre.toUpperCase(), rightX + SIG_W / 2, lineY + 11, { align: "center" });

  if (data.receptorRut) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(MUTED_COLOR);
    doc.text(data.receptorRut, rightX + SIG_W / 2, lineY + 16, { align: "center" });
  }

  y = lineY + 25;

  // ── 7. Evidencia fotográfica ─────────────────────────────────────────────
  if (data.fotoEvidenciaBase64) {
    if (y > PH - 65) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...PRIMARY);
    doc.text("EVIDENCIA FOTOGRÁFICA", ML, y);
    y += 4;

    const thumbW = 75;
    const thumbH = 55;
    const ok = addImageSafe(doc, data.fotoEvidenciaBase64, ML, y, thumbW, thumbH);
    if (ok) {
      doc.setDrawColor(200);
      doc.rect(ML, y, thumbW, thumbH);
      y += thumbH + 5;
    }
  }

  // ── 8. Footer con paginación ─────────────────────────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(MUTED_COLOR);
    doc.text(`Página ${i} de ${totalPages}  •  Generado el ${fechaGen}  •  Folio ${data.folio}`, PW / 2, PH - 8, { align: "center" });
  }

  return Buffer.from(doc.output("arraybuffer"));
}
