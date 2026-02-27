"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock3, FileText, History, Info, Lock, Package2, Paperclip, PencilLine } from "lucide-react";

interface RequestSummary {
  folio: string;
  description?: string | null;
  installation?: { name?: string | null } | null;
  creator?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
}

interface QuotationItem {
  id: string;
  quotedQuantity: number;
  unitPrice: number | null;
  subtotal: number | null;
  supplierNotes?: string | null;
  requestItem?: {
    itemName: string;
    quantity: number;
    unit: string;
    category?: { name?: string | null } | null;
  } | null;
}

interface QuotationAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface QuotationDetail {
  id: string;
  folio: string;
  statusCode: string;
  purchaseOrderNumber?: string | null;
  totalAmount?: number | null;
  observations?: string | null;
  createdAt?: Date | string | null;
  quotationDate?: Date | string | null;
  expirationDate?: Date | string | null;
  supplier?: {
    rut?: string | null;
    legalName?: string | null;
    fantasyName?: string | null;
    businessLine?: string | null;
    contactEmail?: string | null;
  } | null;
  items: QuotationItem[];
  attachments: QuotationAttachment[];
}

interface CotizacionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: RequestSummary;
  quotation: QuotationDetail | null;
}

function formatMoney(value?: number | null) {
  if (!value) return "$0";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-CL").format(new Date(value));
}

function getStatusBadgeClass(statusCode: string) {
  const normalized = statusCode.toUpperCase();
  if (normalized === "PENDIENTE") return "bg-amber-50 text-amber-700 border-amber-200";
  if (normalized === "ENVIADA") return "bg-sky-50 text-sky-700 border-sky-200";
  if (normalized === "RECIBIDA") return "bg-blue-50 text-blue-700 border-blue-200";
  if (normalized === "APROBADA") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (normalized === "RECHAZADA") return "bg-red-50 text-red-700 border-red-200";
  if (normalized === "NO_COTIZADO") return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-slate-100 text-slate-700 border-slate-300";
}

