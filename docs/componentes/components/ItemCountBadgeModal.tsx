"use client";

import { useState } from "react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, Clock, AlertCircle, XCircle, Info, Eye, Edit } from "lucide-react";
import DialogoNumeroOrdenCompra from "./DialogoNumeroOrdenCompra";
import { SolicitudItemStatus } from "@prisma/client";
import CotizacionDetailDialog from "./CotizacionDetailDialog";

export interface ItemWithStatus {
  id: number;
  status: SolicitudItemStatus;
  name?: string;
  quantity?: number;
}
interface ItemCountBadgeProps {
  items: ItemWithStatus[];
  cotizacionesCount?: number;
  tooltipContent?: string;
  solicitudId?: number;
  hasPermiso?: boolean;
}

// Mapeo de estados a colores e iconos - basado en enum SolicitudItemStatus
const getStatusConfig = (status: string) => {
  const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode; bgColor: string }> = {
    PENDIENTE: {
      label: "Pendiente",
      color: "text-gray-600",
      icon: <Clock className="w-4 h-4" />,
      bgColor: "bg-gray-50",
    },
    EN_COTIZACION: {
      label: "En Cotización",
      color: "text-blue-600",
      icon: <AlertCircle className="w-4 h-4" />,
      bgColor: "bg-blue-50",
    },
    COTIZADO: {
      label: "Cotizado",
      color: "text-purple-600",
      icon: <Info className="w-4 h-4" />,
      bgColor: "bg-purple-50",
    },
    APROBADO: {
      label: "Aprobado",
      color: "text-green-600",
      icon: <CheckCircle2 className="w-4 h-4" />,
      bgColor: "bg-green-50",
    },
    RECHAZADO: {
      label: "Rechazado",
      color: "text-red-600",
      icon: <XCircle className="w-4 h-4" />,
      bgColor: "bg-red-50",
    },
    EN_ORDEN_COMPRA: {
      label: "En Orden de Compra",
      color: "text-amber-600",
      icon: <AlertCircle className="w-4 h-4" />,
      bgColor: "bg-amber-50",
    },
    COMPLETADO: {
      label: "Completado",
      color: "text-green-600",
      icon: <CheckCircle2 className="w-4 h-4" />,
      bgColor: "bg-green-50",
    },
  };

  return statusMap[status] || statusMap.PENDIENTE;
};

