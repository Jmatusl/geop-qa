"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Package, Building, Mail, Calendar, DollarSign, Clock, FileText, Download, Eye, CheckCircle, XCircle, AlertTriangle, Info, Lock, Pencil, Check, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useCotizacion, useUpdateCotizacionNeto } from "@/hooks/useCotizaciones";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { PaperPlaneIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";

interface Props {
  cotizacionId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHOW_AREA_PRIORITY_DATE = process.env.NEXT_PUBLIC_SHOW_AREA_PRIORITY_DATE === "true";

const statusConfig = {
  PENDIENTE: { label: "Pendiente", variant: "secondary" as const, icon: Clock },
  EN_COTIZACION: { label: "En Cotización", variant: "default" as const, icon: Mail },
  RECEIVED: { label: "Recibida", variant: "outline" as const, icon: Package },
  APPROVED: { label: "Aprobada", variant: "default" as const, icon: CheckCircle, className: "bg-green-600" },
  REJECTED: { label: "Rechazada", variant: "destructive" as const, icon: XCircle },
  NO_COTIZO: { label: "No Cotizó", variant: "destructive" as const, icon: XCircle },
} as const;

export default function CotizacionDetailDialog({ cotizacionId, open, onOpenChange }: Props) {
  const { data: cotizacionResp, isLoading } = useCotizacion(cotizacionId);
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [adjuntoToDelete, setAdjuntoToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingFilename, setUploadingFilename] = useState<string | null>(null);

  // Estado para edición de neto
  const [isEditingNeto, setIsEditingNeto] = useState(false);
  const [newNeto, setNewNeto] = useState<number>(0);
  const { mutate: updateNeto, isPending: isUpdatingNeto } = useUpdateCotizacionNeto();

  const cotizacion = cotizacionResp?.success ? cotizacionResp.data : null;

  // Inicializar newNeto cuando carga la cotización
  useEffect(() => {
    if (cotizacion?.neto) {
      setNewNeto(Number(cotizacion.neto));
    }
  }, [cotizacion?.neto]);

  // Helper para formatear fechas de forma segura (evita Invalid time value)
  const formatDateSafe = (value: any, fmt = "PPP") => {
    if (!value && value !== 0) return "-";
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return "-";
      return format(d, fmt, { locale: es });
    } catch (e) {
      return "-";
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Cargando Cotización</DialogTitle>
            <DialogDescription className="sr-only">Cargando cotización...</DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Cargando cotización...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!cotizacion) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Error: Cotización no encontrada</DialogTitle>
            <DialogDescription className="sr-only">No se encontró la cotización solicitada.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center py-8">
            <div className="text-red-600">Error: Cotización no encontrada</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const statusInfo = statusConfig[cotizacion.status as keyof typeof statusConfig];
  const StatusIcon = statusInfo.icon;

  // Calcular totales
  const totalItems = cotizacion.items?.length || 0;
  const itemsWithPrice = cotizacion.items?.filter((item: any) => item.totalPrice > 0) || [];
  // Usar el total de la base de datos en lugar de sumar los items
  const totalCotizado = cotizacion.totalEstimado ? Number(cotizacion.totalEstimado) : 0;

  const handleUpdateNeto = () => {
    if (newNeto <= 0) {
      toast.error("El valor neto debe ser mayor a 0");
      return;
    }

    updateNeto(
      { id: cotizacionId, neto: newNeto },
      {
        onSuccess: () => {
          setIsEditingNeto(false);
        },
      },
    );
  };

  // Ordenar items de forma determinística antes de renderizar.
  // Preferimos el orden por solicitudItem.id (si existe) para respetar el orden original de la solicitud.
  const itemsSorted = (cotizacion.items || []).slice().sort((a: any, b: any) => {
    const aKey = a?.solicitudItem?.id ?? a?.solicitudItemId ?? a?.id ?? 0;
    const bKey = b?.solicitudItem?.id ?? b?.solicitudItemId ?? b?.id ?? 0;
    return Number(aKey) - Number(bKey);
  });

  // Abrir o descargar adjunto: usar adjunto.url cuando exista, si no pedir URL firmada al backend
  const fetchSignedUrl = async (fileKey: string) => {
    try {
      const res = await fetch("/api/cotizaciones/adjunto-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey }),
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || "Error obteniendo URL");
      return json.data.url as string;
    } catch (e) {
      console.error("Error fetching signed url:", e);
      return null;
    }
  };

  const viewAttachment = async (adjunto: any) => {
    try {
      const url = adjunto.url || (adjunto.fileKey ? await fetchSignedUrl(adjunto.fileKey) : null);
      if (!url) return;
      window.open(url, "_blank");
    } catch (e) {
      console.error("Error opening attachment:", e);
    }
  };

  const downloadAttachment = async (adjunto: any) => {
    try {
      const url = adjunto.url || (adjunto.fileKey ? await fetchSignedUrl(adjunto.fileKey) : null);
      if (!url) return;
      // Forzar descarga creando <a download>
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.download = adjunto.filename || "archivo";
      // Algunos providers ignoran download on cross-origin; abrir en nueva pestaña como fallback
      try {
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (e) {
        window.open(url, "_blank");
      }
    } catch (e) {
      console.error("Error downloading attachment:", e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-1">
            <Package className="h-5 w-5" />
            Detalle de Cotización - {cotizacion.folio}
          </DialogTitle>
          <DialogDescription>Información completa de la cotización y sus items.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header con información principal */}
          <div
            className={`grid gap-2 ${
              cotizacion.status === "APPROVED" && cotizacion.purchaseOrderNumber && cotizacion.purchaseOrderNumber.trim() !== "" ? "grid-cols-1 md:grid-cols-5" : "grid-cols-1 md:grid-cols-4"
            }`}
          >
            <Card className="p-2 dark:bg-slate-900 dark:border-slate-800">
              <CardHeader className="pb-1.5">
                <CardTitle className="text-xs font-medium text-muted-foreground">Estado</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {cotizacion.status === "APPROVED" ? (
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-700 dark:to-emerald-700 text-white font-bold shadow-lg text-sm">
                    <CheckCircle className="h-3 w-3 animate-pulse" />
                    <span>Aprobada</span>
                    <span className="text-xs ml-0.5 opacity-80">✓</span>
                  </div>
                ) : (
                  <Badge variant={statusInfo.variant} className={(statusInfo as any).className}>
                    <StatusIcon className="mr-1 h-3 w-3" />
                    {statusInfo.label}
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card className="p-2 dark:bg-slate-900 dark:border-slate-800">
              <CardHeader className="pb-1.5">
                <CardTitle className="text-xs font-medium text-muted-foreground">Proveedor</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="font-medium text-sm dark:text-slate-200">{cotizacion.proveedor?.nombre || "Cotización general"}</div>
                {cotizacion.proveedor?.email && <div className="text-xs text-muted-foreground truncate">{cotizacion.proveedor.email}</div>}
              </CardContent>
            </Card>

            <Card className="p-2 dark:bg-slate-900 dark:border-slate-800">
              <CardHeader className="pb-1.5">
                <CardTitle className="text-xs font-medium text-muted-foreground">Items</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="font-medium text-sm dark:text-slate-200">{totalItems} items</div>
                <div className="text-xs text-muted-foreground">{itemsWithPrice.length} con precios</div>
              </CardContent>
            </Card>

            <Card className="p-2 dark:bg-slate-900 dark:border-slate-800">
              <CardHeader className="pb-1.5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Neto</CardTitle>
                {cotizacion.status !== "APPROVED" && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setIsEditingNeto(!isEditingNeto)} disabled={isUpdatingNeto}>
                          {isEditingNeto ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isEditingNeto ? "Cancelar edición" : "Editar Neto"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {isEditingNeto ? (
                  <div className="flex items-center gap-1 px-1">
                    <div className="relative flex-1">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <Input
                        type="text"
                        value={newNeto.toLocaleString("es-CL")}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setNewNeto(Number(val));
                        }}
                        className="h-7 pl-5 text-sm dark:bg-slate-950 dark:border-slate-800"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateNeto();
                          if (e.key === "Escape") setIsEditingNeto(false);
                        }}
                      />
                    </div>
                    <Button size="icon" className="h-7 w-7" onClick={handleUpdateNeto} disabled={isUpdatingNeto}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="font-medium text-sm dark:text-slate-200">${Number(cotizacion.neto).toLocaleString("es-CL")}</div>
                    {cotizacion.leadTime && <div className="text-xs text-muted-foreground">{cotizacion.leadTime} días</div>}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Orden de Compra - Solo si está aprobada y tiene número válido */}
            {cotizacion.status === "APPROVED" && cotizacion.purchaseOrderNumber && cotizacion.purchaseOrderNumber.trim() !== "" && (
              <Card className="p-3 border-2 border-amber-400 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
                <CardHeader className="pb-1.5">
                  <CardTitle className="text-xs font-medium text-amber-900 dark:text-amber-400 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" />
                    O. Compra (externa)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="font-bold text-sm text-amber-900 dark:text-amber-200 font-mono">{cotizacion.purchaseOrderNumber}</div>
                  <div className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">🔖 Referencia</div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* APPROVED Status Banner */}
          {cotizacion.status === "APPROVED" && (
            <div className="space-y-4">
              {/* Main Approval Banner */}
              <div className="relative overflow-hidden rounded-lg border-2 border-green-500 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 opacity-10">
                  <CheckCircle className="h-32 w-32 text-green-600 dark:text-green-500" />
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-600 dark:bg-green-700 text-white shadow-md">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-green-900 dark:text-green-400">¡Cotización Aprobada!</h3>
                      <p className="text-sm text-green-700 dark:text-green-500/90">Esta cotización ha sido marcada como aprobada y podrás enviar la notificación al proveedor.</p>
                    </div>
                  </div>

                  {/* Approval Notes */}
                  {cotizacion.observacionDeAprobacion && (
                    <div className="mt-4 pl-4 border-l-4 border-green-400 dark:border-green-700 bg-white dark:bg-slate-900 rounded p-3 shadow-sm">
                      <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Observaciones de Aprobación</p>
                      <p className="text-sm text-gray-800 dark:text-slate-200 font-medium">{cotizacion.observacionDeAprobacion}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <Tabs defaultValue="items" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="items">Items ({totalItems})</TabsTrigger>
              <TabsTrigger value="info">Información</TabsTrigger>
              <TabsTrigger value="adjuntos">Adjuntos ({cotizacion.adjuntos?.length || 0})</TabsTrigger>
              <TabsTrigger value="logs">Historial ({cotizacion.logs?.length || 0})</TabsTrigger>
            </TabsList>

            {/* Items Tab */}
            <TabsContent value="items" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Items de la Cotización</CardTitle>
                  <CardDescription>Detalle de productos y precios cotizados por el proveedor.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {cotizacion.items && cotizacion.items.length > 0 ? (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Cantidad</TableHead>
                            <TableHead>Unidad</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itemsSorted.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="font-medium">{item.name}</div>
                                {item.supplierSku && <div className="text-xs text-muted-foreground">SKU: {item.supplierSku}</div>}
                                {(item.marcaProveedor || item.modeloProveedor) && (
                                  <div className="text-xs text-muted-foreground">
                                    {item.marcaProveedor} {item.modeloProveedor}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="capitalize">{item.category}</span>
                              </TableCell>
                              <TableCell>{Number(item.quantity)}</TableCell>
                              <TableCell>{item.unit}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No hay items en esta cotización.</div>
                  )}

                  {/* Descripciones - debajo de Items */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t mt-6">
                    {/* Descripción creada por el solicitante */}
                    <Card className="border-l-4 border-l-blue-400 dark:border-l-blue-700 bg-blue-50 dark:bg-blue-950/20 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base dark:text-blue-400">Descripción ingresada por el solicitante</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {cotizacion.solicitud?.descripcion ? (
                          <>
                            <p className="text-sm text-blue-900 dark:text-blue-300">{cotizacion.solicitud.descripcion}</p>
                            <p className="text-xs text-blue-700 dark:text-blue-500 mt-2 inline-flex items-center gap-1">
                              <Info className="h-4 w-4" /> No visible para el proveedor, ingresado por ({cotizacion.solicitud.requestedBy?.username || "N/A"})
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-blue-600 dark:text-blue-500/70 italic">Sin descripción disponible</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Descripción Interna */}
                    <Card className="border-l-4 border-l-yellow-400 dark:border-l-yellow-700 bg-yellow-50 dark:bg-yellow-950/20 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base dark:text-yellow-400">Descripción Interna</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {cotizacion.solicitud?.descripcionInterna && String(cotizacion.solicitud.descripcionInterna).trim() !== "" ? (
                          <>
                            <p className="text-sm text-yellow-900 dark:text-yellow-300">{cotizacion.solicitud.descripcionInterna}</p>
                            <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-2 inline-flex items-center gap-1">
                              <Lock className="h-4 w-4" /> Notas internas, no visibles para el proveedor
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-yellow-600 dark:text-yellow-500/70 italic">Sin descripción interna</p>
                            <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-2 inline-flex items-center gap-1">
                              <Lock className="h-4 w-4" /> Notas internas, no visibles para el proveedor
                            </p>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Información Tab */}
            <TabsContent value="info" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Información de la Solicitud */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Solicitud Origen
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm font-medium">Folio:</span> <span className="text-sm">{cotizacion.solicitud.folio}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Instalación:</span> <span className="text-sm">{cotizacion.solicitud.ship?.name}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Solicitante:</span> <span className="text-sm">{cotizacion.solicitud.solicitante?.name || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Creada por:</span> <span className="text-sm">{cotizacion.solicitud.requestedBy?.username || "N/A"}</span>
                    </div>
                    {SHOW_AREA_PRIORITY_DATE && cotizacion.solicitud.area && (
                      <div>
                        <span className="text-sm font-medium">Área:</span> <span className="text-sm">{cotizacion.solicitud.area.name}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Información de la Cotización */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Detalles de Cotización
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {cotizacion.fechaEnvio && (
                      <div>
                        <span className="text-sm font-medium">Fecha de Envío:</span> <span className="text-sm">{formatDateSafe(cotizacion.fechaEnvio, "PPP")}</span>
                      </div>
                    )}
                    {cotizacion.fechaLimiteRespuesta && (
                      <div>
                        <span className="text-sm font-medium">Fecha Límite:</span> <span className="text-sm">{formatDateSafe(cotizacion.fechaLimiteRespuesta, "PPP")}</span>
                      </div>
                    )}
                    {cotizacion.providerResponseAt && (
                      <div>
                        <span className="text-sm font-medium">Respuesta Recibida:</span> <span className="text-sm">{formatDateSafe(cotizacion.providerResponseAt, "PPP")}</span>
                      </div>
                    )}
                    {cotizacion.condicionesPago && (
                      <div>
                        <span className="text-sm font-medium">Condiciones de Pago:</span> <span className="text-sm">{cotizacion.condicionesPago}</span>
                      </div>
                    )}
                    {cotizacion.validezCotizacion && (
                      <div>
                        <span className="text-sm font-medium">Válida hasta:</span> <span className="text-sm">{formatDateSafe(cotizacion.validezCotizacion, "PPP")}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Observaciones Internas y Observaciones del Proveedor */}
              {cotizacion.observaciones && (
                <Card className="mt-3 border-l-4 border-l-blue-400 dark:border-l-blue-700 bg-blue-50 dark:bg-blue-950/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base dark:text-blue-400">Observaciones Enviadas al proveedor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm dark:text-slate-300">{cotizacion.observaciones}</p>
                    <p className="text-xs text-amber-700 dark:text-amber-500 mt-2 inline-flex items-center gap-1">
                      <PaperPlaneIcon /> Observaciones que se le enviaron al proveedor al solicitar la cotización por correo.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Observaciones que adjuntó el proveedor */}
              <Card className="mt-3 border-l-4 border-l-amber-400 dark:border-l-amber-700 bg-amber-50 dark:bg-amber-950/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base dark:text-amber-400">Observaciones del Proveedor (ingresada manualmente)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm dark:text-slate-300">{cotizacion.observacionesDelProveedor ?? cotizacion.observacionesDelProveedor ?? "S/O"}</p>
                  <p className="text-xs text-blue-700 dark:text-blue-500 mt-2">💬 Observaciones del proveedor al recibir la cotización.</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Adjuntos Tab */}
            <TabsContent value="adjuntos" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Adjuntos de la Cotización</CardTitle>
                  <CardDescription>Archivos y documentos relacionados con la cotización.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    {/* Controls: subir nuevo adjunto */}
                    <div className="flex items-center gap-2 mb-4">
                      <input
                        id={`cotizacion-adjunto-file-${cotizacionId}`}
                        type="file"
                        className="sr-only"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length === 0) return;
                          // subir y registrar el primer archivo (podemos soportar multiples si se desea)
                          const file = files[0];
                          setUploading(true);
                          setUploadingFilename(file.name);
                          try {
                            const fd = new FormData();
                            fd.append("file", file);
                            fd.append("filename", file.name);
                            fd.append("contentType", file.type || "application/octet-stream");

                            const res = await fetch("/api/uploads/r2-simple", { method: "POST", body: fd });
                            const json = await res.json();
                            if (!json?.success) throw new Error(json?.error || "Error al subir archivo");

                            // Registrar en DB usando server action vía endpoint simple (crear ruta dinámica)
                            const registerRes = await fetch("/api/cotizaciones/create-adjunto", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                cotizacionId: cotizacionId,
                                key: json.data.key,
                                url: json.data.url,
                                filename: json.data.filename,
                                filesize: json.data.filesize,
                                filetype: json.data.filetype,
                              }),
                            });
                            const rj = await registerRes.json();
                            if (!rj?.success) throw new Error(rj?.message || "Error registrando adjunto");

                            toast.success("Adjunto subido y registrado");
                            // invalidar cache de cotizacion
                            queryClient.invalidateQueries({ queryKey: ["cotizacion", cotizacionId] });
                          } catch (err: any) {
                            console.error("Error subiendo/registrando adjunto:", err);
                            toast.error(err?.message || "Error al subir adjunto");
                          } finally {
                            setUploading(false);
                            setUploadingFilename(null);
                            const input = document.getElementById(`cotizacion-adjunto-file-${cotizacionId}`) as HTMLInputElement | null;
                            if (input) input.value = "";
                          }
                        }}
                      />

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            const input = document.getElementById(`cotizacion-adjunto-file-${cotizacionId}`) as HTMLInputElement | null;
                            input?.click();
                          }}
                          disabled={uploading}
                        >
                          {uploading ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                              </svg>
                              Subiendo...
                            </span>
                          ) : (
                            "Adjuntar archivo"
                          )}
                        </Button>
                        {uploading && uploadingFilename && <div className="text-sm text-muted-foreground">Subiendo {uploadingFilename}…</div>}
                      </div>
                    </div>

                    {/* Lista de adjuntos */}
                    {cotizacion.adjuntos && cotizacion.adjuntos.length > 0 ? (
                      <div className="space-y-2">
                        {cotizacion.adjuntos.map((adjunto: any) => (
                          <div key={adjunto.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium text-sm">{adjunto.filename}</div>
                                <div className="text-xs text-muted-foreground">
                                  {adjunto.tipo} • {adjunto.filesize ? `${Math.round(adjunto.filesize / 1024)} KB` : ""}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" onClick={() => viewAttachment(adjunto)} title="Ver">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => downloadAttachment(adjunto)} title="Descargar">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setAdjuntoToDelete(adjunto);
                                  setConfirmOpen(true);
                                }}
                                title="Eliminar"
                                disabled={deleting}
                              >
                                {deleting && adjuntoToDelete?.id === adjunto.id ? (
                                  // spinner icon reuse
                                  <svg className="animate-spin h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                  </svg>
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="mx-auto h-8 w-8 mb-4 opacity-50" />
                        <p>No hay adjuntos en esta cotización.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Historial Tab */}
            <TabsContent value="logs" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Historial de Cambios</CardTitle>
                  <CardDescription>Registro de acciones realizadas en esta cotización.</CardDescription>
                </CardHeader>
                <CardContent>
                  {cotizacion.logs && cotizacion.logs.length > 0 ? (
                    <div className="space-y-4">
                      {cotizacion.logs.map((log: any) => (
                        <div key={log.id} className="flex items-start gap-3 pb-4 border-b last:border-b-0">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{log.action}</span>
                              <span className="text-xs text-muted-foreground">{format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{log.descripcion}</p>
                            {log.user && (
                              <p className="text-xs text-muted-foreground mt-1">
                                por {log.user.username} ({log.user.email})
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="mx-auto h-8 w-8 mb-4 opacity-50" />
                      <p>No hay historial de cambios disponible.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
      {/* Confirm dialog for deleting adjunto (mounted in main UI) */}
      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar adjunto"
        description="¿Eliminar este adjunto? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onCancel={() => {
          if (deleting) return; // evitar cerrar mientras se elimina
          setConfirmOpen(false);
          setAdjuntoToDelete(null);
        }}
        onConfirm={async () => {
          if (!adjuntoToDelete) return;
          // Cerrar el diálogo inmediatamente para que el usuario vea que la UI no está "colgada"
          setConfirmOpen(false);
          // Mantener adjuntoToDelete hasta que termine la operación para que
          // el spinner se muestre en el botón correspondiente
          setDeleting(true);
          const idToDelete = adjuntoToDelete.id;
          try {
            const res = await fetch("/api/cotizaciones/delete-adjunto", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ adjuntoId: idToDelete }),
            });
            const json = await res.json();
            if (!json?.success) throw new Error(json?.message || "Error eliminando adjunto");
            toast.success("Adjunto eliminado");
            queryClient.invalidateQueries({ queryKey: ["cotizacion", cotizacionId] });
          } catch (e: any) {
            console.error("Error eliminando adjunto:", e);
            toast.error(e?.message || "Error eliminando adjunto");
          } finally {
            setDeleting(false);
            setAdjuntoToDelete(null);
          }
        }}
      />
    </Dialog>
  );
}
