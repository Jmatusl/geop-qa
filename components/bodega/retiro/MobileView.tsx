"use client";

/**
 * COMPONENTE - RETIRO BODEGA (VISTA MÓVIL)
 *
 * Replica fiel de la interfaz legacy aprobada por el cliente.
 * Colores: orange para acciones, whi bg limpio.
 */

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, PackageMinus, Check, Loader2, Search, ChevronLeft, Warehouse, Pencil, X, Camera, Image as ImageIcon, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { BuscarArticulosPanel } from "./BuscarArticulosPanel";
import { useBodegaConfig } from "@/lib/hooks/bodega/use-bodega-config";
import { useBodegaAuth } from "@/lib/hooks/bodega/use-bodega-auth";

// ============================================================================
// Tipos
// ============================================================================

interface RetiroItem {
  articuloId: string;
  codigo: string;
  nombre: string;
  bodegaOrigenId: string;
  bodegaOrigenNombre: string;
  cantidad: string;
  stockDisponible: number;
  unidad: string;
}

// ============================================================================
// Helpers
// ============================================================================

function parseNumber(value: string | number): number {
  if (typeof value === "number") return value;
  return parseInt(value.replace(/[^\d]/g, "")) || 0;
}

function formatNumber(value: string): string {
  const num = value.replace(/[^\d]/g, "");
  if (!num) return "";
  return new Intl.NumberFormat("es-CL").format(parseInt(num));
}

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

// ============================================================================
// Componente Principal
// ============================================================================

