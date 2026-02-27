"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useCotizacion, useCotizacionActions, useValidateCotizacionForApproval } from "@/hooks/useCotizaciones";
import { getStatusLabel } from "@/utils/statusLabels";
import { approveSelectedCotizacionItems } from "@/actions/solicitud-insumos/cotizacionActions";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const ApproveRejectSchema = z.object({
  observacionDeAprobacion: z.string().optional(),
  observacionDeRechazo: z.string().optional(),
});

type ApproveRejectData = z.infer<typeof ApproveRejectSchema>;

interface ItemData {
  id: number;
  solicitudItemId: number;
  name: string;
  technicalSpec?: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalPrice?: number;
  isAvailable: boolean;
  isAlreadyApproved: boolean;
  reason?: string;
}

interface Props {
  cotizacionId: number;
  action: "approve" | "reject";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ApproveRejectCotizacionDialog({ cotizacionId, action, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { data: cotizacionResp, isLoading } = useCotizacion(cotizacionId);
  const actions = useCotizacionActions();
  // Validación para aprobación (solo cuando se abre el diálogo para aprobar)
  const { data: validationResp, isLoading: isValidating } = useValidateCotizacionForApproval(action === "approve" ? cotizacionId : null, open && action === "approve");

  const cotizacion = cotizacionResp?.success ? cotizacionResp.data : null;

  // Estado para selección de items (integrado en el mismo modal)
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ApproveRejectData>({
    resolver: zodResolver(ApproveRejectSchema),
    defaultValues: {
      observacionDeAprobacion: "",
      observacionDeRechazo: "",
    },
  });

  const onSubmit = async (data: ApproveRejectData) => {
    // Para rechazos, usar el flujo normal
    if (action === "reject") {
      const mutation = actions.reject;
      mutation.mutate(
        {
          cotizacionId,
          observacionDeRechazo: data.observacionDeRechazo,
        },
        {
          onSuccess: (result) => {
            if (result.success) {
              onOpenChange(false);
              form.reset();
              setSelectedItemIds([]);
            }
          },
        },
      );
      return;
    }

    // Para aprobaciones con selección de items
    if (requiresItemSelection && selectedItemIds.length > 0) {
      setIsSubmitting(true);
      try {
        const result = await approveSelectedCotizacionItems(cotizacionId, selectedItemIds, data.observacionDeAprobacion);

        if (result.success) {
          toast.success(result.message || "Items aprobados exitosamente");

          // Invalidar todas las queries relacionadas para actualizar la UI
          queryClient.invalidateQueries({ queryKey: ["cotizacion", cotizacionId] });
          queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
          queryClient.invalidateQueries({ queryKey: ["solicitudes-insumos"] });

          onOpenChange(false);
          form.reset();
          setSelectedItemIds([]);
        } else {
          toast.error(result.message || "Error al aprobar items");
        }
      } catch (error) {
        console.error("Error al aprobar items seleccionados:", error);
        toast.error("Error al aprobar items seleccionados");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Para aprobaciones simples (sin selección de items)
    const mutation = actions.approve;
    mutation.mutate(
      {
        cotizacionId,
        observacionDeAprobacion: data.observacionDeAprobacion,
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            onOpenChange(false);
            form.reset();
            setSelectedItemIds([]);
          }
        },
      },
    );
  };

  // Extraer mensajes de validación de la validación previa (para aprobación)
  // La respuesta puede tener success: true o success: false (con requiresItemSelection)
  const validationData = validationResp?.success ? validationResp.data : null;
  const requiresItemSelection = (validationResp as any)?.requiresItemSelection ?? false;

  // Los datos pueden estar directamente en validationResp cuando requiresItemSelection es true
  const dataSource = (validationResp as any)?.data || {};
  const availableItems = dataSource.availableItems || [];
  const alreadyApprovedItems = dataSource.alreadyApprovedItems || [];

  // Si requiere selección de items, aún puede "aprobar" (con items seleccionados)
  const canApprove = requiresItemSelection ? selectedItemIds.length > 0 : (validationData?.canApprove ?? true);

  const validationMessages = validationData?.validationMessages || (validationResp as any)?.validationMessages || [];
  const warnings = validationMessages.filter((msg: any) => msg.type === "warning");
  const errors = validationMessages.filter((msg: any) => msg.type === "error");

  // Preparar datos de items para la tabla interactiva
  const itemsData = useMemo<ItemData[]>(() => {
    if (!cotizacion?.items || action !== "approve") return [];

    return cotizacion.items
      .filter((item: any) => item.cotizado !== false)
      .map((cotItem: any) => {
        const isAlreadyApproved = alreadyApprovedItems.some((item: any) => item.itemId === cotItem.solicitudItemId);
        const isAvailable = availableItems.some((item: any) => item.itemId === cotItem.solicitudItemId);
        const approvedItem = alreadyApprovedItems.find((item: any) => item.itemId === cotItem.solicitudItemId);

        return {
          id: cotItem.id,
          solicitudItemId: cotItem.solicitudItemId,
          name: cotItem.name,
          technicalSpec: cotItem.technicalSpec,
          quantity: Number(cotItem.quantity),
          unit: cotItem.unit,
          unitPrice: cotItem.unitPrice ? Number(cotItem.unitPrice) : undefined,
          totalPrice: cotItem.totalPrice ? Number(cotItem.totalPrice) : undefined,
          isAvailable: isAvailable && !isAlreadyApproved,
          isAlreadyApproved,
          reason: isAlreadyApproved ? `Ya aprobado en COT-${String(approvedItem?.approvedCotizacionId).padStart(4, "0")}` : undefined,
        };
      });
  }, [cotizacion, availableItems, alreadyApprovedItems, action]);

  // Auto-seleccionar items disponibles cuando se abre el modal o cambia la data
  useEffect(() => {
    if (open && requiresItemSelection && itemsData.length > 0 && action === "approve") {
      const availableIds = itemsData.filter((item: ItemData) => item.isAvailable).map((item: ItemData) => item.solicitudItemId);
      setSelectedItemIds(availableIds);
    }
  }, [open, requiresItemSelection, itemsData, action]);

  // Funciones para manejo de checkboxes
  const handleToggleItem = (itemId: number) => {
    setSelectedItemIds((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]));
  };

  const handleToggleAll = () => {
    const allAvailableIds = itemsData.filter((item: ItemData) => item.isAvailable).map((item: ItemData) => item.solicitudItemId);
    if (selectedItemIds.length === allAvailableIds.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(allAvailableIds);
    }
  };

  // Calcular totales
  const selectedTotal = useMemo(() => {
    return itemsData.filter((item: ItemData) => selectedItemIds.includes(item.solicitudItemId)).reduce((sum: number, item: ItemData) => sum + (item.totalPrice || 0), 0);
  }, [itemsData, selectedItemIds]);

  const config = {
    approve: {
      title: "Aprobar Cotización",
      description: "Esta cotización será marcada como aprobada. Podrás enviar la notificación al proveedor.",
      icon: CheckCircle,
      iconColor: "text-green-600",
      buttonText: "Aprobar Cotización",
      buttonVariant: "default" as const,
      buttonClass: "bg-green-600 hover:bg-green-700",
      labelText: "Observaciones de aprobación para el proveedor (opcional)",
      placeholderText: "Comentarios sobre la aprobación de esta cotización...",
      bannerColor: "bg-gradient-to-r from-green-50 to-emerald-50",
      bannerBorder: "border-green-300",
    },
    reject: {
      title: "✕ Rechazar Cotización",
      description: "Esta acción marcará la cotización como rechazada. La solicitud continuará disponible para otras cotizaciones.",
      icon: XCircle,
      iconColor: "text-red-600",
      buttonText: "Rechazar Cotización",
      buttonVariant: "destructive" as const,
      buttonClass: "",
      labelText: "Motivo del rechazo (opcional)",
      placeholderText: "Explique por qué se rechaza esta cotización...",
      bannerColor: "bg-gradient-to-r from-red-50 to-rose-50",
      bannerBorder: "border-red-300",
    },
  };

  const currentConfig = config[action];
  const Icon = currentConfig.icon;

  // Determinar si el botón debe estar deshabilitado
  const isButtonDisabled = isSubmitting || actions.approve.isPending || actions.reject.isPending || isValidating || (action === "approve" && !canApprove);

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cargando Cotización</DialogTitle>
            <DialogDescription>Por favor espere mientras se carga la información de la cotización.</DialogDescription>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>Ha ocurrido un error al cargar la cotización.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-red-600">Error: Cotización no encontrada</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80vw] max-w-[80vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${currentConfig.iconColor}`} />
            {currentConfig.title}
          </DialogTitle>
          <DialogDescription>{currentConfig.description}</DialogDescription>
        </DialogHeader>

        {/* Contenedor con scroll para el contenido */}
        <div className="overflow-y-auto flex-1 pr-2 space-y-4">
          {/* Banner destacado de acción */}
          <div
            className={`${action === "approve" ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-300 dark:border-green-800" : "bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-red-300 dark:border-red-800"} border-2 rounded-lg p-4 shadow-sm`}
          >
            <div className="flex items-center gap-3">
              <Icon className={`h-6 w-6 flex-shrink-0 ${currentConfig.iconColor}`} />
              <div>
                <h3 className={`font-bold text-sm ${action === "approve" ? "text-green-900 dark:text-green-400" : "text-red-900 dark:text-red-400"}`}>{currentConfig.description}</h3>
                <p className={`text-xs mt-1 ${action === "approve" ? "text-green-700 dark:text-green-500/90" : "text-red-700 dark:text-red-500/90"}`}>
                  {action === "approve" ? "Una vez aprobada, podrás usar esta cotización para crear órdenes de compra." : "El proveedor será notificado del rechazo. La solicitud permanecerá activa."}
                </p>
              </div>
            </div>
          </div>

          {/* Información de la Cotización */}
          <div className="bg-muted/50 dark:bg-slate-900/50 rounded-lg p-4 space-y-2 border dark:border-slate-800">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="dark:text-slate-300">
                <span className="font-medium dark:text-slate-200">Folio:</span> {cotizacion.folio}
              </div>
              <div className="dark:text-slate-300">
                <span className="font-medium dark:text-slate-200">Proveedor:</span> {cotizacion.proveedor?.razonSocial || "N/A"}
              </div>
              <div className="dark:text-slate-300">
                <span className="font-medium dark:text-slate-200">Items:</span> {cotizacion.items?.length || 0}
              </div>
              <div className="dark:text-slate-300">
                <span className="font-medium dark:text-slate-200">Estado:</span> {getStatusLabel(cotizacion.status)}
              </div>
              {/* Totales desde la base de datos en la misma fila */}
              <div className="col-span-2 flex items-center gap-6 text-sm py-2 border-y dark:border-slate-800">
                <div className="flex-1 dark:text-slate-300">
                  <span className="font-medium dark:text-slate-200">Neto:</span> {typeof cotizacion.neto !== "undefined" ? `$${Number(cotizacion.neto).toLocaleString("es-CL")}` : "-"}
                </div>
                <div className="flex-1 dark:text-slate-300">
                  <span className="font-medium dark:text-slate-200">IVA:</span> {typeof cotizacion.iva !== "undefined" ? `$${Number(cotizacion.iva).toLocaleString("es-CL")}` : "-"}
                </div>
                <div className="flex-1 text-right dark:text-blue-400">
                  <span className="font-medium">Total estimado:</span> {typeof cotizacion.totalEstimado !== "undefined" ? `$${Number(cotizacion.totalEstimado).toLocaleString("es-CL")}` : "-"}
                </div>
              </div>
            </div>
            {cotizacion.observaciones && (
              <div className="pt-2">
                <span className="font-medium text-sm dark:text-slate-200">Observaciones:</span>
                <p className="text-sm text-muted-foreground mt-1 dark:text-slate-400">{cotizacion.observaciones}</p>
              </div>
            )}
          </div>

          {/* Tabla Interactiva de Items (solo para aprobación con selección) */}
          {action === "approve" && requiresItemSelection && itemsData.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b flex items-center justify-between">
                <h3 className="font-medium text-sm">Seleccione los items a aprobar</h3>
                <Badge variant="secondary" className="text-xs">
                  {selectedItemIds.length} de {itemsData.filter((item: ItemData) => item.isAvailable).length} disponibles
                </Badge>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedItemIds.length === itemsData.filter((item: ItemData) => item.isAvailable).length && itemsData.filter((item: ItemData) => item.isAvailable).length > 0}
                          onCheckedChange={handleToggleAll}
                          disabled={itemsData.filter((item: ItemData) => item.isAvailable).length === 0}
                        />
                      </TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-[100px]">Cantidad</TableHead>
                      <TableHead className="w-[120px] text-right">Precio Unit.</TableHead>
                      <TableHead className="w-[120px] text-right">Total</TableHead>
                      <TableHead className="w-[120px]">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsData.map((item: ItemData) => (
                      <TableRow key={item.id} className={!item.isAvailable ? "bg-muted/50" : ""}>
                        <TableCell>
                          <Checkbox checked={selectedItemIds.includes(item.solicitudItemId)} onCheckedChange={() => handleToggleItem(item.solicitudItemId)} disabled={!item.isAvailable} />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            {item.technicalSpec && <div className="text-xs text-muted-foreground">{item.technicalSpec}</div>}
                            {item.reason && <div className="text-xs text-muted-foreground mt-1">{item.reason}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {item.quantity} {item.unit}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{item.unitPrice ? `$${item.unitPrice.toLocaleString("es-CL")}` : "-"}</TableCell>
                        <TableCell className="text-right font-medium">{item.totalPrice ? `$${item.totalPrice.toLocaleString("es-CL")}` : "-"}</TableCell>
                        <TableCell>
                          {item.isAvailable ? (
                            <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800">
                              Disponible
                            </Badge>
                          ) : item.isAlreadyApproved ? (
                            <Badge variant="default" className="bg-green-600 dark:bg-green-700 text-xs text-white">
                              Ya aprobado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800">
                              No disponible
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Lista de Items (solo lectura - para rechazo o aprobación simple) */}
          {(action === "reject" || !requiresItemSelection) && cotizacion.items && cotizacion.items.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b">
                <h3 className="font-medium text-sm">Items en esta cotización</h3>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Item</th>
                      <th className="text-center px-4 py-2 font-medium w-24">Cantidad</th>
                      <th className="text-right px-4 py-2 font-medium w-32">Precio Unit.</th>
                      <th className="text-right px-4 py-2 font-medium w-32">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cotizacion.items
                      .filter((item: any) => item.cotizado !== false)
                      .map((item: any, index: number) => {
                        const isAlreadyApproved = item.solicitudItem?.approvedCotizacionId != null;
                        return (
                          <tr key={item.id || index} className={isAlreadyApproved ? "bg-gray-50 dark:bg-slate-800/50 opacity-60" : "dark:border-slate-800"}>
                            <td className="px-4 py-2">
                              <div>
                                <div className="font-medium">{item.name}</div>
                                {item.technicalSpec && <div className="text-xs text-muted-foreground">{item.technicalSpec}</div>}
                                {isAlreadyApproved && (
                                  <Badge variant="default" className="text-xs bg-green-600 mt-1">
                                    Ya aprobado
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <Badge variant="secondary">
                                {item.quantity} {item.unit}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-right">${item.unitPrice?.toLocaleString("es-CL") || "-"}</td>
                            <td className="px-4 py-2 text-right font-medium">${item.totalPrice?.toLocaleString("es-CL") || "-"}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot className="bg-muted/50 border-t font-medium">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-right">
                        Total Cotización:
                      </td>
                      <td className="px-4 py-2 text-right">
                        $
                        {cotizacion.items
                          .filter((item: any) => item.cotizado !== false)
                          .reduce((sum: number, item: any) => sum + (Number(item.totalPrice) || 0), 0)
                          .toLocaleString("es-CL")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Mensajes de Validación */}
          {action === "approve" && !isValidating && (warnings.length > 0 || errors.length > 0 || requiresItemSelection) && (
            <div className="space-y-2">
              {/* Mensaje especial para selección de items */}
              {requiresItemSelection && availableItems.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-medium">Selección de Items Requerida</p>
                    {alreadyApprovedItems.length > 0 ? (
                      <p>
                        Esta cotización tiene {alreadyApprovedItems.length} item(s) ya aprobados en otras cotizaciones. Hay {availableItems.length} item(s) disponibles para aprobación.
                      </p>
                    ) : (
                      <p>Esta cotización tiene {availableItems.length} item(s) disponibles. Puede seleccionar qué items aprobar específicamente.</p>
                    )}
                  </div>
                </div>
              )}

              {warnings.map((warning: any, index: number) => (
                <div key={`warning-${index}`} className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-300">
                    <p className="font-medium">Advertencia</p>
                    <p>{warning.message}</p>
                  </div>
                </div>
              ))}
              {errors.map((error: any, index: number) => (
                <div key={`error-${index}`} className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-800 dark:text-red-300">
                    <p className="font-medium">Error</p>
                    <p>{error.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Loading de validación */}
          {action === "approve" && isValidating && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Validando cotización...</span>
              </div>
            </div>
          )}

          {/* Resumen de Selección (solo para aprobación con items seleccionados) */}
          {/* {action === "approve" && requiresItemSelection && selectedItemIds.length > 0 && (
            <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Items seleccionados: {selectedItemIds.length}</p>
                  <p className="text-xs text-blue-700 mt-1">Total a aprobar: ${selectedTotal.toLocaleString("es-CL")}</p>
                </div>
                <Badge variant="default" className="bg-blue-600">
                  Aprobación Parcial
                </Badge>
              </div>
            </div>
          )} */}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name={action === "approve" ? "observacionDeAprobacion" : "observacionDeRechazo"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{currentConfig.labelText}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={currentConfig.placeholderText} className="min-h-[100px]" {...field} />
                    </FormControl>
                    <div className="flex items-start gap-2 mt-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-950/20 border border-amber-300 dark:border-amber-900/50">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                        Este mensaje será enviado al proveedor en la notificación de {action === "approve" ? "aprobación" : "rechazo"}.
                      </p>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                {action === "approve" ? (
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold shadow-lg hover:shadow-xl transition-all"
                    disabled={isButtonDisabled}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Aprobando...
                      </>
                    ) : isValidating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validando...
                      </>
                    ) : requiresItemSelection && selectedItemIds.length > 0 ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Aprobar {selectedItemIds.length} items
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {currentConfig.buttonText}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold shadow-lg hover:shadow-xl transition-all"
                    disabled={isButtonDisabled}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Rechazando...
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        {currentConfig.buttonText}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
        {/* Fin del contenedor con scroll */}
      </DialogContent>
    </Dialog>
  );
}
