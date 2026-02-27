/**
 * Componente: Modal de Items de Cotización
 * Archivo: app/insumos/[id]/components/QuotationItemsModal.tsx
 *
 * Modal informativo que muestra los items incluidos en una cotización específica.
 */

"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Loader2, X } from "lucide-react";
import { getQuotationById } from "../actions";
import { toast } from "sonner";

interface QuotationItemsModalProps {
  quotationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mapa de estados de items con sus estilos
const ITEM_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  PENDIENTE: {
    label: "Pendiente",
    className: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
  },
  COTIZADO: {
    label: "En Cotización",
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",
  },
  AUTORIZADO: {
    label: "Autorizado",
    className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400",
  },
  APROBADO: {
    label: "Aprobado",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  RECHAZADO: {
    label: "Rechazado",
    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400",
  },
  ENTREGADO: {
    label: "Entregado",
    className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400",
  },
  NO_DISPONIBLE: {
    label: "No Disponible",
    className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400",
  },
};

export default function QuotationItemsModal({
  quotationId,
  open,
  onOpenChange,
}: QuotationItemsModalProps) {
  const [loading, setLoading] = useState(false);
  const [quotation, setQuotation] = useState<any>(null);

  useEffect(() => {
    if (!open || !quotationId) return;

    const loadQuotation = async () => {
      setLoading(true);
      try {
        const result = await getQuotationById(quotationId);
        if (result) {
          setQuotation(result);
        } else {
          toast.error("Error al cargar los items de la cotización");
        }
      } catch (error) {
        console.error("Error loading quotation items:", error);
        toast.error("Error al cargar los items");
      } finally {
        setLoading(false);
      }
    };

    loadQuotation();
  }, [open, quotationId]);

  useEffect(() => {
    if (!open) {
      setQuotation(null);
    }
  }, [open]);

  const items = quotation?.items || [];
  const totalItems = items.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 flex flex-col max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border bg-linear-to-r from-[#283c7f] to-[#344690] text-white shrink-0">
          <DialogTitle className="text-xl font-bold inline-flex items-center gap-3">
            <div className="bg-white/20 rounded-md p-2">
              <Package className="h-5 w-5 text-white" />
            </div>
            Items de Cotización {quotation?.folio ? `(${quotation.folio})` : ""}
          </DialogTitle>
          <DialogDescription className="text-white/90 text-sm mt-2">
            {loading ? (
              "Cargando items..."
            ) : (
              <>
                Total: <span className="font-semibold">{totalItems}</span>{" "}
                {totalItems === 1 ? "ítem" : "ítems"}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Contenido */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="text-sm text-muted-foreground">
                  Cargando items...
                </span>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm font-medium">
                No hay items en esta cotización
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden bg-white dark:bg-slate-900">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Ítem
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-28">
                      Cantidad
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-40">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item: any, idx: number) => {
                    const requestItem = item.requestItem;
                    const statusConfig =
                      ITEM_STATUS_CONFIG[requestItem?.statusCode] ||
                      ITEM_STATUS_CONFIG.PENDIENTE;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        {/* Nombre del ítem */}
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 text-xs font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-slate-900 dark:text-white">
                                {requestItem?.itemName || "—"}
                              </p>
                              {requestItem?.category?.name && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {requestItem.category.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Cantidad */}
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="text-base font-bold text-slate-900 dark:text-white">
                              {item.quotedQuantity || requestItem?.quantity || 0}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              {requestItem?.unit?.code || "UNI"}
                            </span>
                          </div>
                        </td>

                        {/* Estado */}
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant="outline"
                            className={`text-xs font-medium px-2.5 py-1 ${statusConfig.className}`}
                          >
                            {statusConfig.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-border bg-muted/20 shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
