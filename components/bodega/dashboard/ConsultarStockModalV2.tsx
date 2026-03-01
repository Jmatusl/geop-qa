"use client";

import React, { useState } from "react";
import { Search, Package, MapPin, Warehouse, History, X, ChevronRight, ChevronDown, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { HistorialMovimientosSheet } from "@/components/bodega/historial/HistorialMovimientosSheet";
import { cn } from "@/lib/utils";

interface ConsultarStockModalV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConsultarStockModalV2({ open, onOpenChange }: ConsultarStockModalV2Props) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["global-stock-search-v2", search],
    queryFn: async () => {
      if (search.length < 2) return { resultados: [] };
      const res = await fetch(`/api/v1/bodega/consulta-rapida?search=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error("Error buscando artículos");
      return res.json();
    },
    enabled: open && search.length >= 2,
    staleTime: 60000,
  });

  const articulos = data?.resultados || [];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-gray-50 dark:bg-gray-950 rounded-t-4xl sm:rounded-4xl flex flex-col h-[92vh] sm:h-auto sm:max-h-[85vh] shadow-2xl animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                <Search className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight">Consulta de Stock</h2>
                <p className="text-[10px] font-black uppercase text-gray-400">Busca en todas las bodegas</p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Nombre, código o SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-bold focus:border-purple-500 dark:focus:border-purple-500 transition-all outline-none shadow-sm text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-10 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              <p className="text-xs font-black uppercase text-gray-400">Buscando artículos...</p>
            </div>
          ) : articulos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center mb-4 text-gray-300 dark:text-gray-700">
                <Package className="w-8 h-8" />
              </div>
              <p className="text-[11px] font-black uppercase text-gray-400 max-w-[200px] leading-relaxed">
                {search.length < 2 ? "Escribe al menos 2 letras para comenzar la búsqueda" : "No encontramos ningún artículo con ese criterio"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {articulos.map((art: any) => (
                <div
                  key={art.id}
                  className={cn(
                    "rounded-2xl border transition-all duration-200 overflow-hidden",
                    expandedId === art.id
                      ? "border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900 shadow-md scale-[1.01]"
                      : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-800",
                  )}
                >
                  {/* Card Header */}
                  <div className="p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === art.id ? null : art.id)}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[9px] font-black text-gray-500 uppercase tracking-widest">{art.codigo || art.sku || "S/C"}</span>
                        {art.stockTotal <= 0 && (
                          <span className="flex items-center gap-1 text-[9px] font-black text-red-500 uppercase tracking-wider">
                            <AlertCircle className="w-3 h-3" /> SIN STOCK
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm font-black text-purple-600 dark:text-purple-400">
                        {art.stockTotal} {art.unidad}
                        {expandedId === art.id ? <ChevronDown className="w-4 h-4 ml-1" /> : <ChevronRight className="w-4 h-4 ml-1" />}
                      </div>
                    </div>

                    <h3 className="font-black text-gray-900 dark:text-gray-100 leading-tight uppercase text-xs tracking-tight">{art.nombre}</h3>
                  </div>

                  {/* Expanded Content */}
                  {expandedId === art.id && (
                    <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                      <div className="h-px bg-gray-100 dark:bg-gray-800 mb-4" />

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <Warehouse className="w-3.5 h-3.5 text-purple-500" />
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Distribución por Bodega</span>
                        </div>

                        {art.bodegas.map((bodega: any) => (
                          <div key={bodega.bodegaId} className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800">
                            <div>
                              <div className="text-[11px] font-black text-gray-800 dark:text-gray-200 uppercase">{bodega.bodegaNombre}</div>
                              <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 mt-0.5 uppercase">
                                <MapPin className="w-3 h-3" /> {bodega.bodegaCodigo}
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className={cn("text-xs font-black", bodega.cantidadDisponible > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400")}>
                                {bodega.cantidadDisponible} <span className="text-[9px] font-bold opacity-70 uppercase">{art.unidad}</span>
                              </div>

                              <HistorialMovimientosSheet
                                repuestoId={art.id}
                                bodegaId={bodega.bodegaId}
                                nombreArticulo={art.nombre}
                                codigoArticulo={art.codigo}
                                trigger={
                                  <button className="w-9 h-9 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-purple-600 transition-colors shadow-sm">
                                    <History className="w-4 h-4" />
                                  </button>
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center px-1">
                        <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest">UUID: {art.id.substring(0, 8)}...</div>
                        <button
                          className="flex items-center gap-1.5 text-[9px] font-black text-purple-600 hover:underline uppercase tracking-widest"
                          onClick={() => window.open(`/bodega/maestros/articulos?id=${art.id}`, "_blank")}
                        >
                          Ficha Técnica <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