export default function CotizacionDetailDialog({
  open,
  onOpenChange,
  request,
  quotation,
}: CotizacionDetailDialogProps) {
  if (!quotation) return null;

  const supplierName =
    quotation.supplier?.businessLine ||
    quotation.supplier?.legalName ||
    quotation.supplier?.fantasyName ||
    "Sin proveedor";

  const supplierNotes = quotation.items
    .map((item) => item.supplierNotes?.trim())
    .filter((note): note is string => Boolean(note));

  const itemsWithPrice = quotation.items.filter((item) => (item.unitPrice ?? 0) > 0).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80vw]! max-w-[80vw]! max-h-[92vh] overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b border-border bg-gradient-to-r from-background to-muted/30">
          <DialogTitle className="text-xl lg:text-2xl font-extrabold tracking-tight">Detalle de Cotización - {quotation.folio}</DialogTitle>
          <DialogDescription>
            Información completa de la cotización y sus ítems.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground">Estado</p>
            <Badge variant="outline" className={`mt-2 ${getStatusBadgeClass(quotation.statusCode)}`}>
              <Clock3 className="w-3.5 h-3.5 mr-1" />
              {quotation.statusCode}
            </Badge>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground">Proveedor</p>
            <p className="text-xl font-bold mt-1 truncate">{quotation.supplier?.rut || "-"}</p>
            <p className="text-sm text-muted-foreground truncate mt-0.5">{supplierName}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground">Items</p>
            <p className="text-xl font-bold mt-1">{quotation.items.length} items</p>
            <p className="text-sm text-muted-foreground mt-0.5">{itemsWithPrice} con precios</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Total Neto</p>
                <p className="text-2xl font-extrabold mt-1">{formatMoney(quotation.totalAmount ?? null)}</p>
              </div>
              <PencilLine className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        <Tabs defaultValue="items" className="px-6 pb-6">
          <TabsList className="grid grid-cols-4 w-full h-10 bg-muted/70 p-1 rounded-lg">
            <TabsTrigger value="items" className="font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Items ({quotation.items.length})
            </TabsTrigger>
            <TabsTrigger value="info" className="font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Información
            </TabsTrigger>
            <TabsTrigger value="adjuntos" className="font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Adjuntos ({quotation.attachments.length})
            </TabsTrigger>
            <TabsTrigger value="historial" className="font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Historial (1)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-5">
              <div>
                <p className="text-xl lg:text-2xl font-extrabold tracking-tight">Items de la Cotización</p>
                <p className="text-muted-foreground mt-1">Detalle de productos y precios cotizados por el proveedor.</p>
              </div>

              <ScrollArea className="rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr className="h-8">
                      <th className="text-left px-3   font-semibold">Nombre</th>
                      <th className="text-left px-3  font-semibold">Categoría</th>
                      <th className="text-right px-3  font-semibold">Cantidad</th>
                      <th className="text-left px-3  font-semibold">Unidad</th>
                      <th className="text-right px-3  font-semibold">P. Unit</th>
                      <th className="text-right px-3  font-semibold">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.items.map((item) => (
                      <tr key={item.id} className="border-t border-border">
                        <td className="px-3 py-1 font-medium">{item.requestItem?.itemName || "-"}</td>
                        <td className="px-3 py-1 text-muted-foreground">{item.requestItem?.category?.name || "-"}</td>
                        <td className="px-3 py-1 text-right">{item.quotedQuantity || item.requestItem?.quantity || 0}</td>
                        <td className="px-3 py-1 text-muted-foreground">{item.requestItem?.unit || "-"}</td>
                        <td className="px-3 py-1 text-right">{formatMoney(item.unitPrice)}</td>
                        <td className="px-3 py-1 text-right font-semibold">{formatMoney(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-blue-300 bg-blue-50/60 p-4">
                  <p className="text-lg lg:text-xl font-extrabold tracking-tight">Descripción ingresada por el solicitante</p>
                  <p className="mt-2 text-blue-900">{request.description?.trim() || "Sin descripción del solicitante"}</p>
                  <p className="mt-2 text-sm text-blue-700 inline-flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    No visible para el proveedor, ingresado por ({request.creator?.firstName || "Sistema"} {request.creator?.lastName || ""})
                  </p>
                </div>

                <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4">
                  <p className="text-lg lg:text-xl font-extrabold tracking-tight">Descripción Interna</p>
                  <p className="mt-2 text-amber-900 italic">{quotation.observations?.trim() || "Sin descripción interna"}</p>
                  <p className="mt-2 text-sm text-amber-700 inline-flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    Notas internas, no visibles para el proveedor
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="info" className="mt-4 space-y-4 text-sm">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-2">
                <p className="text-xl lg:text-2xl font-extrabold tracking-tight inline-flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Solicitud Origen
                </p>
                <p><span className="font-semibold">Folio:</span> {request.folio}</p>
                <p><span className="font-semibold">Instalación:</span> {request.installation?.name || "-"}</p>
                <p><span className="font-semibold">Solicitante:</span> {request.creator?.firstName || ""} {request.creator?.lastName || ""}</p>
                <p><span className="font-semibold">Creada por:</span> {request.creator?.firstName || "-"} {request.creator?.lastName || ""}</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-2">
                <p className="text-xl lg:text-2xl font-extrabold tracking-tight inline-flex items-center gap-2">
                  <Package2 className="w-5 h-5" />
                  Detalles de Cotización
                </p>
                <p><span className="font-semibold">Fecha emisión:</span> {formatDate(quotation.quotationDate)}</p>
                <p><span className="font-semibold">Fecha Límite:</span> {formatDate(quotation.expirationDate)}</p>
                <p><span className="font-semibold">Número OC:</span> {quotation.purchaseOrderNumber || "-"}</p>
                <p><span className="font-semibold">Estado:</span> {quotation.statusCode}</p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-5 shadow-sm">
              <p className="text-lg lg:text-xl font-extrabold tracking-tight">Observaciones del Proveedor (ingresada manualmente)</p>
              <p className="mt-2">{supplierNotes[0] || "S/O"}</p>
              <p className="mt-2 text-sm text-blue-700 inline-flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Observaciones del proveedor al recibir la cotización.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="adjuntos" className="mt-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm text-sm">
              <p className="text-xl lg:text-2xl font-extrabold tracking-tight mb-3 inline-flex items-center gap-2">
                <Paperclip className="w-5 h-5" />
                Adjuntos ({quotation.attachments.length})
              </p>
              {quotation.attachments.length === 0 ? (
                <p className="text-muted-foreground">No hay archivos adjuntos.</p>
              ) : (
                <ul className="space-y-2">
                  {quotation.attachments.map((file) => (
                    <li key={file.id} className="flex justify-between gap-2 rounded-lg border border-border p-2.5">
                      <span className="truncate font-medium">{file.fileName}</span>
                      <span className="text-muted-foreground whitespace-nowrap">{Math.round(file.fileSize / 1024)} KB</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          <TabsContent value="historial" className="mt-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm text-sm space-y-4">
              <div>
                <p className="text-xl lg:text-2xl font-extrabold tracking-tight inline-flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Historial de Cambios
                </p>
                <p className="text-muted-foreground mt-1">Registro de acciones realizadas en esta cotización.</p>
              </div>

              <div className="flex items-start justify-between gap-4 border-l-2 border-border pl-4 py-1">
                <div>
                  <p className="font-semibold">CREAR</p>
                  <p className="text-muted-foreground">Cotización creada</p>
                  <p className="text-muted-foreground">por {request.creator?.firstName || "Sistema"} {request.creator?.lastName || ""}</p>
                </div>
                <p className="text-muted-foreground whitespace-nowrap">{formatDate(quotation.createdAt)}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
