"use client";

/**
 * COMPONENTE - MOVIMIENTOS / INVENTARIO TRAZABILIDAD (VISTA MÓVIL)
 *
 * Replica fiel de la interfaz legacy aprobada por el cliente.
 * En móvil, /bodega/movimientos muestra el inventario detallado con trazabilidad FIFO
 * (stock por movimiento/lote) — NO la lista de movimientos (eso es /bodega/historial).
 */

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Search, Filter, ArrowUpDown, Package, Warehouse, FileText, Tag, CornerDownRight, Loader2, Info, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useBodegaWarehouses } from "@/lib/hooks/bodega/use-bodega-warehouses";

// ============================================================================
// Tipos
// ============================================================================

interface InventarioItem {
  itemId: string | number;
  articuloId: string | number;
  articuloNombre: string;
  articuloSku: string;
  movimientoId: string | number;
  movimientoNumero: string;
  movimientoFecha: string;
  cantidad: number;
  precioUnitario: number | null;
  bodegaNombre: string;
  centroCosto?: string;
  docReferencia?: string;
  nCotizacion?: string;
  guiaDespacho?: string;
  observaciones?: string;
}

// ============================================================================
// Componente Principal
// ============================================================================

export default function MobileView() {
  const router = useRouter();
  const { data: warehousesData } = useBodegaWarehouses(1, 100);
  const bodegas = warehousesData?.data ?? [];

  const [search, setSearch] = useState("");
  const [bodegaFilter, setBodegaFilter] = useState("TODAS");
  const [sortBy, setSortBy] = useState<"nombre" | "stock" | "bodega">("bodega");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Fetch inventario con trazabilidad (stock por movimiento)
  const { data, isLoading } = useQuery({
    queryKey: ["inventario-trazabilidad-mobile"],
    queryFn: async () => {
      // Usar endpoint de movimientos normalizado
      const res = await fetch("/api/v1/bodega/movimientos?pageSize=200&status=EJECUTADO");
      if (!res.ok) throw new Error("Error al cargar movimientos");
      const data = await res.json();
      const items = (data.data ?? []).map((m: any, idx: number) => ({
        itemId: `${m.id}-${idx}`,
        articuloId: m.id,
        articuloNombre: m.reason || m.folio || "Sin descripción",
        articuloSku: m.folio,
        movimientoId: m.id,
        movimientoNumero: m.folio,
        movimientoFecha: m.createdAt ?? "",
        cantidad: Number(m.totalItems || 0),
        precioUnitario: m.totalItems > 0 ? Number(m.totalPrice || 0) / Number(m.totalItems) : 0,
        bodegaNombre: m.warehouse?.name ?? "—",
        centroCosto: m.request?.ceco || "N/A",
        docReferencia: m.request?.folio || m.reason || m.folio,
        observaciones: m.observations || "",
      }));
      return { items };
    },
    staleTime: 60_000,
  });

  const allItems: InventarioItem[] = data?.items ?? [];

  // Filtrado y ordenamiento en cliente
  const filteredAndSortedItems = useMemo(() => {
    let result = [...allItems];

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.articuloNombre.toLowerCase().includes(s) ||
          item.articuloSku.toLowerCase().includes(s) ||
          item.movimientoNumero.toLowerCase().includes(s) ||
          item.docReferencia?.toLowerCase().includes(s),
      );
    }

    if (bodegaFilter !== "TODAS") {
      result = result.filter((item) => item.bodegaNombre === bodegaFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "nombre") comparison = a.articuloNombre.localeCompare(b.articuloNombre);
      else if (sortBy === "stock") comparison = a.cantidad - b.cantidad;
      else if (sortBy === "bodega") comparison = a.bodegaNombre.localeCompare(b.bodegaNombre);
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [allItems, search, bodegaFilter, sortBy, sortOrder]);

  const toggleSort = (key: typeof sortBy) => {
    if (sortBy === key) {
      if (sortOrder === "asc") setSortOrder("desc");
      else {
        setSortBy("bodega");
        setSortOrder("asc");
      }
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const totalValor = filteredAndSortedItems.reduce((acc, item) => acc + item.cantidad * (item.precioUnitario || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* ── HEADER compacto ── */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 py-2">
        <div className="max-w-4xl mx-auto">
          {/* Fila 1: botón atrás + título + total */}
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">Movimientos de Inventario</h1>
              <p className="text-[10px] text-gray-500">Historial de entradas y salidas</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[9px] font-bold text-gray-400 uppercase">Total</div>
              <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">${totalValor.toLocaleString("es-CL")}</div>
            </div>
          </div>

          {/* Fila 2: buscador */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar artículo, SKU, OC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {/* Fila 3: filtros compactos */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            {/* Filtro bodega */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 text-[10px] font-medium shrink-0">
              <Filter className="w-3 h-3" />
              <select value={bodegaFilter} onChange={(e) => setBodegaFilter(e.target.value)} className="bg-transparent border-none p-0 focus:ring-0 font-bold text-[10px] cursor-pointer">
                <option value="TODAS">Todas</option>
                {bodegas.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => toggleSort("stock")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-medium transition-colors shrink-0",
                sortBy === "stock"
                  ? "bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400"
                  : "bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400",
              )}
            >
              <ArrowUpDown className="w-3 h-3" />
              Stock {sortBy === "stock" && (sortOrder === "asc" ? "↑" : "↓")}
            </button>

            <button
              onClick={() => toggleSort("nombre")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-medium transition-colors shrink-0",
                sortBy === "nombre"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
                  : "bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400",
              )}
            >
              <ArrowUpDown className="w-3 h-3" />
              Nombre {sortBy === "nombre" && (sortOrder === "asc" ? "↑" : "↓")}
            </button>
          </div>
        </div>
      </div>

      {/* ── LISTADO ── */}
      <div className="p-4 max-w-4xl mx-auto space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-sm text-gray-500 font-medium">Cargando inventario detallado...</p>
          </div>
        ) : filteredAndSortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="w-16 h-16 text-gray-200 dark:text-gray-800 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No se encontraron artículos</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredAndSortedItems.map((item) => (
              <Link
                key={`${item.itemId}-${item.movimientoId}`}
                href={`/bodega/movimientos/${item.movimientoId}`}
                className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden relative block active:scale-[0.98]"
              >
                {/* Bodega tag (esquina superior derecha) */}
                <div className="absolute top-0 right-0 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest rounded-bl-xl border-l border-b border-gray-200 dark:border-gray-700">
                  {item.bodegaNombre}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Info del artículo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{item.articuloSku}</span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight mb-2 truncate pr-24">{item.articuloNombre}</h3>

                    {/* Meta: Documento + CeCo */}
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[9px] text-gray-400 leading-none uppercase font-bold">Documento</p>
                          <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 truncate">{item.docReferencia || item.movimientoNumero}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Warehouse className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <div>
                          <p className="text-[9px] text-gray-400 leading-none uppercase font-bold">CeCo</p>
                          <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300">{item.centroCosto || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stock y Valor */}
                  <div className="flex sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-2 bg-gray-50/50 dark:bg-gray-800/20 p-3 sm:p-0 rounded-xl sm:rounded-none sm:border-l border-gray-200 dark:border-gray-800 sm:pl-6 min-w-[120px]">
                    <div className="text-center sm:text-right">
                      <p className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">Cantidad</p>
                      <div className="text-xl font-black text-gray-900 dark:text-gray-100 flex items-baseline gap-1">
                        {item.cantidad}
                        <span className="text-[10px] font-bold text-gray-400">UDS</span>
                      </div>
                    </div>
                    <div className="text-center sm:text-right border-l sm:border-l-0 sm:border-t border-gray-200 dark:border-gray-800 pl-4 sm:pl-0 sm:pt-2">
                      <p className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">Val. Unit</p>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${(item.precioUnitario || 0).toLocaleString("es-CL")}</p>
                    </div>
                  </div>
                </div>

                {/* Footer de trazabilidad */}
                {(item.nCotizacion || item.guiaDespacho || item.observaciones) && (
                  <div className="mt-3 pt-3 border-t border-dashed border-gray-100 dark:border-gray-800 flex flex-wrap gap-x-4 gap-y-1">
                    {item.nCotizacion && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <CornerDownRight className="w-3 h-3" /> Cotiz: <span className="font-bold">{item.nCotizacion}</span>
                      </div>
                    )}
                    {item.guiaDespacho && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <CornerDownRight className="w-3 h-3" /> Guía: <span className="font-bold">{item.guiaDespacho}</span>
                      </div>
                    )}
                    {item.observaciones && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 italic max-w-full truncate">
                        <Info className="w-3 h-3 shrink-0" /> {item.observaciones}
                      </div>
                    )}
                  </div>
                )}
                <div className="absolute bottom-4 right-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="w-5 h-5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── BADGE FLOTANTE con conteo ── */}
      <div className="fixed bottom-6 right-4 z-40">
        <div className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 font-bold text-sm">
          <Package className="w-4 h-4" />
          {filteredAndSortedItems.length} Registros
        </div>
      </div>
    </div>
  );
}
