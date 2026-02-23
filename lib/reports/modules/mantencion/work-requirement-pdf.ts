import { PdfEngine } from "../../core/pdf-engine";
import { format } from "date-fns";
import { es } from "date-fns/locale/es";
import { formatRUT } from "@/lib/utils/chile-utils";
import autoTable from "jspdf-autotable";

export class WorkRequirementPdf extends PdfEngine {
  constructor() {
    super({
      title: "Solicitud de Trabajo",
    });
  }

  /**
   * Genera el contenido específico de la Solicitud de Trabajo
   */
  async generate(data: { wr: any; companyData?: any; userSignature?: string; userRut?: string }) {
    const { wr, companyData, userSignature, userRut } = data;

    // 1. Encabezado y Logo
    await this.applyHeader();

    const marginX = 15;
    let currentY = 35;

    // Folio y Fecha emisión
    this.doc.setFontSize(9);
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(0);
    this.doc.text(`Folio: ${wr.folio}`, marginX, currentY);
    this.doc.text(`Fecha emisión: ${format(new Date(), "dd-MM-yyyy")}`, 195, currentY, { align: "right" });
    currentY += 10;

    // 2. Cuadro Empresa
    this.doc.setDrawColor(200);
    this.doc.rect(marginX, currentY, 180, 25);

    this.doc.setFontSize(8);
    const labelX = marginX + 3;
    const valueX = marginX + 45;

    this.doc.text("EMPRESA:", labelX, currentY + 6);
    this.doc.text("RUT:", labelX, currentY + 12);
    this.doc.text("DIRECCIÓN:", labelX, currentY + 18);
    this.doc.text("GIRO:", labelX, currentY + 24);

    this.doc.setFont("helvetica", "normal");
    this.doc.text(companyData?.name || "Rio Dulce SA", valueX, currentY + 6);
    this.doc.text(companyData?.rut || "96.989.370-3", valueX, currentY + 12);
    this.doc.text(companyData?.address || "Av. Diego Portales 2000, piso 5, Puerto Montt, Chile", valueX, currentY + 18);
    this.doc.text(companyData?.businessLine || "Transporte Marítimo y Procesamiento de especies hidrobiológicas", valueX, currentY + 24);

    currentY += 35;

    // 3. Cuadro Proveedor/Detalle
    this.doc.rect(marginX, currentY, 180, 45);
    this.doc.setFont("helvetica", "bold");

    this.doc.text("SEÑOR(ES):", labelX, currentY + 6);
    this.doc.text("RUT:", labelX, currentY + 12);
    this.doc.text("TÍTULO:", labelX, currentY + 18);
    this.doc.text("DESCRIPCIÓN:", labelX, currentY + 24);
    this.doc.text("SOLICITANTE:", labelX, currentY + 36);
    this.doc.text("INSTALACIÓN:", labelX, currentY + 42);

    this.doc.setFont("helvetica", "normal");
    this.doc.text(wr.provider.legalName || wr.provider.fantasyName, valueX, currentY + 6);
    this.doc.text(formatRUT(wr.provider.rut), valueX, currentY + 12);
    this.doc.text(wr.title || "", valueX, currentY + 18);

    // Descripción multilínea
    const splitDesc = this.doc.splitTextToSize(wr.description || "N/A", 130);
    this.doc.text(splitDesc, valueX, currentY + 24);

    this.doc.text(`${wr.createdBy.firstName} ${wr.createdBy.lastName}`, valueX, currentY + 36);
    this.doc.text(wr.requests?.[0]?.request?.installation?.name || "N/A", valueX, currentY + 42);

    currentY += 55;

    // 4. Tabla de Requerimientos
    autoTable(this.doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [["FOLIO", "DESCRIPCIÓN DEL REQUERIMIENTO", "EQUIPO"]],
      body: wr.requests.map((rel: any) => [`${rel.request.folioPrefix}-${rel.request.folio}`, rel.request.description || "Sin descripción", rel.request.equipment.name]),
      headStyles: {
        fillColor: [40, 60, 127], // Azul corporativo
        fontSize: 8,
        halign: "left",
      },
      bodyStyles: {
        fontSize: 7,
        halign: "left",
      },
      theme: "grid",
    });

    // 5. Footer con Firmas
    const finalY = (this.doc as any).lastAutoTable.finalY + 30;
    const signatureWidth = 50;
    const signatureY = finalY + 20;

    // Líneas
    this.doc.setDrawColor(0);
    this.doc.setLineWidth(0.3);

    // Firma 1: Jefatura
    this.doc.line(marginX, signatureY, marginX + signatureWidth, signatureY);
    this.doc.setFontSize(7);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("Jefatura", marginX + signatureWidth / 2, signatureY + 4, { align: "center" });

    // Firma 2: Instalación
    const instName = wr.requests?.[0]?.request?.installation?.name || "Instalación";
    this.doc.line(marginX + 65, signatureY, marginX + 65 + signatureWidth, signatureY);
    this.doc.text(instName, marginX + 65 + signatureWidth / 2, signatureY + 4, { align: "center" });

    // Firma 3: Emisor (Con firma digital si existe)
    const emisorX = marginX + 130;
    this.doc.line(emisorX, signatureY, emisorX + signatureWidth, signatureY);

    if (userSignature) {
      try {
        this.doc.addImage(userSignature, "PNG", emisorX + 5, signatureY - 15, 40, 12);
      } catch (e) {
        console.warn("PdfEngine: Could not add user signature image", e);
      }
    }

    const userName = `${wr.createdBy.firstName} ${wr.createdBy.lastName}`.toUpperCase();
    this.doc.text(userName, emisorX + signatureWidth / 2, signatureY + 4, { align: "center" });
    if (userRut) {
      this.doc.text(`RUT: ${formatRUT(userRut)}`, emisorX + signatureWidth / 2, signatureY + 8, { align: "center" });
    }
  }
}
