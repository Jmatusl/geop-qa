"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertCircle,
  Building2,
  Calendar,
  Calculator,
  ChevronDown,
  DollarSign,
  Info,
  Loader2,
  Package,
} from "lucide-react";
import { registerManualQuotation } from "../actions";

interface QuotationItem {
  id: string;
  quotedQuantity: number;
  unitPrice: number | null;
  supplierNotes?: string | null;
  requestItem?: {
    itemName?: string | null;
    quantity?: number | null;
    unitName?: string | null;
    itemCode?: string | null;
  } | null;
}

interface QuotationData {
  id: string;
  folio: string;
  createdAt?: string | Date;
  supplier?: {
    businessLine?: string | null;
    legalName?: string | null;
    fantasyName?: string | null;
  } | null;
  items: QuotationItem[];
}

interface ManualCotizacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: QuotationData | null;
  onSuccess?: () => void;
}

export default function ManualCotizacionDialog({
  open,
  onOpenChange,
  quotation,
  onSuccess,
}: ManualCotizacionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split("T")[0]);
  const [expirationDate, setExpirationDate] = useState("");
  const [quotationNumber, setQuotationNumber] = useState("");
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState("");
  const [supplierObservations, setSupplierObservations] = useState("");
  const [generalLeadTime, setGeneralLeadTime] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});
  const [itemTotals, setItemTotals] = useState<Record<string, number>>({});
  const [itemIncluded, setItemIncluded] = useState<Record<string, boolean>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [isMontosOpen, setIsMontosOpen] = useState(true);
  const [isItemsOpen, setIsItemsOpen] = useState(false);
  const [manualSubtotal, setManualSubtotal] = useState<string>("");

  // Limpiar montos e items al abrir el modal
  useEffect(() => {
    if (open) {
      setManualSubtotal("");
      setItemPrices({});
      setItemTotals({});
      setItemIncluded({});
      setItemNotes({});
      setUploadedFiles([]);
      setQuotationDate(new Date().toISOString().split("T")[0]);
      setExpirationDate("");
      setQuotationNumber("");
      setPurchaseOrderNumber("");
      setSupplierObservations("");
      setGeneralLeadTime("");
      setPaymentTerms("");
    }
  }, [open]);

  const formatDate = (value?: string | Date) => {
    if (!value) return new Date().toLocaleDateString("es-CL");
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString("es-CL");
    return date.toLocaleDateString("es-CL");
  };

  const supplierName =
    quotation?.supplier?.businessLine ||
    quotation?.supplier?.legalName ||
    quotation?.supplier?.fantasyName ||
    "Cotización general";

  const parseNumber = (value: string) => {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  // Cálculo automático desde la tabla
  const calculatedSubtotal = useMemo(() => {
    if (!quotation) return 0;
    return quotation.items.reduce((acc, item) => {
      const isIncluded = itemIncluded[item.id] ?? true;
      if (!isIncluded) return acc;
      const value = Number(itemPrices[item.id] || item.unitPrice || 0);
      const qty = item.quotedQuantity || item.requestItem?.quantity || 1;
      return acc + value * qty;
    }, 0);
  }, [itemIncluded, itemPrices, quotation]);

  // Usar valor manual si existe, sino el calculado
  const totalAmount = manualSubtotal ? parseNumber(manualSubtotal) : calculatedSubtotal;

  const vatAmount = Math.round(totalAmount * 0.19);
  const grandTotal = totalAmount + vatAmount;

  // Verificar si hay items con valores válidos para habilitar calculadora
  const hasValidItems = useMemo(() => {
    if (!quotation) return false;
    return quotation.items.some(item => {
      const isIncluded = itemIncluded[item.id] ?? true;
      if (!isIncluded) return false;
      const value = Number(itemPrices[item.id] || item.unitPrice || 0);
      return value > 0;
    });
  }, [itemIncluded, itemPrices, quotation]);

  // Advertencia: valor manual difiere del calculado
  const showSubtotalWarning = useMemo(() => {
    if (!hasValidItems) return false;
    if (!manualSubtotal) return false;
    const manual = parseNumber(manualSubtotal);
    return manual > 0 && Math.abs(manual - calculatedSubtotal) > 1;
  }, [calculatedSubtotal, hasValidItems, manualSubtotal]);

  const handlePriceChange = (itemId: string, rawValue: string, quantity: number) => {
    const sanitized = rawValue.replace(/[^0-9.]/g, "");
    setItemPrices((prev) => ({ ...prev, [itemId]: sanitized }));
    const unitPrice = parseNumber(sanitized);
    setItemTotals((prev) => ({ ...prev, [itemId]: unitPrice * quantity }));
  };

  const handleToggleItem = (itemId: string, checked: boolean) => {
    setItemIncluded((prev) => ({ ...prev, [itemId]: checked }));
    if (!checked) {
      setItemPrices((prev) => ({ ...prev, [itemId]: "" }));
      setItemTotals((prev) => ({ ...prev, [itemId]: 0 }));
      setItemNotes((prev) => ({ ...prev, [itemId]: "" }));
    }
  };

  const fillSubtotalFromItems = () => {
    if (calculatedSubtotal <= 0) {
      toast.error("No hay totales netos válidos para calcular el neto");
      return;
    }
    // Establecer el valor manual como la suma calculada
    setManualSubtotal(String(calculatedSubtotal));
    toast.success("Neto calculado desde los ítems");
  };

  const handleSubmit = async () => {
    if (!quotation) return;

    const payloadItems = quotation.items
      .map((item) => {
        const included = itemIncluded[item.id] ?? true;
        if (!included) return null;
        const value = Number(itemPrices[item.id] || item.unitPrice || 0);
        const qty = item.quotedQuantity || item.requestItem?.quantity || 1;
        return {
          quotationItemId: item.id,
          unitPrice: value > 0 ? value : undefined,
          quotedQuantity: qty,
          supplierNotes: itemNotes[item.id] || undefined,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (!payloadItems.length) {
      toast.error("Debe incluir al menos un ítem");
      return;
    }

    setIsSubmitting(true);
    const response = await registerManualQuotation(quotation.id, {
      quotationDate: quotationDate || undefined,
      expirationDate: expirationDate || undefined,
      quotationNumber: quotationNumber || undefined,
      purchaseOrderNumber: purchaseOrderNumber || undefined,
      observations:
        [
          generalLeadTime ? `Tiempo de Entrega General: ${generalLeadTime} día(s)` : "",
          paymentTerms ? `Condiciones de Pago: ${paymentTerms}` : "",
          supplierObservations,
        ]
          .filter(Boolean)
          .join("\n") || undefined,
      totalAmount: totalAmount > 0 ? totalAmount : undefined,
      items: payloadItems,
    });
    setIsSubmitting(false);

    if (!response.success) {
      toast.error(response.error);
      return;
    }

    toast.success("Cotización manual registrada correctamente");
    onOpenChange(false);
    onSuccess?.();
  };

  if (!quotation) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="w-[80vw]! max-w-[80vw]! max-h-[92vh] p-0 flex flex-col"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Package className="h-6 w-6" />
            Ingresar Cotización Manual - {quotation.folio}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Complete los precios y detalles de la cotización recibida por correo o otros medios
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 py-2 space-y-2 overflow-y-auto flex-1">
          <Card className="rounded-xl border border-border shadow-sm gap-0">
            <CardHeader className="px-4 py-0.5">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Información de la Cotización
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-2 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Folio:</span>
                  <div className="font-semibold">{quotation.folio}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Proveedor:</span>
                  <div className="font-semibold">{supplierName}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Fecha de emisión:</span>
                  <div className="font-semibold">{formatDate(quotation.createdAt)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border shadow-sm gap-0">
            <CardHeader className="px-4 py-0.5">
              <CardTitle className="text-lg font-semibold">Adjuntar archivos (PDF / Excel)</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-2 pt-0 gap-0">
              <div className="space-y-2">
                <Input
                  id="manual-cotizacion-files"
                  type="file"
                  className="hidden"
                  multiple
                  accept="application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setUploadedFiles(files);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const fileInput = document.getElementById("manual-cotizacion-files") as HTMLInputElement | null;
                    fileInput?.click();
                  }}
                >
                  Seleccionar archivos
                </Button>
                {uploadedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((file) => (
                      <Badge key={file.name + file.size} variant="outline" className="text-xs">
                        {file.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-3 px-4 py-3 border border-orange-200 rounded-lg bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900/50 shadow-sm">
            <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-orange-800 dark:text-orange-400 uppercase tracking-tight text-[11px]">Ingreso Manual de Cotización</p>
              <p className="text-orange-700 dark:text-orange-300 mt-1">
                Esta función permite ingresar manualmente los datos de una cotización recibida por correo, teléfono u otros medios. La cotización cambiará
                automáticamente al estado "Recibida".
              </p>
            </div>
          </div>

          <Collapsible open={isMontosOpen} onOpenChange={setIsMontosOpen} className="p-0">
            <Card className="rounded-xl border border-border shadow-sm py-0 gap-0">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer px-4 py-2 border-b hover:bg-muted/30 gap-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2 p-0 leading-none">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      Montos de la Cotización
                    </CardTitle>
                    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isMontosOpen ? "rotate-180" : ""}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="px-4 pt-0 pb-1">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                    <div className="space-y-1.5">
                      <Label>
                        Neto (Subtotal) <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          placeholder="Ingrese el neto"
                          value={manualSubtotal ? new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(parseNumber(manualSubtotal)) : (calculatedSubtotal > 0 ? new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(calculatedSubtotal) : "")}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, "");
                            setManualSubtotal(raw);
                          }}
                          autoComplete="off"
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={fillSubtotalFromItems} 
                          title="Calcular desde ítems"
                          disabled={!hasValidItems}
                        >
                          <Calculator className="h-4 w-4" />
                        </Button>
                      </div>
                      {showSubtotalWarning && (
                        <div className="flex items-start gap-2 text-xs text-orange-600 dark:text-orange-400 mt-1">
                          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>
                            El neto ingresado no coincide con la suma de Totales Netos ({new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(calculatedSubtotal)})
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>IVA (19%)</Label>
                      <Input
                        type="text"
                        value={new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(vatAmount || 0)}
                        readOnly
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Total</Label>
                      <Input
                        type="text"
                        value={new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(grandTotal || 0)}
                        readOnly
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible open={isItemsOpen} onOpenChange={setIsItemsOpen}>
            <Card className="rounded-xl border border-border shadow-sm overflow-hidden py-0 gap-0">
              <CollapsibleTrigger className="p-0 m-0 gap-0" asChild>
                <CardHeader className="cursor-pointer px-4 py-2 border-b hover:bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2 leading-none">
                        <Package className="h-4 w-4 text-blue-600" />
                        Items a Cotizar
                      </CardTitle>
                      <Badge variant="outline" className="text-xs font-normal bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">
                        <Info className="h-3 w-3 mr-1" />
                        Precio Unit., Total Neto y Observaciones son valores opcionales
                      </Badge>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isItemsOpen ? "rotate-180" : ""}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="px-4 pt-2 pb-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="h-9">
                          <TableHead className="w-22.5 py-1.5">Cotizado</TableHead>
                          <TableHead className="w-70 py-1.5">Item</TableHead>
                          <TableHead className="w-25 py-1.5">Cantidad</TableHead>
                          <TableHead className="w-25 py-1.5">Unidad</TableHead>
                          <TableHead className="w-35 py-1.5">Precio Unit.</TableHead>
                          <TableHead className="w-35 py-1.5">Total Neto</TableHead>
                          <TableHead className="w-45 py-1.5">Observaciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quotation.items.map((item) => {
                          const qty = item.quotedQuantity || item.requestItem?.quantity || 1;
                          const include = itemIncluded[item.id] ?? true;
                          const unitPrice = parseNumber(itemPrices[item.id] || String(item.unitPrice || 0));
                          const rowTotal = include ? unitPrice * qty : 0;
                          const rowNotes = itemNotes[item.id] ?? item.supplierNotes ?? "";

                          return (
                            <TableRow key={item.id} className="h-10">
                              <TableCell className="py-1.5">
                                <div className="flex items-center justify-center">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300"
                                    checked={include}
                                    onChange={(e) => handleToggleItem(item.id, e.target.checked)}
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="py-1.5">
                                <div className="font-semibold">{item.requestItem?.itemName || "Ítem"}</div>
                              </TableCell>
                              <TableCell className="py-1.5">
                                <Badge variant="secondary">{qty}</Badge>
                              </TableCell>
                              <TableCell className="py-1.5">{item.requestItem?.unitName || "UN"}</TableCell>
                              <TableCell className="py-1.5">
                                <Input
                                  type="text"
                                  className="h-8"
                                  placeholder="0"
                                  value={
                                    itemPrices[item.id]
                                      ? new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(
                                          parseNumber(itemPrices[item.id])
                                        )
                                      : item.unitPrice && item.unitPrice > 0
                                      ? new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(item.unitPrice)
                                      : ""
                                  }
                                  onChange={(e) => handlePriceChange(item.id, e.target.value, qty)}
                                  disabled={!include}
                                  autoComplete="off"
                                />
                              </TableCell>
                              <TableCell className="py-1.5">
                                <Input
                                  type="text"
                                  className="h-8"
                                  readOnly
                                  value={new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(itemTotals[item.id] ?? rowTotal)}
                                  autoComplete="off"
                                />
                              </TableCell>
                              <TableCell className="py-1.5">
                                <Input
                                  type="text"
                                  className="h-8"
                                  placeholder={include ? "Notas" : "No cotizado"}
                                  value={rowNotes}
                                  onChange={(e) => setItemNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                  disabled={!include}
                                  autoComplete="off"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Card className="rounded-xl border border-border shadow-sm">
            <CardHeader className="px-4 py-0.5">
              <CardTitle className="text-lg font-semibold">Información General</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label>Tiempo de Entrega General (días)</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="7"
                    value={generalLeadTime}
                    onChange={(e) => setGeneralLeadTime(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Condiciones de Pago</Label>
                  <Input
                    placeholder="30 días, contado, etc."
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Validez de la Cotización</Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      autoComplete="off"
                      className="pr-10"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Observaciones del Proveedor a la Solicitud de Cotización (opcional)</Label>
                <Textarea
                  rows={4}
                  placeholder="Incluya cualquier información adicional relevante para esta cotización..."
                  value={supplierObservations}
                  onChange={(e) => setSupplierObservations(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Número de Cotización</Label>
                <Input
                  value={quotationNumber}
                  onChange={(e) => setQuotationNumber(e.target.value)}
                  placeholder="Ej: COT-2026-000123"
                  autoComplete="off"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer con botones fijos */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20 shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="button" className="bg-[#283c7f] hover:bg-[#1e2f63] text-white" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                Ingresando...
              </>
            ) : (
              "Ingresar Cotización"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
