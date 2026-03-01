"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowUpCircle, ArrowDownCircle, ArrowRightCircle, Clock, User, Package, FileText, AlertCircle } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Movimiento {
  id: string;
  movementId: string;
  tipo: string;
  fecha: string;
  cantidad: number;
  usuario: string;
  observaciones: string;
  folio: string;
  bodega: string;
}

interface HistorialMovimientosSheetProps {
  repuestoId: string;
  nombreArticulo?: string;
  codigoArticulo?: string;
  bodegaId?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function HistorialMovimientosSheet({ repuestoId, nombreArticulo, codigoArticulo, bodegaId, trigger, open: controlledOpen, onOpenChange: setControlledOpen }: HistorialMovimientosSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;

  const {
    data: movimientos,
    isLoading,
    isError,
  } = useQuery<Movimiento[]>({
    queryKey: ["historial-movimientos", repuestoId, bodegaId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (bodegaId) params.append("bodegaId", bodegaId);

      const res = await fetch(`/api/v1/bodega/articulos/${repuestoId}/movimientos?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar movimientos");
      return res.json();
    },
    enabled: isOpen,
  });

  const getMovimientoInfo = (tipo: string) => {
    if (tipo === "INGRESO" || tipo === "AJUSTE" || tipo === "DEVOLUCION") {
      return { icon: ArrowUpCircle, color: "text-green-600", bg: "bg-green-100 dark:bg-green-950/30" };
    }
    if (tipo === "SALIDA" || tipo === "RESERVA") {
      return { icon: ArrowDownCircle, color: "text-red-600", bg: "bg-red-100 dark:bg-red-950/30" };
    }
    if (tipo === "LIBERACION") {
      return { icon: ArrowRightCircle, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-950/30" };
    }
    return { icon: Clock, color: "text-gray-600", bg: "bg-gray-100 dark:bg-gray-800/50" };
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Badge variant="outline" className="cursor-pointer hover:bg-accent text-[10px] font-bold uppercase">
            Ver Historial
          </Badge>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl font-bold">Historial de Movimientos</SheetTitle>
          <SheetDescription className="space-y-1">
            {nombreArticulo && <span className="block font-bold text-gray-900 dark:text-gray-100 text-sm uppercase">{nombreArticulo}</span>}
            {codigoArticulo && <span className="block text-xs font-medium">SKU: {codigoArticulo}</span>}
          </SheetDescription>
        </SheetHeader>

        <div className="h-full flex flex-col pt-2">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-4 p-4 border rounded-xl">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-4 text-center text-red-500 flex flex-col items-center gap-2">
              <AlertCircle size={24} />
              <p className="font-bold">Error al cargar el historial.</p>
            </div>
          ) : movimientos?.length === 0 ? (
            <div className="p-8 text-center text-gray-500 italic">No hay movimientos registrados para este artículo.</div>
          ) : (
            <ScrollArea className="flex-1 -mr-4 pr-4">
              <div className="relative ml-4 border-l-2 border-gray-100 dark:border-gray-800 space-y-8 py-4">
                {movimientos?.map((mov) => {
                  const { icon: Icon, color, bg } = getMovimientoInfo(mov.tipo);

                  return (
                    <div key={mov.id} className="relative group pl-8">
                      <span className={`absolute -left-[17px] top-0 p-1.5 rounded-full ${bg} ${color} ring-4 ring-white dark:ring-slate-950 z-10 border border-current/20 shadow-sm`}>
                        <Icon size={18} />
                      </span>

                      <div className="flex flex-col gap-1 pr-2">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-black text-xs uppercase tracking-tight text-gray-800 dark:text-gray-200">{mov.tipo}</span>
                          <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap uppercase">{format(new Date(mov.fecha), "dd MMM yy · HH:mm", { locale: es })}</span>
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`${mov.cantidad > 0 ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"} text-[10px] font-black h-5`}>
                            {mov.cantidad > 0 ? "+" : ""}
                            {mov.cantidad} UDS
                          </Badge>

                          {mov.bodega && <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded">{mov.bodega}</span>}
                        </div>

                        {mov.folio && (
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium mt-1 uppercase">
                            <FileText size={12} className="opacity-70" />
                            <span>Folio: {mov.folio}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium uppercase">
                          <User size={12} className="opacity-70" />
                          <span>{mov.usuario}</span>
                        </div>

                        {mov.observaciones && (
                          <p className="text-[10px] mt-2 italic text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-2 rounded-lg">
                            "{mov.observaciones}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
