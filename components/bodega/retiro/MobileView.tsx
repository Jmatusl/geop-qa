"use client";

/**
 * COMPONENTE - RETIRO BODEGA (VISTA MÓVIL)
 *
 * Replica fiel de la interfaz legacy aprobada por el cliente.
 * Colores: orange para acciones, whi bg limpio.
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, PackageMinus, Check, Loader2, Search, ChevronLeft, Warehouse, Pencil, X, Camera, Image as ImageIcon, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { BuscarArticulosPanel } from "./BuscarArticulosPanel";
import { useBodegaConfig } from "@/lib/hooks/bodega/use-bodega-config";
import { useBodegaAuth } from "@/lib/hooks/bodega/use-bodega-auth";
import { useBodegaWarehouses } from "@/lib/hooks/bodega/use-bodega-warehouses";
import { ConfirmacionRetiroModal } from "./ConfirmacionRetiroModal";

// ============================================================================
// Tipos
// ============================================================================

interface RetiroItem {
  articuloId: string;
  codigo: string;
  nombre: string;
  bodegaOrigenId: string;
  bodegaOrigenNombre: string;
  cantidad: number;
  stockDisponible: number;
  stockGlobal: number;
  unidad: string;
  bodegasStock?: { bodegaId: string; bodegaNombre: string; stock: number }[];
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

interface MobileViewProps {
  initialData?: {
    requestId: string;
    folio: string;
    warehouseId: string;
    justificacion: string;
    referencia: string;
    fechaRequerida: string;
    items: RetiroItem[];
    fotosEvidencia?: string[];
  };
  isEditMode?: boolean;
}

export default function MobileView({ initialData, isEditMode }: MobileViewProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
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

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [aprobacionAuto, setAprobacionAuto] = useState(true);
  const [creando, setCreando] = useState(false);
  const [successData, setSuccessData] = useState<{ id: string; folio: string } | null>(null);

  // ── Catálogos ──────────────────────────────────────────────────────────────
  const { data: bodegasData } = useBodegaWarehouses(1, 100);
  const bodegas = useMemo(() => bodegasData?.data.filter((b: any) => b.isActive) || [], [bodegasData?.data]);

  const [warehouseId, setWarehouseId] = useState<string>("");
  const [items, setItems] = useState<RetiroItem[]>([]);

  // ── Sincronización modo edición ──────────────────────────────────────────
  useEffect(() => {
    if (isEditMode && initialData) {
      setJustificacion(initialData.justificacion);
      setFecha(initialData.fechaRequerida);
      setItems(initialData.items);
      setWarehouseId(initialData.warehouseId);
      if (initialData.fotosEvidencia) {
        setFotosEvidencia(initialData.fotosEvidencia);
      }
    }
  }, [initialData?.requestId, isEditMode]);

  // Fallback para bodega inicial si no estamos en edición
  useEffect(() => {
    if (!isEditMode && bodegas.length > 0 && !warehouseId) {
      setWarehouseId(bodegas[0].id);
    }
  }, [bodegas, warehouseId, isEditMode]);

  // Sincronizar stock de los items cuando cambie la bodega global o items
  useEffect(() => {
    let active = true;
    if (warehouseId && bodegas.length > 0 && items.length > 0) {
      const articleIds = items.map((i) => i.articuloId);
      
      fetch("/api/v1/bodega/stock/batch-query", {
        method: "POST",
        body: JSON.stringify({ warehouseId, articleIds }),
      })
        .then((res) => res.json())
        .then((stockMap) => {
          if (active) {
            setItems((prev) => {
              const needsUpdate = prev.some((item) => 
                item.bodegaOrigenId === warehouseId && 
                item.stockDisponible !== (stockMap[item.articuloId] || 0)
              );
              if (!needsUpdate) return prev;

              return prev.map((item) => {
                if (item.bodegaOrigenId === warehouseId) {
                  return {
                    ...item,
                    stockDisponible: stockMap[item.articuloId] || 0,
                  };
                }
                return item;
              });
            });
          }
        })
        .catch((err) => console.error("Error al refrescar stock:", err));
    }
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId, bodegas, items.length]);

  // ── Artículos ──────────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);

  // ── Evidencias ─────────────────────────────────────────────────────────────
  const [fotosEvidencia, setFotosEvidencia] = useState<string[]>([]);
  const [showFotoPreview, setShowFotoPreview] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // ── Handlers artículos ─────────────────────────────────────────────────────

  const handleSeleccionarArticulo = (articulo: any, bodegaId?: string | null) => {
    if (!bodegaId) return;
    const b = articulo.bodegas?.find((b: any) => b.bodegaId === bodegaId);
    if (!b) return;

    setItems((prev: RetiroItem[]) => {
      const existeIndex = prev.findIndex((i) => i.articuloId === articulo.id);

      const stockGlobal = articulo.stockTotal ?? articulo.bodegas.reduce((sum: number, b: any) => sum + (b.cantidadDisponible || 0), 0);
      const bodegasStock = articulo.bodegas.map((b: any) => ({
        bodegaId: b.bodegaId,
        bodegaNombre: b.bodegaNombre,
        stock: b.cantidadDisponible || 0,
      }));

      if (existeIndex !== -1) {
        const newItems = [...prev];
        newItems[existeIndex] = {
          ...newItems[existeIndex],
          bodegaOrigenId: bodegaId,
          bodegaOrigenNombre: b.bodegaNombre,
          stockDisponible: b.cantidadDisponible ?? b.stockDisponible ?? 0,
          stockGlobal,
          bodegasStock,
        };
        toast.info(`${articulo.nombre} actualizado (Global: ${stockGlobal})`);
        return newItems;
      }

      const newItem: RetiroItem = {
        articuloId: articulo.id,
        codigo: articulo.codigo,
        nombre: articulo.nombre,
        bodegaOrigenId: bodegaId,
        bodegaOrigenNombre: b.bodegaNombre,
        cantidad: 0,
        stockDisponible: b.cantidadDisponible ?? b.stockDisponible ?? 0,
        stockGlobal,
        unidad: articulo.unidad || "uds",
        bodegasStock,
      };

      toast.success(`${articulo.nombre} agregado (Global: ${stockGlobal})`);
      return [...prev, newItem];
    });
  };

  const handleUpdateCantidad = (articuloId: string, bodegaOrigenId: string, cantidadStr: string) => {
    const val = parseNumber(cantidadStr);
    setItems((prev: RetiroItem[]) =>
      prev.map((i) => {
        if (i.articuloId === articuloId) {
          const v = Math.min(val, i.stockGlobal);
          return { ...i, cantidad: v };
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
      const res = await fetch("/api/v1/storage/r2-simple", { method: "POST", body: fd });
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

  const handleCrearSolicitud = async (isAutoApprovedForce?: boolean) => {
    // En móvil, si NO es paso2 (solicitud diferida), activamos aprobación automática si tiene permisos.
    // La entrega inmediata real dependerá de las reglas globales en el backend.
    const finalAutoApprove = isAutoApprovedForce !== undefined ? isAutoApprovedForce : aprobacionAuto && canApprove;
    const isAutoCompletar = (entregaInmediata || autoApproveGlobal) && finalAutoApprove;
    setCreando(true);
    setConfirmOpen(false);

    try {
      const url = isEditMode && initialData?.requestId ? `/api/v1/bodega/solicitudes-internas/${initialData.requestId}` : "/api/v1/bodega/solicitudes-internas";

      const res = await fetch(url, {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `RETIRO MÓVIL: ${justificacion.substring(0, 25)}${justificacion.length > 25 ? "..." : ""}`,
          description: justificacion + (isAutoCompletar ? " | [auto_approved:true]" : ""),
          priority: prioridad,
          requiredDate: fecha,
          warehouseId: warehouseId || (validItems[0]?.bodegaOrigenId ?? null),
          fotoEvidenciaUrl: fotosEvidencia.length > 0 ? fotosEvidencia[0] : undefined,
          metadatos: { fotosEvidencia, origen: "mobile" },
          items: validItems.flatMap((i) => {
            if (i.cantidad <= i.stockDisponible || !i.bodegasStock) {
              return [
                {
                  articleId: i.articuloId,
                  warehouseId: i.bodegaOrigenId,
                  quantity: i.cantidad,
                },
              ];
            }

            let restante = i.cantidad;
            const itemsDistribuidos = [];

            // 1. Tomar de la bodega preferida
            const qtyPreferida = Math.min(restante, i.stockDisponible);
            itemsDistribuidos.push({
              articleId: i.articuloId,
              warehouseId: i.bodegaOrigenId,
              quantity: qtyPreferida,
            });
            restante -= qtyPreferida;

            // 2. Tomar de otras bodegas
            if (restante > 0) {
              const otrasBodegas = i.bodegasStock.filter((b) => b.bodegaId !== i.bodegaOrigenId && b.stock > 0);
              for (const b of otrasBodegas) {
                if (restante <= 0) break;
                const aTomar = Math.min(restante, b.stock);
                itemsDistribuidos.push({
                  articleId: i.articuloId,
                  warehouseId: b.bodegaId,
                  quantity: aTomar,
                });
                restante -= aTomar;
              }
            }

            // 3. Fallback
            if (restante > 0) {
              itemsDistribuidos[0].quantity += restante;
            }

            return itemsDistribuidos;
          }),
          autoCompletar: isAutoCompletar,
          autoAprobar: finalAutoApprove,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en retiro");

      // Invalida caché para refrescar listado y estadísticas
      queryClient.invalidateQueries({ queryKey: ["bodega", "solicitudes-internas"] });
      queryClient.invalidateQueries({ queryKey: ["bodega", "consulta-rapida"] });

      toast.success(isAutoCompletar ? "Retiro inmediato completado" : "Solicitud de retiro creada", {
        description: `Folio: ${data.folio} — ${validItems.length} artículo(s)`,
      });

      setSuccessData({ id: data.id, folio: data.folio });
    } catch (error: any) {
      toast.error("Error en retiro", { description: error.message });
    } finally {
      setCreando(false);
      setConfirmOpen(false);
    }
  };

  // ── Validaciones ───────────────────────────────────────────────────────────
  const hasEvidence = fotosEvidencia.length > 0;
  const validItems = items.filter((i) => parseNumber(i.cantidad) > 0);
  const totalUnidades = validItems.reduce((sum, i) => sum + parseNumber(i.cantidad), 0);
  const canSubmit = validItems.length > 0 && justificacion.trim().length >= 10 && (!evidenciaObligatoria || hasEvidence);

  // ── RENDER ─────────────────────────────────────────────────────────────────

  if (successData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6 shadow-sm">
          <Check className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight mb-2 text-gray-900 dark:text-gray-100 italic">¡Retiro Procesado!</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-10 uppercase font-medium tracking-widest leading-relaxed">
          El folio <span className="text-gray-900 dark:text-white font-extrabold">{successData.folio}</span> ha sido generado con éxito.
        </p>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => {
              setItems([]);
              setJustificacion("");
              setFotosEvidencia([]);
              setSuccessData(null);
            }}
            className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuevo Retiro
          </button>
          <button
            onClick={() => router.push("/bodega")}
            className="w-full h-14 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-400 rounded-2xl font-bold uppercase text-xs tracking-widest active:scale-95 transition-all"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

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
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-tight">{isEditMode ? "Editar Solicitud" : "Retiro Bodega"}</h1>
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
                      {/* Nuevos Badges Móvil */}
                      {item.stockGlobal > item.stockDisponible && item.cantidad < item.stockDisponible && (
                        <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase animate-in fade-in">
                          +{item.stockGlobal - item.stockDisponible} EN OTRAS
                        </span>
                      )}
                      {item.cantidad > item.stockDisponible && <span className="text-[8px] font-black bg-[#283c7f] text-white px-1.5 py-0.5 rounded uppercase animate-pulse">MULTIBODEGA</span>}
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
                <div className="grid grid-cols-2 gap-2 pt-0 border-t border-gray-100 dark:border-gray-800/30">
                  <div className="space-y-0">
                    <label className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1">Stock</label>
                    <div className="px-2 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-gray-100 dark:border-gray-800/50 flex items-center h-[40px]">
                      <div className="text-[9px] font-bold uppercase tracking-tighter flex items-center justify-between w-full">
                        <span className="text-gray-500 flex-1 text-left">
                          DISPONIBLE <span className="text-gray-900 dark:text-gray-100 font-black ml-1">{item.stockDisponible}</span>
                        </span>
                        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-2" />
                        <span className="text-blue-600 dark:text-blue-400 font-black flex-1 text-right">(GLOBAL {item.stockGlobal})</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-red-500 dark:text-red-400 uppercase tracking-widest pl-1">A Retirar</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={item.cantidad === 0 ? "" : item.cantidad}
                      onChange={(e) => handleUpdateCantidad(item.articuloId, item.bodegaOrigenId, formatNumber(e.target.value))}
                      className="w-full h-[40px] px-2.5 bg-orange-50/50 dark:bg-orange-950/20 border-2 border-orange-200 dark:border-orange-900/40 rounded-lg text-xl font-black text-orange-600 dark:text-orange-400 text-center outline-none focus:border-orange-500 transition-all font-mono shadow-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
                {item.cantidad > item.stockDisponible && (
                  <div className="flex items-center gap-1.5 px-2 py-1.5 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-100/50 dark:border-orange-900/30 animate-in slide-in-from-top-1">
                    <Info className="w-3 h-3 text-orange-500 shrink-0" />
                    <p className="text-[9px] font-bold text-orange-600 dark:text-orange-400 leading-tight">
                      Stock insuficiente en esta bodega. Se completará el retiro usando unidades de otras bodegas.
                    </p>
                  </div>
                )}
                {item.stockGlobal < item.cantidad && (
                  <div className="flex items-center gap-1.5 px-2 py-1.5 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100/50 dark:border-red-900/30 animate-pulse">
                    <X className="w-3 h-3 text-red-500 shrink-0" />
                    <p className="text-[9px] font-bold text-red-600 dark:text-red-400 leading-tight uppercase font-black">Supera el stock global disponible ({item.stockGlobal}).</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* ── PANEL BUSCADOR ── */}
        <BuscarArticulosPanel open={dialogOpen} onOpenChange={setDialogOpen} itemsAgregados={items} onAddItem={handleSeleccionarArticulo} mostrarBodegas={true} />

        {/* ── MODAL CONFIRMACIÓN COMPARTIDO ── */}
        <ConfirmacionRetiroModal
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          onConfirm={handleCrearSolicitud}
          isPending={creando}
          itemCount={validItems.length}
          totalUnidades={totalUnidades}
          aprobacionAuto={aprobacionAuto}
          onAprobacionAutoChange={setAprobacionAuto}
          isAutoAprobar={autoApproveGlobal}
          isEntregaInmediata={entregaInmediata}
        />

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
                if (autoApproveGlobal || entregaInmediata) handleCrearSolicitud(true);
                else setConfirmOpen(true);
              }}
              disabled={!canSubmit || creando}
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-gray-100 disabled:text-gray-400 disabled:dark:bg-gray-800 disabled:dark:text-gray-600 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95"
            >
              <PackageMinus className="w-4 h-4" />
              {isEditMode ? "Actualizar Solicitud" : `Retirar ${validItems.length} ${validItems.length === 1 ? "Ítem" : "Ítems"}`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
