"use client";

/**
 * COMPONENTE - MOVIMIENTO ARTÍCULO (VISTA MÓVIL)
 *
 * Replica fiel de la interfaz legacy aprobada por el cliente.
 * Flujo: selección bodegas → carga stock con trazabilidad → selección de lotes → transferir.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeftRight, Check, Loader2, Package, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBodegaConfig } from "@/lib/hooks/bodega/use-bodega-config";
import { useBodegaWarehouses } from "@/lib/hooks/bodega/use-bodega-warehouses";

// ============================================================================
// Tipos
// ============================================================================

interface StockItem {
  itemId: string;
  articuloId: string;
  articuloNombre: string;
  articuloSku: string;
  movimientoId: string;
  movimientoNumero: string;
  movimientoFecha: string;
  cantidad: number;
  selected: boolean;
  cantidadTransferir: string;
}

// ============================================================================
// Helpers
// ============================================================================

function formatNumber(value: string): string {
  const num = value.replace(/[^\d]/g, "");
  if (!num) return "";
  return new Intl.NumberFormat("es-CL").format(parseInt(num));
}

function parseNumber(value: string): number {
  return parseInt(value.replace(/[^\d]/g, "")) || 0;
}

// ============================================================================
// Hook — Stock por movimiento desde la bodega origen
// ============================================================================

function useStockPorMovimiento(bodegaId: string | null) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStock = useCallback(async () => {
    if (!bodegaId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/bodega/warehouses/${bodegaId}/stock`);
      const data = await res.json();
      // Soporta distintos formatos de respuesta
      setItems(data.items || data.data || data || []);
    } catch {
      toast.error("Error al cargar stock");
    } finally {
      setLoading(false);
    }
  }, [bodegaId]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  return { items, loading, refetch: fetchStock };
}

// ============================================================================
// Componente — Tarjeta de lote de stock seleccionable
// ============================================================================

function StockMovimientoCard({ item, onToggle, onUpdateCantidad }: { item: StockItem; onToggle: (itemId: string) => void; onUpdateCantidad: (itemId: string, value: string) => void }) {
  const fecha = item.movimientoFecha ? new Date(item.movimientoFecha).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors cursor-pointer",
        item.selected ? "border-blue-400 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-950/30" : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900",
      )}
      onClick={() => onToggle(item.itemId)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.articuloNombre}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {item.articuloSku} • Mov: {item.movimientoNumero}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Ingreso: {fecha} • Disponible: <strong>{item.cantidad}</strong>
          </div>
        </div>
        <div
          className={cn(
            "w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 ml-2 transition-colors",
            item.selected ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-600",
          )}
        >
          {item.selected && <Check className="w-3.5 h-3.5 text-white" />}
        </div>
      </div>

      {item.selected && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Cantidad a transferir (máx: {item.cantidad})</label>
          <input
            type="text"
            inputMode="numeric"
            value={item.cantidadTransferir}
            onChange={(e) => onUpdateCantidad(item.itemId, e.target.value.replace(/[^\d]/g, ""))}
            onBlur={() => onUpdateCantidad(item.itemId, formatNumber(item.cantidadTransferir))}
            className="w-full px-3 py-2 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 text-sm"
            placeholder={String(item.cantidad)}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Componente Principal
// ============================================================================

export default function MobileView() {
  const router = useRouter();
  const { data: configData } = useBodegaConfig();
  const { data: warehousesData } = useBodegaWarehouses(1, 100);

  const configGeneral = (configData?.["BODEGA_GENERAL_CONFIG"] ?? {}) as Record<string, any>;
  const autoVerifyEnabled = configGeneral.auto_verificar_ingresos === true;
  const ocultarTransito = configGeneral.ocultar_transito === true;

  const bodegas = warehousesData?.data.filter((w) => w.isActive) || [];

  // ── Estado del formulario ──────────────────────────────────────────────────
  const [bodegaOrigenId, setBodegaOrigenId] = useState<string>("");
  const [bodegaDestinoId, setBodegaDestinoId] = useState<string>("");
  const [observaciones, setObservaciones] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // ── Stock de la bodega origen ──────────────────────────────────────────────
  const { items: rawItems, loading } = useStockPorMovimiento(bodegaOrigenId || null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sincronizar items con selección limpia al cambiar bodega
  useEffect(() => {
    setStockItems(
      rawItems.map((item: any) => ({
        itemId: String(item.itemId ?? item.id ?? item.articuloId),
        articuloId: String(item.articuloId),
        articuloNombre: item.articuloNombre ?? item.nombre ?? item.name ?? "",
        articuloSku: item.articuloSku ?? item.sku ?? item.codigo ?? "",
        movimientoId: String(item.movimientoId ?? ""),
        movimientoNumero: item.movimientoNumero ?? item.numero ?? "—",
        movimientoFecha: item.movimientoFecha ?? item.fecha ?? "",
        cantidad: item.cantidad ?? 0,
        selected: false,
        cantidadTransferir: String(item.cantidad ?? 0),
      })),
    );
  }, [rawItems]);

  const filteredItems = stockItems.filter(
    (i) =>
      i.articuloNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.articuloSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.movimientoNumero.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleToggle = (itemId: string) => {
    setStockItems((prev) => prev.map((i) => (i.itemId === itemId ? { ...i, selected: !i.selected } : i)));
  };

  const handleUpdateCantidad = (itemId: string, value: string) => {
    setStockItems((prev) => prev.map((i) => (i.itemId === itemId ? { ...i, cantidadTransferir: value } : i)));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        bodegaOrigenId,
        bodegaDestinoId,
        observaciones: observaciones || undefined,
        items: selectedItems.map((i) => ({
          itemId: i.itemId,
          articuloId: i.articuloId,
          cantidad: parseNumber(i.cantidadTransferir) || i.cantidad,
        })),
      };

      const res = await fetch("/api/v1/bodega/movimientos/transferencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en transferencia");

      toast.success(data.message || "Transferencia completada", {
        description: `${selectedItems.length} artículo(s) movidos`,
      });
      router.push("/bodega/movimientos");
    } catch (error: any) {
      toast.error("Error en transferencia", { description: error.message });
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  // ── Validaciones ───────────────────────────────────────────────────────────
  const selectedItems = stockItems.filter((i) => i.selected);
  const canSubmit = selectedItems.length > 0 && bodegaOrigenId && bodegaDestinoId && bodegaOrigenId !== bodegaDestinoId && observaciones.trim().length >= 10;

  const bodegasDestino = bodegas.filter((b) => {
    if (b.id === bodegaOrigenId) return false;
    if (ocultarTransito && (b.name?.toLowerCase().includes("tránsito") || b.name?.toLowerCase().includes("transito"))) return false;
    return true;
  });

  const bodegaOrigenNombre = bodegas.find((b) => b.id === bodegaOrigenId)?.name ?? "";
  const bodegaDestinoNombre = bodegas.find((b) => b.id === bodegaDestinoId)?.name ?? "";

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div className="pb-28">
      {/* ── HEADER ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ArrowLeftRight className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 uppercase">Movimiento</h1>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {/* ── SELECCIÓN DE BODEGAS ── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-3 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Bodega Origen</label>
            <select
              value={bodegaOrigenId}
              onChange={(e) => {
                setBodegaOrigenId(e.target.value);
                setBodegaDestinoId("");
              }}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
            >
              <option value="">Seleccionar bodega origen...</option>
              {bodegas.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Separador visual */}
          <div className="flex items-center justify-center">
            <ArrowLeftRight className="w-5 h-5 text-gray-400" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Bodega Destino</label>
            <select
              value={bodegaDestinoId}
              onChange={(e) => setBodegaDestinoId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
              disabled={!bodegaOrigenId}
            >
              <option value="">Seleccionar bodega destino...</option>
              {bodegasDestino.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── JUSTIFICACIÓN / OBSERVACIONES ── */}
        <div className="mb-4 space-y-1.5 px-0.5">
          <div className="flex items-center justify-between pl-1">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Justificación / Observaciones<span className="text-red-500">*</span>
            </label>
            <span className={cn("text-[9px] font-bold uppercase tracking-widest", observaciones.length > 280 ? "text-red-500" : "text-gray-400")}>{observaciones.length} / 300</span>
          </div>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            maxLength={300}
            className={cn(
              "w-full px-3 py-2.5 rounded-lg border bg-white dark:bg-gray-900 text-sm resize-none transition-all shadow-sm",
              observaciones.trim().length > 0 && observaciones.trim().length < 10
                ? "border-orange-300 ring-4 ring-orange-500/5 focus:border-blue-500"
                : "border-gray-300 dark:border-gray-700 focus:border-blue-500",
            )}
            placeholder="Ingrese el motivo del movimiento (mín. 10 caracteres)..."
          />
          {observaciones.trim().length > 0 && observaciones.trim().length < 10 && (
            <p className="text-[10px] font-medium text-orange-600 dark:text-orange-400 pl-1">Faltan {10 - observaciones.trim().length} caracteres más.</p>
          )}
        </div>

        {/* ── STOCK DISPONIBLE (por movimiento/lote) ── */}
        {bodegaOrigenId && (
          <>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-tight">Buscar artículo</h2>
              {selectedItems.length > 0 && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium">{selectedItems.length} seleccionado(s)</span>
              )}
            </div>

            {/* Input de búsqueda */}
            <input
              type="text"
              placeholder="Buscar artículo o movimiento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm mb-3"
            />

            {/* Lista de lotes */}
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-10">
                <Package className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">{searchTerm ? "Sin resultados" : "No hay stock con trazabilidad en esta bodega"}</p>
              </div>
            ) : (
              <div className="space-y-2 mb-3">
                {filteredItems.map((item) => (
                  <StockMovimientoCard key={item.itemId} item={item} onToggle={handleToggle} onUpdateCantidad={handleUpdateCantidad} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Guía cuando no hay bodega seleccionada */}
        {!bodegaOrigenId && (
          <div className="text-center py-12">
            <ArrowLeftRight className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-400 dark:text-gray-500">Selecciona una bodega origen para ver el stock disponible</p>
          </div>
        )}
      </div>

      {/* ── BARRA INFERIOR FIJA ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 z-30">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400">
            Volver
          </button>
          <button
            type="button"
            onClick={() => {
              if (autoVerifyEnabled) handleSubmit();
              else setShowConfirm(true);
            }}
            disabled={!canSubmit || submitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:dark:bg-gray-700 text-white font-medium text-sm transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Transferir ({selectedItems.length})
          </button>
        </div>
      </div>

      {/* ── MODAL CONFIRMACIÓN ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">¿Confirmar transferencia?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Se moverán <strong>{selectedItems.length}</strong> lote(s) de stock.
            </p>
            {bodegaOrigenNombre && bodegaDestinoNombre && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium">
                {bodegaOrigenNombre} → {bodegaDestinoNombre}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
