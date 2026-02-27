"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, AlertCircle, Package, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { getCotizacionItems } from "@/actions/solicitud-insumos/cotizacionActions";
import { toast } from "sonner";

interface CotizacionItemsModalProps {
  cotizacionId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cotizacionFolio?: string;
}

interface CotizacionItem {
  id: number;
  name: string;
  quantity: number;
  solicitudItem: {
    id: number;
    status: string;
    approvedCotizacionId: number | null;
  };
  unitPrice: number;
  totalPrice: number;
  cotizado: boolean;
  observaciones: string | null;
}

const statusConfig: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  PENDIENTE: {
    label: "Pendiente",
    icon: Clock,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
  EN_COTIZACION: {
    label: "En Cotización",
    icon: AlertCircle,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  COTIZADO: {
    label: "Cotizado",
    icon: Package,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  APROBADO: {
    label: "Aprobado",
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  RECHAZADO: {
    label: "Rechazado",
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  EN_ORDEN_COMPRA: {
    label: "En Orden de Compra",
    icon: Package,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  COMPLETADO: {
    label: "Completado",
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
};

export default function CotizacionItemsModal({ cotizacionId, open, onOpenChange, cotizacionFolio }: CotizacionItemsModalProps) {
  const [items, setItems] = useState<CotizacionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [showNoCotizados, setShowNoCotizados] = useState(false);

  useEffect(() => {
    if (!open) return;

    const loadItems = async () => {
      setLoading(true);
      try {
        const result = await getCotizacionItems(cotizacionId);

        if (result.success && result.data) {
          setItems(result.data.items || []);
          setTotalItems(result.data.totalItems || 0);
        } else {
          toast.error(result.message || "Error al cargar items");
        }
      } catch (error) {
        console.error("Error loading cotizacion items:", error);
        toast.error("Error al cargar los items de la cotización");
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, [open, cotizacionId]);

  const getStatusBadge = (status: string, isApproved: boolean) => {
    const config = statusConfig[status] || statusConfig.PENDIENTE;
    const StatusIcon = config.icon;

    return (
      <div className="flex items-center gap-1.5">
        <div className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${config.bgColor}`}>
          <StatusIcon className={`h-3 w-3 ${config.color}`} />
        </div>
        <span className="text-xs font-medium text-gray-900">{config.label}</span>
        {isApproved && <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">✓ Aprobado</span>}
      </div>
    );
  };

  const itemsCotizados = items.filter((item) => item.cotizado);
  const itemsNoCotizados = items.filter((item) => !item.cotizado);

  const ItemRow = ({ item }: { item: CotizacionItem }) => {
    const isApproved = item.solicitudItem.approvedCotizacionId !== null;

    return (
      <TableRow key={item.id} className={`border-b transition-colors ${isApproved ? "bg-green-50/30 hover:bg-green-100/20" : "hover:bg-blue-50/30"}`}>
        <TableCell className="py-2.5 px-3">
          <div className="flex flex-col gap-1">
            <span className="font-medium text-sm text-gray-900">{item.name}</span>
            {item.observaciones && <span className="text-xs text-gray-600 italic">{item.observaciones}</span>}
          </div>
        </TableCell>
        <TableCell className="py-2.5 px-3 text-center">
          <span className="text-sm font-semibold text-gray-900">{item.quantity}</span>
        </TableCell>
        <TableCell className="py-2.5 px-3">
          <Badge variant="outline" className="flex items-center gap-1.5 px-2 py-1 w-full justify-start">
            {getStatusBadge(item.solicitudItem.status, isApproved)}
          </Badge>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Items de Cotización {cotizacionFolio && `(${cotizacionFolio})`}
          </DialogTitle>
          <DialogDescription>
            Total: <span className="font-semibold text-gray-900">{totalItems} items</span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="text-sm text-gray-600">Cargando items...</span>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Package className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm font-medium">No hay items en esta cotización</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Items Cotizados */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b-2 border-green-200">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold text-gray-900 py-2.5 px-3 text-xs uppercase tracking-wider">Ítem</TableHead>
                    <TableHead className="font-bold text-gray-900 py-2.5 px-3 text-xs uppercase tracking-wider text-center">Cantidad</TableHead>
                    <TableHead className="font-bold text-gray-900 py-2.5 px-3 text-xs uppercase tracking-wider">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsCotizados.map((item) => (
                    <ItemRow key={item.id} item={item} />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Items No Cotizados (Colapsable) */}
            {itemsNoCotizados.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowNoCotizados(!showNoCotizados)}
                  className="w-full flex items-center justify-between gap-2 p-3 bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200 hover:from-orange-100 hover:to-orange-150 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {showNoCotizados ? <ChevronDown className="h-4 w-4 text-orange-600" /> : <ChevronRight className="h-4 w-4 text-orange-600" />}
                    <span className="font-semibold text-sm text-orange-900">Items No Cotizados ({itemsNoCotizados.length})</span>
                  </div>
                  <span className="text-xs bg-orange-200 text-orange-900 px-2 py-1 rounded">Cerrado por defecto</span>
                </button>

                {showNoCotizados && (
                  <Table>
                    <TableHeader className="bg-gray-50 border-b border-gray-200">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-bold text-gray-900 py-2.5 px-3 text-xs uppercase tracking-wider">Ítem</TableHead>
                        <TableHead className="font-bold text-gray-900 py-2.5 px-3 text-xs uppercase tracking-wider text-center">Cantidad</TableHead>
                        <TableHead className="font-bold text-gray-900 py-2.5 px-3 text-xs uppercase tracking-wider">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsNoCotizados.map((item) => (
                        <ItemRow key={item.id} item={item} />
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {/* Resumen */}
            <div className="bg-gray-50 border rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <span className="text-xs text-gray-600 uppercase tracking-wider">Total Ítems</span>
                  <p className="text-lg font-bold text-gray-900 mt-1">{items.length}</p>
                </div>
                <div className="text-center">
                  <span className="text-xs text-gray-600 uppercase tracking-wider">Cotizados</span>
                  <p className="text-lg font-bold text-green-600 mt-1">{itemsCotizados.length}</p>
                </div>
                <div className="text-center">
                  <span className="text-xs text-gray-600 uppercase tracking-wider">Aprobados</span>
                  <p className="text-lg font-bold text-blue-600 mt-1">{items.filter((i) => i.solicitudItem.approvedCotizacionId !== null).length}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
