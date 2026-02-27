"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, FileText, Download, Loader2 } from "lucide-react";

interface PreviewRequest {
  folio: string;
  installation?: { name?: string | null } | null;
  creator?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
}

interface PreviewQuotation {
  id?: string;
  folio: string;
  statusCode: string;
  createdAt?: Date | string | null;
  expirationDate?: Date | string | null;
  totalAmount?: number | null;
  observations?: string | null;
  supplier?: {
    rut?: string | null;
    businessLine?: string | null;
    legalName?: string | null;
    contactEmail?: string | null;
  } | null;
  items?: Array<{
    id: string;
    quotedQuantity?: number | null;
    unitPrice?: number | null;
    subtotal?: number | null;
    requestItem?: {
      itemName?: string | null;
      unit?: string | null;
      category?: { name?: string | null } | null;
    } | null;
  }>;
  request?: PreviewRequest | null;
}

interface PreviewQuotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: PreviewRequest;
  quotation: PreviewQuotation;
  initialTab?: "email" | "pdf";
}

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-CL").format(new Date(value));
}

function escapeHtml(value?: string | null) {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function PreviewQuotationDialog({
  open,
  onOpenChange,
  request,
  quotation,
  initialTab = "email",
}: PreviewQuotationDialogProps) {
  const [activeTab, setActiveTab] = useState<"email" | "pdf">(initialTab);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const supplierName =
    quotation.supplier?.businessLine || quotation.supplier?.legalName || "Sin proveedor";

  const toEmail = quotation.supplier?.contactEmail || "sin-email@proveedor.cl";
  const supplierRut = quotation.supplier?.rut || "N/A";
  const installationName = request?.installation?.name || quotation.request?.installation?.name || "N/A";
  const requestFolio = request?.folio || quotation.request?.folio || "N/A";
  const generatedAt = new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  useEffect(() => {
    let active = true;
    const toDataUrl = async (imagePath: string) => {
      try {
        const response = await fetch(imagePath);
        if (!response.ok) return null;
        const blob = await response.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("No fue posible leer el logo"));
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        return null;
      }
    };

    const resolveLogo = async () => {
      try {
        // 1) Try REPORT_CONFIG from settings API
        const rep = await fetch(`/api/v1/settings?key=REPORT_CONFIG`);
        if (rep.ok) {
          const arr = await rep.json();
          const cfg = Array.isArray(arr) && arr.length ? arr[0].value : null;
          const pdfCfg = cfg?.pdf || cfg?.excel;
          if (pdfCfg?.logo_base64) return pdfCfg.logo_base64;
          if (pdfCfg?.logo) {
            const d = await toDataUrl(pdfCfg.logo);
            if (d) return d;
          }
        }

        // 2) Try UI_CONFIG (logo light mode)
        const ui = await fetch(`/api/v1/settings?key=UI_CONFIG`);
        if (ui.ok) {
          const arr = await ui.json();
          const cfg = Array.isArray(arr) && arr.length ? arr[0].value : null;
          const logoLight = cfg?.logo?.light_mode;
          if (logoLight?.base64) return logoLight.base64;
          if (logoLight?.image) {
            const d = await toDataUrl(logoLight.image);
            if (d) return d;
          }
        }

        // 3) Try common public fallbacks
        const fallbacks = ["/images/informes/logo_pdf.png", "/sotex/logo-sotex-sin.png", "/cliente/logo.png"];
        for (const p of fallbacks) {
          const d = await toDataUrl(p);
          if (d) return d;
        }
      } catch (e) {
        // ignore
      }
      return null;
    };

    const generatePdf = async () => {
      if (!open || !quotation) return;
      setIsGeneratingPdf(true);
      try {
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const logo = await resolveLogo();

        if (logo) {
          try {
            // logo puede venir como data:image/... o como URL convertida
            if (logo.startsWith("data:image")) {
              doc.addImage(logo, "PNG", 14, 8, 32, 14);
            } else {
              const converted = await toDataUrl(logo);
              if (converted) doc.addImage(converted, "PNG", 14, 8, 32, 14);
            }
          } catch {
            // Ignora errores de logo para no romper PDF
          }
        }

        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("SOLICITUD DE COTIZACIÓN", pageWidth / 2, 13, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(71, 85, 105);
        doc.text("Documento de Análisis de Propuesta Comercial", pageWidth / 2, 18, { align: "center" });

        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.4);
        doc.line(14, 22, pageWidth - 14, 22);

        let y = 28;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(14, y, pageWidth - 28, 44, 3, 3, "FD");

        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.text("INFORMACIÓN DE LA COTIZACIÓN", 19, y + 6);

        doc.setFontSize(6.5);
        const colLeft = 19;
        const colRight = pageWidth / 2 + 4;
        const labelOffset = 30;
        let yL = y + 12;
        let yR = y + 12;

        doc.setFont("helvetica", "bold");
        doc.text("Folio Cotización:", colLeft, yL);
        doc.setFont("helvetica", "normal");
        doc.text(quotation.folio || "N/A", colLeft + labelOffset, yL);
        yL += 4;

        doc.setFont("helvetica", "bold");
        doc.text("Solicitud Origen:", colLeft, yL);
        doc.setFont("helvetica", "normal");
        doc.text(requestFolio, colLeft + labelOffset, yL);
        yL += 4;

        doc.setFont("helvetica", "bold");
        doc.text("Instalación:", colLeft, yL);
        doc.setFont("helvetica", "normal");
        doc.text(installationName, colLeft + labelOffset, yL);

        doc.setFont("helvetica", "bold");
        doc.text("Fecha de Envío:", colRight, yR);
        doc.setFont("helvetica", "normal");
        doc.text(formatDate(quotation.createdAt), colRight + labelOffset, yR);
        yR += 4;

        doc.setFont("helvetica", "bold");
        doc.text("Fecha Límite:", colRight, yR);
        doc.setFont("helvetica", "normal");
        doc.text(formatDate(quotation.expirationDate), colRight + labelOffset, yR);
        yR += 4;

        doc.setFont("helvetica", "bold");
        doc.text("Generado:", colRight, yR);
        doc.setFont("helvetica", "normal");
        doc.text(generatedAt, colRight + labelOffset, yR);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text("PROVEEDOR", 19, y + 26);

        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.text("Razón Social:", colLeft, y + 31);
        doc.setFont("helvetica", "normal");
        doc.text(supplierName, colLeft + labelOffset, y + 31);

        doc.setFont("helvetica", "bold");
        doc.text("RUT:", colLeft, y + 35);
        doc.setFont("helvetica", "normal");
        doc.text(supplierRut, colLeft + labelOffset, y + 35);

        doc.setFont("helvetica", "bold");
        doc.text("Email:", colRight, y + 35);
        doc.setFont("helvetica", "normal");
        doc.text(toEmail, colRight + labelOffset, y + 35);

        y += 50;
        doc.setTextColor(41, 72, 165);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("DESCRIPCIÓN DE LA SOLICITUD", 14, y);

        y += 3;
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(14, y + 1, pageWidth - 28, 12, 2, 2, "S");

        y += 20;
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(8);
        doc.text("ITEMS A COTIZAR", 19, y);

        const itemsBody = (quotation.items || []).map((item, idx) => [
          String(idx + 1),
          item.requestItem?.itemName || "-",
          `${item.quotedQuantity ?? 0} ${item.requestItem?.unit || ""}`,
        ]);

        autoTable(doc, {
          startY: y + 4,
          head: [["#", "Descripción", "Cant."]],
          body: itemsBody,
          theme: "grid",
          margin: { left: 14, right: 14 },
          tableWidth: pageWidth - 28,
          headStyles: {
            fillColor: [71, 85, 105],
            textColor: 255,
            fontSize: 6,
            fontStyle: "bold",
            halign: "center",
            cellPadding: 1.2,
          },
          bodyStyles: {
            fontSize: 6,
            textColor: [0, 0, 0],
            cellPadding: 1.1,
          },
          columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: pageWidth - 58 },
            2: { cellWidth: 20, halign: "right" },
          },
        });

        const tableEndY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 18;
        let afterTableY = tableEndY + 6;

        doc.setDrawColor(47, 78, 166);
        doc.setLineWidth(0.8);
        doc.roundedRect(14, afterTableY, pageWidth - 28, 24, 3, 3, "S");
        doc.setTextColor(47, 78, 166);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("INSTRUCCIONES PARA COTIZAR", 19, afterTableY + 7);
        doc.setDrawColor(47, 78, 166);
        doc.setLineWidth(0.2);
        doc.line(19, afterTableY + 9, pageWidth - 19, afterTableY + 9);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(30, 41, 59);
        doc.text("- Incluya las condiciones de pago y los tiempos estimados de entrega", 19, afterTableY + 14);
        doc.text("- Adjunte especificaciones técnicas detalladas y fichas de productos si es necesario", 19, afterTableY + 19);

        afterTableY += 30;
        doc.setDrawColor(242, 179, 26);
        doc.setLineWidth(0.8);
        doc.roundedRect(14, afterTableY, pageWidth - 28, 12, 3, 3, "S");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(146, 64, 14);
        doc.text("FECHA LÍMITE DE RESPUESTA:", 24, afterTableY + 7.5);
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "normal");
        doc.text(formatDate(quotation.expirationDate), 86, afterTableY + 7.5);

        // Footer: añadir línea y textos en cada página con numeración
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setDrawColor(203, 213, 225);
          doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16);
          doc.setTextColor(100, 116, 139);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(5);
          doc.text(`Documento generado el ${generatedAt}`, 14, pageHeight - 12);
          doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 12, { align: "center" });
          doc.text(`Folio: ${quotation.folio}`, pageWidth - 14, pageHeight - 12, { align: "right" });
        }

        const blob = doc.output("blob");
        const blobUrl = URL.createObjectURL(blob);

        if (!active) {
          URL.revokeObjectURL(blobUrl);
          return;
        }

        setPdfBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return blobUrl;
        });
      } catch (error) {
        console.error("Error generando preview PDF:", error);
        if (active) toast.error("No fue posible generar el preview PDF");
      } finally {
        if (active) setIsGeneratingPdf(false);
      }
    };

    generatePdf();

    return () => {
      active = false;
    };
  }, [generatedAt, installationName, open, quotation, requestFolio, supplierName, supplierRut, toEmail]);

  useEffect(() => {
    return () => {
      setPdfBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

  const emailHtml = useMemo(() => {
    const itemsRows = (quotation.items || [])
      .map(
        (item, index) => `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${index + 1}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(item.requestItem?.itemName || "-")}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${item.quotedQuantity ?? 0} ${escapeHtml(item.requestItem?.unit || "")}</td>
          </tr>
        `
      )
      .join("");

    return `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <style>
            body { margin: 0; background: #f3f4f6; font-family: Inter, Arial, sans-serif; color: #0f172a; }
            .wrap { max-width: 800px; margin: 20px auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
            .hero { background: #344690; color: white; text-align: center; padding: 32px 24px 28px; }
            .hero h1 { margin: 0; font-size: 24px; font-weight: 600; line-height: 1.05; }
            .hero p { margin: 8px 0 0 0; font-size: 18px; font-weight: 500; }
            .content { padding: 20px 18px; font-size: 14px; line-height: 1.45; }
            .lead { color: #2b4ba0; font-weight: 700; margin: 0 0 10px 0; font-size: 16px; }
            .box { border-left: 6px solid #344690; background: #f8fafc; border-radius: 8px; padding: 12px 14px; margin: 14px 0; }
            .box h3 { margin: 0 0 6px 0; color: #2b4ba0; font-size: 16px; }
            .box p { margin: 6px 0; }
            .table-box { border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; margin-top: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            thead { background: #eef2ff; }
            th { text-align: left; padding: 10px 12px; color: #334155; border-bottom: 1px solid #cbd5e1; }
            .attach { margin-top: 12px; border-left: 6px solid #eab308; background: #fef9c3; border-radius: 8px; padding: 10px 12px; font-size: 13px; }
            .footer { background: #344690; color: #cbd5e1; text-align: center; padding: 12px 14px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="hero">
              <h1>Solicitud de Cotización</h1>
              <p>${escapeHtml(quotation.folio)}</p>
            </div>
            <div class="content">
              <p class="lead">Estimado/a ${escapeHtml(supplierName)},</p>
              <p>Por medio de la presente, solicitamos su cotización para los siguientes productos/servicios de acuerdo a nuestra solicitud <strong>${escapeHtml(requestFolio)}</strong>.</p>
              <div class="box">
                <h3>📝 Información de la Solicitud</h3>
                <p><strong>Folio Cotización:</strong> ${escapeHtml(quotation.folio)}</p>
                <p><strong>Instalación:</strong> ${escapeHtml(installationName)}</p>
                <p><strong>Fecha Límite:</strong> ${escapeHtml(formatDate(quotation.expirationDate))}</p>
              </div>
              <div class="table-box">
                <table>
                  <thead>
                    <tr>
                      <th style="width: 60px;">#</th>
                      <th>Descripción</th>
                      <th style="width: 190px; text-align: right;">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>${itemsRows}</tbody>
                </table>
              </div>
              <div class="attach">
                <strong>📎 Documento Adjunto:</strong><br/>
                En este email encontrará el archivo PDF con todos los detalles de la solicitud de cotización. Por favor, complete los precios y envíe su respuesta.
              </div>
              <p style="margin-top: 24px;">Agradecemos su atención y quedamos a la espera de su pronta respuesta.</p>
              <p>Saludos cordiales,</p>
            </div>
            <div class="footer">Este es un email automático. Por favor, no responda directamente a este mensaje.</div>
          </div>
        </body>
      </html>
    `;
  }, [installationName, quotation.expirationDate, quotation.folio, quotation.items, requestFolio, supplierName]);

  const handleDownloadPdf = () => {
    if (!pdfBlobUrl) {
      toast.error("El PDF aún no está disponible");
      return;
    }

    try {
      setIsPreparingPdf(true);
      const anchor = document.createElement("a");
      anchor.href = pdfBlobUrl;
      anchor.download = `${quotation.folio || "cotizacion"}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setIsPreparingPdf(false);
    } catch (error) {
      console.error("Error preparando PDF:", error);
      toast.error("No fue posible preparar la descarga del PDF");
      setIsPreparingPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80vw]! max-w-[80vw]! max-h-[92vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-xl font-bold inline-flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Preview del Email y PDF
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Vista previa del correo electrónico y PDF que se enviará al proveedor
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "email" | "pdf")} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 pt-4 shrink-0">
            <TabsList className="grid w-full grid-cols-2 h-10 bg-muted/40 p-1 rounded-md">
              <TabsTrigger value="email" className="font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm inline-flex gap-2 items-center">
                <Mail className="h-4 w-4" />
                Correo Electrónico
              </TabsTrigger>
              <TabsTrigger value="pdf" className="font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm inline-flex gap-2 items-center">
                <FileText className="h-4 w-4" />
                PDF Adjunto
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="px-6 pb-4 overflow-y-auto flex-1 space-y-4">
            <TabsContent value="email" className="mt-0 h-full">
              <div className="rounded-lg border border-border bg-card overflow-hidden h-[62vh]">
                <iframe srcDoc={emailHtml} className="w-full h-full border-0" title={`Preview Email ${quotation.folio}`} />
              </div>
            </TabsContent>

            <TabsContent value="pdf" className="mt-0 h-full space-y-3">
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={handleDownloadPdf} className="gap-2" disabled={isPreparingPdf || isGeneratingPdf || !pdfBlobUrl}>
                  {isPreparingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Descargar PDF
                </Button>
              </div>
              <div className="rounded-lg border border-border bg-card overflow-hidden h-[62vh]">
                {isGeneratingPdf ? (
                  <div className="w-full h-full flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generando PDF...
                  </div>
                ) : pdfBlobUrl ? (
                  <iframe src={pdfBlobUrl} className="w-full h-full border-0" title={`Preview PDF ${quotation.folio}`} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">No fue posible generar el PDF</div>
                )}
              </div>
            </div>
          </TabsContent>
          </div>

          {/* Footer con botones fijos */}
          <div className="flex justify-between items-center px-6 py-4 border-t border-border bg-muted/20 shrink-0">
            <div>
              {activeTab === "pdf" && (
                <Button type="button" variant="outline" size="sm" onClick={handleDownloadPdf} className="gap-2" disabled={isPreparingPdf || isGeneratingPdf || !pdfBlobUrl}>
                  {isPreparingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Descargar PDF
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
