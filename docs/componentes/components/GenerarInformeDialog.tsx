"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Mail, Loader, ShoppingCart } from "lucide-react";
import { useCotizacion } from "@/hooks/useCotizaciones";
import { useProveedoresQuery } from "@/hooks/useProveedor";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getStatusLabel } from "@/utils/statusLabels";
import { generarHtmlCorreoCotizacion } from "@/utils/generarHtmlCorreoCotizacion";
import { formatearRut } from "@/lib/formats";

interface GenerarInformeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cotizacionId: number;
}

export default function GenerarInformeDialog({ open, onOpenChange, cotizacionId }: GenerarInformeDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("email");

  const { data: cotizacionResp, isLoading } = useCotizacion(cotizacionId);
  const { data: proveedoresList } = useProveedoresQuery();
  const queryClient = useQueryClient();

  const cotizacion = cotizacionResp?.success ? cotizacionResp.data : null;

  useEffect(() => {
    if (!open || !cotizacion?.proveedor?.email || emailInput) return;
    setEmailInput(cotizacion.proveedor.email);
  }, [open, cotizacion?.proveedor?.email, emailInput]);

  const handleSendApprovalEmail = async () => {
    if (!cotizacion?.proveedorId || !emailInput) {
      toast.error("Falta información");
      return;
    }

    setIsSendingEmail(true);
    try {
      // Si hay un número de orden de compra, guardar primero
      if (purchaseOrderNumber && String(purchaseOrderNumber).trim() !== "") {
        const { actualizarNumeroOrdenCompra } = await import("@/actions/solicitud-insumos/cotizacionActions");
        const updateResult = await actualizarNumeroOrdenCompra(cotizacionId, purchaseOrderNumber);

        if (!updateResult.success) {
          toast.error("Error al guardar número de orden de compra");
          setIsSendingEmail(false);
          return;
        }
      }

      const { sendCotizacionApprovalEmail } = await import("@/app/dashboard/mantencion/solicitud-insumos/services/sendCotizacionApprovalEmail");

      const result = await sendCotizacionApprovalEmail({
        cotizacionId,
        proveedorNombre: cotizacion.proveedor?.razonSocial || cotizacion.proveedor?.nombre || "Proveedor",
        proveedorId: cotizacion.proveedorId,
        recipientEmail: emailInput,
        purchaseOrderNumber: purchaseOrderNumber || undefined,
        cotizacionFolio: cotizacion.folio,
        totalEstimado: cotizacion.totalEstimado ? Number(cotizacion.totalEstimado) : undefined,
        proveedoresList,
      });

      if (result.success) {
        toast.success("Correo enviado correctamente");
        queryClient.invalidateQueries({ queryKey: ["cotizacion", cotizacionId] });
        queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      } else {
        toast.error(result.message || "Error al enviar");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al enviar correo");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const generatePDFDocument = async () => {
    if (!cotizacion) return null;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 15;

    // ========== OBTENER LOGO ==========
    let logoBase64: string | null = null;
    try {
      const { getConfigByNameKey } = await import("@/actions/configActions");
      const logoConfig = await getConfigByNameKey("INFORME", "LOGO_OTPDF");
      logoBase64 = logoConfig?.value || null;

      if (logoBase64 && !logoBase64.startsWith("data:image/")) {
        console.warn("Logo de la base de datos no tiene formato base64 válido");
        logoBase64 = null;
      }
    } catch (error) {
      console.warn("Error al recuperar logo de la base de datos:", error);
    }

    // Usar logo fallback si no hay logo válido
    if (!logoBase64) {
      try {
        const response = await fetch("/logo-sotex-sin.png");
        if (response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();
          logoBase64 = await new Promise((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
      } catch (error) {
        console.warn("Error al obtener logo fallback:", error);
      }
    }

    // Agregar logo si existe (esquina superior izquierda)
    if (logoBase64) {
      try {
        const imgProps = doc.getImageProperties(logoBase64);
        const maxLogoWidth = 30;
        const maxLogoHeight = 20;

        let logoWidth = maxLogoWidth;
        let logoHeight = (imgProps.height * logoWidth) / imgProps.width;

        if (logoHeight > maxLogoHeight) {
          logoHeight = maxLogoHeight;
          logoWidth = (imgProps.width * logoHeight) / imgProps.height;
        }

        doc.addImage(logoBase64, "PNG", 15, 10, logoWidth, logoHeight);
      } catch (error) {
        console.warn("Error al agregar logo:", error);
      }
    }

    // Título principal en negro
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0); // Negro
    doc.text("INFORME DE COTIZACIÓN", pageWidth / 2, 20, { align: "center" });

    // Subtítulo
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139); // Gris
    doc.text("Documento de Análisis de Propuesta Comercial", pageWidth / 2, 27, { align: "center" });

    // Línea separadora
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(15, 32, pageWidth - 15, 32);

    // Resetear color de texto
    doc.setTextColor(0, 0, 0);
    yPos = 38;

    // ========== INFORMACIÓN DE LA COTIZACIÓN CON CAJA DESTACADA ==========
    // Caja con fondo gris claro
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(15, yPos, pageWidth - 30, 52, 3, 3, "FD");

    yPos += 5;

    // Título de sección en negro
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0); // Negro
    doc.text("INFORMACIÓN DE LA COTIZACIÓN", 20, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    // Información en dos columnas para mejor aprovechamiento del espacio
    const col1X = 20;
    const col2X = pageWidth / 2 + 5;
    const labelWidth = 27; // Ancho consistente para alinear valores
    const startY = yPos;

    // Columna 1
    doc.setFont("helvetica", "bold");
    doc.text("Folio Cotización:", col1X, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(cotizacion.folio || "N/A", col1X + labelWidth, yPos);
    yPos += 4;

    doc.setFont("helvetica", "bold");
    doc.text("Solicitud Origen:", col1X, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(cotizacion.solicitud?.folio || "N/A", col1X + labelWidth, yPos);
    yPos += 4;

    doc.setFont("helvetica", "bold");
    doc.text("Instalación:", col1X, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(cotizacion.solicitud?.ship?.name || "N/A", col1X + labelWidth, yPos);
    yPos += 4;

    doc.setFont("helvetica", "bold");
    doc.text("Solicitante:", col1X, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(cotizacion.solicitud?.solicitante?.name || "N/A", col1X + labelWidth, yPos);

    // Columna 2
    yPos = startY;
    doc.setFont("helvetica", "bold");
    doc.text("Estado:", col2X, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(getStatusLabel(cotizacion.status) || "N/A", col2X + labelWidth, yPos);
    yPos += 4;

    doc.setFont("helvetica", "bold");
    doc.text("Fecha de Envío:", col2X, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(cotizacion.fechaEnvio ? format(new Date(cotizacion.fechaEnvio), "dd/MM/yyyy", { locale: es }) : "N/A", col2X + labelWidth, yPos);
    yPos += 4;

    doc.setFont("helvetica", "bold");
    doc.text("Fecha Límite:", col2X, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(cotizacion.fechaLimiteRespuesta ? format(new Date(cotizacion.fechaLimiteRespuesta), "dd/MM/yyyy", { locale: es }) : "N/A", col2X + labelWidth, yPos);
    yPos += 4;

    doc.setFont("helvetica", "bold");
    doc.text("Generado:", col2X, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(format(new Date(), "dd/MM/yyyy HH:mm", { locale: es }), col2X + labelWidth, yPos);

    yPos = startY + 16;
    yPos += 5;

    // ========== INFORMACIÓN DEL PROVEEDOR (SIN FONDO) ==========
    // Título de sección en negro (mismo margen que INFORMACIÓN DE LA COTIZACIÓN)
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0); // Negro
    doc.text("PROVEEDOR", 20, yPos);
    yPos += 8;

    doc.setFontSize(8);

    // Información en dos columnas compactas
    const provStartY = yPos;

    // Columna 1: Razón Social y RUT
    doc.setFont("helvetica", "bold");
    doc.text("Razón Social:", col1X, yPos);
    doc.setFont("helvetica", "normal");
    const razonLines = doc.splitTextToSize(cotizacion.proveedor?.razonSocial || "N/A", pageWidth - col1X - labelWidth - 15);
    doc.text(razonLines, col1X + labelWidth, yPos);
    yPos += razonLines.length * 4;

    doc.setFont("helvetica", "bold");
    doc.text("RUT:", col1X, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(cotizacion.proveedor?.rutProveedor || "N/A", col1X + labelWidth, yPos);
    yPos += 4;

    // Columna 2: Email y Teléfono (bajados una línea para no solaparse)
    yPos = provStartY + razonLines.length * 4;
    doc.setFont("helvetica", "bold");
    doc.text("Email:", col2X, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(cotizacion.proveedor?.email || "N/A", col2X + labelWidth, yPos);
    yPos += 4;

    doc.setFont("helvetica", "bold");
    doc.text("Teléfono:", col2X, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(cotizacion.proveedor?.telefono || "N/A", col2X + labelWidth, yPos);

    yPos = provStartY + razonLines.length * 4 + 8;
    yPos += 6;

    // ========== ITEMS COTIZADOS TABLA COMPACTA (SIN FONDO) ==========
    // Título de sección simple (mismo margen que las demás secciones)
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0); // Negro
    doc.text("DETALLE DE PRODUCTOS Y SERVICIOS", 20, yPos);
    yPos += 8;

    // Preparar datos de la tabla de forma compacta
    const itemsData = (cotizacion.items || []).map((item: any, index: number) => {
      const description = item.name || "";
      const specs = item.technicalSpec ? ` - ${item.technicalSpec}` : "";
      return [(index + 1).toString(), description + specs, `${item.quantity || 0} ${item.unit || ""}`, item.leadTime ? `${item.leadTime} días` : "-"];
    });

    autoTable(doc, {
      startY: yPos,
      head: [["#", "Descripción", "Cant.", "Entreg."]],
      body: itemsData,
      theme: "plain", // Sin fondo en las filas
      headStyles: {
        fillColor: [71, 85, 105], // Gris oscuro solo en el encabezado
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
        cellPadding: 1.5,
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 1,
        textColor: [0, 0, 0],
        minCellHeight: 3.5,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: "center", fontStyle: "bold" },
        1: { cellWidth: 110 },
        2: { cellWidth: 30, halign: "center" },
        3: { cellWidth: 25, halign: "center" },
      },
      margin: { left: 15, right: 15 },
      tableWidth: pageWidth - 30, // Mismo ancho que el separador
      styles: {
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
        overflow: "linebreak",
      },
    });

    // Obtener la posición Y después de la tabla
    yPos = (doc as any).lastAutoTable.finalY + 10;

    // ========== RESUMEN FINANCIERO MEJORADO ==========
    const subtotal = cotizacion.neto ? Number(cotizacion.neto) : 0;
    const iva = cotizacion.iva ? Number(cotizacion.iva) : 0;
    const total = cotizacion.totalEstimado ? Number(cotizacion.totalEstimado) : 0;

    // Verificar si necesitamos nueva página
    if (yPos + 45 > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
    }

    // Caja de totales con fondo
    const boxX = pageWidth - 75;
    const boxY = yPos;
    const boxWidth = 60;
    const boxHeight = 28;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, "FD");

    yPos += 6;

    // Subtotal
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Subtotal (Neto):", boxX + 3, yPos);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(`$${subtotal.toLocaleString("es-CL")}`, boxX + boxWidth - 3, yPos, { align: "right" });
    yPos += 6;

    // IVA
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("IVA (19%):", boxX + 3, yPos);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(`$${iva.toLocaleString("es-CL")}`, boxX + boxWidth - 3, yPos, { align: "right" });
    yPos += 6;

    // Línea separadora
    doc.setDrawColor(203, 213, 225);
    doc.line(boxX + 3, yPos - 1, boxX + boxWidth - 3, yPos - 1);
    yPos += 2;

    // Total destacado
    doc.setFillColor(30, 64, 175);
    doc.roundedRect(boxX + 2, yPos - 3, boxWidth - 4, 8, 1, 1, "F");

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL:", boxX + 5, yPos + 2);
    doc.text(`$${total.toLocaleString("es-CL")}`, boxX + boxWidth - 5, yPos + 2, { align: "right" });
    doc.setTextColor(0, 0, 0);

    yPos = boxY + boxHeight + 8;

    // ========== CONDICIONES Y TÉRMINOS (SIN FONDO) ==========
    if (cotizacion.condicionesPago || cotizacion.leadTime || cotizacion.validezCotizacion || cotizacion.observaciones) {
      if (yPos + 35 > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }

      const condStartY = yPos;

      // Título de sección (sin fondo, solo borde)
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(15, yPos, pageWidth - 15, yPos);

      yPos += 6;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 64, 175);
      doc.text("CONDICIONES Y TÉRMINOS", 20, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 8;

      doc.setFontSize(9);

      if (cotizacion.condicionesPago) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.text("Condiciones de Pago:", 20, yPos);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        yPos += 5;
        const condicionesLines = doc.splitTextToSize(cotizacion.condicionesPago, pageWidth - 40);
        doc.text(condicionesLines, 20, yPos);
        yPos += condicionesLines.length * 4.5 + 3;
      }

      if (cotizacion.leadTime) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.text("Plazo de Entrega:", 20, yPos);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(`${cotizacion.leadTime} días`, 55, yPos);
        yPos += 5;
      }

      if (cotizacion.validezCotizacion) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.text("Válida hasta:", 20, yPos);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(format(new Date(cotizacion.validezCotizacion), "dd/MM/yyyy", { locale: es }), 48, yPos);
        yPos += 5;
      }

      if (cotizacion.observaciones) {
        yPos += 2;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.text("Observaciones:", 20, yPos);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        yPos += 5;
        const observacionesLines = doc.splitTextToSize(cotizacion.observaciones, pageWidth - 40);
        doc.text(observacionesLines, 20, yPos);
        yPos += observacionesLines.length * 4.5;
      }

      yPos += 8;
    }

    // ========== PIE DE PÁGINA MEJORADO ==========
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Línea superior del footer
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(15, pageHeight - 18, pageWidth - 15, pageHeight - 18);

      // Información del footer
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);

      // Izquierda: Información de generación
      doc.text(`Documento generado el ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}`, 15, pageHeight - 12);

      // Centro: Número de página
      doc.setFont("helvetica", "bold");
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 12, { align: "center" });

      // Derecha: Folio
      doc.setFont("helvetica", "normal");
      doc.text(`Folio: ${cotizacion.folio || cotizacionId}`, pageWidth - 15, pageHeight - 12, { align: "right" });

      // Nota legal
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text("Este documento es válido sin firma cuando es generado electrónicamente", pageWidth / 2, pageHeight - 7, { align: "center" });
    }

    // Resetear colores
    doc.setTextColor(0, 0, 0);

    return doc;
  };

  const handleGeneratePDF = async () => {
    if (!cotizacion) return;
    setIsGenerating(true);

    try {
      const doc = await generatePDFDocument();
      if (doc) {
        const fileName = `Informe_Cotizacion_${cotizacion.folio || cotizacionId}_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`;
        doc.save(fileName);
        toast.success("PDF descargado exitosamente");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al generar PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  // Generar preview del PDF cuando se abre el modal o cambia la cotización
  useEffect(() => {
    const generatePreview = async () => {
      if (open && cotizacion) {
        try {
          const doc = await generatePDFDocument();
          if (doc) {
            const pdfBlob = doc.output("blob");
            const url = URL.createObjectURL(pdfBlob);
            setPdfDataUrl(url);
          }
        } catch (error) {
          console.error("Error generando preview PDF:", error);
        }
      }
    };

    generatePreview();

    return () => {
      if (pdfDataUrl) {
        URL.revokeObjectURL(pdfDataUrl);
      }
    };
  }, [open, cotizacion]);

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[80vw] max-w-[80vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cargando...</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-8">
            <Loader className="h-6 w-6 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!cotizacion) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[80vw] max-w-[80vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className="text-red-600">No se pudo cargar la cotización</div>
        </DialogContent>
      </Dialog>
    );
  }

  const emailLog = cotizacion.emailLog && Array.isArray(cotizacion.emailLog) ? cotizacion.emailLog : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80vw] max-w-[80vw] h-[85vh] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Cotización: {cotizacion.folio}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 shrink-0">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Preview Email
            </TabsTrigger>
            <TabsTrigger value="pdf" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Preview PDF
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="hidden data-[state=active]:flex flex-1 flex-col mt-4 min-h-0">
            <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-2 gap-3">
                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-gray-600 dark:text-slate-400 uppercase font-semibold">Estado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge className="bg-green-600 dark:bg-green-700">{getStatusLabel(cotizacion.status)}</Badge>
                  </CardContent>
                </Card>
                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-gray-600 dark:text-slate-400 uppercase font-semibold">Proveedor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-semibold dark:text-slate-200">
                      {cotizacion.proveedor?.rutProveedor ? formatearRut(cotizacion.proveedor.rutProveedor) : cotizacion.proveedor?.nombre || "General"}
                    </div>
                    {cotizacion.proveedor?.razonSocial && <div className="text-xs text-gray-500 dark:text-slate-400 truncate capitalize leading-tight mt-0.5">{cotizacion.proveedor.razonSocial}</div>}
                    {/* Badge para Número de Orden de Compra */}
                    {cotizacion.purchaseOrderNumber && cotizacion.purchaseOrderNumber.trim() !== "" && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-600 dark:text-slate-400">OC:</span>
                        <div className="inline-flex items-center gap-1 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 px-2 py-1 rounded-md border border-green-300 dark:border-green-800 shadow-sm">
                          <ShoppingCart className="w-3 h-3 text-green-600 dark:text-green-500" />
                          <span className="text-xs font-bold text-green-700 dark:text-green-400">{cotizacion.purchaseOrderNumber}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-blue-300 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 dark:text-blue-400">
                    <Mail className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                    Enviar Correo de Aprobación
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs font-medium">Correos del Proveedor</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="correo@proveedor.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="h-8 text-sm flex-1 dark:bg-slate-950 dark:border-slate-800"
                      />
                      <Button onClick={handleSendApprovalEmail} disabled={isSendingEmail || !emailInput} size="sm" className="bg-green-600 hover:bg-green-700 h-8">
                        {isSendingEmail ? <Loader className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Enviar Correo
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium">N° de Orden de Compra (opcional)</label>
                    <Input placeholder="OC-2025-..." value={purchaseOrderNumber} onChange={(e) => setPurchaseOrderNumber(e.target.value)} className="h-8 text-sm" />
                  </div>

                  {/* Preview del correo */}
                  <div className="bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-700 dark:text-slate-300">Vista previa del correo:</p>
                    {cotizacion && (
                      <div className="bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-800 rounded p-2 text-xs">
                        <div>
                          <span className="font-semibold text-gray-600 dark:text-slate-400">De:</span> <span className="text-gray-700 dark:text-slate-300">soporte@riodulce.cl</span>
                        </div>
                        <div className="mt-1">
                          <span className="font-semibold text-gray-600 dark:text-slate-400">Para:</span>{" "}
                          <span className="text-gray-700 dark:text-slate-300">{emailInput || "(correo del proveedor)"}</span>
                        </div>
                        <div className="mt-1">
                          <span className="font-semibold text-gray-600 dark:text-slate-400">Asunto:</span>{" "}
                          <span className="text-gray-700 dark:text-slate-300">
                            {generarHtmlCorreoCotizacion(cotizacion as any, cotizacion.proveedor?.razonSocial || "Proveedor", purchaseOrderNumber).subject}
                          </span>
                        </div>
                        <div className="border-t pt-2 mt-2">
                          <div
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: generarHtmlCorreoCotizacion(cotizacion as any, cotizacion.proveedor?.razonSocial || "Proveedor", purchaseOrderNumber).htmlContent,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {emailLog.length > 0 && (
                    <div className="pt-2 border-t text-xs">
                      <p className="font-medium">Histórico de envíos: {emailLog.length}</p>
                      {emailLog.slice(-2).map((log: any, idx: number) => (
                        <div key={idx} className="text-gray-600 text-[10px]">
                          {format(new Date(log.createdAt), "dd/MM HH:mm", { locale: es })} → {(log.destinatarios || log.recipients || []).join(", ")}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="dark:bg-slate-900 dark:border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm dark:text-slate-200">Resumen Financiero</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between dark:text-slate-300">
                    <span>Subtotal:</span>
                    <span>${cotizacion.neto ? Number(cotizacion.neto).toLocaleString("es-CL") : "0"}</span>
                  </div>
                  <div className="flex justify-between dark:text-slate-300">
                    <span>IVA:</span>
                    <span>${cotizacion.iva ? Number(cotizacion.iva).toLocaleString("es-CL") : "0"}</span>
                  </div>
                  <div className="border-t dark:border-slate-800 pt-2 flex justify-between font-bold dark:text-blue-400">
                    <span>TOTAL:</span>
                    <span>${cotizacion.totalEstimado ? Number(cotizacion.totalEstimado).toLocaleString("es-CL") : "0"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pdf" className="hidden data-[state=active]:flex flex-1 flex-col mt-4 min-h-0">
            {pdfDataUrl ? (
              <>
                <div className="flex-1 border rounded overflow-hidden min-h-0">
                  <iframe src={pdfDataUrl} className="w-full h-full" title="PDF Preview" />
                </div>
                <div className="flex justify-end pt-3 shrink-0">
                  <Button onClick={handleGeneratePDF} disabled={isGenerating} size="sm">
                    {isGenerating ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin mr-2" />
                        Descargando...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Descargar PDF
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center min-h-0">
                <Loader className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 mt-4 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating || isSendingEmail}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
