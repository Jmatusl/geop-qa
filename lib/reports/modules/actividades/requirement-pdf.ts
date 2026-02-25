import { PdfEngine } from "../../core/pdf-engine";
import { format } from "date-fns";
import { es } from "date-fns/locale/es";
import { formatRUT } from "@/lib/utils/chile-utils";
import autoTable from "jspdf-autotable";

export class ActivityRequirementPdf extends PdfEngine {
  constructor() {
    super({
      title: "Requerimiento de Actividad",
    });
  }

  /**
   * Genera el contenido específico del Requerimiento de Actividad
   */
  async generate(data: { requirement: any; companyData?: any; userSignature?: string; userRut?: string }) {
    const { requirement, companyData, userSignature, userRut } = data;

    // 1. Encabezado y Logo
    await this.applyHeader();

    const marginX = 15;
    let currentY = 35;

    // Folio y Fecha emisión (Fecha a la derecha)
    this.doc.setFontSize(9);
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(0);
    
    // Obtener el proveedor principal (primera actividad con proveedor)
    const mainSupplier = requirement.activities?.[0]?.supplier;
    const supplierCode = mainSupplier?.fantasyName || mainSupplier?.legalName || "";
    const folio = `${requirement.folioPrefix}-${String(requirement.folio).padStart(4, "0")}${supplierCode ? " - " + supplierCode : ""}`;
    
    this.doc.text(`Folio: ${folio}`, marginX, currentY);
    this.doc.text(`Fecha: ${format(new Date(), "dd/MM/yyyy")}`, 195, currentY, { align: "right" });
    currentY += 8;

    // 2. Cuadro de Información del Requerimiento
    const boxHeight = 52;
    this.doc.setDrawColor(0);
    this.doc.setLineWidth(0.3);
    this.doc.rect(marginX, currentY, 180, boxHeight);

    this.doc.setFontSize(8);
    const labelX = marginX + 3;
    const valueStartX = marginX + 35;

    // Aplicante (Solicitante)
    const applicantName = requirement.applicant 
      ? `${requirement.applicant.firstName} ${requirement.applicant.lastName}` 
      : requirement.nombreSolicitante || "N/A";

    // Estado
    const estado = requirement.status?.name || "Sin estado";

    // Prioridad
    const prioridad = requirement.priority?.name || "N/A";

    // Proveedor principal
    const proveedorName = mainSupplier?.fantasyName || mainSupplier?.legalName || "N/A";
    const proveedorRut = mainSupplier?.rut ? formatRUT(mainSupplier.rut) : "N/A";

    // Área/Ubicación
    const areaName = requirement.location?.name || "N/A";

    // Nave
    const naveName = requirement.ship?.name || "N/A";

    let lineY = currentY + 6;
    const lineSpacing = 6;

    this.doc.setFont("helvetica", "bold");
    this.doc.text("Requerimiento:", labelX, lineY);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(requirement.title || "Sin título", valueStartX, lineY);

    lineY += lineSpacing;
    this.doc.setFont("helvetica", "bold");
    this.doc.text("Nave:", labelX, lineY);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(naveName, valueStartX, lineY);

    lineY += lineSpacing;
    this.doc.setFont("helvetica", "bold");
    this.doc.text("Solicitante:", labelX, lineY);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(applicantName, valueStartX, lineY);

    lineY += lineSpacing;
    this.doc.setFont("helvetica", "bold");
    this.doc.text("Estado:", labelX, lineY);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(estado, valueStartX, lineY);

    lineY += lineSpacing;
    this.doc.setFont("helvetica", "bold");
    this.doc.text("Prioridad:", labelX, lineY);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(prioridad, valueStartX, lineY);

    lineY += lineSpacing;
    this.doc.setFont("helvetica", "bold");
    this.doc.text("Proveedor:", labelX, lineY);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(proveedorName, valueStartX, lineY);

    lineY += lineSpacing;
    this.doc.setFont("helvetica", "bold");
    this.doc.text("RUT Proveedor:", labelX, lineY);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(proveedorRut, valueStartX, lineY);

    lineY += lineSpacing;
    this.doc.setFont("helvetica", "bold");
    this.doc.text("Área:", labelX, lineY);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(areaName, valueStartX, lineY);

    currentY += boxHeight + 12;

    // 3. Sección ACTIVIDADES
    this.doc.setFontSize(10);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("ACTIVIDADES:", marginX, currentY);
    currentY += 5;

    // 4. Tabla de Actividades (si existen)
    if (requirement.activities && requirement.activities.length > 0) {
      for (const act of requirement.activities) {
        // Datos de la actividad
        const actSupplier = act.supplier?.fantasyName || act.supplier?.legalName || "N/A";
        const actResponsable = act.responsible 
          ? `${act.responsible.firstName} ${act.responsible.lastName}` 
          : "N/A";
        const actEstado = act.status?.name || "N/A";
        const actFechaInicio = act.startDate 
          ? format(new Date(act.startDate), "dd/MM/yy") 
          : "—";
        const actFechaFin = act.endDate 
          ? format(new Date(act.endDate), "dd/MM/yy") 
          : "—";

        // Construir las filas del body
        const bodyRows = [
          // Fila 1: Datos de la actividad
          [
            act.name || "Sin nombre",
            actResponsable,
            actEstado,
            actSupplier,
            actFechaInicio,
            actFechaFin,
          ],
          // Fila 2: Lugar (se va a hacer colspan en didParseCell)
          ["Lugar: —", "", "", "", "", ""],
          // Fila 3: Título Descripción (se va a hacer colspan en didParseCell)
          ["Descripción:", "", "", "", "", ""],
          // Fila 4: Texto de descripción (se va a hacer colspan en didParseCell)
          [act.description || "Sin descripción", "", "", "", "", ""],
        ];

        autoTable(this.doc, {
          startY: currentY,
          margin: { left: marginX, right: marginX },
          head: [["Actividad", "Responsable", "Estado", "Proveedor", "F. Inicio", "F. Fin"]],
          body: bodyRows,
          headStyles: {
            fillColor: [40, 60, 127], // Azul corporativo
            fontSize: 8,
            halign: "left",
            textColor: [255, 255, 255],
            cellPadding: 2,
          },
          bodyStyles: {
            fontSize: 7,
            halign: "left",
            cellPadding: 1.5,
          },
          columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 30 },
            2: { cellWidth: 25 },
            3: { cellWidth: 45 },
            4: { cellWidth: 20 },
            5: { cellWidth: 20 },
          },
          theme: "grid",
          didParseCell: (data) => {
            // Fila 2 (índice 1): "Lugar: —" con fondo gris
            if (data.section === "body" && data.row.index === 1) {
              if (data.column.index === 0) {
                data.cell.colSpan = 6;
                data.cell.styles.fillColor = [235, 235, 235]; // Gris claro
                data.cell.styles.fontStyle = "bold";
              } else {
                // Ocultar las demás celdas porque están fusionadas
                data.cell.styles.fillColor = [235, 235, 235];
                data.cell.styles.textColor = [235, 235, 235];
              }
            }
            // Fila 3 (índice 2): "Descripción:" con fondo gris
            if (data.section === "body" && data.row.index === 2) {
              if (data.column.index === 0) {
                data.cell.colSpan = 6;
                data.cell.styles.fillColor = [235, 235, 235]; // Gris claro
                data.cell.styles.fontStyle = "bold";
              } else {
                data.cell.styles.fillColor = [235, 235, 235];
                data.cell.styles.textColor = [235, 235, 235];
              }
            }
            // Fila 4 (índice 3): Texto de descripción (colspan sin fondo)
            if (data.section === "body" && data.row.index === 3) {
              if (data.column.index === 0) {
                data.cell.colSpan = 6;
                data.cell.styles.fontStyle = "normal";
              } else {
                data.cell.styles.textColor = [255, 255, 255]; // Ocultar contenido
              }
            }
          },
        });

        currentY = (this.doc as any).lastAutoTable.finalY + 5;
      }
    } else {
      currentY += 5;
    }

    // 5. Footer con Firmas (posicionar siempre al final de la página)
    // Calcular posición del footer (reservar 50mm desde el final de la página)
    const pageHeight = this.doc.internal.pageSize.height;
    const footerStartY = pageHeight - 50;

    // Si el contenido actual está muy abajo, agregar nueva página
    if (currentY > footerStartY - 10) {
      this.doc.addPage();
      currentY = 20;
    } else {
      currentY = footerStartY;
    }

    // Líneas de firma
    const signatureWidth = 50;
    const signatureSpacing = 65;

    this.doc.setDrawColor(0);
    this.doc.setLineWidth(0.3);
    this.doc.setTextColor(0);

    // Firma 1: Aprobador
    const approverName = requirement.approvedBy 
      ? `${requirement.approvedBy.firstName} ${requirement.approvedBy.lastName}` 
      : "";
    this.doc.line(marginX, currentY, marginX + signatureWidth, currentY);
    this.doc.setFontSize(7);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(approverName, marginX + signatureWidth / 2, currentY + 4, { align: "center" });
    this.doc.setFont("helvetica", "italic");
    this.doc.text("APROBADOR", marginX + signatureWidth / 2, currentY + 8, { align: "center" });

    // Firma 2: Solicitante
    const solicitanteX = marginX + signatureSpacing;
    this.doc.line(solicitanteX, currentY, solicitanteX + signatureWidth, currentY);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(applicantName, solicitanteX + signatureWidth / 2, currentY + 4, { align: "center" });
    this.doc.setFont("helvetica", "italic");
    this.doc.text("SOLICITANTE", solicitanteX + signatureWidth / 2, currentY + 8, { align: "center" });

    // Firma 3: Proveedor
    const proveedorX = marginX + signatureSpacing * 2;
    this.doc.line(proveedorX, currentY, proveedorX + signatureWidth, currentY);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(proveedorName, proveedorX + signatureWidth / 2, currentY + 4, { align: "center" });
    if (proveedorRut !== "N/A") {
      this.doc.setFontSize(6);
      this.doc.text(`RUT: ${proveedorRut}`, proveedorX + signatureWidth / 2, currentY + 7, { align: "center" });
      this.doc.setFontSize(7);
      this.doc.setFont("helvetica", "italic");
      this.doc.text("PROVEEDOR", proveedorX + signatureWidth / 2, currentY + 10, { align: "center" });
    } else {
      this.doc.setFont("helvetica", "italic");
      this.doc.text("PROVEEDOR", proveedorX + signatureWidth / 2, currentY + 8, { align: "center" });
    }

    currentY += 18;

    // 6. Recuadro "RECEPCIÓN CONFORME"
    const boxWidth = 60;
    const boxHeight2 = 25;
    const boxX = (this.doc.internal.pageSize.width - boxWidth) / 2;

    this.doc.setDrawColor(0);
    this.doc.setLineWidth(0.5);
    this.doc.rect(boxX, currentY, boxWidth, boxHeight2);

    this.doc.setFontSize(9);
    this.doc.setFont("helvetica", "bold");
    this.doc.text("RECEPCIÓN CONFORME", boxX + boxWidth / 2, currentY + 5, { align: "center" });

    const fieldY = currentY + 10;
    const fieldSpacing = 5;

    this.doc.setFontSize(7);
    this.doc.setFont("helvetica", "normal");
    
    // Nombre:
    this.doc.text("Nombre:", boxX + 2, fieldY);
    this.doc.line(boxX + 15, fieldY, boxX + boxWidth - 2, fieldY);

    // RUT:
    this.doc.text("RUT:", boxX + 2, fieldY + fieldSpacing);
    this.doc.line(boxX + 15, fieldY + fieldSpacing, boxX + boxWidth - 2, fieldY + fieldSpacing);

    // Firma:
    this.doc.text("Firma:", boxX + 2, fieldY + fieldSpacing * 2);
    this.doc.line(boxX + 15, fieldY + fieldSpacing * 2, boxX + boxWidth - 2, fieldY + fieldSpacing * 2);
  }
}
