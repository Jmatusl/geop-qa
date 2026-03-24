"use client";

/**
 * COMPONENTE - MOVIMIENTO ARTÍCULO (TRANSFERENCIA) - DESKTOP
 *
 * Versión adaptada para coincidir con la estética y funcionalidad
 * del sistema original, manteniendo la integración con el backend GEOP.
 */

import { useState, useRef, useEffect, useCallback } from "react";
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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { useBodegaWarehouses } from "@/lib/hooks/bodega/use-bodega-warehouses";
import { useBodegaArticles } from "@/lib/hooks/bodega/use-bodega-articles";
import type { BodegaArticle } from "@/lib/hooks/bodega/use-bodega-articles";
import { useCreateBodegaMovement } from "@/lib/hooks/bodega/use-bodega-movements";
import { useBodegaSimpleMasters } from "@/lib/hooks/bodega/use-bodega-simple-masters";
import { useBodegaConfig } from "@/lib/hooks/bodega/use-bodega-config";
import { useBodegaAuth } from "@/lib/hooks/bodega/use-bodega-auth";
import { ConfirmacionTransferenciaModal } from "./ConfirmacionTransferenciaModal";
import { CrearArticuloDialog } from "@/components/bodega/maestros/CrearArticuloDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ArrowUpDown, SlidersHorizontal, Settings2 } from "lucide-react";

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
    if (!bodegaId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/bodega/warehouses/${bodegaId}/stock`);
      const data = await res.json();
      const result = data.items || data.data || data;
      setItems(Array.isArray(result) ? result : []);
    } catch {
      // ignore
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
      className={`rounded-xl border p-4 transition-colors cursor-pointer ${item.selected ? "border-blue-400 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-950/30" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"}`}
      onClick={() => onToggle(item.itemId)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate uppercase mt-1">{item.articuloNombre}</div>
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase">
            {item.articuloSku} • Mov: {item.movimientoNumero}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium tracking-widest uppercase">
            Ingreso: {fecha} • Disp: <strong className="text-black dark:text-white font-black text-xs">{item.cantidad}</strong>
          </div>
        </div>
        <div
          className={`w-6 h-6 rounded-md flex items-center justify-center border-2 shrink-0 ml-2 transition-colors ${item.selected ? "bg-blue-600 border-blue-600" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"}`}
        >
          {item.selected && <Check className="w-4 h-4 text-white font-black" style={{ strokeWidth: 3 }} />}
        </div>
      </div>

      {item.selected && (
        <div className="mt-3 pt-3 border-t border-blue-100 dark:border-blue-900/50" onClick={(e) => e.stopPropagation()}>
          <label className="text-[10px] font-black text-blue-800 dark:text-blue-300 mb-1 block uppercase tracking-widest">Cantidad a transferir (máx: {item.cantidad})</label>
          <input
            type="text"
            inputMode="numeric"
            value={item.cantidadTransferir}
            onChange={(e) => {
              const val = e.target.value.replace(/[^\d]/g, "");
              if (parseInt(val) > item.cantidad) {
                onUpdateCantidad(item.itemId, String(item.cantidad));
              } else {
                onUpdateCantidad(item.itemId, val);
              }
            }}
            onBlur={() => onUpdateCantidad(item.itemId, formatNumber(item.cantidadTransferir))}
            className="w-full h-8 px-3 py-1 rounded-md border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-sm font-black focus:border-blue-500 focus:ring-0 transition-colors text-blue-900 dark:text-blue-100"
            placeholder={String(item.cantidad)}
          />
        </div>
      )}
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

interface TransferenciaArticuloDesktopProps {
  onCancel?: () => void;
  tipoInicial?: string;
  titulo?: string;
  ocultarTipoOperacion?: boolean;
  ocultarCentroCosto?: boolean;
  sinDestinoPorDefecto?: boolean;
  skipTransitoFilter?: boolean; // New prop from legacy
}

export function TransferenciaArticuloDesktop({
  onCancel,

  skipTransitoFilter = true,
}: TransferenciaArticuloDesktopProps) {
  // Estado del formulario
  const tipo = "INGRESO_TRANSFERENCIA";
  const titulo = "MOVIMIENTO ARTÍCULO";
  const ocultarCentroCosto = true;
  const esTransferencia = true;
  const esEgreso = false;
  const esIngreso = false;

  const [warehouseId, setWarehouseId] = useState("");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [responsable, setResponsable] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [documentoReferencia, setDocumentoReferencia] = useState("");
  const [numeroCotizacion, setNumeroCotizacion] = useState("");
  const [guiaDespacho, setGuiaDespacho] = useState("");
  const [showAdvancedRef, setShowAdvancedRef] = useState(false);
  const [justificacion, setJustificacion] = useState("");
  const [items, setItems] = useState<ItemMovimiento[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const { items: rawItems, loading: loadingStock } = useStockPorMovimiento(warehouseId || null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);

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

  const selectedItems = stockItems.filter((i) => i.selected);
  const totalUnidades = selectedItems.reduce((sum, i) => sum + parseNumber(i.cantidadTransferir), 0);

  const [confirmOpen, setConfirmOpen] = useState(false);

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
  const { isBodegaAdmin, canApprove, user } = useBodegaAuth();

  useEffect(() => {
    if (user?.firstName && !responsable) {
      setResponsable(`${user.firstName} ${user.lastName || ""}`.trim());
    }
  }, [user?.firstName, user?.lastName]);

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

  // Al cargar, si es transferencia e ingreso (como en la versión legacy), configurar destino
  useEffect(() => {
    if (warehousesData?.data && warehousesData.data.length > 0 && true) {
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
  }, [warehousesData, warehouses, warehouseId, esTransferencia, destinationWarehouseId]);

  const handleAddEmptyRow = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        articuloId: "",
        codigo: "",
        nombre: "",
        cantidad: 1,
        unitPrice: "", // Vacío por defecto
        unidad: "UN",
      },
    ]);
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
    if (!responsable.trim()) return toast.error("Debe ingresar el responsable del movimiento");
    const validItems = selectedItems.map((i) => ({ articuloId: i.articuloId, cantidad: parseNumber(i.cantidadTransferir) }));
    if (validItems.length === 0) return toast.error("Seleccione al menos un artículo para transferir");
    if (justificacion.trim().length < 10) return toast.error("La justificación debe tener al menos 10 caracteres");

    if (evidenciaObligatoria && fotosEvidencia.length === 0) {
      return toast.error("Evidencia obligatoria", { description: "Debe adjuntar al menos una foto o archivo de evidencia para continuar." });
    }

    setConfirmOpen(true);
  };

  const handleSubmit = async (isAutoVerified: boolean = false) => {
    const validItems = selectedItems.map((i) => ({ 
      articuloId: i.articuloId, 
      cantidad: parseNumber(i.cantidadTransferir), 
      sourceId: i.itemId,
      unitCost: i.unitCost 
    }));

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
            unitCost: i.unitCost, 
            sourceMovementItemId: i.sourceId 
          })),
          reason: "EGRESO_TRANSFERENCIA",
          observations: `${justificacion} | DESTINO: ${destinationWarehouseId}`,
          responsable,
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
            unitCost: i.unitCost, 
            sourceMovementItemId: i.sourceId 
          })),
          reason: "INGRESO_TRANSFERENCIA",
          observations: `${justificacion} | ORIGEN: ${warehouseId}`,
          responsable,
          externalReference: documentoReferencia || null,
          autoVerify: isAutoVerified,
        });

        // 3. Llamada de notificación
        try {
          await fetch("/api/v1/bodega/movimientos/notificar-transferencia", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              itemsCount: selectedItems.length,
              documentReference: "TR-" + new Date().getTime(),
              originId: warehouseId,
              destinationId: destinationWarehouseId,
              observations: justificacion,
              responsable: responsable,
              items: selectedItems,
            }),
          });
        } catch (err) {
          console.error("Error enviando notificacion desktop:", err);
        }
      } else {
        // Movimiento Simple (INGRESO o SALIDA) con múltiples artículos
        const obsArray = [
          `Justificación: ${justificacion}`,
          // No concatenamos campos estructurados aquí ya que iran en sus propios campos
          costCenterId ? `C. Costo: ${costCenters.find((c) => c.id === costCenterId)?.name}` : null,
          `Verificación Automática: ${isAutoVerified ? "SI" : "NO"}`,
        ].filter(Boolean);

        await createMovement.mutateAsync({
          type: tipo as any,
          warehouseId,
          items: validItems.map((i) => ({ articleId: i.articuloId, quantity: i.cantidad, sourceMovementItemId: i.sourceId })),
          reason: justificacion,
          externalReference: documentoReferencia || null,
          quotationNumber: numeroCotizacion || null,
          deliveryGuide: guiaDespacho || null,
          observations: obsArray.join(" | "),
          responsable,
          evidence: fotosEvidencia,
          autoVerify: isAutoVerified,
        });

        // Notificación de Movimiento Simple
        try {
          await fetch("/api/v1/bodega/movimientos/notificar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: tipo,
              documentReference: documentoReferencia || "S/R",
              warehouseId,
              observations: justificacion,
              responsable,
              items: validItems.map((i) => ({ articleId: i.articuloId, quantity: i.cantidad })),
              costCenterId,
            }),
          });
        } catch (err) {
          console.error("Error enviando notificacion simple:", err);
        }
      }

      toast.success("Registro completado exitosamente");
      setConfirmOpen(false);
      setShowConfirmModal(false);
      setIsSuccess(true);
    } catch (error: any) {
      toast.error("Error al procesar", { description: error.message });
    }
  };

  // totalUnidades handled

  if (isSuccess) {
    return (
      <Card className="rounded-md border shadow-sm overflow-hidden bg-white dark:bg-slate-950 flex flex-col items-center justify-center py-20 min-h-[50vh]">
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6">
          <Check className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-tight">Registro Completado</h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium mb-8 text-[11px] uppercase tracking-wider text-center max-w-sm">
          El movimiento ha sido procesado exitosamente. Todos los cambios se han guardado con trazabilidad.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm px-4">
          <button
            onClick={() => (window.location.href = "/bodega/movimiento-articulo")}
            className="flex-1 py-3.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 font-bold uppercase tracking-widest text-[10px] hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors bg-white dark:bg-transparent"
          >
            NUEVO MOVIMIENTO
          </button>
          <button
            onClick={() => (window.location.href = "/bodega")}
            className="flex-1 py-3.5 rounded-xl bg-blue-600 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-colors"
          >
            VOLVER A BODEGA
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Información requerida Legacy style */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
            {/* Bodega Origen / Destino (Dynamic) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest flex items-center gap-1">
                "BODEGA ORIGEN *" <Truck className="h-3 w-3" />
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
                    {warehouses
                      .filter((w) => !(ocultarTransito && w.code === "TRANSITO"))
                      .map((w) => (
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

            {/* Responsable */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">RESPONSABLE *</label>
              <Input
                placeholder="Nombre del responsable"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                className="w-full h-10 text-xs font-bold uppercase border-slate-200 dark:border-slate-800 bg-slate-50/50 rounded-md"
              />
            </div>

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

      {/* Selector de Artículos (Tarjetas) */}
      <Card className="rounded-md border shadow-sm overflow-hidden bg-white dark:bg-slate-950 min-h-75">
        <div className="px-6 py-4 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50/20 dark:bg-slate-800/80">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-tight flex items-center gap-2 italic dark:text-slate-100">
              Seleccionar Artículos
              <Badge variant="outline" className="text-[9px] py-0 bg-transparent text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700/50 rounded-full font-bold px-2 italic">
                {selectedItems.length} SELECCIONADO(S)
              </Badge>
            </h3>
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter italic">SELECCIONE LOS ARTÍCULOS QUE DESEA TRANSFERIR</p>
          </div>
        </div>
        <CardContent className="p-8">
          {warehouseId ? (
            <>
              <div className="relative mb-6">
                <input
                  type="text"
                  placeholder="Buscar artículo o movimiento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-bold uppercase transition-colors focus:border-blue-500"
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              </div>

              {loadingStock ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-2" />
                  <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">Consultando Stock...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">{searchTerm ? "SIN RESULTADOS" : "NO HAY STOCK CON TRAZABILIDAD EN ESTA BODEGA"}</p>
                </div>
              ) : (
              <div className="max-h-100 overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map((item) => (
                    <StockMovimientoCard key={item.itemId} item={item} onToggle={handleToggle} onUpdateCantidad={handleUpdateCantidad} />
                  ))}
                </div>
              </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <ArrowRightLeft className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">Seleccione una BODEGA DE ORIGEN arriba para ver el stock</p>
              <p className="text-[10px] uppercase font-black tracking-widest text-[#283c7f] dark:text-blue-400 mt-2">LISTADO DE TRANSFERENCIA</p>
            </div>
          )}
        </CardContent>
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
            disabled={createMovement.isPending || selectedItems.length === 0 || justificacion.trim().length < 10}
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

      <ConfirmacionTransferenciaModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleSubmit}
        isSubmitting={createMovement.isPending}
        itemCount={selectedItems.length}
        bodegaOrigenNombre={warehouses.find(w => w.id === warehouseId)?.name}
        bodegaDestinoNombre={warehouses.find(w => w.id === destinationWarehouseId)?.name}
        title={
          esTransferencia 
            ? "¿Confirmar transferencia?" 
            : esIngreso 
              ? "¿Confirmar Ingreso?" 
              : "¿Confirmar Registro?"
        }
        // Solo mostramos el switch si no es transferencia y el usuario puede aprobar
        verificacionAuto={(!esTransferencia && canApprove) ? verificacionAuto : undefined}
        onVerificacionAutoChange={(!esTransferencia && canApprove) ? setVerificacionAuto : undefined}
      />
    </div>
  );
}
