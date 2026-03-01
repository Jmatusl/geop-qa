"use client";

/**
 * COMPONENTE - INGRESO BODEGA (VISTA MÓVIL)
 *
 * Replica fiel de la interfaz legacy aprobada por el cliente.
 * Idioma: blanco, bordes grises, emerald para acciones.
 */

import React, { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, PackagePlus, Check, Loader2, Pencil, ChevronLeft, Warehouse, Camera, Image as ImageIcon, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { BuscarArticulosPanel } from "../retiro/BuscarArticulosPanel";
import { useBodegaWarehouses } from "@/lib/hooks/bodega/use-bodega-warehouses";
import { useBodegaAdjustmentReasons } from "@/lib/hooks/bodega/use-bodega-masters";
import { useBodegaConfig } from "@/lib/hooks/bodega/use-bodega-config";
import { useCreateBodegaMovement } from "@/lib/hooks/bodega/use-bodega-movements";
import { useBodegaCostCenters } from "@/lib/hooks/bodega/use-bodega-masters";

// ============================================================================
// Tipos
// ============================================================================

interface IngresoItem {
  id: string;
  articuloId: string;
  articuloNombre: string;
  articuloCodigo: string;
  cantidad: string;
  precioUnitario: string;
  unidad: string;
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

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

// ============================================================================
// Componente — Tarjeta de Artículo (estilo legacy)
// ============================================================================

function ArticuloCard({
  item,
  onUpdate,
  onRemove,
  onOpenBuscador,
}: {
  item: IngresoItem;
  onUpdate: (id: string, field: string, value: string) => void;
  onRemove: (id: string) => void;
  onOpenBuscador: (itemId: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
      {/* Selector de artículo */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Artículo</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onOpenBuscador(item.id)}
            className="flex-1 text-left px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 truncate"
          >
            {item.articuloNombre || "Seleccionar artículo..."}
          </button>
          <button
            type="button"
            onClick={() => onOpenBuscador(item.id)}
            className="flex items-center justify-center w-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 dark:hover:bg-emerald-950/30 transition-colors"
            title="Buscar artículo"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cantidad y Valor Unit. */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Cantidad</label>
          <input
            type="text"
            inputMode="numeric"
            value={item.cantidad}
            onChange={(e) => onUpdate(item.id, "cantidad", e.target.value.replace(/[^\d]/g, ""))}
            placeholder="0"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Valor Unit.</label>
          <input
            type="text"
            inputMode="numeric"
            value={item.precioUnitario}
            onChange={(e) => onUpdate(item.id, "precioUnitario", e.target.value.replace(/[^\d]/g, ""))}
            placeholder="0"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
          />
        </div>
      </div>

      {/* Botón eliminar */}
      <div className="flex justify-end">
        <button type="button" onClick={() => onRemove(item.id)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded">
          <Trash2 className="w-3.5 h-3.5" /> Quitar
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Componente Principal
// ============================================================================

export default function MobileView() {
  const router = useRouter();
  const { data: bodegasData } = useBodegaWarehouses(1, 100);
  const { data: costCentersData } = useBodegaCostCenters("", true);
  const { data: config } = useBodegaConfig();
  const createMovement = useCreateBodegaMovement();

  const bodegas = bodegasData?.data.filter((b) => b.isActive) || [];
  const costCenters = costCentersData?.data || [];
  const configGeneral = (config?.BODEGA_GENERAL_CONFIG ?? {}) as Record<string, any>;
  const evidenciaObligatoria = configGeneral.ingresos_evidencia_obligatoria === true;
  const autoVerifyEnabled = configGeneral.auto_verificar_ingresos === true;

  // ── Fecha editable ─────────────────────────────────────────────────────────
  const [fecha, setFecha] = useState(new Date().toLocaleDateString("en-CA"));
  const [editingDate, setEditingDate] = useState(false);
  const fechaDisplay = (() => {
    const [y, m, d] = fecha.split("-");
    return `${d}-${m}-${y.slice(2)}`;
  })();

  // ── Estado del formulario ──────────────────────────────────────────────────
  const [warehouseId, setWarehouseId] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [docReferencia, setDocReferencia] = useState("");
  const [numCotizacion, setNumCotizacion] = useState("");
  const [guiaDespacho, setGuiaDespacho] = useState("");
  const [showAdvancedRef, setShowAdvancedRef] = useState(false);

  // ── Artículos ──────────────────────────────────────────────────────────────
  const [items, setItems] = useState<IngresoItem[]>([{ id: generateId(), articuloId: "", articuloNombre: "", articuloCodigo: "", cantidad: "", precioUnitario: "", unidad: "uds" }]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetItemId, setTargetItemId] = useState<string | null>(null);

  // ── Evidencias ─────────────────────────────────────────────────────────────
  const [fotosEvidencia, setFotosEvidencia] = useState<string[]>([]);
  const [showFotoPreview, setShowFotoPreview] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [showConfirm, setShowConfirm] = useState(false);
  const [verificacionAuto, setVerificacionAuto] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Seleccionar bodega EN TRÁNSITO por defecto
  React.useEffect(() => {
    if (bodegas.length > 0 && !warehouseId) {
      const transito = bodegas.find((b) => b.name?.toLowerCase().includes("tránsito") || b.name?.toLowerCase().includes("transito"));
      setWarehouseId(transito ? transito.id : bodegas[0].id);
    }
  }, [bodegas, warehouseId]);

  const handleUpdateItem = (id: string, field: string, value: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const handleOpenBuscador = (itemId: string) => {
    setTargetItemId(itemId);
    setDialogOpen(true);
  };

  const handleSeleccionarArticulo = (articulo: any) => {
    if (targetItemId) {
      setItems((prev) =>
        prev.map((i) => (i.id === targetItemId ? { ...i, articuloId: articulo.id, articuloNombre: articulo.nombre || articulo.name || "", articuloCodigo: articulo.codigo || articulo.sku || "" } : i)),
      );
    } else {
      // Sin target: modo "carrito" — agrega si no existe
      const existe = items.find((i) => i.articuloId === articulo.id);
      if (!existe) {
        setItems((prev) => [
          ...prev,
          {
            id: generateId(),
            articuloId: articulo.id,
            articuloNombre: articulo.nombre || articulo.name || "",
            articuloCodigo: articulo.codigo || articulo.sku || "",
            cantidad: "",
            precioUnitario: "",
            unidad: articulo.unidad || "uds",
          },
        ]);
      } else {
        toast.info("El artículo ya está en la lista");
      }
    }
    setDialogOpen(false);
    setTargetItemId(null);
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { id: generateId(), articuloId: "", articuloNombre: "", articuloCodigo: "", cantidad: "", precioUnitario: "", unidad: "uds" }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // ── Upload evidencia ───────────────────────────────────────────────────────

  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))), "image/jpeg", 0.8);
      };
      img.onerror = reject;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    const toastId = toast.loading("Procesando imagen...");
    try {
      const resized = await resizeImage(file, 1920, 1080);
      const fd = new FormData();
      fd.append("file", resized, "evidencia.jpg");
      fd.append("path", "bodega/evidencias");
      const res = await fetch("/api/uploads/r2-simple", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Error al subir imagen");
      const data = await res.json();
      const url = data.data?.url || data.url;
      if (!url) throw new Error("Sin URL de respuesta");
      setFotosEvidencia((prev) => [...prev, url]);
      setShowFotoPreview(true);
      toast.success("Foto cargada", { id: toastId });
    } catch (err: any) {
      toast.error("Error al cargar foto", { description: err.message, id: toastId });
    } finally {
      setUploadingFoto(false);
      if (e.target) e.target.value = "";
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const validItems = items.filter((i) => i.articuloId && parseNumber(i.cantidad) > 0);
      for (const item of validItems) {
        const obsArray = [
          observaciones ? `Justificación: ${observaciones}` : null,
          docReferencia ? `Doc. Ref: ${docReferencia}` : null,
          numCotizacion ? `N° Cotización: ${numCotizacion}` : null,
          guiaDespacho ? `Guía Despacho: ${guiaDespacho}` : null,
          costCenterId ? `C. Costo: ${costCenters.find((c) => c.id === costCenterId)?.name}` : null,
          parseNumber(item.precioUnitario) > 0 ? `P. Unitario: ${item.precioUnitario}` : null,
        ].filter(Boolean);

        await createMovement.mutateAsync({
          movementType: "INGRESO",
          warehouseId,
          articleId: item.articuloId,
          quantity: parseNumber(item.cantidad),
          reason: observaciones,
          observations: obsArray.join(" | "),
        });
      }
      toast.success("Ingreso completado con éxito");
      router.push("/bodega/movimientos");
    } catch (error: any) {
      toast.error("Error al procesar", { description: error.message });
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  // ── Validaciones ───────────────────────────────────────────────────────────
  const hasEvidence = fotosEvidencia.length > 0;
  const validItems = items.filter((i) => i.articuloId && parseNumber(i.cantidad) > 0);
  const canSubmit = validItems.length > 0 && warehouseId && costCenterId && observaciones.trim().length >= 10 && (!evidenciaObligatoria || hasEvidence);

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
          <Warehouse className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-tight">Ingreso Bodega</h1>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 shrink-0">
          <span className="font-bold tabular-nums">{fechaDisplay}</span>
          <button
            type="button"
            onClick={() => setEditingDate(!editingDate)}
            className="p-1.5 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-emerald-500 transition-colors"
            title="Cambiar fecha"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor de fecha */}
      {editingDate && (
        <div className="mx-4 mt-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800 p-3 animate-in slide-in-from-top-2">
          <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest pl-1 mb-1 block">Fecha de Ingreso</label>
          <div className="relative">
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-900 text-sm font-medium"
              autoFocus
            />
            <button onClick={() => setEditingDate(false)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-emerald-600">
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="px-4 py-3 max-w-lg mx-auto space-y-3">
        {/* ── BODEGA DESTINO + CENTRO DE COSTO ── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1">Bodega Destino</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-[11px] font-bold uppercase"
              >
                {bodegas.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1">Centro de Costo</label>
              <select
                value={costCenterId}
                onChange={(e) => setCostCenterId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-[11px] font-bold uppercase"
              >
                <option value="">Seleccionar...</option>
                {costCenters.map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── DOCUMENTO DE REFERENCIA ── */}
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block uppercase">Documento de Referencia (OC/Factura)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={docReferencia}
              onChange={(e) => setDocReferencia(e.target.value.toUpperCase())}
              placeholder="EJ: OC-1234..."
              className="flex-1 px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium"
            />

            {/* Btn: más campos */}
            <button
              type="button"
              onClick={() => setShowAdvancedRef(!showAdvancedRef)}
              className={cn(
                "flex items-center justify-center w-10 h-[42px] rounded-lg border transition-colors",
                showAdvancedRef ? "bg-emerald-600 border-emerald-600 text-white" : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100",
              )}
              title="Más campos de referencia"
            >
              <Plus className={cn("w-4 h-4 transition-transform", showAdvancedRef && "rotate-45")} />
            </button>

            {/* Btn: cámara */}
            <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
            <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploadingFoto}
              className="flex items-center justify-center w-10 h-[42px] rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 transition-colors"
              title="Tomar foto"
            >
              {uploadingFoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>

            {/* Btn: galería / ver evidencia */}
            <button
              type="button"
              onClick={() => {
                if (fotosEvidencia.length > 0) setShowFotoPreview(!showFotoPreview);
                else galleryInputRef.current?.click();
              }}
              disabled={uploadingFoto}
              className={cn(
                "flex items-center justify-center w-10 h-[42px] rounded-lg border transition-colors relative",
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
          </div>

          {/* Aviso evidencia obligatoria */}
          {!showFotoPreview && evidenciaObligatoria && !hasEvidence && (
            <div className="flex items-center gap-1.5 mt-2 px-1 text-[10px] font-medium animate-in fade-in">
              <Info className="w-3 h-3 text-red-500 shrink-0" />
              <span className="text-red-500 font-bold uppercase tracking-tight">La foto de evidencia es obligatoria para registrar el ingreso.</span>
            </div>
          )}

          {/* Campos avanzados de referencia */}
          {showAdvancedRef && (
            <div className="mt-2 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1 block">N° Cotización</label>
                  <input
                    type="text"
                    value={numCotizacion}
                    onChange={(e) => setNumCotizacion(e.target.value.toUpperCase())}
                    placeholder="COT-..."
                    className="w-full px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-gray-900 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1 block">Guía Despacho</label>
                  <input
                    type="text"
                    value={guiaDespacho}
                    onChange={(e) => setGuiaDespacho(e.target.value.toUpperCase())}
                    placeholder="GD-..."
                    className="w-full px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-gray-900 text-sm font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Justificación / Observaciones */}
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
              placeholder="Ingrese el motivo o justificación del ingreso (mín. 10 caracteres)..."
            />
            {observaciones.trim().length > 0 && observaciones.trim().length < 10 && (
              <p className="text-[10px] font-medium text-orange-600 pl-1">Faltan {10 - observaciones.trim().length} caracteres más.</p>
            )}
          </div>

          {/* Preview de fotos */}
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
        </div>

        {/* ── LISTA DE ARTÍCULOS ── */}
        <div className="space-y-3">
          {items.map((item) => (
            <ArticuloCard key={item.id} item={item} onUpdate={handleUpdateItem} onRemove={handleRemoveItem} onOpenBuscador={handleOpenBuscador} />
          ))}
        </div>

        {/* ── BOTÓN AGREGAR ARTÍCULO ── */}
        <button
          type="button"
          onClick={handleAddItem}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:border-emerald-400 hover:text-emerald-500 transition-colors"
        >
          <Plus className="w-4 h-4" /> Agregar Artículo
        </button>
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
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:dark:bg-gray-700 text-white font-medium text-sm transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Realizar Ingreso ({validItems.length})
          </button>
        </div>
      </div>

      {/* ── MODAL BUSCADOR DE ARTÍCULOS ── */}
      <BuscarArticulosPanel
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        itemsAgregados={items.filter((i) => i.articuloId).map((i) => ({ articuloId: i.articuloId }) as any)}
        onAddItem={handleSeleccionarArticulo}
        mostrarBodegas={false}
      />

      {/* ── MODAL CONFIRMACIÓN ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">¿Realizar el ingreso?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Se ingresarán <strong>{validItems.length}</strong> artículo(s) en la bodega seleccionada.
            </p>

            <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 mb-4 cursor-pointer">
              <div
                className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${verificacionAuto ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-600"}`}
              >
                {verificacionAuto && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
              <input type="checkbox" checked={verificacionAuto} onChange={(e) => setVerificacionAuto(e.target.checked)} className="sr-only" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Verificación automática al registrar</span>
            </label>

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
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm"
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
