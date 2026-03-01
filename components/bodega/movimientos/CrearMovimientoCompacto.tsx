"use client";

/**
 * COMPONENTE - CREAR MOVIMIENTO COMPACTO (RÉPLICA EXACTA LEGACY)
 *
 * Versión adaptada para coincidir con la estética y funcionalidad
 * del sistema original, manteniendo la integración con el backend GEOP.
 */

import { useState, useRef, useEffect } from "react";
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
import { CrearArticuloDialog } from "@/components/bodega/maestros/CrearArticuloDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ArrowUpDown, SlidersHorizontal, Settings2 } from "lucide-react";

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
  const { isBodegaAdmin, isSupervisor } = useBodegaAuth();

  const warehouses = warehousesData?.data.filter((w) => w.isActive) ?? [];
  const articles = articlesData?.data.filter((a) => a.isActive) ?? [];
  const costCenters = costCentersData?.data ?? [];
  const configGeneral = (configData?.BODEGA_GENERAL_CONFIG ?? {}) as Record<string, any>;
  const evidenciaObligatoria = (tipo.startsWith("INGRESO") ? configGeneral.ingresos_evidencia_obligatoria : configGeneral.egresos_evidencia_obligatoria) === true;

  // Lógica de Permisos
  const isAutoEjecutar = configGeneral.auto_ejecutar_oc === true;
  const isAutoAprobar = configGeneral.auto_aprobar_solicitudes === true;
  const canApprove = isBodegaAdmin || isSupervisor; // Permiso "Aprobar Solicitudes" equivalente a Supervisor/Admin

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [verificacionAuto, setVerificacionAuto] = useState(true);

  // Articulo seleccionado en el mini-buscador
  const [selectedArtId, setSelectedArtId] = useState("");
  const [selectedCant, setSelectedCant] = useState("1");
  const [selectedPrice, setSelectedPrice] = useState("0");

  const esTransferencia = tipo.includes("TRANSFERENCIA") || tipo === "MOVIMIENTO";
  const esEgreso = tipo.includes("SALIDA") || tipo.includes("RETIRO");
  const esIngreso = tipo.includes("INGRESO");

  // Al cargar, si es transferencia e ingreso (como en la versión legacy), configurar destino
  useEffect(() => {
    if (warehouses.length > 0 && !sinDestinoPorDefecto) {
      if (!warehouseId) setWarehouseId(warehouses[0].id);
      if (esTransferencia && !destinationWarehouseId && warehouses.length > 1) {
        setDestinationWarehouseId(warehouses[1].id);
      }
    }
  }, [warehouses, warehouseId, esTransferencia, destinationWarehouseId, sinDestinoPorDefecto]);

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

      const res = await fetch("/api/uploads/r2-simple", {
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
      // Para cada item, enviamos un movimiento (limitación actual del backend v1)
      for (const item of validItems) {
        if (esTransferencia) {
          // 1. Egreso Origen
          await createMovement.mutateAsync({
            movementType: "SALIDA",
            warehouseId,
            articleId: item.articuloId,
            quantity: item.cantidad,
            reason: "EGRESO_TRANSFERENCIA",
            observations: `${justificacion} | DESTINO: ${destinationWarehouseId}`,
          });

          // 2. Ingreso Destino
          await createMovement.mutateAsync({
            movementType: "INGRESO",
            warehouseId: destinationWarehouseId,
            articleId: item.articuloId,
            quantity: item.cantidad,
            reason: "INGRESO_TRANSFERENCIA",
            observations: `${justificacion} | ORIGEN: ${warehouseId}`,
          });
        } else {
          // Movimiento Simple (INGRESO o SALIDA)
          const obsArray = [
            `Justificación: ${justificacion}`,
            documentoReferencia ? `Doc. Ref: ${documentoReferencia}` : null,
            numeroCotizacion ? `N° Cotización: ${numeroCotizacion}` : null,
            guiaDespacho ? `Guía Despacho: ${guiaDespacho}` : null,
            costCenterId ? `C. Costo: ${costCenters.find((c) => c.id === costCenterId)?.name}` : null,
            item.unitPrice ? `P. Unitario: ${item.unitPrice.replace(/\D/g, "")}` : null,
            `Verificación Automática: ${isAutoVerified ? "SI" : "NO"}`,
          ].filter(Boolean);

          await createMovement.mutateAsync({
            movementType: tipo as any,
            warehouseId,
            articleId: item.articuloId,
            quantity: item.cantidad,
            reason: justificacion,
            observations: obsArray.join(" | "),
          });
        }
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
                <SelectTrigger className="h-10 text-xs font-bold uppercase border-slate-200 dark:border-slate-800 rounded-md bg-slate-50/50">
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
                  <SelectTrigger className="h-10 text-xs font-bold uppercase border-slate-200 dark:border-slate-800 rounded-md bg-slate-50/50">
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
                  <SelectTrigger className="h-10 text-xs font-bold uppercase border-slate-200 dark:border-slate-800 rounded-md bg-slate-50/50">
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
                  className="h-10 text-xs font-bold uppercase border-slate-200 dark:border-slate-800 bg-slate-50/50 rounded-md"
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
                    className="h-9 text-xs font-bold uppercase border-blue-200 dark:border-blue-800 bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Guía Despacho</label>
                  <Input
                    placeholder="GD-..."
                    value={guiaDespacho}
                    onChange={(e) => setGuiaDespacho(e.target.value.toUpperCase())}
                    className="h-9 text-xs font-bold uppercase border-blue-200 dark:border-blue-800 bg-white"
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
                className="h-10 text-sm border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 rounded-md font-medium"
                maxLength={300}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selector de Artículos (Carrito) Style Legacy */}
      <Card className="rounded-md border shadow-sm overflow-hidden bg-white dark:bg-slate-950 min-h-[300px]">
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
            <Button onClick={handleAddEmptyRow} className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" />
              AGREGAR FILA
            </Button>
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
                  <TableRow key={item.id} className="h-16 border-b dark:border-slate-800 transition-all hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                    <TableCell className="text-center text-[10px] font-bold text-slate-300 dark:text-slate-600 italic">{(index + 1).toString().padStart(2, "0")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 w-full min-w-[300px]">
                        <Select
                          value={item.articuloId || ""}
                          onValueChange={(val) => {
                            const art = articles.find((a) => a.id === val);
                            const unName = art ? (typeof (art as any)?.unit === "string" ? (art as any)?.unit : (art as any)?.unit?.code || "UN") : "UN";
                            const newItems = [...items];
                            newItems[index] = { ...newItems[index], articuloId: val, codigo: art?.code || "", nombre: art?.name || "", unidad: unName };
                            setItems(newItems);
                          }}
                        >
                          <SelectTrigger className="w-full h-10 font-bold uppercase text-[11px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                            <SelectValue placeholder="Buscar repuesto..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-80 w-[400px]">
                            {articles.map((a) => (
                              <SelectItem key={a.id} value={a.id} className="text-[11px] font-bold uppercase">
                                [{a.code}] {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {/* Botón para crear un nuevo artículo y auto-seleccionarlo */}
                        <CrearArticuloDialog
                          trigger={
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 shrink-0 border-dashed hover:border-[#283c7f] hover:text-[#283c7f] transition-colors"
                              title="Crear Nuevo Artículo"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          }
                          onArticuloCreado={async (nuevo?: BodegaArticle) => {
                            if (!nuevo) return;
                            // Refrescar la lista de artículos
                            await refetchArticles();
                            // Auto-seleccionar el nuevo artículo en esta fila
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
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800 w-24 mx-auto p-0.5">
                        <button
                          className="h-6 w-6 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                          onClick={() => {
                            const newItems = [...items];
                            newItems[index].cantidad = Math.max(1, newItems[index].cantidad - 1);
                            setItems(newItems);
                          }}
                        >
                          -
                        </button>
                        <input
                          type="text"
                          value={item.cantidad}
                          onChange={(e) => {
                            const val = parseInt(e.target.value.replace(/\D/g, "") || "0");
                            const newItems = [...items];
                            newItems[index].cantidad = val;
                            setItems(newItems);
                          }}
                          className="w-full bg-transparent text-center font-black text-[11px] border-none focus:ring-0 p-0"
                        />
                        <button
                          className="h-6 w-6 flex items-center justify-center text-slate-400 hover:text-emerald-500 transition-colors"
                          onClick={() => {
                            const newItems = [...items];
                            newItems[index].cantidad += 1;
                            setItems(newItems);
                          }}
                        >
                          +
                        </button>
                      </div>
                    </TableCell>
                    {esIngreso && (
                      <TableCell>
                        <div className="flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800 w-28 mx-auto">
                          <input
                            type="text"
                            value={item.unitPrice || ""}
                            onChange={(e) => {
                              // Solo números
                              const pureValue = e.target.value.replace(/\D/g, "");
                              // Formato miles (Chile)
                              const formatted = pureValue ? new Intl.NumberFormat("es-CL").format(parseInt(pureValue)) : "";

                              const newItems = [...items];
                              newItems[index].unitPrice = formatted;
                              setItems(newItems);
                            }}
                            placeholder="0"
                            className="w-full bg-transparent text-center font-black text-[11px] border-none focus:ring-0 h-8 p-0 dark:text-blue-400"
                          />
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.id)}
                        className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
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
        <AlertDialogContent className="rounded-md p-10 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-[500px] bg-white dark:bg-slate-950">
          <AlertDialogHeader>
            <div className="w-20 h-20 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-8 mx-auto border-4 border-blue-100 dark:border-blue-900/30">
              <ArrowRightLeft className="h-10 w-10 text-blue-600 dark:text-blue-400 stroke-3 italic animate-pulse" />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-center text-slate-900 dark:text-white mb-4 italic leading-none">¿Confirmar Movimiento?</AlertDialogTitle>
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
              onClick={() => handleSubmit(false)}
              className="h-12 flex-1 rounded-md bg-[#284893] hover:bg-slate-900 dark:hover:bg-blue-800 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-900/20 border-none transition-all active:scale-95"
            >
              Confirmar Envío
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de confirmación para verificación automática (Legacy Parity) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-2xl p-6 shadow-2xl scale-in-center overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <ShieldAlert className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-gray-100 italic uppercase tracking-tighter">¿CONFIRMAR REGISTRO?</h3>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Está por procesar un registro de <strong>{items.filter((i) => i.articuloId).length}</strong> artículo(s). La configuración actual permite la validación o habilitación automática.
            </p>

            {/* Switch de Verificación */}
            <div
              className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer mb-6 ${
                verificacionAuto
                  ? "bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800"
                  : "bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 hover:border-slate-300"
              }`}
              onClick={() => setVerificacionAuto(!verificacionAuto)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-slate-900 dark:text-gray-100 uppercase tracking-tight">AUTO-ACTIVAR / VERIFICAR</span>
                  {verificacionAuto && <Badge className="bg-blue-600 hover:bg-blue-700 text-[9px] h-4 px-1 leading-none text-white border-none italic">OPCIONAL</Badge>}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {verificacionAuto ? "Se saltará el flujo de verificación y la operación aplicará inmediatamente." : "Se mantendrá como pendiente hasta que se verifique manualmente."}
                </p>
              </div>
              <div
                className={`w-6 h-6 shrink-0 rounded-lg flex items-center justify-center border-2 transition-all ${
                  verificacionAuto ? "bg-blue-600 border-blue-600 shadow-sm shadow-blue-500/20" : "border-slate-300 dark:border-slate-600"
                }`}
              >
                {verificacionAuto && <Check className="w-4 h-4 text-white" />}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 h-12 rounded-xl border-slate-200 dark:border-slate-800 text-sm font-black uppercase text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => handleSubmit(verificacionAuto)}
                disabled={createMovement.isPending}
                className="flex-1 h-12 rounded-xl bg-[#284893] hover:bg-[#1e3a7a] text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-900/20 active:scale-95 transition-transform"
              >
                {createMovement.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    PROCESAR
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
