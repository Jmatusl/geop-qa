"use client";

import { useState } from "react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, XCircle, Info } from "lucide-react";
import { SolicitudItemStatus } from "@prisma/client";

export interface ItemWithStatus {
  id: number;
  status: SolicitudItemStatus;
  name?: string; // Opcional, se usa solo si está disponible
  quantity?: number; // Opcional
}

interface ItemCountBadgeProps {
  items: ItemWithStatus[];
  cotizacionesCount?: number;
  tooltipContent?: string;
}

// Mapeo de estados a colores e iconos
const getStatusConfig = (status: SolicitudItemStatus) => {
  const configs: Record<SolicitudItemStatus, { label: string; color: string; icon: React.ReactNode; bgColor: string }> = {
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

  return configs[status] || configs.PENDIENTE;
};

export default function ItemCountBadge({ items, cotizacionesCount = 0, tooltipContent }: ItemCountBadgeProps) {
  const [modalOpen, setModalOpen] = useState(false);

  // Contar items por estado
  const statusCounts = items.reduce((acc, item) => {
    const status = item.status || "PENDIENTE";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<SolicitudItemStatus, number>);

  // Generar tooltip content
  const tooltipText =
    tooltipContent ||
    `Total: ${items.length} items | ${Object.entries(statusCounts)
      .map(([status, count]) => `${getStatusConfig(status as SolicitudItemStatus).label}: ${count}`)
      .join(" | ")}`;

  return (
    <TooltipProvider>
      <div className="flex flex-col items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center min-w-[2rem] h-6 px-2 rounded-full bg-gray-100 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
            >
              {items.length}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-sm">{tooltipText}</p>
          </TooltipContent>
        </Tooltip>

        {cotizacionesCount > 0 && (
          <div className="text-xs text-blue-600 font-medium">
            {cotizacionesCount} cotización{cotizacionesCount > 1 ? "es" : ""}
          </div>
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
            {(Object.entries(statusCounts) as [SolicitudItemStatus, number][]).map(([status, count]) => {
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
            {(Object.entries(statusCounts) as [SolicitudItemStatus, number][]).map(([status]) => {
              const itemsWithStatus = items.filter((item) => (item.status || "PENDIENTE") === status);
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
    </TooltipProvider>
  );
}
