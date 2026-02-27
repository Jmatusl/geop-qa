/**
 * Componente: Modal de Items de Solicitud
 * Archivo: app/insumos/listado/components/RequestItemsModal.tsx
 *
 * Muestra tabla informativa con el detalle de items de una solicitud,
 * incluyendo su estado y proveedores asignados.
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, X, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getRequestItemsDetail } from "../actions";
import { cn } from "@/lib/utils";

/* ── Configuración de estados de ítem ──────────────────────── */
const ITEM_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDIENTE: { label: "Pendiente", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400" },
  COTIZADO: { label: "En Cotización", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400" },
  AUTORIZADO: { label: "Autorizado", className: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400" },
  APROBADO: { label: "Aprobado", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400" },
  RECHAZADO: { label: "Rechazado", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400" },
  ENTREGADO: { label: "Entregado", className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400" },
  NO_DISPONIBLE: { label: "No Disponible", className: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400" },
};

const QUOTATION_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDIENTE: { label: "Pendiente", className: "bg-amber-50 text-amber-700 border-amber-200" },
  ENVIADA: { label: "Enviada", className: "bg-sky-50 text-sky-700 border-sky-200" },
  RECIBIDA: { label: "Recibida", className: "bg-blue-50 text-blue-700 border-blue-200" },
  NO_COTIZADO: { label: "No Cotizó", className: "bg-slate-100 text-slate-500 border-slate-200" },
  APROBADA: { label: "Aprobada", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  RECHAZADA: { label: "Rechazada", className: "bg-red-50 text-red-700 border-red-200" },
  CANCELADA: { label: "Cancelada", className: "bg-orange-50 text-orange-700 border-orange-200" },
};

interface Props {
  requestId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type RequestItemsDetail = Awaited<ReturnType<typeof getRequestItemsDetail>>;

export default function RequestItemsModal({ requestId, open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RequestItemsDetail>(null);

  useEffect(() => {
    if (!open || !requestId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const result = await getRequestItemsDetail(requestId);
        if (result) {
          setData(result);
        } else {
          toast.error("Error al cargar los items de la solicitud");
        }
      } catch (error) {
        console.error("Error loading request items:", error);
        toast.error("Error al cargar los items");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, requestId]);

  const formatCLP = (value: number | null | undefined) => {
    if (!value) return "-";
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] lg:max-w-[80vw] p-0 flex flex-col max-h-[85vh]">
        {/* Header corporativo */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border bg-linear-to-r from-[#283c7f] to-[#344690] text-white shrink-0">
          <DialogTitle className="text-xl font-bold inline-flex items-center gap-3">
            <div className="bg-white/20 rounded-md p-2">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col items-start">
              <span>Items de Solicitud {data?.folio || ""}</span>
              {data?.title && (
                <span className="text-sm font-normal text-white/80 mt-0.5">
                  {data.title}
                </span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Contenido scrollable */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-4 mb-4">
                <Package className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm text-muted-foreground">No hay items en esta solicitud</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Ítem</TableHead>
                  <TableHead className="text-center w-25">Cant.</TableHead>
                  <TableHead className="w-35">Estado</TableHead>
                  <TableHead className="w-45">Categoría</TableHead>
                  <TableHead>Cotizaciones / Proveedores</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item, idx) => (
                  <TableRow key={item.id}>
                    {/* Número */}
                    <TableCell className="font-medium text-slate-500 text-xs">
                      {idx + 1}
                    </TableCell>

                    {/* Nombre del ítem */}
                    <TableCell>
                      <p className="text-sm font-medium leading-tight line-clamp-2 max-w-sm">
                        {item.itemName}
                      </p>
                    </TableCell>

                    {/* Cantidad */}
                    <TableCell className="text-center">
                      <span className="text-sm font-semibold tabular-nums">
                        {item.quantity}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">
                        {item.unit}
                      </span>
                    </TableCell>

                    {/* Estado del ítem */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] font-medium whitespace-nowrap",
                          ITEM_STATUS_CONFIG[item.statusCode]?.className || "bg-slate-100 text-slate-600"
                        )}
                      >
                        {ITEM_STATUS_CONFIG[item.statusCode]?.label || item.statusCode}
                      </Badge>
                    </TableCell>

                    {/* Categoría */}
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {item.categoryName}
                      </span>
                    </TableCell>

                    {/* Cotizaciones y proveedores */}
                    <TableCell>
                      {item.quotations.length === 0 ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <AlertCircle className="h-3 w-3" />
                          <span>Sin cotizaciones</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {item.quotations.map((quot: any) => (
                            <div
                              key={quot.id}
                              className="flex items-center gap-2 text-xs"
                            >
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-medium shrink-0",
                                  QUOTATION_STATUS_CONFIG[quot.statusCode]?.className || "bg-slate-100 text-slate-600"
                                )}
                              >
                                {quot.folio}
                              </Badge>
                              <span className="text-muted-foreground truncate max-w-50">
                                {quot.supplierName}
                              </span>
                              {quot.subtotal && (
                                <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums ml-auto shrink-0">
                                  {formatCLP(quot.subtotal)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer sticky */}
        <div className="px-6 py-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/50 shrink-0 flex justify-end">
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
