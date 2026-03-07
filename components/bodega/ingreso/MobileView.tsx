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
import { Plus, Trash2, PackagePlus, Check, Loader2, Pencil, ChevronLeft, Warehouse, Camera, Image as ImageIcon, X, Info, Search, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useBodegaArticles, type BodegaArticle } from "@/lib/hooks/bodega/use-bodega-articles";
import { CrearArticuloDialog } from "@/components/bodega/maestros/CrearArticuloDialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useBodegaWarehouses } from "@/lib/hooks/bodega/use-bodega-warehouses";
import { useBodegaAdjustmentReasons } from "@/lib/hooks/bodega/use-bodega-masters";
import { useBodegaConfig } from "@/lib/hooks/bodega/use-bodega-config";
import { useCreateBodegaMovement } from "@/lib/hooks/bodega/use-bodega-movements";
import { useBodegaCostCenters } from "@/lib/hooks/bodega/use-bodega-masters";
import { ConfirmacionMovimientoModal } from "@/components/bodega/movimientos/ConfirmacionMovimientoModal";

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

/**
 * SELECTOR DE ARTÍCULO PARA MÓVIL (COMBOBOX)
 */
function ArticuloSelectorMobile({
  value,
  onSelect,
  articles,
  onCreated,
  placeholder = "Seleccionar artículo...",
  triggerRef,
}: {
  value: string;
  onSelect: (val: string) => void;
  articles: BodegaArticle[];
  onCreated: (nuevo?: BodegaArticle) => Promise<void>;
  placeholder?: string;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyWithStock, setShowOnlyWithStock] = useState(true);
  const selectedArt = articles.find((a) => a.id === value);
  const internalRef = useRef<HTMLButtonElement>(null);
  const activeRef = triggerRef || internalRef;

  const filteredArticles = articles.filter((a) => {
    // Primero el filtro de stock si está activo
    if (showOnlyWithStock && (a.stock ?? 0) <= 0) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return a.code.toLowerCase().includes(term) || a.name.toLowerCase().includes(term);
  });

  const isRedundant = (code: string, name: string) => {
    if (!code || !name) return false;
    const c = code.toLowerCase().replace(/[^a-z0-9]/g, "");
    const n = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    return n.startsWith(c) || c.startsWith(n) || n === c;
  };

  // Función para resaltar el término buscado
  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${highlight})`, "gi"));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-100 font-black p-0 rounded-sm">
              {part}
            </mark>
          ) : (
            part
          ),
        )}
      </span>
    );
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            ref={activeRef}
            type="button"
            className="flex-1 flex items-center justify-between text-left px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 truncate shadow-sm transition-all active:scale-[0.98]"
          >
            <span className="truncate pr-2 font-bold uppercase text-[10px] tracking-tight">
              {value && selectedArt ? (isRedundant(selectedArt.code, selectedArt.name) ? selectedArt.name : `[${selectedArt.code}] ${selectedArt.name}`) : placeholder}
            </span>
            <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
          </button>
        </DialogTrigger>
        <DialogContent
          className="p-0 border-none shadow-2xl h-auto max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden max-w-[98vw] rounded-2xl sm:rounded-2xl top-[4dvh] sm:top-1/2 translate-y-0 sm:-translate-y-1/2"
          onCloseAutoFocus={(e) => {
            // Si el foco ya se movió a un input (por nuestro onSelect), evitamos que el Dialog lo robe de vuelta al botón trigger
            if (document.activeElement?.tagName === "INPUT") {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader className="p-3 border-b bg-white dark:bg-slate-950 sticky top-0 z-10 space-y-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Catálogo de Artículos</DialogTitle>
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-full border border-slate-100 dark:border-slate-800 transition-all active:scale-95">
                <input
                  type="checkbox"
                  checked={showOnlyWithStock}
                  onChange={(e) => setShowOnlyWithStock(e.target.checked)}
                  className="w-3 h-3 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-[9px] font-black uppercase text-slate-500">Solo con Stock</span>
              </label>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por código o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 text-xs font-bold uppercase bg-slate-50 dark:bg-slate-900 border-none focus-visible:ring-0"
                autoFocus
              />
            </div>
          </DialogHeader>
          <div className="overflow-y-auto px-3 py-2 space-y-1.5 min-h-0 bg-slate-50/50 dark:bg-slate-900/10">
            {filteredArticles.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                  <Search className="h-6 w-6 text-slate-300" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin resultados</p>
                  {showOnlyWithStock && (
                    <button onClick={() => setShowOnlyWithStock(false)} className="text-[9px] font-bold text-emerald-600 uppercase underline">
                      Ver artículos sin stock
                    </button>
                  )}
                </div>
              </div>
            ) : (
              filteredArticles.map((a) => {
                const redundant = isRedundant(a.code, a.name);
                const hasStock = (a.stock ?? 0) > 0;
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      onSelect(a.id);
                      setOpen(false);
                      setSearchTerm("");
                    }}
                    className={cn(
                      "w-full text-left px-3 py-1 rounded-lg text-xs font-bold flex flex-col gap-0 transition-all border",
                      value === a.id
                        ? "bg-emerald-600 text-white shadow-lg border-emerald-500"
                        : "bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-800",
                    )}
                  >
                    <div className="flex items-center justify-between w-full h-3">
                      {!redundant && (
                        <span
                          className={cn(
                            "text-[8px] font-black tracking-tight px-1 py-0 rounded-md",
                            value === a.id ? "bg-emerald-500/30 text-emerald-100" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
                          )}
                        >
                          {highlightText(a.code, searchTerm)}
                        </span>
                      )}
                      {a.stock !== undefined && (
                        <span className={cn("text-[8px] font-extrabold uppercase", hasStock ? (value === a.id ? "text-white" : "text-emerald-500") : "text-slate-400")}>Stock: {a.stock}</span>
                      )}
                    </div>
                    <span className="truncate text-[11px] font-extrabold uppercase leading-tight">{highlightText(a.name, searchTerm)}</span>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CrearArticuloDialog
        trigger={
          <button
            type="button"
            className="flex items-center justify-center h-9.5 w-9 shrink-0 rounded-lg border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all active:scale-95"
            title="Crear Artículo"
          >
            <Plus className="w-4 h-4" />
          </button>
        }
        onArticuloCreado={onCreated}
      />
    </div>
  );
}

// ============================================================================
// Componente — Tarjeta de Artículo (estilo legacy)
// ============================================================================

function ArticuloCard({
  item,
  onUpdate,
  onRemove,
  articles,
  onRefetchArticles,
  selectorRef,
  quantityRef,
  priceRef,
}: {
  item: IngresoItem;
  onUpdate: (id: string, field: string, value: string) => void;
  onRemove: (id: string) => void;
  articles: BodegaArticle[];
  onRefetchArticles: () => Promise<any>;
  selectorRef?: React.RefObject<HTMLButtonElement | null>;
  quantityRef?: React.RefObject<HTMLInputElement | null>;
  priceRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div
      id={`card-${item.id}`}
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3 scroll-mt-20 transition-all duration-300 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 shadow-sm focus-within:shadow-md"
    >
      {/* Selector de artículo */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">Artículo</label>
        <ArticuloSelectorMobile
          value={item.articuloId}
          articles={articles}
          triggerRef={selectorRef}
          onSelect={(val) => {
            const art = articles.find((a) => a.id === val);
            if (art) {
              onUpdate(item.id, "articuloId", art.id);
              onUpdate(item.id, "articuloNombre", art.name);
              onUpdate(item.id, "articuloCodigo", art.code);
              onUpdate(item.id, "unidad", art.unit || "uds");
              // Al seleccionar, saltar a cantidad con un delay que permita cerrar el Dialog
              setTimeout(() => {
                if (quantityRef?.current) {
                  quantityRef.current.focus();
                  // Seleccionar el texto para sobreescribir rápido
                  if (typeof quantityRef.current.select === "function") {
                    quantityRef.current.select();
                  }
                }
              }, 400);
            }
          }}
          onCreated={async (nuevo) => {
            if (nuevo) {
              await onRefetchArticles();
              onUpdate(item.id, "articuloId", nuevo.id);
              onUpdate(item.id, "articuloNombre", nuevo.name);
              onUpdate(item.id, "articuloCodigo", nuevo.code);
              onUpdate(item.id, "unidad", nuevo.unit || "uds");
              setTimeout(() => {
                if (quantityRef?.current) {
                  quantityRef.current.focus();
                  if (typeof quantityRef.current.select === "function") {
                    quantityRef.current.select();
                  }
                }
              }, 400);
            }
          }}
        />
      </div>

      {/* Cantidad y Valor Unit. */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Cantidad</label>
          <input
            ref={quantityRef}
            type="text"
            inputMode="numeric"
            enterKeyHint="next"
            value={item.cantidad}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                priceRef?.current?.focus();
              }
            }}
            onChange={(e) => onUpdate(item.id, "cantidad", e.target.value.replace(/[^\d]/g, ""))}
            placeholder="0"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Valor Unit.</label>
          <input
            ref={priceRef}
            type="text"
            inputMode="numeric"
            enterKeyHint="done"
            value={item.precioUnitario}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            onChange={(e) => onUpdate(item.id, "precioUnitario", formatNumber(e.target.value))}
            placeholder="0"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-bold text-blue-600 dark:text-blue-400"
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
  const { data: articlesData, refetch: refetchArticles } = useBodegaArticles(1, 1000);
  const createMovement = useCreateBodegaMovement();
  const articles = articlesData?.data || [];
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
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, { selector: React.RefObject<HTMLButtonElement | null>; quantity: React.RefObject<HTMLInputElement | null>; price: React.RefObject<HTMLInputElement | null> }>>(
    {},
  );

  // Inicializar refs para los items existentes
  items.forEach((item) => {
    if (!cardRefs.current[item.id]) {
      cardRefs.current[item.id] = {
        selector: React.createRef<HTMLButtonElement | null>(),
        quantity: React.createRef<HTMLInputElement | null>(),
        price: React.createRef<HTMLInputElement | null>(),
      };
    }
  });

  // Scroll y foco automático al agregar item
  React.useEffect(() => {
    if (lastAddedId) {
      const element = document.getElementById(`card-${lastAddedId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        // Foco en el selector del nuevo artículo
        setTimeout(() => {
          cardRefs.current[lastAddedId]?.selector.current?.focus();
          setLastAddedId(null);
        }, 500);
      }
    }
  }, [lastAddedId]);

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

  const handleAddItem = () => {
    const newId = generateId();
    setItems((prev) => [...prev, { id: newId, articuloId: "", articuloNombre: "", articuloCodigo: "", cantidad: "", precioUnitario: "", unidad: "uds" }]);
    setLastAddedId(newId);
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

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const validItems = items.filter((i) => i.articuloId && parseNumber(i.cantidad) > 0);

      const movementItems = validItems.map((item) => ({
        articleId: item.articuloId,
        quantity: parseNumber(item.cantidad),
        unitCost: parseNumber(item.precioUnitario),
      }));

      const obsArray = [
        observaciones ? `Justificación: ${observaciones}` : null,
        docReferencia ? `Doc. Ref: ${docReferencia}` : null,
        numCotizacion ? `N° Cotización: ${numCotizacion}` : null,
        guiaDespacho ? `Guía Despacho: ${guiaDespacho}` : null,
        costCenterId ? `C. Costo: ${costCenters.find((c) => c.id === costCenterId)?.name}` : null,
      ].filter(Boolean);

      await createMovement.mutateAsync({
        movementType: "INGRESO",
        warehouseId,
        items: movementItems,
        reason: observaciones,
        externalReference: docReferencia || null,
        observations: obsArray.join(" | "),
        evidence: fotosEvidencia,
        autoVerify: autoVerifyEnabled && verificacionAuto,
      });

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
                "flex items-center justify-center w-10 h-10.5 rounded-lg border transition-colors",
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
              className="flex items-center justify-center w-10 h-10.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 transition-colors"
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
            <ArticuloCard
              key={item.id}
              item={item}
              onUpdate={handleUpdateItem}
              onRemove={handleRemoveItem}
              articles={articles}
              onRefetchArticles={refetchArticles}
              selectorRef={cardRefs.current[item.id]?.selector}
              quantityRef={cardRefs.current[item.id]?.quantity}
              priceRef={cardRefs.current[item.id]?.price}
            />
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

      {/* ── MODAL CONFIRMACIÓN ── */}
      <ConfirmacionMovimientoModal
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onConfirm={handleSubmit}
        isPending={submitting}
        tipo="INGRESO"
        itemCount={validItems.length}
        verificacionAuto={verificacionAuto}
        onVerificacionAutoChange={setVerificacionAuto}
      />
    </div>
  );
}
