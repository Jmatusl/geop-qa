"use client";

import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Loader2, Mail, Send } from "lucide-react";
import { getQuotationById, sendQuotationByEmail } from "../actions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationId: string | null;
  onSuccess?: () => void;
}

function formatCLP(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(value);
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    try {
      return (value as { toNumber: () => number }).toNumber();
    } catch {
      return 0;
    }
  }
  return 0;
}

function formatDate(value?: Date | string | null) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function escapeHtml(text?: string | null) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function SendApprovalEmailDialog({
  open,
  onOpenChange,
  quotationId,
  onSuccess,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"email" | "pdf">("email");
  const [emailTo, setEmailTo] = useState("");
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState("");
  const [quotation, setQuotation] = useState<any>(null);
  const [emailHtml, setEmailHtml] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);

  const subtotal = useMemo(() => toNumber(quotation?.totalAmount), [quotation]);
  const iva = useMemo(() => Math.round(subtotal * 0.19), [subtotal]);
  const total = useMemo(() => subtotal + iva, [subtotal, iva]);

  useEffect(() => {
    if (!open || !quotationId) return;

    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const full = await getQuotationById(quotationId);
        if (!mounted || !full) return;

        setQuotation(full);
        setEmailTo(full.supplier?.contactEmail || "");
        setPurchaseOrderNumber(full.purchaseOrderNumber || "");
      } catch {
        toast.error("No fue posible cargar la cotización");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [open, quotationId]);

  useEffect(() => {
    if (!open || !quotation) return;

    let mounted = true;

    const generate = async () => {
      setIsGenerating(true);
      try {
        const generated = await generatePreviewAssets(quotation, purchaseOrderNumber);
        if (!mounted) return;
        setEmailHtml(generated.html);
        setPdfBase64(generated.base64);
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return generated.blobUrl;
        });
      } catch {
        toast.error("No fue posible generar la vista previa");
      } finally {
        if (mounted) setIsGenerating(false);
      }
    };

    generate();

    return () => {
      mounted = false;
    };
  }, [open, quotation, purchaseOrderNumber]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const handleSend = async () => {
    if (!quotationId || !quotation) return;
    if (!emailTo.trim()) {
      toast.error("Debe ingresar un correo del proveedor");
      return;
    }
    if (!pdfBase64 || !emailHtml) {
      toast.error("La vista previa aún no está lista");
      return;
    }

    setIsSending(true);
    try {
      const supplierName =
        quotation.supplier?.businessLine || quotation.supplier?.legalName || "Proveedor";

      const response = await sendQuotationByEmail(quotationId, {
        recipientEmail: emailTo.trim(),
        observations: "Cotización aprobada",
        html: emailHtml,
        pdfBase64,
        subject: `Cotización Aprobada ${quotation.folio} - ${supplierName}`,
      });

      if (!response.success) {
        toast.error(response.error || "No fue posible enviar el correo");
        return;
      }

      toast.success("Correo de aprobación enviado correctamente");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Error enviando el correo");
    } finally {
      setIsSending(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!pdfUrl || !quotation?.folio) return;
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `informe-${quotation.folio}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80vw]! max-w-[80vw]! max-h-[92vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-5 pb-4 border-b border-border bg-white dark:bg-slate-900 shrink-0">
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white inline-flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Cotización: {quotation?.folio || "-"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "email" | "pdf")} className="w-full flex flex-col flex-1 overflow-hidden">
          <div className="px-6 pt-3 shrink-0">
            <TabsList className="grid w-full grid-cols-2 h-11">
              <TabsTrigger value="email" className="text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Mail className="w-4 h-4 mr-2" />
                Preview Email
              </TabsTrigger>
              <TabsTrigger value="pdf" className="text-sm font-medium data-[state=active]:bg-slate-600 data-[state=active]:text-white">
                <FileText className="w-4 h-4 mr-2" />
                Preview PDF
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            <TabsContent value="email" className="space-y-4 mt-0">
              {isLoading ? (
                <div className="h-40 border rounded-lg flex items-center justify-center text-sm text-muted-foreground bg-slate-50 dark:bg-slate-800">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Cargando cotización...
                </div>
              ) : (
                <>
                  {/* Información de Estado y Proveedor */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border bg-white dark:bg-slate-900 p-4 shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">ESTADO</p>
                      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1">Aprobada</Badge>
                    </div>
                    <div className="rounded-lg border border-border bg-white dark:bg-slate-900 p-4 shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">PROVEEDOR</p>
                      <p className="text-base font-bold text-slate-900 dark:text-white">{quotation?.supplier?.rut || "-"}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{quotation?.supplier?.businessLine || quotation?.supplier?.legalName || "Sin proveedor"}</p>
                    </div>
                  </div>

                  {/* Sección de Envío de Correo */}
                  <div className="rounded-xl border border-blue-200 bg-blue-50/80 dark:bg-blue-950/30 p-5 space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-blue-200 dark:border-blue-800">
                      <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-base font-bold text-blue-900 dark:text-blue-100">Enviar Correo de Aprobación</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr_auto] gap-3 items-end">
                      <div>
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                          N° de Orden de Compra <span className="text-muted-foreground font-normal">(opcional)</span>
                        </label>
                        <Input 
                          value={purchaseOrderNumber} 
                          onChange={(e) => setPurchaseOrderNumber(e.target.value)} 
                          placeholder="OC-2025-..." 
                          autoComplete="off"
                          className="bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                          Correos del Proveedor
                        </label>
                        <Input 
                          value={emailTo} 
                          onChange={(e) => setEmailTo(e.target.value)} 
                          placeholder="proveedor@correo.cl" 
                          autoComplete="off"
                          className="bg-white dark:bg-slate-900"
                        />
                      </div>

                      <Button 
                        onClick={handleSend} 
                        disabled={isSending || isGenerating || isLoading || !emailTo.trim()} 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-10 px-6 whitespace-nowrap"
                      >
                        {isSending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2 text-white" />
                            Enviar Correo
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="pt-3 border-t border-blue-200 dark:border-blue-800">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">Vista previa del correo:</p>
                      <div className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden shadow-sm">
                        {isGenerating ? (
                          <div className="h-105 flex items-center justify-center text-sm text-muted-foreground">
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generando preview...
                          </div>
                        ) : (
                          <iframe title="preview-email-aprobacion" srcDoc={emailHtml} className="w-full h-105 border-0" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Resumen Financiero */}
                  <div className="rounded-xl border border-border bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-b border-border">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Resumen Financiero</h3>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Subtotal:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{formatCLP(subtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600 dark:text-slate-400">IVA:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{formatCLP(iva)}</span>
                      </div>
                      <div className="pt-2 border-t border-border flex justify-between items-center">
                        <span className="text-base font-bold text-slate-900 dark:text-white">TOTAL:</span>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCLP(total)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="pdf" className="space-y-4 mt-0">
              <div className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden shadow-sm">
                {isGenerating || !pdfUrl ? (
                  <div className="h-155 flex items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generando PDF...
                  </div>
                ) : (
                  <iframe title="preview-pdf-aprobacion" src={pdfUrl} className="w-full h-155 border-0" />
                )}
              </div>
            </TabsContent>
          </div>

          {/* Footer con botones fijos */}
          <div className="flex justify-between items-center px-6 py-4 border-t border-border bg-muted/20 shrink-0">
            <div>
              {activeTab === "pdf" && (
                <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={!pdfUrl} className="h-9">
                  <Download className="w-4 h-4 mr-2" /> Descargar PDF
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="min-w-30">
              Cerrar
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

async function generatePreviewAssets(quotation: any, purchaseOrderNumber: string) {
  const requestFolio = quotation?.request?.folio || "N/A";
  const installationName = quotation?.request?.installation?.name || "N/A";
  const requesterName = quotation?.request?.creator
    ? `${quotation.request.creator.firstName || ""} ${quotation.request.creator.lastName || ""}`.trim() || "N/A"
    : "N/A";
  const supplierName =
    quotation?.supplier?.businessLine || quotation?.supplier?.legalName || "Proveedor";
  const supplierRut = quotation?.supplier?.rut || "N/A";
  const supplierEmail = quotation?.supplier?.contactEmail || "N/A";
  const supplierPhone = quotation?.supplier?.phone || "N/A";

  const subtotal = toNumber(quotation?.totalAmount);
  const iva = Math.round(subtotal * 0.19);
  const total = subtotal + iva;

  const generatedAt = new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ═══════════════════════════════════════════════════════════
  // Resolver y agregar logo
  // ═══════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════
  // Título
  // ═══════════════════════════════════════════════════════════
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("INFORME DE COTIZACIÓN", pageWidth / 2, 13, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Documento de Análisis de Propuesta Comercial", pageWidth / 2, 18, { align: "center" });

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(14, 22, pageWidth - 14, 22);

  // ═══════════════════════════════════════════════════════════
  // Información de la Cotización
  // ═══════════════════════════════════════════════════════════
  let y = 28;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, pageWidth - 28, 58, 3, 3, "FD");

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("INFORMACIÓN DE LA COTIZACIÓN", 19, y + 6);

  doc.setFontSize(7);
  const colLeft = 19;
  const colRight = pageWidth / 2 + 4;
  const labelOffset = 28;
  let yL = y + 12;
  let yR = y + 12;

  doc.setFont("helvetica", "bold");
  doc.text("Folio Cotización:", colLeft, yL);
  doc.setFont("helvetica", "normal");
  doc.text(quotation?.folio || "N/A", colLeft + labelOffset, yL);
  yL += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Solicitud Origen:", colLeft, yL);
  doc.setFont("helvetica", "normal");
  doc.text(requestFolio, colLeft + labelOffset, yL);
  yL += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Instalación:", colLeft, yL);
  doc.setFont("helvetica", "normal");
  doc.text(installationName, colLeft + labelOffset, yL);
  yL += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Solicitante:", colLeft, yL);
  doc.setFont("helvetica", "normal");
  doc.text(requesterName, colLeft + labelOffset, yL);

  doc.setFont("helvetica", "bold");
  doc.text("Estado:", colRight, yR);
  doc.setFont("helvetica", "normal");
  doc.text("Aprobada", colRight + labelOffset, yR);
  yR += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Fecha de Envío:", colRight, yR);
  doc.setFont("helvetica", "normal");
  doc.text("N/A", colRight + labelOffset, yR);
  yR += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Fecha Límite:", colRight, yR);
  doc.setFont("helvetica", "normal");
  doc.text(formatDate(quotation?.expirationDate), colRight + labelOffset, yR);
  yR += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Generado:", colRight, yR);
  doc.setFont("helvetica", "normal");
  doc.text(generatedAt, colRight + labelOffset, yR);

  // ═══════════════════════════════════════════════════════════
  // Proveedor
  // ═══════════════════════════════════════════════════════════
  y += 39;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("PROVEEDOR", 19, y);

  doc.setFontSize(7);
  yL = y + 6;
  yR = y + 6;

  doc.setFont("helvetica", "bold");
  doc.text("Razón Social:", colLeft, yL);
  doc.setFont("helvetica", "normal");
  doc.text(supplierName, colLeft + labelOffset, yL);
  yL += 5;

  doc.setFont("helvetica", "bold");
  doc.text("RUT:", colLeft, yL);
  doc.setFont("helvetica", "normal");
  doc.text(supplierRut, colLeft + labelOffset, yL);

  doc.setFont("helvetica", "bold");
  doc.text("Email:", colRight, yR);
  doc.setFont("helvetica", "normal");
  doc.text(supplierEmail, colRight + labelOffset, yR);
  yR += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Teléfono:", colRight, yR);
  doc.setFont("helvetica", "normal");
  doc.text(supplierPhone, colRight + labelOffset, yR);

  // ═══════════════════════════════════════════════════════════
  // Detalle de productos
  // ═══════════════════════════════════════════════════════════
  y += 25;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DETALLE DE PRODUCTOS Y SERVICIOS", 14, y);

  const rows = (quotation?.items || []).map((item: any, idx: number) => [
    String(idx + 1),
    item?.requestItem?.itemName || "-",
    `${item?.quotedQuantity ?? 0} ${item?.requestItem?.unit || ""}`,
    "-",
  ]);

  autoTable(doc, {
    startY: y + 3,
    head: [["#", "Descripción", "Cant.", "Entreg."]],
    body: rows,
    margin: { left: 14, right: 14 },
    tableWidth: pageWidth - 28,
    theme: "grid",
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: 255,
      fontSize: 7,
      fontStyle: "bold",
      halign: "center",
      cellPadding: 1.5,
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: [0, 0, 0],
      cellPadding: 1.2,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 124 },
      2: { cellWidth: 24, halign: "center" },
      3: { cellWidth: 24, halign: "center" },
    },
  });

  // ═══════════════════════════════════════════════════════════
  // Resumen financiero
  // ═══════════════════════════════════════════════════════════
  const finalY = (doc as any).lastAutoTable?.finalY ?? y + 30;
  const boxX = pageWidth - 65;
  const boxY = finalY + 8;

  doc.setDrawColor(59, 80, 182);
  doc.setLineWidth(0.5);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(boxX, boxY, 50, 32, 2, 2, "FD");

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("Subtotal (Neto):", boxX + 3, boxY + 5);
  doc.text(formatCLP(subtotal), boxX + 47, boxY + 5, { align: "right" });

  doc.text("IVA (19%):", boxX + 3, boxY + 10);
  doc.text(formatCLP(iva), boxX + 47, boxY + 10, { align: "right" });

  // Caja azul del TOTAL
  doc.setFillColor(59, 80, 182);
  doc.roundedRect(boxX + 2, boxY + 16, 46, 12, 2, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", boxX + 5, boxY + 23);
  doc.text(formatCLP(total), boxX + 45, boxY + 23, { align: "right" });

  // ═══════════════════════════════════════════════════════════
  // Footer
  // ═══════════════════════════════════════════════════════════
  const footerY = pageHeight - 12;
  
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(14, footerY - 4, pageWidth - 14, footerY - 4);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");

  // Izquierda: Fecha de generación
  doc.text(`Documento generado el ${generatedAt}`, 14, footerY);

  // Centro: Página
  doc.text("Página 1 de 1", pageWidth / 2, footerY, { align: "center" });

  // Derecha: Folio
  doc.text(`Folio: ${quotation?.folio || "N/A"}`, pageWidth - 14, footerY, { align: "right" });

  // Texto legal centrado
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(5.5);
  doc.text("Este documento es válido sin firma cuando es generado electrónicamente", pageWidth / 2, footerY + 3, { align: "center" });

  const pdfArrayBuffer = doc.output("arraybuffer");
  const bytes = new Uint8Array(pdfArrayBuffer);
  const base64 = btoa(bytes.reduce((acc, b) => acc + String.fromCharCode(b), ""));
  const blob = new Blob([pdfArrayBuffer], { type: "application/pdf" });
  const blobUrl = URL.createObjectURL(blob);

  const itemsHtml = (quotation?.items || [])
    .map(
      (item: any, idx: number) => `
      <tr>
        <td style="padding:8px;border:1px solid #e2e8f0;">${idx + 1}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(item?.requestItem?.itemName || "-")}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${item?.quotedQuantity ?? 0} ${escapeHtml(item?.requestItem?.unit || "")}</td>
      </tr>
    `
    )
    .join("");

  const html = `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <style>
          body { margin:0; padding:24px; font-family: Arial, sans-serif; color:#0f172a; background:#f8fafc; }
          .card { max-width:720px; margin:0 auto; background:#fff; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; }
          .head { text-align:center; padding:18px; border-bottom:2px solid #3b50b6; color:#3b50b6; font-weight:700; }
          .body { padding:18px; font-size:14px; line-height:1.45; }
          .box { background:#f1f5f9; border-left:4px solid #3b50b6; padding:12px; margin:12px 0; }
          .obs { background:#fef3c7; border-left:4px solid #f59e0b; padding:10px; margin-top:12px; }
          table { width:100%; border-collapse:collapse; margin-top:10px; }
          th { background:#f1f5f9; text-align:left; padding:8px; border:1px solid #e2e8f0; }
          td { padding:8px; border:1px solid #e2e8f0; }
          .footer { text-align:center; padding:12px; font-size:12px; color:#64748b; border-top:1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="head">Cotización Aprobada</div>
          <div class="body">
            <p>Estimado ${escapeHtml(supplierName)},</p>
            <p>Nos complace comunicarle que su cotización ha sido aprobada por nuestro equipo.</p>
            <div class="box">
              <p><strong>Folio de Cotización:</strong> ${escapeHtml(quotation?.folio || "N/A")}</p>
              <p><strong>Solicitud Origen:</strong> ${escapeHtml(requestFolio)}</p>
              ${purchaseOrderNumber ? `<p><strong>N° Orden de Compra:</strong> ${escapeHtml(purchaseOrderNumber)}</p>` : ""}
            </div>
            <p><strong>Items aprobados:</strong></p>
            <table>
              <thead>
                <tr><th>#</th><th>Descripción</th><th>Cant.</th></tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <div class="obs">
              <strong>Observaciones:</strong>
              <p>Aprobado</p>
            </div>
            <p style="margin-top:16px;">Próximamente, nos pondremos en contacto para gestionar la orden de compra correspondiente.</p>
            <p>Saludos de Adquisiciones.</p>
          </div>
          <div class="footer">Este correo fue enviado automáticamente el ${generatedAt}.</div>
        </div>
      </body>
    </html>
  `;

  return { html, base64, blobUrl };
}
