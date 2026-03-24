"use client";

/**
 * COMPONENTE - HISTORIAL MOVIMIENTOS (VISTA MÓVIL)
 *
 * Replica fiel de la interfaz legacy aprobada por el cliente.
 * Lista paginada de movimientos con tarjetas expandibles y filtros avanzados.
 * Usa /api/v1/bodega/movimientos que ya existe en el proyecto.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Package, X, ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import { useBodegaWarehouses } from "@/lib/hooks/bodega/use-bodega-warehouses";
import { cn } from "@/lib/utils";

// ============================================================================
// Tipos
// ============================================================================

interface MovimientoItem {
  id: string;
  folio: string;
  type: string;
  status: string;
  reason: string | null;
  observations: string | null;
  createdAt: string;
  warehouse: { id: string; name: string };
  article?: { id: string; name: string; code: string } | null;
  creator: { firstName: string; lastName: string };
  _count: { items: number };
  request?: { folio: string } | null;
  quantity?: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ============================================================================
// Helpers
// ============================================================================

function getMovementBadgeStyle(folio: string, type: string) {
  const safeFolio = folio || "";
  const safeType = type || "";

  if (safeFolio.includes("TRANSFERENCIA") || safeType.includes("TRANSFERENCIA")) {
    return { label: "TRANSFERENCIA", className: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800" };
  }

  if (safeFolio.includes("_OC") || safeType === "INGRESO") {
    return { label: "INGRESO OC", className: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800" };
  }

  if (safeFolio.includes("EGRESO") || safeType.includes("SALIDA")) {
    return { label: "EGRESO", className: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800" };
  }

  return { label: safeType || "MOVIMIENTO", className: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700" };
}

function getStatusBadgeStyle(status: string) {
  if (status === "APROBADA") {
    return { label: "APROBADA", className: "bg-blue-500 text-white" };
  }

  if (status === "APLICADA") {
    return { label: "EJECUTADO", className: "bg-emerald-500 text-white" };
  }

  if (status === "COMPLETADA") {
    return { label: "COMPLETADA", className: "bg-purple-600 text-white" };
  }

  if (status === "PENDIENTE") {
    return { label: "PENDIENTE", className: "bg-amber-500 text-white" };
  }

  if (status === "RECHAZADA" || status === "CANCELADA") {
    return { label: status, className: "bg-red-500 text-white" };
  }

  if (status === "BORRADOR") {
    return { label: "BORRADOR", className: "bg-slate-400 text-white" };
  }

  return { label: status, className: "bg-slate-500 text-white" };
}

// ============================================================================
// Componente — Tarjeta de movimiento expandible
// ============================================================================

function MovimientoCard({ mov }: { mov: MovimientoItem }) {
  const [expanded, setExpanded] = useState(false);
  const movementBadge = getMovementBadgeStyle(mov.folio, mov.type);
  const statusBadge = getStatusBadgeStyle(mov.status);

  const fecha = new Date(mov.createdAt).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const hora = new Date(mov.createdAt).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <button type="button" onClick={() => setExpanded(!expanded)} className="w-full text-left p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Badges Tipo + Estado */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-full border tracking-wider", movementBadge.className)}>
                {movementBadge.label}
              </span>
              <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow-sm", statusBadge.className)}>
                {statusBadge.label}
              </span>
            </div>

            {/* Folio + Referencia */}
            <div className="flex items-baseline gap-2 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{mov.folio}</div>
              {mov.request?.folio && <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal truncate shrink-0">Ref: {mov.request.folio}</span>}
            </div>

            {/* Fecha + Artículos */}
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {fecha} {hora} • {mov._count?.items ?? 0} artículo(s)
              {mov.quantity != null && ` • ${mov.quantity} uds`}
            </div>

            {/* Bodega */}
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{mov.warehouse.name}</div>
          </div>
          <div className="shrink-0 ml-2 mt-0.5">{expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}</div>
        </div>
      </button>

      {/* Detalle expandido */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {mov.reason && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">Motivo:</span> {mov.reason}
            </p>
          )}
          {mov.observations && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">Obs:</span> {mov.observations}
            </p>
          )}
          {mov.creator && (
            <p className="text-xs text-gray-400">
              Creado por: {mov.creator.firstName} {mov.creator.lastName}
            </p>
          )}
          {mov.article && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Artículo:</p>
              <div className="flex items-center justify-between text-xs py-1.5 px-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span className="text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">{mov.article.name}</span>
                <span className="text-[10px] font-mono text-gray-400 shrink-0">{mov.article.code}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Componente Principal
// ============================================================================

export default function HistorialMobileView() {
  const router = useRouter();
  const { data: warehousesData } = useBodegaWarehouses(1, 100);
  const bodegas = warehousesData?.data ?? [];

  // ── Filtros ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [orderDir, setOrderDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  // ── Datos ──────────────────────────────────────────────────────────────────
  const [data, setData] = useState<MovimientoItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHistorial = useCallback(async (params: Record<string, string | number>) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== "" && v != null) query.set(k, String(v));
      });
      const res = await fetch(`/api/v1/bodega/movimientos?${query}`);
      const json = await res.json();
      setData(json.data || []);
      setPagination(json.meta ?? null);
    } catch {
      // Silencioso — no exponer detalles técnicos al cliente
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial y al cambiar página/orden
  useEffect(() => {
    fetchHistorial({ page, pageSize: 20, search, type: tipo, status: estado, warehouseId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, orderDir]);

  const handleApplyFilters = () => {
    setPage(1);
    fetchHistorial({ page: 1, pageSize: 20, search, type: tipo, status: estado, warehouseId });
  };

  const handleClearFilters = () => {
    setSearch("");
    setTipo("");
    setEstado("");
    setWarehouseId("");
    setPage(1);
    setOrderDir("desc");
    fetchHistorial({ page: 1, pageSize: 20 });
  };

  const toggleOrder = () => {
    setOrderDir((prev) => (prev === "desc" ? "asc" : "desc"));
    setPage(1);
  };

  const hasActiveFilters = search || tipo || estado || warehouseId;
  const totalPages = pagination?.totalPages ?? 1;

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div className="pb-6">
      {/* ── HEADER ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <button type="button" onClick={() => router.back()} className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search className="w-5 h-5 text-slate-600 dark:text-slate-400 shrink-0" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Historial</h1>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {/* ── BARRA DE CONTROL ── */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar movimiento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={toggleOrder}
            className="p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-500 hover:bg-gray-100 transition-colors"
            title={orderDir === "desc" ? "Más recientes primero" : "Más antiguos primero"}
          >
            {orderDir === "desc" ? <ArrowDownWideNarrow className="w-5 h-5 text-blue-600" /> : <ArrowUpNarrowWide className="w-5 h-5 text-blue-600" />}
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-lg border transition-colors ${
              hasActiveFilters ? "border-blue-400 bg-blue-50 dark:bg-blue-950/50 text-blue-600" : "border-gray-300 dark:border-gray-700 text-gray-500 hover:bg-gray-100"
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
          <button type="button" onClick={handleApplyFilters} className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
            Refrescar
          </button>
        </div>

        {/* ── PANEL FILTROS EXPANDIBLE ── */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtros</span>
              {hasActiveFilters && (
                <button type="button" onClick={handleClearFilters} className="text-xs text-blue-600 flex items-center gap-1">
                  <X className="w-3 h-3" /> Limpiar
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Tipo</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm">
                  <option value="">Todos</option>
                  <option value="INGRESO">Ingresos</option>
                  <option value="SALIDA">Egresos</option>
                  <option value="AJUSTE">Ajustes</option>
                  <option value="RESERVA">Reservas</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                >
                  <option value="">Todos</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="APROBADA">Aprobada</option>
                  <option value="APLICADA">Ejecutado</option>
                  <option value="COMPLETADA">Completada</option>
                  <option value="RECHAZADA">Rechazada</option>
                  <option value="CANCELADA">Cancelada</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Bodega</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
              >
                <option value="">Todas</option>
                {bodegas.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" onClick={handleApplyFilters} className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
              Aplicar filtros
            </button>
          </div>
        )}

        {/* ── RESULTADOS ── */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{hasActiveFilters ? "No se encontraron movimientos con estos filtros" : "No hay movimientos registrados"}</p>
          </div>
        ) : (
          <>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {pagination?.total ?? data.length} movimiento(s) • Pág. {pagination?.page ?? 1} de {totalPages}
            </div>
            <div className="space-y-2 mb-4">
              {data.map((mov) => (
                <MovimientoCard key={mov.id} mov={mov} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
