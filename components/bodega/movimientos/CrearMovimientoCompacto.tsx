"use client";

/**
 * COMPONENTE - CREAR MOVIMIENTO COMPACTO (RÉPLICA EXACTA LEGACY)
 *
 * Versión adaptada para coincidir con la estética y funcionalidad
 * del sistema original, manteniendo la integración con el backend GEOP.
 */

import { useState, useRef, useEffect, createRef } from "react";
import {
  X,
  Plus,
  Check,
  Trash2,
  Truck,
  ArrowRightLeft,
  FileText,
  Loader2,
  Warehouse,
  Package,
  ArrowRight,
  Info,
  History,
  AlertCircle,
  Search,
  ArrowLeft,
  Image as ImageIcon,
  LayoutGrid,
  LogOut,
  ShieldAlert,
  ChevronsUpDown,
  ArrowUpDown,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { useBodegaWarehouses } from "@/lib/hooks/bodega/use-bodega-warehouses";
import { useBodegaArticles } from "@/lib/hooks/bodega/use-bodega-articles";
import type { BodegaArticle } from "@/lib/hooks/bodega/use-bodega-articles";
import { useCreateBodegaMovement } from "@/lib/hooks/bodega/use-bodega-movements";
import { useBodegaSimpleMasters } from "@/lib/hooks/bodega/use-bodega-simple-masters";
import { useBodegaConfig } from "@/lib/hooks/bodega/use-bodega-config";
import { useBodegaAuth } from "@/lib/hooks/bodega/use-bodega-auth";
import { CrearArticuloDialog } from "@/components/bodega/maestros/CrearArticuloDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmacionMovimientoModal } from "@/components/bodega/movimientos/ConfirmacionMovimientoModal";

/**
 * SELECTOR DE ARTÍCULO (COMBOBOX FILTRABLE)
 */
function ArticuloSelector({
  value,
  onSelect,
  articles,
  onCreated,
  placeholder = "Buscar repuesto...",
  triggerRef,
}: {
  value: string;
  onSelect: (val: string) => void;
  articles: BodegaArticle[];
  onCreated: (nuevo?: BodegaArticle) => Promise<void>;
  placeholder?: string;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const [openMobile, setOpenMobile] = useState(false);
  const [openDesktop, setOpenDesktop] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyWithStock, setShowOnlyWithStock] = useState(true);
  const selectedArt = articles.find((a) => a.id === value);
  const internalRef = useRef<HTMLButtonElement>(null);
  const activeRef = triggerRef || internalRef;

  // Filtrado reactivo para móvil y desktop
  const filteredArticles = articles.filter((a) => {
    // Filtro de stock
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
            <mark key={i} className="bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100 font-bold p-0 rounded-sm">
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
      {/* VISTA MÓVIL */}
      <div className="lg:hidden w-full">
        <Dialog open={openMobile} onOpenChange={setOpenMobile}>
          <DialogTrigger asChild>
            <Button
              ref={activeRef as any}
              variant="outline"
              role="combobox"
              className="w-full h-10 justify-between font-bold uppercase text-[10px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 shadow-sm active:scale-95"
            >
              <span className="truncate mr-2">
                {value && selectedArt ? (isRedundant(selectedArt.code, selectedArt.name) ? selectedArt.name : `[${selectedArt.code}] ${selectedArt.name}`) : placeholder}
              </span>
              <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </DialogTrigger>
          <DialogContent
            className="p-0 sm:max-w-md h-auto max-h-[90dvh] sm:max-h-[85vh] flex flex-col gap-0 overflow-hidden border-none shadow-2xl rounded-2xl sm:rounded-2xl top-[4dvh] sm:top-1/2 translate-y-0 sm:-translate-y-1/2"
            onCloseAutoFocus={(e) => {
              if (document.activeElement?.tagName === "INPUT") {
                e.preventDefault();
              }
            }}
          >
            <DialogHeader className="p-4 border-b bg-white dark:bg-slate-950 sticky top-0 z-10 space-y-3">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-[10px] font-black uppercase tracking-widest text-[#283c7f]">Selector de Repuestos</DialogTitle>
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-full border border-slate-100 transition-all active:scale-95">
                  <input
                    type="checkbox"
                    checked={showOnlyWithStock}
                    onChange={(e) => setShowOnlyWithStock(e.target.checked)}
                    className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-[9px] font-black uppercase text-slate-500">Stock {">"} 0</span>
                </label>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Código o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 text-xs font-bold uppercase bg-slate-50 border-none focus-visible:ring-0"
                  autoFocus
                />
              </div>
            </DialogHeader>
            <div className="overflow-y-auto px-3 py-2 space-y-1.5 min-h-0 bg-slate-50/50 dark:bg-slate-900/10">
              {filteredArticles.length === 0 ? (
                <div className="py-20 text-center space-y-2">
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Sin resultados</p>
                  {showOnlyWithStock && (
                    <Button variant="link" size="sm" onClick={() => setShowOnlyWithStock(false)} className="text-[9px] font-black text-blue-600 p-0 h-auto uppercase">
                      Mostrar todo el catálogo
                    </Button>
                  )}
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
                        setOpenMobile(false);
                        setSearchTerm("");
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1 rounded-lg text-xs font-bold flex flex-col gap-0 transition-all border",
                        value === a.id
                          ? "bg-[#283c7f] text-white shadow-lg border-[#283c7f]"
                          : "bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-800",
                      )}
                    >
                      <div className="flex items-center justify-between w-full h-3">
                        <span className={cn("text-[8px] font-black tracking-tight px-1 py-0 rounded-md", value === a.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>
                          {highlightText(a.code, searchTerm)}
                        </span>
                        {a.stock !== undefined && (
                          <span className={cn("text-[8px] font-extrabold uppercase", (a.stock ?? 0) > 0 ? (value === a.id ? "text-white/80" : "text-emerald-500") : "text-slate-400")}>
                            Stock: {a.stock}
                          </span>
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
      </div>

      {/* VISTA DESKTOP */}
      <div className="hidden lg:flex items-center gap-2 w-full">
        <Popover open={openDesktop} onOpenChange={setOpenDesktop}>
          <PopoverTrigger asChild>
            <Button
              ref={activeRef as any}
              variant="outline"
              role="combobox"
              aria-expanded={openDesktop}
              className="w-full h-8 justify-between font-bold uppercase text-[10px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 hover:bg-slate-50 transition-colors"
            >
              <span className="truncate mr-2">
                {value && selectedArt ? (isRedundant(selectedArt.code, selectedArt.name) ? selectedArt.name : `[${selectedArt.code}] ${selectedArt.name}`) : placeholder}
              </span>
              <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="p-0 shadow-2xl border-slate-200 dark:border-slate-800 w-125 flex flex-col overflow-hidden"
            align="start"
            sideOffset={8}
            onCloseAutoFocus={(e) => {
              if (document.activeElement?.tagName === "INPUT") {
                e.preventDefault();
              }
            }}
          >
            <div className="p-2 border-b bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <div className="relative flex-1 max-w-75">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Filtrar por código o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-[10px] font-bold uppercase bg-white dark:bg-slate-950 border-slate-200 focus-visible:ring-1 focus-visible:ring-[#283c7f]"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={showOnlyWithStock}
                  onChange={(e) => setShowOnlyWithStock(e.target.checked)}
                  className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[9px] font-black uppercase text-slate-500">Solo con stock</span>
              </label>
            </div>

            <div className="max-h-87.5 overflow-y-auto p-1">
              {filteredArticles.length === 0 ? (
                <div className="py-10 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">No se encontraron resultados</div>
              ) : (
                <div className="grid grid-cols-1 gap-px">
                  {filteredArticles.map((a) => {
                    const redundant = isRedundant(a.code, a.name);
                    const isSelected = value === a.id;
                    return (
                      <button
                        key={a.id}
                        onClick={() => {
                          onSelect(a.id);
                          setOpenDesktop(false);
                          setSearchTerm("");
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded flex items-center gap-3 transition-colors",
                          isSelected ? "bg-blue-600 text-white" : "hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300",
                        )}
                      >
                        <Check className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <div className="flex items-center gap-2 truncate">
                            {!redundant && (
                              <span className={cn("text-[9px] font-black px-1 rounded", isSelected ? "bg-blue-500 text-white" : "text-[#283c7f] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40")}>
                                [{highlightText(a.code, searchTerm)}]
                              </span>
                            )}
                            <span className="text-[11px] font-bold uppercase truncate">{highlightText(a.name, searchTerm)}</span>
                          </div>
                          <span className={cn("text-[10px] font-black tabular-nums shrink-0 ml-4", (a.stock ?? 0) > 0 ? (isSelected ? "text-blue-100" : "text-emerald-600") : "text-slate-400")}>
                            {a.stock ?? 0} UN
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <CrearArticuloDialog
        trigger={
          <Button
            type="button"
            variant="outline"
            tabIndex={-1}
            className="h-8 w-8 lg:h-8 lg:w-8 shrink-0 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-600 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-500 transition-all active:scale-95 p-0"
            title="Crear Nuevo Artículo"
          >
            <Plus className="w-4 h-4" />
          </Button>
        }
        onArticuloCreado={onCreated}
      />
    </div>
  );
}

interface ItemMovimiento {
  id: string; // Temporal para la UI
  articuloId: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  unitPrice?: string; // Cambiado a string para manejar formateo manual
}

interface CrearMovimientoCompactoProps {
  onCancel?: () => void;
  tipoInicial?: string;
  titulo?: string;
  ocultarTipoOperacion?: boolean;
  ocultarCentroCosto?: boolean;
  sinDestinoPorDefecto?: boolean;
  skipTransitoFilter?: boolean; // New prop from legacy
}

export function CrearMovimientoCompacto({
  onCancel,
  tipoInicial = "INGRESO",
  titulo = "MOVIMIENTO",
  ocultarTipoOperacion = false,
  sinDestinoPorDefecto = false,
  ocultarCentroCosto = false,
  skipTransitoFilter = false,
}: CrearMovimientoCompactoProps) {
  // Estado del formulario
  const [tipo, setTipo] = useState(tipoInicial);
  const [warehouseId, setWarehouseId] = useState("");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [documentoReferencia, setDocumentoReferencia] = useState("");
  const [numeroCotizacion, setNumeroCotizacion] = useState("");
  const [guiaDespacho, setGuiaDespacho] = useState("");
  const [showAdvancedRef, setShowAdvancedRef] = useState(false);
  const [justificacion, setJustificacion] = useState("");
  const [items, setItems] = useState<ItemMovimiento[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, { selector: React.RefObject<HTMLButtonElement | null>; quantity: React.RefObject<HTMLInputElement | null>; price: React.RefObject<HTMLInputElement | null> }>>(
    {},
  );

  // Registrar refs para cada item
  items.forEach((item) => {
    if (!rowRefs.current[item.id]) {
      rowRefs.current[item.id] = {
        selector: createRef<HTMLButtonElement | null>(),
        quantity: createRef<HTMLInputElement | null>(),
        price: createRef<HTMLInputElement | null>(),
      };
    }
  });

  // Efecto para scroll y foco al agregar fila
  useEffect(() => {
    if (lastAddedId) {
      const element = document.getElementById(`row-${lastAddedId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          rowRefs.current[lastAddedId]?.selector.current?.focus();
          setLastAddedId(null);
        }, 500);
      }
    }
  }, [lastAddedId]);

  // Evidencia
  const [fotosEvidencia, setFotosEvidencia] = useState<string[]>([]);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [showFotoPreview, setShowFotoPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Catálogos y Auth
  const { data: warehousesData } = useBodegaWarehouses(1, 100, "");
  const { data: articlesData, refetch: refetchArticles } = useBodegaArticles(1, 1000, "");
  const { data: costCentersData } = useBodegaSimpleMasters("centros-costo", "");
  const { data: configData } = useBodegaConfig();
  const createMovement = useCreateBodegaMovement();
  const { isBodegaAdmin, canApprove } = useBodegaAuth();

  const configGeneral = (configData?.BODEGA_GENERAL_CONFIG ?? {}) as Record<string, any>;
  const ocultarTransito = !!configGeneral.ocultar_transito;

  const warehouses = (warehousesData?.data.filter((w) => w.isActive) ?? []).filter((w) => {
    if (skipTransitoFilter) return true;
    return !ocultarTransito || w.code !== "TRANSITO";
  });
  const articles = articlesData?.data.filter((a) => a.isActive) ?? [];
  const costCenters = costCentersData?.data ?? [];
  const evidenciaObligatoria = (tipo.startsWith("INGRESO") ? configGeneral.ingresos_evidencia_obligatoria : configGeneral.egresos_evidencia_obligatoria) === true;

  // Lógica de Permisos y Reglas de Módulo
  const isAutoEjecutar = !!configData?.BODEGA_GENERAL_CONFIG?.auto_ejecutar_oc;
  const isAutoAprobar = !!configData?.BODEGA_GENERAL_CONFIG?.auto_aprobar_solicitudes;

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [verificacionAuto, setVerificacionAuto] = useState(true);

  // Articulo seleccionado en el mini-buscador
  const [selectedArtId, setSelectedArtId] = useState("");
  const [selectedCant, setSelectedCant] = useState("1");
  const [selectedPrice, setSelectedPrice] = useState("");

  const esTransferencia = tipo.includes("TRANSFERENCIA") || tipo === "MOVIMIENTO";
  const esEgreso = tipo.includes("SALIDA") || tipo.includes("RETIRO");
  const esIngreso = tipo.includes("INGRESO");

  // Al cargar, si es transferencia e ingreso (como en la versión legacy), configurar destino
  useEffect(() => {
    if (warehousesData?.data && warehousesData.data.length > 0 && !sinDestinoPorDefecto) {
      const allWarehouses = warehousesData.data;
      const transitoWarehouse = allWarehouses.find((w) => w.code === "TRANSITO");

      if (!warehouseId) {
        // Priorizar TRANSITO, sino cargar la primera disponible (que ya viene filtrada en 'warehouses')
        if (transitoWarehouse) {
          setWarehouseId(transitoWarehouse.id);
        } else if (warehouses.length > 0) {
          setWarehouseId(warehouses[0].id);
        }
      }

      if (esTransferencia && !destinationWarehouseId) {
        // Para transferencias, si warehouseId es TRANSITO, el destino debería ser algo distinto
        if (transitoWarehouse && warehouseId === transitoWarehouse.id) {
          const firstNonTransito = warehouses.find((w) => w.code !== "TRANSITO");
          if (firstNonTransito) setDestinationWarehouseId(firstNonTransito.id);
        } else if (warehouses.length > 1) {
          setDestinationWarehouseId(warehouses[1].id);
        }
      }
    }
  }, [warehousesData, warehouses, warehouseId, esTransferencia, destinationWarehouseId, sinDestinoPorDefecto]);

  const handleAddEmptyRow = () => {
    const newId = crypto.randomUUID();
    setItems([
      ...items,
      {
        id: newId,
        articuloId: "",
        codigo: "",
        nombre: "",
        cantidad: 1,
        unitPrice: "", // Vacío por defecto
        unidad: "UN",
      },
    ]);
    setLastAddedId(newId);
  };

  const AddRowButton = () => (
    <Button onClick={handleAddEmptyRow} className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
      <Plus className="w-3.5 h-3.5" />
      AGREGAR FILA
    </Button>
  );

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
      setShowFotoPreview(true);
      toast.success("Foto cargada correctamente", { id: toastId });
    } catch (err: any) {
      toast.error("Error al cargar foto", { description: err.message, id: toastId });
    } finally {
      setUploadingFoto(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const handlePreSubmit = () => {
    if (!warehouseId) return toast.error("Seleccione bodega de origen");
    if (esTransferencia && !destinationWarehouseId) return toast.error("Seleccione bodega de destino");
    const validItems = items.filter((i) => i.articuloId && i.articuloId.trim() !== "");
    if (validItems.length === 0) return toast.error("Agregue y seleccione al menos un artículo");
    if (justificacion.trim().length < 10) return toast.error("La justificación debe tener al menos 10 caracteres");

    if (evidenciaObligatoria && fotosEvidencia.length === 0) {
      return toast.error("Evidencia obligatoria", { description: "Debe adjuntar al menos una foto o archivo de evidencia para continuar." });
    }

    if (esIngreso) {
      if (isAutoEjecutar) {
        setVerificacionAuto(true);
        handleSubmit(true);
      } else if (canApprove) {
        setShowConfirmModal(true);
      } else {
        setVerificacionAuto(false);
        handleSubmit(false);
      }
    } else if (esEgreso) {
      if (isAutoAprobar) {
        setVerificacionAuto(true);
        handleSubmit(true);
      } else if (canApprove) {
        setShowConfirmModal(true);
      } else {
        setVerificacionAuto(false);
        handleSubmit(false);
      }
    } else {
      setConfirmOpen(true);
    }
  };

  const handleSubmit = async (isAutoVerified: boolean = false) => {
    const validItems = items.filter((i) => i.articuloId && i.articuloId.trim() !== "");

    try {
      if (esTransferencia) {
        // Para transferencias, enviamos ambos lados en una sola acción de "TRANSFERENCIA"
        // NOTA: Si el backend requiere movimientos separados, el servicio de bodega debería manejarlo
        // pero por ahora enviamos el esquema de items múltiples al endpoint de creación.

        // 1. Egreso Origen
        await createMovement.mutateAsync({
          type: "SALIDA",
          warehouseId,
          items: validItems.map((i) => ({
            articleId: i.articuloId,
            quantity: i.cantidad,
            unitCost: i.unitPrice ? parseInt(i.unitPrice.replace(/\D/g, "")) : 0,
          })),
          reason: "EGRESO_TRANSFERENCIA",
          observations: `${justificacion} | DESTINO: ${destinationWarehouseId}`,
          externalReference: documentoReferencia || null,
          autoVerify: isAutoVerified,
        });

        // 2. Ingreso Destino
        await createMovement.mutateAsync({
          type: "INGRESO",
          warehouseId: destinationWarehouseId,
          items: validItems.map((i) => ({
            articleId: i.articuloId,
            quantity: i.cantidad,
            unitCost: i.unitPrice ? parseInt(i.unitPrice.replace(/\D/g, "")) : 0,
          })),
          reason: "INGRESO_TRANSFERENCIA",
          observations: `${justificacion} | ORIGEN: ${warehouseId}`,
          externalReference: documentoReferencia || null,
          autoVerify: isAutoVerified,
        });
      } else {
        // Movimiento Simple (INGRESO o SALIDA) con múltiples artículos
        const obsArray = [
          `Justificación: ${justificacion}`,
          // Removemos Doc. Ref, Cotización y Guía de aquí ya que irán en sus propios campos
          costCenterId ? `C. Costo: ${costCenters.find((c) => c.id === costCenterId)?.name}` : null,
          `Verificación Automática: ${isAutoVerified ? "SI" : "NO"}`,
        ].filter(Boolean);

        await createMovement.mutateAsync({
          type: tipo as any,
          warehouseId,
          items: validItems.map((i) => ({
            articleId: i.articuloId,
            quantity: i.cantidad,
            unitCost: i.unitPrice ? parseInt(i.unitPrice.replace(/\D/g, "")) : 0,
          })),
          reason: justificacion,
          externalReference: documentoReferencia || null,
          quotationNumber: numeroCotizacion || null,
          deliveryGuide: guiaDespacho || null,
          observations: obsArray.join(" | "),
          evidence: fotosEvidencia,
          autoVerify: isAutoVerified,
        });
      }

      toast.success("Registro completado exitosamente");
      setConfirmOpen(false);
      setShowConfirmModal(false);
      // Redirigir al dashboard para ver los cambios actualizados
      window.location.href = "/bodega";
    } catch (error: any) {
      toast.error("Error al procesar", { description: error.message });
    }
  };

  const totalUnidades = items.reduce((sum, i) => sum + i.cantidad, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Cabecera Compacta Legacy Style */}
      <Card className="rounded-md border shadow-sm overflow-hidden bg-white dark:bg-slate-950">
        <div className="bg-slate-50/50 dark:bg-slate-900/20 px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center border border-blue-100 dark:border-blue-800">
                <LayoutGrid className="w-5 h-5 text-[#284893] dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold uppercase tracking-tight text-slate-900 dark:text-blue-100">{titulo}</h2>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">CONFIGURACIÓN GENERAL DEL REGISTRO</p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30">
              <AlertCircle className="w-3 h-3 text-amber-600" />
              <span className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">(*) CAMPOS OBLIGATORIOS</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            <Button
              variant="outline"
              size="sm"
              disabled={uploadingFoto}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "h-10 px-4 font-bold uppercase text-[11px] tracking-widest border-slate-200 dark:border-slate-800 rounded-md bg-white hover:bg-slate-50 transition-colors flex items-center gap-2",
                fotosEvidencia.length > 0 && "bg-emerald-50 border-emerald-200 text-emerald-600",
              )}
            >
              {uploadingFoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-blue-600" />}
              {fotosEvidencia.length > 0 ? `${fotosEvidencia.length} ARCHIVO(S)` : "ADJUNTAR ARCHIVO"}
            </Button>
            {fotosEvidencia.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFotoPreview(!showFotoPreview)}
                className="h-10 px-3 rounded-md border-emerald-200 bg-emerald-50 text-emerald-600 font-bold text-[11px] uppercase"
              >
                Ver
              </Button>
            )}
          </div>
        </div>

        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
            {/* Bodega Origen / Destino (Dynamic) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest flex items-center gap-1">
                {esIngreso ? "BODEGA DESTINO" : "BODEGA ORIGEN"} * {esIngreso ? <ArrowUpDown className="h-3 w-3" /> : <Warehouse className="h-3 w-3" />}
              </label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger className="w-full h-10 text-xs font-bold uppercase border-slate-200 dark:border-slate-800 rounded-md bg-slate-50/50">
                  <SelectValue placeholder="Seleccione bodega" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses
                    .filter((b) => {
                      if (skipTransitoFilter) return true;
                      return !(configGeneral.ocultar_transito && b.code === "TRANSITO");
                    })
                    .map((w) => (
                      <SelectItem key={w.id} value={w.id} className="text-xs font-bold uppercase">
                        {w.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bodega Destino (Solo si es transferencia) */}
            {esTransferencia && (
              <div className="space-y-2 animate-in slide-in-from-left-2">
                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest flex items-center gap-1">
                  BODEGA DESTINO * <ArrowRightLeft className="w-3 h-3" />
                </label>
                <Select value={destinationWarehouseId} onValueChange={setDestinationWarehouseId}>
                  <SelectTrigger className="w-full h-10 text-xs font-bold uppercase border-slate-200 dark:border-slate-800 rounded-md bg-slate-50/50">
                    <SelectValue placeholder="Seleccione destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id} className="text-xs font-bold uppercase">
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Centro de Costo (Opcional según prop) */}
            {!ocultarCentroCosto && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest flex items-center gap-1">
                  CENTRO DE COSTO * <SlidersHorizontal className="h-3 w-3" />
                </label>
                <Select value={costCenterId} onValueChange={setCostCenterId}>
                  <SelectTrigger className="w-full h-10 text-xs font-bold uppercase border-slate-200 dark:border-slate-800 rounded-md bg-slate-50/50">
                    <SelectValue placeholder="Seleccione C. Costo" />
                  </SelectTrigger>
                  <SelectContent>
                    {costCenters.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id} className="text-xs font-bold uppercase">
                        {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Documento de Referencia */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest flex items-center gap-1">
                DOC. REFERENCIA <FileText className="h-3 w-3" />
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ej: OC-2024..."
                  value={documentoReferencia}
                  onChange={(e) => setDocumentoReferencia(e.target.value.toUpperCase())}
                  className="w-full h-10 text-xs font-bold uppercase border-slate-200 dark:border-slate-800 bg-slate-50/50 rounded-md"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className={cn("h-10 w-10 shrink-0 rounded-md", showAdvancedRef && "bg-blue-600 border-blue-600 text-white")}
                  onClick={() => setShowAdvancedRef(!showAdvancedRef)}
                >
                  <Plus className={cn("w-4 h-4 transition-transform", showAdvancedRef && "rotate-45")} />
                </Button>
              </div>
            </div>

            {/* Campos Avanzados de Referencia */}
            {showAdvancedRef && (
              <div className="md:col-span-full grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-md border border-blue-100 bg-blue-50/30 dark:bg-blue-900/10 dark:border-blue-900/30 animate-in slide-in-from-top-2">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">N° Cotización</label>
                  <Input
                    placeholder="COT-..."
                    value={numeroCotizacion}
                    onChange={(e) => setNumeroCotizacion(e.target.value.toUpperCase())}
                    className="w-full h-9 text-xs font-bold uppercase border-blue-200 dark:border-blue-800 bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Guía Despacho</label>
                  <Input
                    placeholder="GD-..."
                    value={guiaDespacho}
                    onChange={(e) => setGuiaDespacho(e.target.value.toUpperCase())}
                    className="w-full h-9 text-xs font-bold uppercase border-blue-200 dark:border-blue-800 bg-white"
                  />
                </div>
              </div>
            )}

            {/* Justificación */}
            <div className="md:col-span-full space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase text-[#283c7f] dark:text-blue-400 tracking-widest pl-1">JUSTIFICACIÓN / OBSERVACIONES *</label>
                <div className="flex items-center gap-4">
                  <span className="text-[9px] font-bold text-slate-300 uppercase italic">{justificacion.length} / 300</span>
                  <Badge className="bg-blue-600 hover:bg-blue-700 text-[9px] font-black text-white border-none h-5 px-3 rounded-md italic">{totalUnidades} UNIDADES</Badge>
                </div>
              </div>
              <Input
                placeholder="Ingrese motivo del movimiento (mín. 10 caracteres)..."
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                autoComplete="off"
                className="w-full h-10 text-sm border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 rounded-md font-medium"
                maxLength={300}
              />
              {evidenciaObligatoria && fotosEvidencia.length === 0 && (
                <div className="flex items-center gap-1.5 mt-1 animate-in fade-in slide-in-from-top-1 text-red-500">
                  <Info className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">La foto de evidencia es obligatoria para registrar el {esIngreso ? "ingreso" : "movimiento"}.</span>
                </div>
              )}
            </div>
          </div>
          {/* Previsualización de Fotos */}
          {showFotoPreview && fotosEvidencia.length > 0 && (
            <div className="mt-6 p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-900/40 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Archivos Adjuntos ({fotosEvidencia.length})</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFotoPreview(false)}
                  className="h-6 text-[10px] uppercase font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                >
                  Cerrar Panel
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {fotosEvidencia.map((url, i) => (
                  <div key={i} className="group relative aspect-square rounded-lg border border-white dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
                    <img src={url} alt={`Evidencia ${i + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <button
                      onClick={() => setFotosEvidencia((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 h-6 w-6 rounded-md bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/40 backdrop-blur-sm">
                      <p className="text-[8px] text-white font-bold truncate text-center uppercase tracking-tighter">Imagen {i + 1}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selector de Artículos (Carrito) Style Legacy */}
      <Card className="rounded-md border shadow-sm overflow-hidden bg-white dark:bg-slate-950 min-h-75">
        <div className="px-6 py-4 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50/20 dark:bg-slate-800/80">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-tight flex items-center gap-2 italic dark:text-white">
              Artículos Incluidos
              <Badge variant="outline" className="text-[9px] py-0 bg-transparent text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700/50 rounded-full font-bold px-2 italic">
                {items.length} REGISTROS
              </Badge>
            </h3>
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-tighter italic">AGREGUE REPUESTOS Y CANTIDADES</p>
          </div>

          {/* Botones Derecha */}
          <div className="flex items-center gap-4">
            <AddRowButton />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-950/50">
              <TableRow className="h-12 border-b dark:border-slate-800">
                <TableHead className="w-12 text-center text-[10px] font-black uppercase text-[#283c7f] dark:text-blue-500 tracking-widest">#</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-[#283c7f] dark:text-blue-500 tracking-widest">ARTÍCULO *</TableHead>
                <TableHead className="w-32 text-center text-[10px] font-black uppercase text-[#283c7f] dark:text-blue-500 tracking-widest">CANTIDAD *</TableHead>
                {esIngreso && <TableHead className="w-32 text-center text-[10px] font-black uppercase text-[#283c7f] dark:text-blue-500 tracking-widest">PRECIO UNIT.</TableHead>}
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 opacity-20 grayscale">
                      <Package className="w-12 h-12" />
                      <p className="text-[10px] font-black uppercase tracking-widest italic">Sin registros cargados</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <TableRow
                    key={item.id}
                    id={`row-${item.id}`}
                    className="h-16 border-b dark:border-slate-800 transition-all hover:bg-slate-50/50 dark:hover:bg-slate-900/40 scroll-mt-20 focus-within:bg-blue-50/50 dark:focus-within:bg-blue-900/10 focus-within:ring-1 focus-within:ring-blue-500/30"
                  >
                    <TableCell className="text-center text-[10px] font-bold text-slate-300 dark:text-slate-600 italic">{(index + 1).toString().padStart(2, "0")}</TableCell>
                    <TableCell>
                      <ArticuloSelector
                        value={item.articuloId || ""}
                        articles={articles}
                        triggerRef={rowRefs.current[item.id]?.selector}
                        onSelect={(val) => {
                          const art = articles.find((a) => a.id === val);
                          const unName = art ? (typeof (art as any)?.unit === "string" ? (art as any)?.unit : (art as any)?.unit?.code || "UN") : "UN";
                          const newItems = [...items];
                          newItems[index] = { ...newItems[index], articuloId: val, codigo: art?.code || "", nombre: art?.name || "", unidad: unName };
                          setItems(newItems);
                          // Saltar a cantidad con un delay mayor para permitir cerrar el Dialog/Popover
                          setTimeout(() => {
                            const qInput = rowRefs.current[item.id]?.quantity.current;
                            if (qInput) {
                              qInput.focus();
                              if (typeof qInput.select === "function") qInput.select();
                            }
                          }, 400);
                        }}
                        onCreated={async (nuevo?: BodegaArticle) => {
                          if (!nuevo) return;
                          await refetchArticles();
                          const unName = nuevo.unit || "UN";
                          const newItems = [...items];
                          newItems[index] = {
                            ...newItems[index],
                            articuloId: nuevo.id,
                            codigo: nuevo.code || "",
                            nombre: nuevo.name || "",
                            unidad: unName,
                          };
                          setItems(newItems);
                          setTimeout(() => {
                            const qInput = rowRefs.current[item.id]?.quantity.current;
                            if (qInput) {
                              qInput.focus();
                              if (typeof qInput.select === "function") qInput.select();
                            }
                          }, 400);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800 w-full mx-auto p-0.5">
                        <button
                          tabIndex={-1}
                          className="h-6 w-6 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                          onClick={() => {
                            const newItems = [...items];
                            newItems[index].cantidad = Math.max(1, newItems[index].cantidad - 1);
                            setItems(newItems);
                          }}
                        >
                          <ArrowLeft className="h-3 w-3" />
                        </button>
                        <Input
                          ref={rowRefs.current[item.id]?.quantity as any}
                          type="number"
                          enterKeyHint="next"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (esIngreso) {
                                rowRefs.current[item.id]?.price.current?.focus();
                              } else {
                                e.currentTarget.blur();
                              }
                            }
                          }}
                          className="h-7 w-12 text-center text-[11px] font-bold border-none bg-transparent focus-visible:ring-0 p-0"
                          value={item.cantidad}
                          onBlur={(e) => {
                            const value = Math.max(1, parseInt(e.target.value) || 1);
                            const newItems = [...items];
                            newItems[index].cantidad = value;
                            setItems(newItems);
                          }}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[index].cantidad = parseInt(e.target.value) || 0;
                            setItems(newItems);
                          }}
                        />
                        <button
                          tabIndex={-1}
                          className="h-6 w-6 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors"
                          onClick={() => {
                            const newItems = [...items];
                            newItems[index].cantidad = (newItems[index].cantidad || 0) + 1;
                            setItems(newItems);
                          }}
                        >
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </TableCell>
                    {esIngreso && (
                      <TableCell>
                        <Input
                          ref={rowRefs.current[item.id]?.price as any}
                          type="text"
                          enterKeyHint="done"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            }
                          }}
                          className="h-9 text-center text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-md"
                          placeholder="$ 0"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            const formatted = val ? new Intl.NumberFormat("es-CL").format(parseInt(val)) : "";
                            const newItems = [...items];
                            newItems[index].unitPrice = formatted;
                            setItems(newItems);
                          }}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.id)}
                        tabIndex={-1}
                        className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}

              {items.length > 0 && (
                <TableRow className="border-b dark:border-slate-800">
                  <TableCell colSpan={esIngreso ? 5 : 4} className="px-4 py-4">
                    <div className="flex justify-end">
                      <AddRowButton />
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Footer Acciones Legacy style */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t pb-12">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-tight text-gray-700 dark:text-gray-300">
            <div className="p-2 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30">
              <Info className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase text-slate-900 dark:text-white leading-none mb-1 italic">Control de Flujo</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase">TRAZABILIDAD INTEGRADA POR MOVIMIENTO</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-tight text-gray-700 dark:text-gray-300">
            <div className="p-2 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30">
              <History className="w-4 h-4 text-blue-800" />
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase text-slate-900 dark:text-white leading-none mb-1 italic">AUDITORÍA ACTIVA</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">REGISTRO SEGURO POR USUARIO</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={onCancel}
            className="h-12 flex-1 md:flex-none px-10 rounded-md font-black uppercase text-[11px] tracking-widest border-slate-200 text-slate-500 transition-all active:scale-95 flex items-center gap-3 bg-white"
          >
            <X className="w-4 h-4" />
            CANCELAR REGISTRO
          </Button>
          <Button
            disabled={createMovement.isPending || items.length === 0 || justificacion.trim().length < 10}
            onClick={handlePreSubmit}
            className="h-12 flex-1 md:flex-none px-12 rounded-md bg-[#283c7f] hover:bg-slate-900 text-white font-black uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-blue-900/10 transition-all active:scale-95 flex items-center gap-3 border-none"
          >
            {createMovement.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4 stroke-3" />
                FINALIZAR REGISTRO
              </>
            )}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-md p-10 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-125 bg-white dark:bg-slate-950">
          <AlertDialogHeader>
            <div className="w-20 h-20 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-8 mx-auto border-4 border-blue-100 dark:border-blue-900/30">
              <ArrowRightLeft className="h-10 w-10 text-blue-600 dark:text-blue-400 stroke-3 italic animate-pulse" />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-center text-slate-900 dark:text-white mb-4 italic leading-none">
              {tipo.includes("INGRESO") ? "¿Confirmar Ingreso?" : tipo.includes("TRANSFERENCIA") ? "¿Confirmar Transferencia?" : "¿Confirmar Egreso?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-slate-500 dark:text-slate-400 font-medium leading-relaxed px-4 uppercase text-[10px] tracking-widest">
              Está por procesar la transferencia de <span className="font-black text-slate-900 dark:text-blue-100 px-2 py-1 bg-slate-100 dark:bg-blue-900/40 rounded-md">{totalUnidades} unidades</span>
              . Esto afectará el stock de ambas bodegas inmediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 flex-1 rounded-md font-bold uppercase tracking-widest text-[10px] border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              REVISAR DATOS
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleSubmit(true)}
              className="h-12 flex-1 rounded-md bg-[#284893] hover:bg-slate-900 dark:hover:bg-blue-800 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-900/20 border-none transition-all active:scale-95"
            >
              Confirmar Envío
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConfirmacionMovimientoModal
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        onConfirm={handleSubmit}
        isPending={createMovement.isPending}
        tipo={tipo}
        itemCount={items.filter((i) => i.articuloId).length}
        verificacionAuto={verificacionAuto}
        onVerificacionAutoChange={setVerificacionAuto}
      />
    </div>
  );
}
