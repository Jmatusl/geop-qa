"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Warehouse, Plus, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBodegaQuickSearch } from "@/lib/hooks/bodega/use-bodega-quick-search";
import { cn } from "@/lib/utils";

interface BuscarArticulosPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemsAgregados: any[];
  onAddItem: (articulo: any, bodegaId?: string | null) => void;
  mostrarBodegas?: boolean; // si false oculta las bodegas
}

export function BuscarArticulosPanel({ open, onOpenChange, itemsAgregados, onAddItem, mostrarBodegas = true }: BuscarArticulosPanelProps) {
  const [terminoBusqueda, setTerminoBusqueda] = useState("");

  // 1. Carga inicial del catálogo (vacío trae los primeros ~250 según take del servicio)
  const { data: catalogoData, isLoading: cargandoCatalogo } = useBodegaQuickSearch("");
  const articulosCatalogo = catalogoData?.resultados || [];

  // 2. Filtrado local inteligente sopesando nombre, código, descripción, partNumber e internalCode
  const resultadosLocales = articulosCatalogo.filter((articulo) => {
    if (!terminoBusqueda.trim()) return true;
    const search = terminoBusqueda.toLowerCase();
    return (
      articulo.nombre.toLowerCase().includes(search) ||
      articulo.codigo.toLowerCase().includes(search) ||
      articulo.descripcion?.toLowerCase().includes(search) ||
      articulo.partNumber?.toLowerCase().includes(search) ||
      articulo.internalCode?.toLowerCase().includes(search)
    );
  });

  // 3. Determinar si necesitamos disparar búsqueda al servidor (si local falló y hay término suficiente)
  const debeBuscarServidor = terminoBusqueda.trim().length >= 2 && resultadosLocales.length === 0;

  const { data: buscadorServidorData, isLoading: buscandoEnServidor } = useBodegaQuickSearch(terminoBusqueda, undefined, { enabled: debeBuscarServidor });

  const resultadosBusqueda = debeBuscarServidor ? buscadorServidorData?.resultados || [] : resultadosLocales;
  const buscando = cargandoCatalogo || (debeBuscarServidor && buscandoEnServidor);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw]! max-w-[95vw]! md:w-[60vw]! md:max-w-[60vw]! max-h-[92vh] md:max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 border-none rounded-md shadow-2xl bg-white dark:bg-gray-950">
        <DialogHeader className="p-4 md:p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center">
                <Warehouse className="w-4 h-4 text-orange-500" />
              </div>
              <div className="space-y-0.5">
                <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-50 uppercase tracking-tight italic">Buscar Artículos</DialogTitle>
                <DialogDescription className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">Busca por código, nombre o descripción</DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col bg-gray-50/30 dark:bg-gray-900/40">
          <div className="p-3 md:p-4 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
            <div className="flex gap-2">
              <div className="flex-1 relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                <Input
                  placeholder="Escribe para buscar..."
                  value={terminoBusqueda}
                  onChange={(e) => setTerminoBusqueda(e.target.value)}
                  className="pl-9 h-10 rounded-md border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-xs md:text-sm font-semibold transition-all focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
              <Button
                disabled={buscando}
                className="h-10 px-6 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-black shadow-sm active:scale-95 transition-all text-[10px] uppercase tracking-widest"
              >
                {buscandoEnServidor ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 stroke-3" />}
                <span className="ml-2">{buscandoEnServidor ? "Buscando..." : "Buscar"}</span>
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2 md:px-4">
            {buscando ? (
              <div className="space-y-3 py-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-gray-950 rounded-md p-4 border border-gray-100 dark:border-gray-800 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-4 w-20 rounded" />
                        <Skeleton className="h-3.5 w-2/3 rounded" />
                      </div>
                      <Skeleton className="h-4 w-12 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : resultadosBusqueda.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center opacity-60">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 transition-transform hover:scale-110">
                  <Search className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                </div>
                <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{terminoBusqueda.length >= 2 ? "No hay resultados" : "Escribe para buscar"}</h3>
                <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold tracking-widest">Ingrese al menos 2 caracteres para iniciar la búsqueda</p>
              </div>
            ) : (
              <div className="space-y-3 py-2 pb-6">
                {resultadosBusqueda.map((articulo) => (
                  <div
                    key={articulo.id}
                    className="bg-white dark:bg-gray-900 rounded-md p-3 md:p-4 border border-gray-100 dark:border-gray-800/50 shadow-sm hover:border-orange-200 dark:hover:border-orange-900/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <code className="text-[9px] font-bold bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded border border-orange-100/50 dark:border-orange-900/20 uppercase tracking-tight">
                            {articulo.codigo}
                          </code>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">ARTÍCULO</span>
                        </div>
                        <h4 className="font-bold text-xs md:text-sm text-gray-800 dark:text-gray-100 leading-tight mb-1 italic uppercase">{articulo.nombre}</h4>
                        <div className="flex flex-wrap gap-2 mb-1">
                          {articulo.partNumber && (
                            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tighter bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800/50">
                              P/N: {articulo.partNumber}
                            </span>
                          )}
                          {articulo.internalCode && (
                            <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-tighter bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded border border-purple-100 dark:border-purple-800/50">
                              SKU/INT: {articulo.internalCode}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium line-clamp-1 italic">{articulo.descripcion || "Sin descripción"}</p>
                      </div>

                      <div className="flex flex-col items-end text-right">
                        <span className="text-[9px] font-black text-orange-500 dark:text-orange-400 flex items-center gap-1 uppercase bg-orange-50/50 dark:bg-orange-950/20 px-2 py-0.5 rounded border border-orange-100 dark:border-orange-900/30">
                          {articulo.unidad || "UND"}
                        </span>
                      </div>
                    </div>

                    {mostrarBodegas ? (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {articulo.bodegas?.map((bodega) => {
                          const yaAgregado = itemsAgregados.some((i) => i.articuloId === articulo.id);
                          const esBodegaActual = itemsAgregados.some((i) => i.articuloId === articulo.id && i.bodegaOrigenId === bodega.bodegaId);

                          return (
                            <button
                              key={bodega.bodegaId}
                              onClick={() => !yaAgregado && onAddItem(articulo, bodega.bodegaId)}
                              disabled={yaAgregado}
                              className={cn(
                                "flex items-center justify-between p-2 rounded border transition-all text-left h-12",
                                yaAgregado
                                  ? esBodegaActual
                                    ? "bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-500"
                                    : "bg-emerald-50/30 border-emerald-200/50 text-emerald-600/80 dark:bg-emerald-950/10 dark:border-emerald-900/30 font-medium"
                                  : "bg-gray-50 dark:bg-gray-900/50 border-transparent hover:border-orange-300 dark:hover:border-orange-900/50 active:scale-[0.98]",
                              )}
                            >
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <Warehouse className={cn("h-3 w-3 shrink-0", yaAgregado ? "text-emerald-500" : "text-gray-400")} />
                                  <span className="font-bold text-[10px] truncate uppercase tracking-tight text-gray-700 dark:text-gray-300">{bodega.bodegaNombre}</span>
                                </div>
                                <span
                                  className={cn(
                                    "text-[9px] font-black px-1.5 py-0.5 rounded",
                                    bodega.cantidadDisponible > 0
                                      ? yaAgregado
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-white dark:bg-gray-800 text-orange-500 border border-gray-100 dark:border-gray-700"
                                      : "bg-red-50 text-red-500",
                                  )}
                                >
                                  {bodega.cantidadDisponible} DISPONIBLE
                                </span>
                              </div>
                              <div
                                className={cn(
                                  "h-7 w-7 rounded flex items-center justify-center transition-all shadow-sm border",
                                  yaAgregado
                                    ? esBodegaActual
                                      ? "bg-emerald-500 border-emerald-500 text-white"
                                      : "bg-emerald-100 border-emerald-200 text-emerald-500"
                                    : "bg-white dark:bg-gray-800 text-orange-500 border-gray-200 dark:border-gray-700",
                                )}
                              >
                                {yaAgregado ? <Check className="h-3.5 w-3.5 stroke-3" /> : <Plus className="h-3.5 w-3.5 stroke-3" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-4 flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => onAddItem(articulo)}
                          className="h-8 rounded-md bg-orange-600 hover:bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest px-6"
                        >
                          <Plus className="w-3.5 h-3.5 mr-2" /> Agregar Artículo
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center px-6">
          {itemsAgregados.length > 0 && (
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded border border-emerald-100 dark:border-emerald-900/50">
              <Check className="h-4 w-4 stroke-3" />
              {itemsAgregados.length} ARTÍCULOS LISTOS
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-10 px-8 rounded-md font-black uppercase tracking-widest text-[11px] text-orange-600 dark:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all border border-orange-100 dark:border-orange-900/30 active:scale-95"
          >
            Finalizar Selección
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BuscarArticulosPanel;
