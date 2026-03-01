"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Package, MapPin, Warehouse, History, DollarSign, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { HistorialMovimientosSheet } from "@/components/bodega/historial/HistorialMovimientosSheet";
import { cn } from "@/lib/utils";

interface GlobalStockSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalStockSearchModal({ open, onOpenChange }: GlobalStockSearchModalProps) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["global-stock-search", search],
    queryFn: async () => {
      if (search.length < 2) return { resultados: [] };
      const res = await fetch(`/api/v1/bodega/consulta-rapida?search=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error("Error buscando artículos");
      return res.json();
    },
    enabled: search.length >= 2,
    staleTime: 60000,
  });

  const articulos = data?.resultados || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col overflow-hidden rounded-2xl border-none shadow-2xl">
        <DialogHeader className="px-1 pt-2">
          <DialogTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight text-blue-700 dark:text-blue-400">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
              <Package className="h-6 w-6" />
            </div>
            Consulta Global de Stock
          </DialogTitle>
          <DialogDescription className="text-sm font-medium text-gray-400">Busque un artículo para ver su disponibilidad en todas las bodegas.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 py-4 px-1">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Buscar por código, ID Artículo o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-12 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-blue-500 font-medium"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-1 pb-2 custom-scrollbar">
          {isLoading ? (
            <div className="space-y-4 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-3">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              ))}
            </div>
          ) : articulos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
              <Search className="w-12 h-12 opacity-10" />
              <p className="text-sm font-medium">{search.length < 2 ? "Ingrese al menos 2 caracteres para buscar." : "No se encontraron resultados para su búsqueda."}</p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {articulos.map((art: any) => (
                <div
                  key={art.id}
                  className={cn(
                    "border border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900/50 transition-all shadow-sm",
                    expandedId === art.id && "border-blue-200 dark:border-blue-800 shadow-md",
                  )}
                >
                  <button
                    onClick={() => setExpandedId(expandedId === art.id ? null : art.id)}
                    className="w-full flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 text-left hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="text-[10px] font-black bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg text-gray-500 uppercase tracking-widest leading-none">
                          {art.codigo || art.sku || "S/C"}
                        </code>
                        <span className="font-bold text-gray-900 dark:text-gray-100 uppercase text-xs tracking-tight">{art.nombre}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2">
                          <span className={`text-base font-black ${art.stockTotal > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>{art.stockTotal}</span>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter self-end mb-0.5">{art.unidad}</span>
                        </div>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">STOCK TOTAL</span>
                      </div>
                      {expandedId === art.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </button>

                  {expandedId === art.id && (
                    <div className="px-5 pb-5 pt-1 animate-in slide-in-from-top-2 duration-200">
                      <div className="space-y-4">
                        <div className="h-px bg-gray-100 dark:bg-gray-800" />

                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <Warehouse className="h-3.5 w-3.5 text-blue-500" /> Distribución por Bodega
                        </h4>

                        <div className="grid gap-2">
                          {art.bodegas.map((bodega: any) => (
                            <div
                              key={bodega.bodegaId}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800/50 transition-all group"
                            >
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase">{bodega.bodegaNombre}</span>
                                  {bodega.bajoStock && <Badge className="bg-amber-500 text-white text-[8px] h-4 font-black uppercase tracking-widest">BAJO MÍNIMO</Badge>}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase">
                                  <MapPin className="h-3 w-3" /> {bodega.bodegaCodigo}
                                  {bodega.cantidadDisponible === 0 && (
                                    <span className="flex items-center gap-1 text-red-500 ml-2">
                                      <AlertCircle className="h-3 w-3" /> SIN STOCK
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-4 mt-3 sm:mt-0">
                                <div className="flex flex-col items-end mr-2">
                                  <div className={`text-sm font-black ${bodega.cantidadDisponible > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}`}>
                                    {bodega.cantidadDisponible} <span className="text-[8px] opacity-70">{art.unidad}</span>
                                  </div>
                                </div>

                                <HistorialMovimientosSheet
                                  repuestoId={art.id}
                                  bodegaId={bodega.bodegaId}
                                  nombreArticulo={art.nombre}
                                  codigoArticulo={art.codigo}
                                  trigger={
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-9 rounded-lg gap-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm transition-all hover:text-blue-600 hover:border-blue-300"
                                    >
                                      <History className="h-4 w-4" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Historial</span>
                                    </Button>
                                  }
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 flex justify-end">
                          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">ID ARTÍCULO: {art.id}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
