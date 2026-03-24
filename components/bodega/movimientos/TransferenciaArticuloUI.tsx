"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeftRight, Check, Loader2, Package, ChevronLeft, Truck, Camera, ImagePlus, X, Plus, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBodegaConfig } from "@/lib/hooks/bodega/use-bodega-config";
import { useBodegaWarehouses } from "@/lib/hooks/bodega/use-bodega-warehouses";
import { useBodegaAuth } from "@/lib/hooks/bodega/use-bodega-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmacionTransferenciaModal } from "./ConfirmacionTransferenciaModal";

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
  unitCost: number;
}

function formatNumber(value: string): string {
  const num = value.replace(/[^\d]/g, "");
  if (!num) return "";
  return new Intl.NumberFormat("es-CL").format(parseInt(num));
}

function parseNumber(value: string): number {
  return parseInt(value.replace(/[^\d]/g, "")) || 0;
}

function useStockPorMovimiento(bodegaId: string | null) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStock = useCallback(async () => {
    if (!bodegaId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/bodega/warehouses/${bodegaId}/stock`);
      const data = await res.json();
      
      // Manejo robusto de la respuesta
      const result = data.items || data.data || data;
      setItems(Array.isArray(result) ? result : []);
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
          <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate uppercase mt-1">{item.articuloNombre}</div>
          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1 uppercase">
            {item.articuloSku} • Mov: {item.movimientoNumero}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium">
            Ingreso: {fecha} • Disponible: <strong className="text-black dark:text-white font-extrabold">{item.cantidad}</strong>
          </div>
        </div>
        <div
          className={cn(
            "w-6 h-6 rounded-md flex items-center justify-center border-2 shrink-0 ml-2 transition-colors",
            item.selected ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900",
          )}
        >
          {item.selected && <Check className="w-4 h-4 text-white font-black stroke-3" />}
        </div>
      </div>

      {item.selected && (
        <div className="mt-3 pt-3 border-t border-blue-100 dark:border-blue-900/50" onClick={(e) => e.stopPropagation()}>
          <label className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-1 block uppercase tracking-tight">Cantidad a transferir (máx: {item.cantidad})</label>
          <input
            type="text"
            inputMode="numeric"
            value={item.cantidadTransferir}
            onChange={(e) => {
              const val = e.target.value.replace(/[^\d]/g, "");
              if (parseInt(val) > item.cantidad) {
                // Si excede, auto-corrige al max
                onUpdateCantidad(item.itemId, String(item.cantidad));
              } else {
                onUpdateCantidad(item.itemId, val);
              }
            }}
            onBlur={() => onUpdateCantidad(item.itemId, formatNumber(item.cantidadTransferir))}
            className="w-full px-3 py-2 rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-900 text-sm font-black focus:border-blue-500 focus:ring-0 transition-colors text-blue-900 dark:text-blue-100"
            placeholder={String(item.cantidad)}
          />
        </div>
      )}
    </div>
  );
}

export function TransferenciaArticuloUI() {
  const router = useRouter();
  const { data: configData } = useBodegaConfig();
  const { data: warehousesData } = useBodegaWarehouses(1, 100);
  const { user } = useBodegaAuth();

  const configGeneral = (configData?.BODEGA_GENERAL_CONFIG ?? {}) as Record<string, any>;
  const autoVerifyEnabled = configGeneral.auto_verificar_ingresos === true;
  const ocultarTransito = configGeneral.ocultar_transito === true;

  const bodegas = warehousesData?.data.filter((w) => w.isActive) || [];

  const [bodegaOrigenId, setBodegaOrigenId] = useState<string>("");
  const [bodegaDestinoId, setBodegaDestinoId] = useState<string>("");
  const [observaciones, setObservaciones] = useState("");
  const [responsable, setResponsable] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [documentoReferencia, setDocumentoReferencia] = useState("");
  const [numeroCotizacion, setNumeroCotizacion] = useState("");
  const [guiaDespacho, setGuiaDespacho] = useState("");
  const [showAdvancedRef, setShowAdvancedRef] = useState(false);
  const [fotosEvidencia, setFotosEvidencia] = useState<string[]>([]);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [showFotoPreview, setShowFotoPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { items: rawItems, loading } = useStockPorMovimiento(bodegaOrigenId || null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (user?.firstName && !responsable) {
      setResponsable(`${user.firstName} ${user.lastName || ""}`.trim());
    }
  }, [user?.firstName, user?.lastName]);

  useEffect(() => {
    if (!Array.isArray(rawItems)) {
      setStockItems([]);
      return;
    }

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
        unitCost: item.unitCost || 0,
      })),
    );
  }, [rawItems]);

  const filteredItems = stockItems.filter(
    (i) =>
      i.articuloNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.articuloSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.movimientoNumero.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleToggle = (itemId: string) => {
    setStockItems((prev) => prev.map((i) => (i.itemId === itemId ? { ...i, selected: !i.selected, cantidadTransferir: String(i.cantidad) } : i)));
  };

  const handleUpdateCantidad = (itemId: string, value: string) => {
    setStockItems((prev) => prev.map((i) => (i.itemId === itemId ? { ...i, cantidadTransferir: value } : i)));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFoto(true);
    const toastId = toast.loading("Subiendo imagen...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", "bodega/evidencias");

      const res = await fetch("/api/v1/storage/r2-simple", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Error al subir imagen");
      const data = await res.json();
      const url = data.data?.url || data.url;
      if (!url) throw new Error("No se recibió la URL de la imagen");

      setFotosEvidencia((prev) => [...prev, url]);
      toast.success("Foto cargada correctamente", { id: toastId });
    } catch (err: any) {
      toast.error("Error al cargar foto", { description: err.message, id: toastId });
    } finally {
      setUploadingFoto(false);
      if (e.target) e.target.value = "";
    }
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

      const obsArray = [
        observaciones ? `Justificación: ${observaciones}` : null,
        // No concatenamos campos estructurados aquí ya que iran en sus propios campos
      ].filter(Boolean);

      for (const item of selectedItems) {
        // Egreso
        const rSalida = await fetch("/api/v1/bodega/movimientos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "SALIDA",
            warehouseId: bodegaOrigenId,
            articleId: item.articuloId,
            quantity: parseNumber(item.cantidadTransferir),
            unitCost: item.unitCost,
            sourceMovementItemId: item.itemId,
            reason: "EGRESO_TRANSFERENCIA",
            externalReference: documentoReferencia || null,
            quotationNumber: numeroCotizacion || null,
            deliveryGuide: guiaDespacho || null,
            observations: [...obsArray, `DESTINO: ${bodegaDestinoId}`].join(" | "),
            responsable,
            evidence: fotosEvidencia,
          }),
        });
        if (!rSalida.ok) throw new Error("Error en salida");

        // Ingreso
        const rIngreso = await fetch("/api/v1/bodega/movimientos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "INGRESO",
            warehouseId: bodegaDestinoId,
            articleId: item.articuloId,
            quantity: parseNumber(item.cantidadTransferir),
            unitCost: item.unitCost,
            sourceMovementItemId: item.itemId,
            reason: "INGRESO_TRANSFERENCIA",
            externalReference: documentoReferencia || null,
            quotationNumber: numeroCotizacion || null,
            deliveryGuide: guiaDespacho || null,
            observations: [...obsArray, `ORIGEN: ${bodegaOrigenId}`].join(" | "),
            responsable,
            evidence: fotosEvidencia,
          }),
        });
        if (!rIngreso.ok) throw new Error("Error en ingreso");
      }
      const data = { message: "Ok" };

      // Llamada de notificación
      try {
        await fetch("/api/v1/bodega/movimientos/notificar-transferencia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemsCount: selectedItems.length,
            documentReference: "TR-" + new Date().getTime(),
            originId: bodegaOrigenId,
            destinationId: bodegaDestinoId,
            observations: observaciones,
            responsable: responsable,
            items: selectedItems,
          }),
        });
      } catch (err) {
        console.error("Error enviando notificacion:", err);
      }

      toast.success(data.message || "Transferencia completada", {
        description: `${selectedItems.length} artículo(s) movidos`,
      });
      setIsSuccess(true);
    } catch (error: any) {
      toast.error("Error en transferencia", { description: error.message });
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  const selectedItems = stockItems.filter((i) => i.selected);
  const canSubmit = selectedItems.length > 0 && bodegaOrigenId && bodegaDestinoId && bodegaOrigenId !== bodegaDestinoId && observaciones.trim().length >= 10 && responsable.trim().length > 0;

  const bodegasDestino = bodegas.filter((b) => {
    if (b.id === bodegaOrigenId) return false;
    if (ocultarTransito && b.code === "TRANSITO") return false;
    return true;
  });

  const bodegaOrigenNombre = bodegas.find((b) => b.id === bodegaOrigenId)?.name ?? "";
  const bodegaDestinoNombre = bodegas.find((b) => b.id === bodegaDestinoId)?.name ?? "";

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center p-8 max-w-lg mx-auto text-center h-[calc(100vh-140px)]">
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6">
          <Check className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-tight">Registro Completado</h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium mb-8 text-[11px] uppercase tracking-wider max-w-sm">
          El movimiento ha sido procesado exitosamente. Todos los cambios se han guardado con trazabilidad.
        </p>

        <div className="flex flex-col gap-4 w-full">
          <button
            onClick={() => (window.location.href = "/bodega/movimiento-articulo")}
            className="w-full py-4 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 font-bold uppercase tracking-widest text-[11px] hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors bg-white dark:bg-gray-900"
          >
            NUEVO MOVIMIENTO
          </button>
          <button
            onClick={() => (window.location.href = "/bodega")}
            className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold uppercase tracking-widest text-[11px] hover:bg-blue-700 transition-colors"
          >
            VOLVER A BODEGA
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28 max-w-2xl mx-auto md:mt-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-40">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ArrowLeftRight className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-tight">Movimiento</h1>
        </div>
      </div>

      <div className="px-4 py-3 max-w-lg mx-auto space-y-3">
        {/* Bloque: Responsable + Evidencia + Opcionales */}
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block uppercase">Responsable *</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nombre"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium uppercase"
            />

            <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploadingFoto}
              className="flex items-center justify-center w-10 h-10.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 transition-colors"
              title="Tomar foto"
            >
              {uploadingFoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>

            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            <button
              type="button"
              onClick={() => {
                if (fotosEvidencia.length > 0) setShowFotoPreview(!showFotoPreview);
                else fileInputRef.current?.click();
              }}
              disabled={uploadingFoto}
              className={cn(
                "flex items-center justify-center w-10 h-10.5 rounded-lg border transition-colors relative",
                fotosEvidencia.length > 0
                  ? "bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-800"
                  : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:bg-gray-100",
              )}
              title={fotosEvidencia.length > 0 ? "Ver evidencia" : "Seleccionar galería"}
            >
              <ImageIcon className="w-4 h-4" />
              {fotosEvidencia.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  {!showFotoPreview && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-white dark:border-gray-900" />
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowAdvancedRef(!showAdvancedRef)}
              className={cn(
                "flex items-center justify-center w-10 h-10.5 rounded-lg border transition-colors",
                showAdvancedRef ? "bg-emerald-600 border-emerald-600 text-white" : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100",
              )}
              title="Más campos de referencia"
            >
              <Plus className={cn("w-4 h-4 transition-transform", showAdvancedRef && "rotate-45")} />
            </button>
          </div>
        </div>

        {showFotoPreview && fotosEvidencia.length > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-green-50/30 dark:bg-green-950/10 border border-green-100 dark:border-green-900/30 animate-in fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase">Evidencia ({fotosEvidencia.length})</span>
              <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                <Plus className="w-3 h-3" /> AÑADIR
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {fotosEvidencia.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-green-200 dark:border-green-800 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Evidencia ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      const newFotos = fotosEvidencia.filter((_, i) => i !== idx);
                      setFotosEvidencia(newFotos);
                      if (newFotos.length === 0) setShowFotoPreview(false);
                    }}
                    className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showAdvancedRef && (
          <div className="mt-2 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1 block">DOC. REFERENCIA (OC / FACTURA)</label>
                <input
                  type="text"
                  placeholder="Ej: OC-1234, FACT-987"
                  value={documentoReferencia}
                  onChange={(e) => setDocumentoReferencia(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-gray-900 text-sm font-medium uppercase"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1 block">N° COTIZACIÓN</label>
                <input
                  type="text"
                  placeholder="COT-..."
                  value={numeroCotizacion}
                  onChange={(e) => setNumeroCotizacion(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-gray-900 text-sm font-medium uppercase"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1 block">GUÍA DESPACHO</label>
                <input
                  type="text"
                  placeholder="GD-..."
                  value={guiaDespacho}
                  onChange={(e) => setGuiaDespacho(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-gray-900 text-sm font-medium uppercase"
                />
              </div>
            </div>
          </div>
        )}

        {/* Bloque de Bodegas */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div>
            <label className="text-xs font-black text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1 uppercase tracking-widest">
              Bodega Origen <Truck className="w-3.5 h-3.5" />
            </label>
            <Select
              value={bodegaOrigenId}
              onValueChange={(value) => {
                setBodegaOrigenId(value);
                setBodegaDestinoId("");
              }}
            >
              <SelectTrigger className="w-full h-10.5 px-3 py-2.5 rounded-lg border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-black uppercase text-gray-700 dark:text-gray-300">
                <SelectValue placeholder="Seleccionar bodega origen..." />
              </SelectTrigger>
              <SelectContent>
                {bodegas.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs font-bold uppercase">
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-center py-1">
            <ArrowLeftRight className="w-5 h-5 text-gray-300 dark:text-gray-600" />
          </div>

          <div>
            <label className="text-xs font-black text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1 uppercase tracking-widest">Bodega Destino</label>
            <Select value={bodegaDestinoId} onValueChange={setBodegaDestinoId} disabled={!bodegaOrigenId}>
              <SelectTrigger className="w-full h-10.5 px-3 py-2.5 rounded-lg border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-black uppercase text-gray-700 dark:text-gray-300">
                <SelectValue placeholder="Seleccionar bodega destino..." />
              </SelectTrigger>
              <SelectContent>
                {bodegasDestino.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs font-bold uppercase">
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Justificación */}
        <div className="mt-3 space-y-1.5">
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
              "w-full px-3 py-2.5 rounded-lg border bg-white dark:bg-gray-900 text-sm resize-none transition-all",
              observaciones.trim().length > 0 && observaciones.trim().length < 10 ? "border-orange-300 ring-4 ring-orange-500/5" : "border-gray-300 dark:border-gray-700",
            )}
            placeholder="Ingrese el motivo o justificación de la transferencia (mín. 10 caracteres)..."
          />
          {observaciones.trim().length > 0 && observaciones.trim().length < 10 && (
            <p className="text-[10px] font-medium text-orange-600 pl-1">Faltan {10 - observaciones.trim().length} caracteres más.</p>
          )}
        </div>

        {bodegaOrigenId && (
          <>
            <div className="flex items-center justify-between mb-3 mt-4">
              <h2 className="text-sm font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest">Buscar Artículo</h2>
              {selectedItems.length > 0 && (
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                  {selectedItems.length} seleccionado(s)
                </span>
              )}
            </div>

            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Buscar artículo o movimiento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium placeholder:text-gray-400"
              />
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-2" />
                <p className="text-[10px] font-black tracking-widest uppercase text-gray-400">Consultando Stock...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 bg-gray-50/50 dark:bg-gray-900/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                <Package className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">{searchTerm ? "SIN RESULTADOS" : "NO HAY STOCK CON TRAZABILIDAD EN ESTA BODEGA"}</p>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                {filteredItems.map((item) => (
                  <StockMovimientoCard key={item.itemId} item={item} onToggle={handleToggle} onUpdateCantidad={handleUpdateCantidad} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

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
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
            Transferir ({selectedItems.length})
          </button>
        </div>
      </div>

      <ConfirmacionTransferenciaModal
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onConfirm={handleSubmit}
        isSubmitting={submitting}
        itemCount={selectedItems.length}
        bodegaOrigenNombre={bodegaOrigenNombre}
        bodegaDestinoNombre={bodegaDestinoNombre}
      />
    </div>
  );
}