export default function ItemCountBadge({ items, cotizacionesCount = 0, tooltipContent, solicitudId, hasPermiso = false }: ItemCountBadgeProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingTotals, setLoadingTotals] = useState(false);
  const [totalsLoaded, setTotalsLoaded] = useState(false);
  const [cotizacionesTotals, setCotizacionesTotals] = useState<any[] | null>(null);
  const [totalsError, setTotalsError] = useState<string | null>(null);
  const [selectedCotizacionId, setSelectedCotizacionId] = useState<number | null>(null);
  const [selectedParaOrden, setSelectedParaOrden] = useState<{ id: number; purchaseOrderNumber?: string | null } | null>(null);

  // Contar items por estado
  const statusCounts = items.reduce((acc, item) => {
    const status = String(item.status) || "PENDIENTE";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Generar header del tooltip para cotizaciones
  // Mostrar el total de cotizaciones (prop) y la cantidad aprobada (calculada cuando los totales ya estén cargados)
  const approvedCount = totalsLoaded && Array.isArray(cotizacionesTotals) ? cotizacionesTotals.filter((c: any) => c.status === "APPROVED").length : 0;
  const tooltipHeader = tooltipContent || `Total Cotizaciones  ${cotizacionesCount} | Aprobado ${approvedCount}`;

  const fetchTotals = async (solicitudId?: number) => {
    if (!solicitudId) return;
    if (totalsLoaded || loadingTotals) return;
    setLoadingTotals(true);
    setTotalsError(null);
    try {
      const res = await fetch("/api/solicitud-insumos/cotizaciones-totales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solicitudId }),
      });
      const json = await res.json();
      if (json?.success && Array.isArray(json.data)) {
        setCotizacionesTotals(json.data);
        setTotalsLoaded(true);
      } else {
        setTotalsError(json?.message || "No se encontraron totales");
      }
    } catch (e) {
      console.error("Error fetching cotizaciones totals:", e);
      setTotalsError("Error al cargar totales");
    } finally {
      setLoadingTotals(false);
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col items-center gap-2">
        {/* Badge: solo abre modal al click, no tooltip */}
        <div
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center min-w-[2rem] h-6 px-2 rounded-full bg-gray-100 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors relative"
        >
          {loadingTotals ? <span className="w-3 h-3 rounded-full bg-gray-400 animate-pulse" /> : items.length}
        </div>

        {cotizacionesCount > 0 && hasPermiso && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div onMouseEnter={() => fetchTotals(solicitudId)} className="text-xs text-blue-600 font-medium cursor-pointer">
                {cotizacionesCount} cotización{cotizacionesCount > 1 ? "es" : ""}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs p-0 bg-white border border-gray-200 shadow-lg rounded-lg overflow-hidden">
              {/* Header compacto */}
              <div className="bg-blue-50 px-1.5 py-2 border-b border-gray-200">
                <div className="text-xs font-bold text-gray-900">{tooltipHeader}</div>
              </div>

              {/* Contenido compacto */}
              <div className="px-1.5 py-2 max-h-80 overflow-y-auto">
                {loadingTotals && (
                  <div className="flex items-center gap-2 py-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                    <div className="text-xs text-gray-600">Cargando…</div>
                  </div>
                )}

                {totalsError && <div className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded border border-red-200">⚠ {totalsError}</div>}

                {!loadingTotals && cotizacionesTotals && cotizacionesTotals.length > 0 && (
                  <div className="space-y-1.5">
                    {cotizacionesTotals.map((c) => (
                      <div key={c.id} className="bg-gray-50 rounded p-1.5 border border-gray-200 hover:bg-blue-50 transition-colors text-xs">
                        {/* Línea 1: Ojo | Folio | Total | Aprobado - sin quebrados */}
                        <div className="flex items-center justify-between gap-1 mb-1 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedCotizacionId(c.id)}
                              className="text-blue-600 hover:text-blue-700 transition-colors flex-shrink-0"
                              title="Ver detalles de cotización"
                              aria-label={`Ver detalles cotización ${c.folio || c.id}`}
                            >
                              <Eye className="w-4 h-4 text-current" />
                            </button>
                            {c.status === "APPROVED" && (
                              <button
                                onClick={() => setSelectedParaOrden({ id: c.id, purchaseOrderNumber: c.purchaseOrderNumber })}
                                className="text-amber-600 hover:text-amber-700 transition-colors flex-shrink-0"
                                title="Asignar número de orden de compra"
                                aria-label={`Asignar número de orden a ${c.folio || c.id}`}
                              >
                                <Edit className="w-4 h-4 text-current" />
                              </button>
                            )}
                          </div>
                          <div className="font-bold text-gray-900 min-w-fit">{c.folio || `#${c.id}`}</div>
                          <div className="text-blue-600 font-bold min-w-fit">{c.totalEstimado != null ? `$${Number(c.totalEstimado).toLocaleString("es-CL")}` : "–"}</div>
                          {c.status === "APPROVED" && <span className="bg-green-100 text-green-800 px-1 py-0.5 rounded text-xs font-medium whitespace-nowrap">✓ Aprobado</span>}
                        </div>
                        {/* Línea 2: Proveedor - sin margen izquierdo */}
                        <div className="text-gray-600 -mx-1.5 px-1.5">
                          <span className="font-medium">Proveedor:</span> {c.proveedor?.razonSocial || c.proveedor?.nombre || "-"}
                        </div>
                        {/* Badge para Número de Orden de Compra */}
                        {c.purchaseOrderNumber && c.purchaseOrderNumber.trim() !== "" && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-600">OC:</span>
                            <div className="inline-flex items-center gap-1 bg-gradient-to-r from-green-50 to-emerald-50 px-2 py-1 rounded-md border border-green-300 shadow-sm">
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                              <span className="text-xs font-bold text-green-700">{c.purchaseOrderNumber}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {!loadingTotals && (!cotizacionesTotals || cotizacionesTotals.length === 0) && <div className="text-xs text-gray-500 py-1">Sin cotizaciones</div>}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Modal con detalles de items */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Detalles de Items
            </DialogTitle>
            <DialogDescription>
              Total de items: <span className="font-semibold text-gray-900">{items.length}</span>
            </DialogDescription>
          </DialogHeader>

          {/* Resumen por estado */}
          <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
            {Object.entries(statusCounts).map(([status, count]) => {
              const config = getStatusConfig(status);
              return (
                <div key={status} className={`flex items-center gap-2 p-2 rounded ${config.bgColor}`}>
                  <span className={config.color}>{config.icon}</span>
                  <div>
                    <div className="text-xs font-semibold text-gray-700">{config.label}</div>
                    <div className="text-sm font-bold text-gray-900">{count}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Listado de items por estado */}
          <div className="space-y-3">
            {Object.entries(statusCounts).map(([status]) => {
              const itemsWithStatus = items.filter((item) => String(item.status) === status);
              const config = getStatusConfig(status);

              return (
                <div key={status}>
                  <h4 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-2">
                    <span className={config.color}>{config.icon}</span>
                    {config.label} ({itemsWithStatus.length})
                  </h4>
                  <ul className="space-y-1 ml-6">
                    {itemsWithStatus.map((item) => (
                      <li key={item.id} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-gray-400 mt-1">•</span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.name || `Item #${item.id}`}</div>
                          {item.quantity && <div className="text-xs text-gray-500">Cantidad: {item.quantity}</div>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Footer con información adicional */}
          {items.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                <span className="font-semibold">💡 Tip:</span> Haz clic en el número de items para ver este detalle en cualquier momento.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CotizacionDetailDialog - se abre cuando selectedCotizacionId está set */}
      {selectedCotizacionId !== null && (
        <CotizacionDetailDialog
          cotizacionId={selectedCotizacionId}
          open={true}
          onOpenChange={(open) => {
            if (!open) setSelectedCotizacionId(null);
          }}
        />
      )}
      {/* Dialogo para asignar número de orden de compra */}
      {selectedParaOrden !== null && (
        <DialogoNumeroOrdenCompra
          cotizacionId={selectedParaOrden.id}
          valorInicial={selectedParaOrden.purchaseOrderNumber}
          open={true}
          onOpenChange={(open) => {
            if (!open) setSelectedParaOrden(null);
          }}
          onSuccess={() => setSelectedParaOrden(null)}
        />
      )}
    </TooltipProvider>
  );
}
