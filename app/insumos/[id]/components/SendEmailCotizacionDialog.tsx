"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MailCheck, Mail, Paperclip, UserRound } from "lucide-react";
import { sendQuotationByEmail, getQuotationById } from "../actions";

function escapeHtml(value?: string | null) {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-CL").format(new Date(value));
}

interface QuotationEmailData {
  id: string;
  folio: string;
  statusCode: string;
  itemsCount: number;
  supplier?: {
    rut?: string | null;
    businessLine?: string | null;
    legalName?: string | null;
    contactEmail?: string | null;
  } | null;
}

interface SendEmailCotizacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: QuotationEmailData | null;
  onSuccess?: () => void;
}

export default function SendEmailCotizacionDialog({
  open,
  onOpenChange,
  quotation,
  onSuccess,
}: SendEmailCotizacionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [deadline, setDeadline] = useState("");
  const [observations, setObservations] = useState("");
  const [includeAttachments, setIncludeAttachments] = useState(true);

  // Prefill fields when dialog opens or quotation changes
  useEffect(() => {
    if (!open || !quotation) return;
    setEmail(quotation.supplier?.contactEmail || "");
    // deadline and observations may come from a fuller quotation; keep empty by default
    setDeadline("");
    setObservations("");

    // Try to fetch full quotation to prefill deadline/observations if available
    (async () => {
      try {
        const full = await getQuotationById(quotation.id);
        if (!full) return;
        if (full.expirationDate) setDeadline(new Date(full.expirationDate).toISOString().slice(0, 10));
        if (full.observationsForSupplier) setObservations(full.observationsForSupplier);
        // if no expiration date, try to read default days from settings
        if (!full.expirationDate) {
          try {
            const resp = await fetch(`/api/v1/insumos-config`);
            if (resp.ok) {
              const j = await resp.json();
              const days = typeof j?.data?.defaultDeadlineDays === 'number' 
                ? j.data.defaultDeadlineDays 
                : 7;
              const dt = new Date();
              dt.setDate(dt.getDate() + days);
              setDeadline(dt.toISOString().slice(0, 10));
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [open, quotation]);

  const handleSend = async () => {
    if (!quotation) return;
    if (!email.trim()) {
      toast.error("Debe ingresar un correo de destino");
      return;
    }

    setIsSubmitting(true);
    try {
      // Obtener detalle completo de la cotización para construir el HTML y PDF
      const full = await getQuotationById(quotation.id);
      if (!full) throw new Error("No fue posible obtener la cotización completa");

      const installationName = full.request?.installation?.name || "N/A";
      const requestFolio = full.request?.folio || "N/A";
      const supplierName = full.supplier?.businessLine || full.supplier?.legalName || "Sin proveedor";
      const supplierRut = full.supplier?.rut || "N/A";
      const toEmail = full.supplier?.contactEmail || "sin-email@proveedor.cl";
      const generatedAt = new Intl.DateTimeFormat("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date());

      // ══ GENERAR PDF (misma lógica que PreviewQuotationDialog) ══
      let pdfBase64: string | null = null;
      try {
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Resolver logo
        let logo: string | null = null;
        try {
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
            } catch {
              return null;
            }
          };

          // 1) Try REPORT_CONFIG
          const rep = await fetch(`/api/v1/settings?key=REPORT_CONFIG`);
          if (rep.ok) {
            const arr = await rep.json();
            const cfg = Array.isArray(arr) && arr.length ? arr[0].value : null;
            const pdfCfg = cfg?.pdf || cfg?.excel;
            if (pdfCfg?.logo_base64) logo = pdfCfg.logo_base64;
            else if (pdfCfg?.logo) {
              const d = await toDataUrl(pdfCfg.logo);
              if (d) logo = d;
            }
          }

          // 2) Try UI_CONFIG
          if (!logo) {
            const ui = await fetch(`/api/v1/settings?key=UI_CONFIG`);
            if (ui.ok) {
              const arr = await ui.json();
              const cfg = Array.isArray(arr) && arr.length ? arr[0].value : null;
              const logoLight = cfg?.logo?.light_mode;
              if (logoLight?.base64) logo = logoLight.base64;
              else if (logoLight?.image) {
                const d = await toDataUrl(logoLight.image);
                if (d) logo = d;
              }
            }
          }

          // 3) Fallbacks
          if (!logo) {
            const fallbacks = ["/images/informes/logo_pdf.png", "/sotex/logo-sotex-sin.png", "/cliente/logo.png"];
            for (const p of fallbacks) {
              const d = await toDataUrl(p);
              if (d) {
                logo = d;
                break;
              }
            }
          }
        } catch {
          // ignore logo errors
        }

        // Agregar logo si existe
        if (logo) {
          try {
            if (logo.startsWith("data:image")) {
              doc.addImage(logo, "PNG", 14, 8, 32, 14);
            } else {
              const toDataUrl = async (imagePath: string) => {
                const response = await fetch(imagePath);
                const blob = await response.blob();
                return await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
                });
              };
              const converted = await toDataUrl(logo);
              if (converted) doc.addImage(converted, "PNG", 14, 8, 32, 14);
            }
          } catch {
            // ignore
          }
        }

        // Título
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
        doc.text(full.folio || "N/A", colLeft + labelOffset, yL);
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
        doc.text(formatDate(full.createdAt), colRight + labelOffset, yR);
        yR += 4;

        doc.setFont("helvetica", "bold");
        doc.text("Fecha Límite:", colRight, yR);
        doc.setFont("helvetica", "normal");
        doc.text(formatDate(full.expirationDate), colRight + labelOffset, yR);
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

        const itemsBody = (full.items || []).map((item: any, idx: number) => [
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
        doc.text(formatDate(full.expirationDate), 86, afterTableY + 7.5);

        // Footer
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
          doc.text(`Folio: ${full.folio}`, pageWidth - 14, pageHeight - 12, { align: "right" });
        }

        // Convertir a base64
        const pdfData = doc.output("arraybuffer");
        const base64 = btoa(
          new Uint8Array(pdfData).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );
        pdfBase64 = base64;
      } catch (pdfError) {
        console.error("Error generando PDF:", pdfError);
        toast.error("No fue posible generar el PDF adjunto");
        setIsSubmitting(false);
        return;
      }
      // ══ FIN GENERACIÓN PDF ══

      const itemsRows = (full.items || [])
        .map(
          (item: any, index: number) => `
            <tr>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${index + 1}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(item.requestItem?.itemName || "-")}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${item.quotedQuantity ?? 0} ${escapeHtml(item.requestItem?.unit || "")}</td>
            </tr>
          `
        )
        .join("");

      const mailHtml = `
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
                <p>${escapeHtml(full.folio || "")}</p>
              </div>
              <div class="content">
                <p class="lead">Estimado/a ${escapeHtml(supplierName)},</p>
                <p>Por medio de la presente, solicitamos su cotización para los siguientes productos/servicios de acuerdo a nuestra solicitud <strong>${escapeHtml(requestFolio)}</strong>.</p>
                <div class="box">
                  <h3>📝 Información de la Solicitud</h3>
                  <p><strong>Folio Cotización:</strong> ${escapeHtml(full.folio)}</p>
                  <p><strong>Instalación:</strong> ${escapeHtml(installationName)}</p>
                  <p><strong>Fecha Límite:</strong> ${escapeHtml(formatDate(full.expirationDate))}</p>
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
              <div class="footer">Documento generado el ${generatedAt} - Este es un email automático. Por favor, no responda directamente a este mensaje.</div>
            </div>
          </body>
        </html>
      `;

      const response = await sendQuotationByEmail(quotation.id, {
        recipientEmail: email.trim(),
        responseDeadline: deadline || undefined,
        observations: observations || undefined,
        pdfBase64: pdfBase64 || undefined,
        html: mailHtml,
      });

      setIsSubmitting(false);

      if (!response.success) {
        toast.error(response.error || "Error enviando correo");
        return;
      }

      toast.success("Envío de cotización registrado correctamente");
      onOpenChange(false);
      onSuccess?.();
      return;
    } catch (err: any) {
      console.error(err);
      setIsSubmitting(false);
      toast.error(err?.message || "Error al preparar el envío");
      return;
    }
    
  };

  if (!quotation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80vw]! max-w-[80vw]! max-h-[92vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border bg-linear-to-r from-[#283c7f] to-[#344690] text-white shrink-0">
          <DialogTitle className="text-xl lg:text-2xl font-extrabold tracking-tight inline-flex items-center gap-3">
            <div className="bg-white/20 rounded-md p-2">
              <Mail className="w-4 h-4 text-white" />
            </div>
            Enviar Cotización por Email
          </DialogTitle>
          <DialogDescription className="text-sm text-white/80">
            Configure y envíe rápidamente
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground">RESUMEN DE LA COTIZACIÓN</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
              <div className="rounded-lg border border-border bg-white/50 p-3">
                <p className="text-xs font-semibold text-muted-foreground">Folio</p>
                <p className="text-lg font-bold mt-1">{quotation.folio}</p>
              </div>
              <div className="rounded-lg border border-border bg-white/50 p-3">
                <p className="text-xs font-semibold text-muted-foreground">Estado</p>
                <Badge variant="outline" className="mt-2">{quotation.statusCode}</Badge>
              </div>
              <div className="rounded-lg border border-border bg-white/50 p-3">
                <p className="text-xs font-semibold text-muted-foreground">Items</p>
                <p className="text-lg font-bold mt-1">{quotation.itemsCount}</p>
              </div>
              <div className="rounded-lg border border-border bg-white/50 p-3">
                <p className="text-xs font-semibold text-muted-foreground">Proveedor (RUT)</p>
                <p className="text-sm font-semibold truncate mt-1">{quotation.supplier?.rut || "-"}</p>
                <p className="text-xs font-semibold text-muted-foreground mt-3">Razón Social</p>
                <p className="text-sm font-semibold truncate mt-1">{quotation.supplier?.businessLine || quotation.supplier?.legalName || "Sin proveedor"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
            <p className="font-semibold inline-flex items-center gap-2">
              <MailCheck className="w-4 h-4 text-blue-600" />
              Datos de Envío
            </p>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">Email del Proveedor
                {quotation.supplier?.contactEmail && (
                  <span className="ml-2 text-xs text-emerald-600 font-medium">(prellenado)</span>
                )}
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={quotation.supplier?.contactEmail || "proveedor@correo.cl"}
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">Fecha Límite de Respuesta (Opcional)
                {deadline && <span className="ml-2 text-xs text-emerald-600 font-medium">(prellenado)</span>}
              </Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} autoComplete="off" />
            </div>

            <div className="space-y-1.5">
              <Label>Observaciones Adicionales (Opcional)</Label>
              <div className="rounded-md border border-border bg-blue-50/50 dark:bg-slate-900 p-3 text-sm text-slate-700">
                <p className="font-semibold text-sm text-blue-700">Nota: <span className="font-normal text-sm text-slate-700">La observación se precarga desde la creación de la solicitud, puede editarse aquí antes de enviar el email.</span></p>
              </div>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Instrucciones o detalles para el proveedor"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-border bg-card p-4 shadow-sm">
            <Checkbox
              checked={includeAttachments}
              onCheckedChange={(value) => setIncludeAttachments(Boolean(value))}
              id="include-attachments"
            />
            <div>
              <Label htmlFor="include-attachments" className="inline-flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Incluir adjuntos y especificaciones técnicas
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                {includeAttachments
                  ? "Se considerará envío con adjuntos técnicos en la trazabilidad."
                  : "Se registrará envío sin adjuntos."}
              </p>
            </div>
          </div>
        </div>

        {/* Footer con botones fijos */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border bg-muted/20 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button className="bg-[#283c7f] hover:bg-[#1e2f63] text-white" onClick={handleSend} disabled={isSubmitting}>
            <Mail className="w-4 h-4 mr-2 text-white" />
            {isSubmitting ? "Enviando..." : "Enviar Email"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