export default function MobileView() {
  const router = useRouter();
  const { data: configData } = useBodegaConfig();

  const configGeneral = configData?.["BODEGA_GENERAL_CONFIG"] || {};
  const autoApproveGlobal = (configGeneral as any).auto_aprobar_solicitudes === true;
  const entregaInmediata = (configGeneral as any).entrega_inmediata === true;
  const evidenciaObligatoria = (configGeneral as any).egresos_evidencia_obligatoria === true;

  const { isBodegaAdmin, isSupervisor } = useBodegaAuth();
  const canApprove = isBodegaAdmin || isSupervisor;

  // ── Fecha editable ─────────────────────────────────────────────────────────
  const [fecha, setFecha] = useState(new Date().toLocaleDateString("en-CA"));
  const [editingDate, setEditingDate] = useState(false);
  const fechaDisplay = (() => {
    const [y, m, d] = fecha.split("-");
    return `${d}-${m}-${y.slice(2)}`;
  })();

  // ── Estado del formulario ──────────────────────────────────────────────────
  const [justificacion, setJustificacion] = useState("");
  const [prioridad] = useState("NORMAL"); // Oculto pero enviado al backend

  // ── Artículos ──────────────────────────────────────────────────────────────
  const [items, setItems] = useState<RetiroItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  // ── Evidencias ─────────────────────────────────────────────────────────────
  const [fotosEvidencia, setFotosEvidencia] = useState<string[]>([]);
  const [showFotoPreview, setShowFotoPreview] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [showConfirm, setShowConfirm] = useState(false);
  const [paso2, setPaso2] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Handlers artículos ─────────────────────────────────────────────────────

  const handleSeleccionarArticulo = (articulo: any, bodegaId?: string | null) => {
    if (!bodegaId) return;
    const b = articulo.bodegas?.find((b: any) => b.bodegaId === bodegaId);
    if (!b) return;

    const existe = items.find((i) => i.articuloId === articulo.id && i.bodegaOrigenId === bodegaId);
    if (!existe) {
      setItems((prev) => [
        ...prev,
        {
          articuloId: articulo.id,
          codigo: articulo.codigo,
          nombre: articulo.nombre,
          bodegaOrigenId: bodegaId,
          bodegaOrigenNombre: b.bodegaNombre,
          cantidad: "",
          stockDisponible: b.cantidadDisponible ?? b.stockDisponible ?? 0,
          unidad: articulo.unidad || "uds",
        },
      ]);
    }
  };

  const handleUpdateCantidad = (articuloId: string, bodegaOrigenId: string, cantidadStr: string) => {
    const val = parseNumber(cantidadStr);
    setItems((prev) =>
      prev.map((i) => {
        if (i.articuloId === articuloId && i.bodegaOrigenId === bodegaOrigenId) {
          if (val > i.stockDisponible) return { ...i, cantidad: formatNumber(String(i.stockDisponible)) };
          return { ...i, cantidad: cantidadStr };
        }
        return i;
      }),
    );
  };

  const handleRemoveItem = (articuloId: string, bodegaOrigenId: string) => {
    setItems((prev) => prev.filter((i) => !(i.articuloId === articuloId && i.bodegaOrigenId === bodegaOrigenId)));
  };

  // ── Upload evidencia ───────────────────────────────────────────────────────

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
      if (entregaInmediata && (canApprove || autoApproveGlobal) && !paso2) {
        // FLUJO DE PARIDAD: Si la entrega inmediata está activa, creamos el Egreso/Salida real directamente.
        const externalFolio = `DIR-${Date.now()}`;

        for (const i of validItems) {
          const response = await fetch("/api/v1/bodega/movimientos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              movementType: "SALIDA",
              warehouseId: i.bodegaOrigenId,
              articleId: i.articuloId,
              quantity: parseNumber(i.cantidad),
              reason: `Entrega Inmediata Móvil`,
              observations: justificacion + " | [auto_approved:true]",
            }),
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Error al contabilizar entrega inmediata móvil");
          }
        }

        toast.success("Retiro inmediato procesado", {
          description: `EGRESO DIRECTO — ${validItems.length} artículo(s)`,
        });

        router.push("/bodega");
      } else {
        // FLUJO DE SOLICITUD INTERNA
        const res = await fetch("/api/v1/bodega/solicitudes-internas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `RETIRO MÓVIL: ${justificacion.substring(0, 25)}${justificacion.length > 25 ? "..." : ""}`,
            description: justificacion + (autoApproveGlobal && !paso2 ? " | [auto_approved:true]" : ""),
            priority: prioridad,
            requiredDate: fecha,
            warehouseId: validItems[0]?.bodegaOrigenId ?? null,
            fotoEvidenciaUrl: fotosEvidencia.length > 0 ? fotosEvidencia[0] : undefined,
            metadatos: { fotosEvidencia, origen: "mobile" },
            items: validItems.map((i) => ({
              articleId: i.articuloId,
              warehouseId: i.bodegaOrigenId,
              quantity: parseNumber(i.cantidad),
            })),
            autoCompletar: !paso2,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error en retiro");

        toast.success("Retiro completado", {
          description: `${data.folio ?? data.numero} — ${validItems.length} artículo(s)`,
        });

        if (paso2 && data.solicitudId) {
          router.push(`/bodega/solicitudes-internas/${data.solicitudId}`);
        } else {
          router.push("/bodega");
        }
      }
    } catch (error: any) {
      toast.error("Error en retiro", { description: error.message });
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  // ── Validaciones ───────────────────────────────────────────────────────────
  const hasEvidence = fotosEvidencia.length > 0;
  const validItems = items.filter((i) => parseNumber(i.cantidad) > 0);
  const totalUnidades = validItems.reduce((sum, i) => sum + parseNumber(i.cantidad), 0);
  const canSubmit = validItems.length > 0 && justificacion.trim().length >= 10 && (!evidenciaObligatoria || hasEvidence);

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
          <Warehouse className="w-5 h-5 text-orange-500 dark:text-orange-400 shrink-0" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-tight">Retiro Bodega</h1>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 shrink-0">
          <span className="font-bold tabular-nums">{fechaDisplay}</span>
          <button
            type="button"
            onClick={() => setEditingDate(!editingDate)}
            className="p-1.5 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-orange-500 transition-colors"
            title="Cambiar fecha"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor de fecha */}
      {editingDate && (
        <div className="mx-4 mt-3 bg-orange-50/50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-800 p-3 animate-in slide-in-from-top-2">
          <label className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest pl-1 mb-1 block">Fecha de Retiro</label>
          <div className="relative">
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-orange-200 dark:border-orange-800 bg-white dark:bg-gray-900 text-sm font-medium"
              autoFocus
            />
            <button onClick={() => setEditingDate(false)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-orange-600">
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="px-4 pt-2 max-w-lg mx-auto">
        {/* ── BARRA DE BUSQUEDA + EVIDENCIA ── */}
        <div className="flex gap-2 mb-2 h-14">
          {/* Buscador */}
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="flex-1 flex items-center justify-between px-3.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center">
                <Search className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-left">
                <span className="block text-xs font-bold text-gray-800 dark:text-gray-100 uppercase tracking-tight">Buscar Artículos</span>
                <span className="block text-[9px] text-gray-400 dark:text-gray-500 font-medium">TOCA PARA AGREGAR</span>
              </div>
            </div>
            <Plus className="w-4 h-4 text-gray-300" />
          </button>

          {/* Inputs ocultos */}
          <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
          <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

          {/* Botón Cámara */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploadingFoto}
            className="flex flex-col items-center justify-center w-14 h-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-500 hover:bg-gray-50 shadow-sm active:scale-95 transition-all"
          >
            {uploadingFoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            <span className="text-[8px] font-bold mt-0.5 uppercase tracking-tighter text-gray-400">Cámara</span>
          </button>

          {/* Botón Galería / Preview */}
          <button
            type="button"
            onClick={() => {
              if (fotosEvidencia.length > 0) setShowFotoPreview(!showFotoPreview);
              else galleryInputRef.current?.click();
            }}
            disabled={uploadingFoto}
            className={cn(
              "flex flex-col items-center justify-center w-14 h-full rounded-xl border transition-all shadow-sm relative active:scale-95",
              fotosEvidencia.length > 0
                ? "bg-green-50/50 border-green-200 text-green-600 dark:bg-green-950/30 dark:border-green-900/40"
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-500 hover:bg-gray-50",
            )}
          >
            <ImageIcon className={cn("w-4 h-4", fotosEvidencia.length === 0 && "text-gray-300")} />
            <span className="text-[8px] font-bold mt-0.5 uppercase tracking-tighter text-gray-400">Galería</span>
            {fotosEvidencia.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                {!showFotoPreview && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border-2 border-white dark:border-gray-900 shadow-sm" />
              </span>
            )}
          </button>
        </div>

        {/* Aviso evidencia obligatoria */}
        {!showFotoPreview && evidenciaObligatoria && !hasEvidence && (
          <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-medium animate-in fade-in slide-in-from-top-1">
            <Info className="w-3 h-3 text-red-500 shrink-0" />
            <span className="text-red-500 font-bold uppercase tracking-tight">La foto de evidencia es obligatoria para registrar el retiro.</span>
          </div>
        )}

        {/* Preview de fotos */}
        {showFotoPreview && fotosEvidencia.length > 0 && (
          <div className="mb-3 p-3 rounded-xl bg-green-50/20 dark:bg-green-950/5 border border-green-100/50 dark:border-green-900/20 animate-in fade-in slide-in-from-top-1 shadow-sm">
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <span className="text-[9px] font-bold text-green-600 dark:text-green-500 uppercase tracking-widest">Evidencia ({fotosEvidencia.length})</span>
              <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-1.5 text-[9px] font-bold text-blue-500 hover:text-blue-600 dark:text-blue-400">
                <Plus className="w-3 h-3" /> AÑADIR
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {fotosEvidencia.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-green-100 dark:border-green-900/50 shadow-sm bg-gray-100">
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

        {/* ── JUSTIFICACIÓN ── */}
        <div className="mt-2 mb-3 space-y-1.5 px-0.5">
          <div className="flex items-center justify-between pl-1">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Justificación<span className="text-red-500">*</span>
            </label>
            <span className={cn("text-[9px] font-bold uppercase tracking-widest", justificacion.length > 280 ? "text-red-500" : "text-gray-400")}>{justificacion.length} / 300</span>
          </div>
          <textarea
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            rows={2}
            maxLength={300}
            className={cn(
              "w-full px-3 py-2.5 rounded-lg border bg-white dark:bg-gray-900 text-sm resize-none transition-all shadow-sm",
              justificacion.trim().length > 0 && justificacion.trim().length < 10
                ? "border-orange-300 ring-4 ring-orange-500/5 focus:border-orange-500"
                : "border-gray-300 dark:border-gray-700 focus:border-orange-500",
            )}
            placeholder="Ingrese el motivo o justificación del retiro (mín. 10 caracteres)..."
          />
          {justificacion.trim().length > 0 && justificacion.trim().length < 10 && (
            <p className="text-[10px] font-medium text-orange-600 dark:text-orange-400 pl-1">Faltan {10 - justificacion.trim().length} caracteres más.</p>
          )}
        </div>

        {/* ── LISTA DE ARTÍCULOS ── */}
        <div className="space-y-4 mb-8">
          {items.length === 0 ? (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="w-full p-12 text-center bg-gray-50/50 dark:bg-gray-900/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 hover:bg-orange-50/30 dark:hover:bg-orange-900/10 transition-colors active:scale-[0.98]"
            >
              <Warehouse className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-400 dark:text-gray-500">¿Qué necesitas retirar hoy?</p>
              <span className="inline-block text-xs text-orange-600 font-bold mt-2 uppercase tracking-wide">Comenzar búsqueda</span>
            </button>
          ) : (
            items.map((item) => (
              <div
                key={`${item.articuloId}-${item.bodegaOrigenId}`}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                {/* Header tarjeta */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-[10px] font-mono font-bold bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-md border border-orange-100/50">
                        {item.codigo}
                      </code>
                      <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 flex items-center gap-1 uppercase tracking-tight">
                        <Warehouse className="w-3 h-3" />
                        {item.bodegaOrigenNombre}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">{item.nombre}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.articuloId, item.bodegaOrigenId)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Stock + Cantidad */}
                <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-gray-100 dark:border-gray-800/30">
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1">Stock</label>
                    <div className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800/30 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-400 flex items-baseline gap-1">
                      {item.stockDisponible}
                      <span className="text-[9px] text-gray-400 font-medium lowercase italic">{item.unidad}</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1">A Retirar</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={item.cantidad === "0" ? "" : item.cantidad}
                      onChange={(e) => handleUpdateCantidad(item.articuloId, item.bodegaOrigenId, formatNumber(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/40 rounded-lg text-xs font-bold text-orange-600 dark:text-orange-400 text-center outline-none focus:border-orange-500 transition-all font-mono"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── PANEL BUSCADOR ── */}
        <BuscarArticulosPanel open={dialogOpen} onOpenChange={setDialogOpen} itemsAgregados={items} onAddItem={handleSeleccionarArticulo} mostrarBodegas={true} />

        {/* ── BARRA INFERIOR FIJA ── */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-3 z-30 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
          <div className="max-w-lg mx-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="h-10 px-4 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest hover:bg-gray-50 active:scale-95 transition-all"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={() => {
                if (autoApproveGlobal || entregaInmediata) handleSubmit();
                else setShowConfirm(true);
              }}
              disabled={!canSubmit || submitting}
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-gray-100 disabled:text-gray-400 disabled:dark:bg-gray-800 disabled:dark:text-gray-600 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95"
            >
              <PackageMinus className="w-4 h-4" />
              Retirar {validItems.length} {validItems.length === 1 ? "Ítem" : "Ítems"}
            </button>
          </div>
        </div>

        {/* ── MODAL CONFIRMACIÓN ── */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-[2px] animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-white dark:bg-gray-950 rounded-t-2xl sm:rounded-xl p-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
              <div className="mb-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">¿Confirmar Retiro?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Vas a solicitar <strong>{validItems.length}</strong> artículo(s) para un total de <strong>{totalUnidades}</strong> unidades.
                </p>
              </div>

              {/* Checkbox Paso 2 */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50 mb-5 cursor-pointer hover:border-orange-200 transition-colors">
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${paso2 ? "bg-orange-500 border-orange-500 shadow-sm" : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"}`}
                >
                  {paso2 && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <input type="checkbox" checked={paso2} onChange={(e) => setPaso2(e.target.checked)} className="sr-only" />
                <div className="flex-1">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block uppercase tracking-tight">Paso 2</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium leading-none">Activar retiro manual / preparación</span>
                </div>
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={submitting}
                  className="flex-1 h-11 rounded-lg border border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest hover:bg-gray-50 active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-orange-500/10 active:scale-95 transition-all"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
