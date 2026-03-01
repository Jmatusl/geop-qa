"use client";

/**
 * COMPONENTE - RETIRO BODEGA (VISTA DESKTOP - RÉPLICA EXACTA LEGACY)
 *
 * Implementación fiel a la versión original del sistema legacy.
 * Siguiendo estrictamente los estilos de borde (rounded-md) y disposición de elementos.
 */

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";
import {
  Plus,
  Check,
  Trash2,
  AlertCircle,
  Zap,
  ArrowLeft,
  FileText,
  Loader2,
  LayoutDashboard,
  Info,
  History,
  Calendar,
  Warehouse,
  Search,
  X,
  Image as ImageIcon,
  Package,
  ShieldAlert,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BodegaBreadcrumb } from "@/components/bodega/BodegaBreadcrumb";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BuscarArticulosPanel } from "./BuscarArticulosPanel";
import { useBodegaWarehouses } from "@/lib/hooks/bodega/use-bodega-warehouses";
import { useBodegaConfig } from "@/lib/hooks/bodega/use-bodega-config";
import { useBodegaAuth } from "@/lib/hooks/bodega/use-bodega-auth";

// Tipos para el estado local
interface ItemCarrito {
  articuloId: string;
  codigo: string;
  nombre: string;
  bodegaOrigenId: string;
  bodegaOrigenNombre: string;
  cantidad: number;
  stockDisponible: number;
  unidad: string;
}

export default function DesktopView() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: config } = useBodegaConfig();
  const { isBodegaAdmin, isSupervisor } = useBodegaAuth();

  // Catálogos
  const { data: bodegasData } = useBodegaWarehouses(1, 100);
  const bodegas = bodegasData?.data.filter((b) => b.isActive) || [];

  // Estado del formulario
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [justificacion, setJustificacion] = useState("");
  const [referencia, setReferencia] = useState("");
  const [fechaRequerida, setFechaRequerida] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [itemsAgregados, setItemsAgregados] = useState<ItemCarrito[]>([]);

  // UI States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [creando, setCreando] = useState(false);
  const [successData, setSuccessData] = useState<{ id: string; folio: string } | null>(null);

  // Evidencia
  const [fotosEvidencia, setFotosEvidencia] = useState<string[]>([]);
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [showFotoPreview, setShowFotoPreview] = useState(false);

  // Configuración de negocio
  const configGeneral = config?.["BODEGA_GENERAL_CONFIG"] || {};
  const evidenciaObligatoria = configGeneral.egresos_evidencia_obligatoria === true;

  // Lógica de Permisos para Aprobación
  const isAutoAprobar = configGeneral.auto_aprobar_solicitudes === true;
  const canApprove = isBodegaAdmin || isSupervisor; // Permiso "Aprobar Solicitudes"
  const isEntregaInmediata = configGeneral.entrega_inmediata === true;

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [aprobacionAuto, setAprobacionAuto] = useState(true);

  // Seleccionar la primera bodega por defecto
  useEffect(() => {
    if (bodegas.length > 0 && !warehouseId) {
      setWarehouseId(bodegas[0].id);
    }
  }, [bodegas, warehouseId]);

  const handleSeleccionarArticulo = (articulo: any, selectedBodegaId?: string | null) => {
    const targetBodegaId = selectedBodegaId || warehouseId;
    if (!targetBodegaId) {
      toast.warning("Debe seleccionar una bodega de origen");
      return;
    }

    const bodegaStock = articulo.bodegas.find((b: any) => b.bodegaId === targetBodegaId);
    if (!bodegaStock) {
      toast.error("El artículo no tiene registro de stock en la bodega seleccionada");
      return;
    }

    const existe = itemsAgregados.find((i) => i.articuloId === articulo.id && i.bodegaOrigenId === targetBodegaId);

    if (!existe) {
      const nuevoItem: ItemCarrito = {
        articuloId: articulo.id,
        codigo: articulo.codigo,
        nombre: articulo.nombre,
        bodegaOrigenId: targetBodegaId,
        bodegaOrigenNombre: bodegaStock.bodegaNombre,
        cantidad: 0,
        stockDisponible: bodegaStock.cantidadDisponible,
        unidad: articulo.unidad,
      };
      setItemsAgregados([...itemsAgregados, nuevoItem]);
      toast.success(`${articulo.nombre} agregado`);
    } else {
      toast.info("El artículo ya está en la lista");
    }
  };

  const handleRemoverItem = (articuloId: string, bId: string) => {
    setItemsAgregados(itemsAgregados.filter((i) => !(i.articuloId === articuloId && i.bodegaOrigenId === bId)));
  };

  const handleCantidadChange = (articuloId: string, bId: string, val: number) => {
    setItemsAgregados((prev) => prev.map((item) => (item.articuloId === articuloId && item.bodegaOrigenId === bId ? { ...item, cantidad: Math.min(Math.max(0, val), item.stockDisponible) } : item)));
  };

  const handlePreSubmit = () => {
    if (isAutoAprobar) {
      setAprobacionAuto(true);
      handleCrearSolicitud(true);
    } else if (canApprove) {
      setShowConfirmModal(true);
    } else {
      setAprobacionAuto(false);
      handleCrearSolicitud(false);
    }
  };

  const handleCrearSolicitud = async (isAutoApproved: boolean = false) => {
    setCreando(true);
    setConfirmOpen(false);
    setShowConfirmModal(false);

    try {
      if (isEntregaInmediata && (canApprove || isAutoAprobar)) {
        // FLUJO DE PARIDAD: Si la entrega inmediata está activa, creamos el Egreso/Salida real directamente.
        // Hacemos múltiples llamadas a /movimientos porque la versión V1 del backend no acepta bulk movements.
        const validItems = itemsAgregados.filter((i) => i.cantidad > 0);
        const externalFolio = `DIR-${Date.now()}`;

        for (const item of validItems) {
          const response = await fetch("/api/v1/bodega/movimientos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              movementType: "SALIDA",
              warehouseId: item.bodegaOrigenId,
              articleId: item.articuloId,
              quantity: item.cantidad,
              reason: `Entrega Inmediata (Ref: ${referencia || "S/R"})`,
              observations: justificacion + (isAutoApproved ? " | [auto_approved:true]" : ""),
            }),
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Error al contabilizar entrega inmediata");
          }
        }

        setSuccessData({ id: externalFolio, folio: `EGRESO DIRECTO (${validItems.length} items)` });
        toast.success("Retiro inmediato procesado exitosamente");
      } else {
        // FLUJO NORMAL: Se crea una Solicitud Interna
        const response = await fetch("/api/v1/bodega/solicitudes-internas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            warehouseId,
            title: `RETIRO: ${justificacion.substring(0, 30)}`,
            description: justificacion + (isAutoApproved ? " | [auto_approved:true]" : ""),
            externalReference: referencia,
            requiredDate: new Date(fechaRequerida).toISOString(),
            items: itemsAgregados
              .filter((i) => i.cantidad > 0)
              .map((item) => ({
                articleId: item.articuloId,
                quantity: item.cantidad,
              })),
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Error al crear");

        setSuccessData({ id: data.id, folio: data.folio });
        toast.success("Retiro procesado exitosamente");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCreando(false);
    }
  };

  const totalUnidades = itemsAgregados.reduce((sum, i) => sum + i.cantidad, 0);
  const hasEvidence = fotosEvidencia.length > 0;
  const puedeFinalizar = itemsAgregados.some((i) => i.cantidad > 0) && justificacion.trim().length >= 10 && (!evidenciaObligatoria || hasEvidence);

  if (successData) {
    return (
      <div className="max-w-[600px] mx-auto py-20 animate-in fade-in zoom-in-95 duration-500">
        <Card className="rounded-md border-2 border-emerald-500/20 shadow-xl overflow-hidden bg-emerald-50/10 dark:bg-emerald-950/5">
          <CardContent className="p-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6">
              <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold uppercase tracking-tight mb-2 italic">¡Retiro Procesado!</h2>
            <p className="text-muted-foreground text-sm mb-6 uppercase font-medium tracking-widest text-center leading-loose">
              El folio <span className="text-foreground font-extrabold">{successData.folio}</span> ha sido creado con éxito.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full pt-4 border-t">
              <Button
                variant="outline"
                className="h-12 rounded-md border border-input bg-background px-4 py-2 uppercase font-bold text-[11px] tracking-widest hover:bg-accent hover:text-accent-foreground transition-all active:scale-95"
                onClick={() => router.push("/bodega")}
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Ir al Inicio
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 h-12 rounded-md uppercase font-bold text-[11px] tracking-widest text-white transition-all active:scale-95"
                onClick={() => {
                  setItemsAgregados([]);
                  setJustificacion("");
                  setSuccessData(null);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Retiro
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 p-0 space-y-6 pb-12 bg-slate-50/30 dark:bg-transparent min-h-screen">
      <BodegaBreadcrumb
        items={[
          { label: "Bodega", href: "/bodega" },
          { label: "Retiros", href: "/bodega/retiro-bodega" },
        ]}
      />

      {/* CABECERA LEGACY - Bordes redondeados sutiles (rounded-md) */}
      <Card className="rounded-md border shadow-sm overflow-hidden bg-card">
        <div className="bg-orange-50/50 dark:bg-orange-950/10 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold uppercase tracking-tight text-gray-900 dark:text-gray-100 italic">Retiro Bodega</h2>
                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Configuración general del registro</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-orange-200 dark:bg-gray-900 dark:border-orange-900/50">
                <AlertCircle className="w-3 h-3 text-orange-500" />
                <span className="text-[9px] font-bold text-orange-700 dark:text-orange-400 uppercase tracking-widest">(*) Campos Obligatorios</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={evidenceInputRef}
                className="hidden"
                accept="*/*"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setFotosEvidencia([...fotosEvidencia, ...files.map((f) => f.name)]);
                  setShowFotoPreview(true);
                  toast.success("Archivos adjuntados");
                }}
              />

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (fotosEvidencia.length > 0) {
                      setShowFotoPreview(!showFotoPreview);
                    } else {
                      evidenceInputRef.current?.click();
                    }
                  }}
                  disabled={uploadingFoto}
                  className={cn(
                    "h-9 px-3 flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest border-gray-200 dark:border-gray-800",
                    fotosEvidencia.length > 0 && "bg-orange-50/50 border-orange-200 text-orange-600",
                  )}
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  {fotosEvidencia.length > 0 ? `Archivos (${fotosEvidencia.length})` : "Adjuntar archivo"}
                </Button>
              </div>

              <Button variant="outline" size="sm" onClick={() => router.back()} className="h-9 font-bold uppercase text-[10px] tracking-widest border-gray-200 dark:border-gray-800">
                <ArrowLeft className="h-3.5 w-3.5 mr-2" />
                Cerrar
              </Button>
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {/* Fecha Requerida */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-900 dark:text-slate-200 tracking-widest flex items-center gap-2">
                Fecha Requerida * <Calendar className="w-3 h-3" />
              </label>
              <Input
                type="date"
                value={fechaRequerida}
                onChange={(e) => setFechaRequerida(e.target.value)}
                className="h-10 text-xs font-bold uppercase border-gray-200 dark:border-gray-800 rounded-md"
              />
            </div>

            {/* Documento de Referencia */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-900 dark:text-slate-200 tracking-widest flex items-center gap-2">
                Referencia <FileText className="w-3 h-3" />
              </label>
              <Input
                placeholder="Ej: MANT-001..."
                value={referencia}
                onChange={(e) => setReferencia(e.target.value.toUpperCase())}
                className="h-10 text-xs font-bold uppercase border-gray-200 dark:border-gray-800 rounded-md"
                autoComplete="off"
              />
            </div>

            {/* Resumen Unidades */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-900 dark:text-slate-200 tracking-widest flex items-center gap-2">
                Total Unidades <Package className="w-3 h-3" />
              </label>
              <div className="h-10 px-3 bg-orange-50/20 dark:bg-orange-900/5 border border-orange-100 dark:border-orange-900/20 rounded-md flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-gray-400">{itemsAgregados.length} ARTÍCULOS</span>
                <Badge className="bg-orange-500 hover:bg-orange-600 text-[10px] font-bold text-white border-none shrink-0">{totalUnidades} UNIDADES</Badge>
              </div>
            </div>

            {/* Justificación */}
            <div className="md:col-span-full space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase text-slate-900 dark:text-slate-200 tracking-widest flex items-center gap-2">
                  Justificación / Observaciones * <Info className="w-3 h-3" />
                </label>
                <span className={cn("text-[9px] font-bold uppercase tracking-widest", justificacion.length > 280 ? "text-red-500" : "text-slate-400")}>{justificacion.length} / 300</span>
              </div>
              <Input
                placeholder="Ingrese descripción detallada..."
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                className="bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 h-10 text-xs font-medium rounded-md"
                autoComplete="off"
                maxLength={300}
              />
              {evidenciaObligatoria && !hasEvidence && (
                <div className="flex items-center gap-1.5 mt-1 animate-in fade-in slide-in-from-top-1 text-red-500">
                  <Info className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">La foto de evidencia es obligatoria para registrar el retiro.</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TABLA DE ARTÍCULOS - rounded-md */}
      <Card className="rounded-md border shadow-sm overflow-hidden bg-card">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-tight flex items-center gap-2 text-gray-700 dark:text-gray-300 italic">
              Artículos a Retirar
              <Badge variant="secondary" className="text-[10px] py-0 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-md italic">
                {itemsAgregados.length} Registros
              </Badge>
            </h3>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">Agregue piezas y cantidades</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(true)}
              className="h-8 border-dashed border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:border-orange-900/50 dark:text-orange-400 text-[10px] font-bold uppercase tracking-widest rounded-md"
            >
              <Search className="w-3 h-3 mr-2" /> Agregar Artículo
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/50 dark:bg-gray-900/50 text-[#283c7f]">
              <TableRow className="h-12">
                <TableHead className="w-10 text-center font-bold text-[10px] uppercase tracking-widest text-[#283c7f]">#</TableHead>
                <TableHead className="min-w-[300px] font-bold text-[10px] uppercase tracking-widest text-[#283c7f]">Artículo *</TableHead>
                <TableHead className="min-w-[150px] font-bold text-[10px] uppercase tracking-widest text-center text-[#283c7f]">Bodega Origen</TableHead>
                <TableHead className="w-64 font-bold text-[10px] uppercase tracking-widest text-center text-[#283c7f]">Cantidad *</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsAgregados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-4 opacity-30">
                      <Warehouse className="w-12 h-12 text-orange-600" />
                      <p className="text-[10px] font-bold uppercase tracking-widest italic">Sin artículos cargados</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                itemsAgregados.map((item, index) => (
                  <TableRow key={`${item.articuloId}-${item.bodegaOrigenId}`} className="hover:bg-slate-50 border-border h-20 transition-all">
                    <TableCell className="text-center text-[10px] font-bold text-gray-400 italic">{(index + 1).toString().padStart(2, "0")}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold uppercase text-gray-900 dark:text-gray-100 italic">{item.nombre}</span>
                        <div className="flex items-center gap-2">
                          <code className="text-[9px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20 px-1 w-fit rounded">{item.codigo}</code>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.unidad}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="h-8 border-slate-100 dark:border-slate-800 text-[9px] font-bold uppercase px-4 rounded-xl text-slate-500">
                        {item.bodegaOrigenNombre}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex items-center bg-slate-50 dark:bg-slate-900 rounded-md p-0.5 border border-slate-100 dark:border-slate-800 w-32 shadow-inner">
                          <button
                            onClick={() => handleCantidadChange(item.articuloId, item.bodegaOrigenId, item.cantidad - 1)}
                            className="h-8 w-8 flex items-center justify-center rounded bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 transition-all"
                          >
                            -
                          </button>
                          <input
                            type="text"
                            value={item.cantidad}
                            onChange={(e) => {
                              const numeric = parseInt(e.target.value.replace(/\D/g, "") || "0");
                              handleCantidadChange(item.articuloId, item.bodegaOrigenId, numeric);
                            }}
                            className="w-full bg-transparent text-center font-bold text-xs uppercase focus:ring-0 border-none"
                          />
                          <button
                            onClick={() => handleCantidadChange(item.articuloId, item.bodegaOrigenId, item.cantidad + 1)}
                            className="h-8 w-8 flex items-center justify-center rounded bg-white dark:bg-slate-800 text-slate-400 hover:text-emerald-500 transition-all"
                          >
                            +
                          </button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoverItem(item.articuloId, item.bodegaOrigenId)}
                          className="h-8 w-8 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      {item.stockDisponible < item.cantidad && (
                        <div className="text-center mt-1">
                          <span className="text-[8px] font-bold text-red-500 uppercase tracking-tighter animate-pulse">STOCK INSUFICIENTE ({item.stockDisponible})</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* FOOTER ACCIONES - rounded-md */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-1 pt-6 pb-12 border-t mt-8">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-tight text-gray-700 dark:text-gray-300">
            <div className="p-2 rounded bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30">
              <Info className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase text-slate-900 dark:text-white leading-none mb-1 italic">Control de Trazabilidad</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase">Proceso de egreso inmediato activado</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-tight text-gray-700 dark:text-gray-300">
            <div className="p-2 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30">
              <History className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase text-slate-900 dark:text-white leading-none mb-1 italic">Seguridad de Datos</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase">Auditoría activa por usuario</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setItemsAgregados([]);
              setJustificacion("");
            }}
            className="h-12 px-8 rounded-md font-bold uppercase text-[11px] tracking-widest border-gray-200 dark:border-gray-800 text-gray-400 transition-all active:scale-95 flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancelar Registro
          </Button>
          <Button
            type="button"
            disabled={!puedeFinalizar || creando}
            onClick={handlePreSubmit}
            className="bg-orange-600 hover:bg-slate-900 text-white h-12 px-10 rounded-md font-extrabold uppercase text-[11px] tracking-widest transition-all shadow-lg shadow-orange-600/10 active:scale-95 flex items-center gap-3"
          >
            {creando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4 stroke-3" />
                Finalizar Registro
              </>
            )}
          </Button>
        </div>
      </div>

      <BuscarArticulosPanel open={dialogOpen} onOpenChange={setDialogOpen} itemsAgregados={itemsAgregados} onAddItem={handleSeleccionarArticulo} mostrarBodegas={true} />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-md p-10 border shadow-2xl max-w-[500px]">
          <AlertDialogHeader>
            <div className="w-20 h-20 rounded-xl bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center mb-8 mx-auto border-4 border-orange-50 dark:border-orange-900/50">
              <Zap className="h-10 w-10 text-orange-600 dark:text-orange-400 stroke-3 italic animate-pulse" />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-center text-slate-900 dark:text-white mb-4 italic leading-none">¿Procesar Registro?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-slate-500 font-medium leading-relaxed px-4 uppercase text-[10px] tracking-widest">
              Se descontarán <span className="font-black text-slate-900 dark:text-white px-2 py-1 bg-slate-100 rounded-md">{totalUnidades} unidades</span> del inventario actual de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-12 flex-1 rounded-md font-bold uppercase tracking-widest text-[10px] border border-gray-200 text-gray-400">Revisar Datos</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleCrearSolicitud(false)}
              className="h-12 flex-1 rounded-md bg-orange-600 hover:bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-600/20 transition-all active:scale-95"
            >
              Confirmar Envío
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de confirmación para aprobación automática (Legacy Parity) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-2xl p-6 shadow-2xl scale-in-center overflow-hidden border border-orange-200 dark:border-orange-900/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                <ShieldAlert className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-gray-100 italic uppercase tracking-tighter">¿CONFIRMAR RETIRO?</h3>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Está por procesar un retiro de <strong>{itemsAgregados.length}</strong> artículo(s). La configuración actual permite la aprobación y entrega inmediata.
            </p>

            {/* Switch de Verificación */}
            <div
              className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer mb-6 ${
                aprobacionAuto
                  ? "bg-orange-50/50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800"
                  : "bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 hover:border-slate-300"
              }`}
              onClick={() => setAprobacionAuto(!aprobacionAuto)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-slate-900 dark:text-gray-100 uppercase tracking-tight">AUTO-APROBAR / ENTREGAR</span>
                  {aprobacionAuto && <Badge className="bg-orange-600 hover:bg-orange-700 text-[9px] h-4 px-1 leading-none text-white border-none italic">OPCIONAL</Badge>}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {aprobacionAuto ? "La solicitud será aprobada y el stock será descontado inmediatamente." : "La solicitud quedará pendiente de aprobación manual por un Supervisor."}
                </p>
              </div>
              <div
                className={`w-6 h-6 shrink-0 rounded-lg flex items-center justify-center border-2 transition-all ${
                  aprobacionAuto ? "bg-orange-600 border-orange-600 shadow-sm shadow-orange-500/20" : "border-slate-300 dark:border-slate-600"
                }`}
              >
                {aprobacionAuto && <Check className="w-4 h-4 text-white" />}
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
                onClick={() => handleCrearSolicitud(aprobacionAuto)}
                disabled={creando}
                className="flex-1 h-12 rounded-xl bg-orange-600 hover:bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-900/20 active:scale-95 transition-transform"
              >
                {creando ? (
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
