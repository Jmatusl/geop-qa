"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Mail, Loader2, Search, X, Building2, Mail as MailIcon, CreditCard, Package as PackageIcon, Eye, EyeOff, Info, Lock, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { createCotizacion, createMultipleCotizaciones } from "@/actions/solicitud-insumos/cotizacionActions";
import { useProveedoresForCotizacion, useCotizaciones } from "@/hooks/useCotizaciones";
import ProveedorForm from "@/app/dashboard/mantencion/maestro-proveedores/components/ProveedorForm";

interface ItemSolicitud {
  id: number;
  cantidad: number;
  cantidadEnviada?: number;
  cantidadPendiente?: number;
  repuesto: {
    id: number;
    nombre: string;
    codigo?: string;
    unidad?: string;
  };
}

interface Proveedor {
  id: number;
  rutProveedor: string | null;
  nombre: string;
  razonSocial: string | null;
  email: string | null;
  telefono: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitudId: number;
  items: ItemSolicitud[];
  onSuccess?: () => void;
  observacionCrearSolicitudCotizacion?: string | null;
}

const formSchema = z.object({
  fechaLimite: z.date({
    required_error: "La fecha límite es requerida",
  }),
  descripcion: z.string().optional(),
  observacionCrearSolicitudCotizacion: z.string().optional(),
  incluirCotizacionGeneral: z.boolean().default(false),
});

// Configuración: controlar comportamiento desde constantes
// Los items solo se deshabilitan si tienen cotizaciones en estado RECEIVED o APPROVED
// Items con cotizaciones NO_COTIZO o REJECTED pueden volver a cotizarse
const DISABLE_IF_IN_ANY_COTIZACION = true;
// Si true, mostrar todos los folios donde aparece el item (si hay más de uno)
const SHOW_ALL_FOLIOS = true;

export default function SendToQuoteDialog({ open, onOpenChange, solicitudId, items, onSuccess, observacionCrearSolicitudCotizacion }: Props) {
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectedProveedores, setSelectedProveedores] = useState<number[]>([]);
  const [isFechaOpen, setIsFechaOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showNewProveedorDialog, setShowNewProveedorDialog] = useState(false);
  const [proveedorFilter, setProveedorFilter] = useState("");
  const [showQuotedItems, setShowQuotedItems] = useState(false); // Por defecto ocultos

  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fechaLimite: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días desde hoy
      descripcion: "",
      observacionCrearSolicitudCotizacion: "",
      incluirCotizacionGeneral: false,
    },
  });

  // Estado local para manejar incluirCotizacionGeneral de forma más estable
  const [incluirCotizacionGeneral, setIncluirCotizacionGeneral] = useState(false);

  // Obtener proveedores usando el hook existente
  const { data: proveedoresResp, isLoading: loadingProveedores, error: proveedoresError } = useProveedoresForCotizacion(open);
  const proveedores = proveedoresResp?.success ? proveedoresResp.data : [];

  // Obtener cotizaciones de la solicitud para detectar items ya cotizados
  const { data: cotizacionesResp } = useCotizaciones(open ? { solicitudId, limit: 100 } : undefined);
  const cotizaciones = cotizacionesResp?.success && cotizacionesResp.data?.cotizaciones ? cotizacionesResp.data.cotizaciones : [];

  // Función para verificar si un item ya está cotizado y obtener sus folios
  // Bloquea items con cotizaciones en estados PENDIENTE, EN_COTIZACION, RECEIVED o APPROVED
  // Items con cotizaciones NO_COTIZO o REJECTED pueden volver a cotizarse
  const getItemQuotationStatus = useCallback(
    (itemId: number) => {
      const folios: string[] = [];
      let isQuoted = false;

      // Estados que SÍ bloquean el item (cotización activa o cerrada)
      const BLOCKING_STATUSES = ["PENDIENTE", "EN_COTIZACION", "RECEIVED", "APPROVED"];

      if (cotizaciones && Array.isArray(cotizaciones)) {
        cotizaciones.forEach((cotizacion: any) => {
          if (cotizacion.items && Array.isArray(cotizacion.items)) {
            // Intentar buscar con diferentes nombres de campo
            const itemInCotizacion = cotizacion.items.find((ci: any) => {
              const idMatch = ci.solicitudItemId === itemId || ci.itemId === itemId || ci.id === itemId;
              return idMatch;
            });

            if (itemInCotizacion) {
              // Solo bloquear si la cotización está en un estado activo o cerrado
              if (cotizacion.folio && BLOCKING_STATUSES.includes(cotizacion.status)) {
                isQuoted = true;
                folios.push(cotizacion.folio);
              }
            }
          }
        });
      }

      return { isQuoted, folios };
    },
    [cotizaciones],
  );

  // Filtrar items disponibles para envío (PENDIENTE y EN_COTIZACION para nuevas cotizaciones)
  // Separar items cotizados de no cotizados
  const { availableItems, quotedItems } = useMemo(() => {
    const allAvailableItems = items.filter((item: any) => item.status === "PENDIENTE" || item.status === "EN_COTIZACION");

    const quoted: any[] = [];
    const notQuoted: any[] = [];

    allAvailableItems.forEach((item: any) => {
      const { isQuoted } = getItemQuotationStatus(item.id);
      if (isQuoted) {
        quoted.push(item);
      } else {
        notQuoted.push(item);
      }
    });

    return { availableItems: notQuoted, quotedItems: quoted };
  }, [items, getItemQuotationStatus]);

  // Items a mostrar en la tabla según el filtro de mostrar/ocultar cotizados
  const itemsToDisplay = useMemo(() => {
    if (showQuotedItems) {
      // Mostrar todos: disponibles + cotizados
      return [...availableItems, ...quotedItems];
    } else {
      // Solo mostrar disponibles (no cotizados)
      return availableItems;
    }
  }, [availableItems, quotedItems, showQuotedItems]);

  // Filtrar proveedores por búsqueda (memorizado para optimizar performance)
  const filteredProveedores = useMemo(() => {
    if (!proveedores || proveedores.length === 0) return [];
    return proveedores.filter(
      (proveedor: any) =>
        (proveedor.rutProveedor && proveedor.rutProveedor.toLowerCase().includes(proveedorFilter.toLowerCase())) ||
        proveedor.nombre.toLowerCase().includes(proveedorFilter.toLowerCase()) ||
        (proveedor.razonSocial && proveedor.razonSocial.toLowerCase().includes(proveedorFilter.toLowerCase())) ||
        (proveedor.email && proveedor.email.toLowerCase().includes(proveedorFilter.toLowerCase())),
    );
  }, [proveedores, proveedorFilter]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedProveedores([]);
      setProveedorFilter("");
      setIncluirCotizacionGeneral(false);
      form.reset({
        fechaLimite: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        descripcion: "",
        observacionCrearSolicitudCotizacion: observacionCrearSolicitudCotizacion || "",
        incluirCotizacionGeneral: false,
      });
    }
  }, [open, form, observacionCrearSolicitudCotizacion]); // Cargar valor desde la solicitud

  // Seleccionar todos los items disponibles (no cotizados) cuando se abra el diálogo
  useEffect(() => {
    if (open && availableItems.length > 0) {
      setSelectedItems(availableItems.map((item) => item.id));
    } else if (open) {
      setSelectedItems([]);
    }
  }, [open, availableItems.length]); // Depende de open y el número de items disponibles

  const handleItemToggle = useCallback((itemId: number) => {
    setSelectedItems((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]));
  }, []);

  const handleProveedorToggle = useCallback((proveedorId: number) => {
    setSelectedProveedores((prev) => (prev.includes(proveedorId) ? prev.filter((id) => id !== proveedorId) : [...prev, proveedorId]));
  }, []);

  const handleSelectAllItems = useCallback(() => {
    // Solo seleccionar items disponibles (no cotizados)
    if (selectedItems.length === availableItems.length && availableItems.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(availableItems.map((item) => item.id));
    }
  }, [selectedItems.length, availableItems]);

  const handleClearProveedorFilter = useCallback(() => {
    setProveedorFilter("");
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (selectedItems.length === 0) {
      toast.error("Debe seleccionar al menos un item");
      return;
    }

    if (selectedProveedores.length === 0 && !values.incluirCotizacionGeneral) {
      toast.error("Debe seleccionar al menos un proveedor o incluir cotización general");
      return;
    }

    setIsCreating(true);

    try {
      const itemsToSend = selectedItems.map((itemId) => {
        const item = availableItems.find((i) => i.id === itemId)!;
        const cantidadPendiente = item.cantidadPendiente ?? item.cantidad - (item.cantidadEnviada ?? 0);
        return {
          itemSolicitudId: itemId,
          cantidad: cantidadPendiente,
        };
      });

      const cotizacionesToCreate = [];

      // Crear cotizaciones para proveedores seleccionados
      if (selectedProveedores.length > 0) {
        const selectedProveedoresData = (proveedores || []).filter((p: any) => selectedProveedores.includes(p.id));
        cotizacionesToCreate.push(
          ...selectedProveedoresData.map((proveedor) => ({
            proveedor,
            items: itemsToSend,
          })),
        );
      }

      // Crear cotización general si está seleccionada
      if (values.incluirCotizacionGeneral) {
        cotizacionesToCreate.push({
          proveedor: null,
          items: itemsToSend,
        });
      }

      // Crear las cotizaciones usando una función específica para múltiples cotizaciones
      const result = await createMultipleCotizaciones({
        solicitudId,
        fechaLimiteRespuesta: values.fechaLimite,
        descripcion: values.descripcion || null,
        observacionCrearSolicitudCotizacion: values.observacionCrearSolicitudCotizacion || null,
        itemIds: selectedItems,
        proveedorIds: selectedProveedores,
        incluirCotizacionGeneral: values.incluirCotizacionGeneral,
      });

      let createdCount = 0;
      if (result.success) {
        createdCount = result.data?.createdCount || 0;
      } else {
        console.error("Error creating cotizaciones:", result);
        toast.error(`Error al crear cotizaciones: ${result.message}`);
      }

      if (createdCount > 0) {
        toast.success(`${createdCount} cotización${createdCount > 1 ? "es" : ""} creada${createdCount > 1 ? "s" : ""} exitosamente`);
        onOpenChange(false);
        onSuccess?.();
        // Invalidar las queries de cotizaciones para refrescar los datos inmediatamente
        queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
        router.refresh();
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al crear las cotizaciones");
    } finally {
      setIsCreating(false);
    }
  };

  const isSubmitting = isCreating;

  return (
    <>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 dark:border-slate-800 flex-shrink-0">
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-slate-100">Enviar Ítems a Cotización</DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-slate-400">Seleccione los items y proveedores para crear las cotizaciones correspondientes.</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-2 py-0 space-y-2 overflow-y-auto flex-1">
                {/* Sección: Configuración General */}
                <div className="bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-lg p-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-200 mb-2 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Configuración de la Cotización
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {/* Fecha límite */}
                    <FormField
                      control={form.control}
                      name="fechaLimite"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-xs font-semibold text-gray-700">Fecha Límite de Respuesta</FormLabel>
                          <Popover open={isFechaOpen} onOpenChange={setIsFechaOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal h-10", !field.value && "text-muted-foreground")}>
                                  {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                locale={es}
                                selected={field.value}
                                onSelect={(date) => {
                                  field.onChange(date);
                                  setIsFechaOpen(false);
                                }}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Grid de 2 columnas para Observaciones */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Observaciones para el Proveedor */}
                      <FormField
                        control={form.control}
                        name="descripcion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                              Observaciones para el Proveedor
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-normal">Opcional</span>
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="..."
                                className="min-h-[100px] resize-none text-sm border-blue-200 dark:border-blue-900/50 dark:bg-slate-950 focus:border-blue-400 focus:ring-blue-200"
                                {...field}
                              />
                            </FormControl>
                            <div className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-400 dark:border-blue-800 rounded-r px-3 py-2 mt-2">
                              <p className="text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                                <span className="inline-block mt-0.5 text-base">
                                  <Info className="w-4 h-4" />
                                </span>
                                <span className="flex-1">
                                  <strong className="font-semibold text-blue-900 dark:text-blue-200">Visible para el proveedor:</strong> Este texto se incluirá en el correo y PDF de cotización que
                                  recibirá el proveedor externo.
                                </span>
                              </p>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Observaciones Internas (entre gestores) */}
                      <FormField
                        control={form.control}
                        name="observacionCrearSolicitudCotizacion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                              Observaciones Internas
                              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-normal">Opcional</span>
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="..."
                                className="min-h-[100px] resize-none text-sm border-amber-200 dark:border-amber-900/50 dark:bg-slate-950 focus:border-amber-400 focus:ring-amber-200"
                                {...field}
                              />
                            </FormControl>
                            <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-400 dark:border-amber-800 rounded-r px-3 py-2 mt-2">
                              <p className="text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                                <span className="inline-block mt-0.5 text-base">
                                  <Lock className="w-4 h-4" />{" "}
                                </span>
                                <span className="flex-1">
                                  <strong className="font-semibold text-amber-900 dark:text-amber-200">Solo para gestores:</strong> Comentario privado que únicamente verán otros usuarios gestores del
                                  sistema. No se envía al proveedor.
                                </span>
                              </p>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Items disponibles */}
                <div className="border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-900/50 pl-5 pr-4 py-3 border-b dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-200 flex items-center gap-2">
                      <PackageIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Items Disponibles para Cotización
                    </h3>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs">
                        {selectedItems.length} / {availableItems.length}
                      </Badge>
                      <Button type="button" variant="outline" size="sm" onClick={handleSelectAllItems} className="h-8 text-xs">
                        {selectedItems.length === availableItems.length ? "Deseleccionar" : "Seleccionar Todo"}
                      </Button>
                      {quotedItems.length > 0 && (
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowQuotedItems(!showQuotedItems)} className="h-8 text-xs flex items-center gap-2">
                          {showQuotedItems ? (
                            <>
                              <EyeOff className="h-3.5 w-3.5" />
                              Ocultar Cotizados
                            </>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5" />
                              Mostrar Cotizados
                              <Badge variant="secondary" className="ml-1">
                                {quotedItems.length}
                              </Badge>
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {itemsToDisplay.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <PackageIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">
                        {availableItems.length === 0 && quotedItems.length === 0
                          ? "No hay items disponibles para enviar a cotización"
                          : "No hay items disponibles. Haz clic en 'Mostrar Cotizados' para ver los items ya cotizados."}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50/50 dark:bg-slate-900/50">
                            <TableHead className="w-12 py-2 pl-5">
                              <Checkbox checked={selectedItems.length === availableItems.length && availableItems.length > 0} onCheckedChange={handleSelectAllItems} />
                            </TableHead>
                            <TableHead className="font-semibold text-xs py-2">Ítem Solicitado</TableHead>
                            <TableHead className="font-semibold text-xs py-2 text-center">Cantidad</TableHead>
                            <TableHead className="font-semibold text-xs py-2">Unidad</TableHead>
                            <TableHead className="font-semibold text-xs py-2">Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itemsToDisplay.map((item: any) => {
                            // Verificar si el item está cotizado
                            const { isQuoted, folios } = getItemQuotationStatus(item.id);

                            // Manejo flexible de cantidad pendiente
                            const cantidadPendiente = item.cantidadPendiente ?? item.quantity ?? item.cantidad ?? 1;

                            // Manejo flexible de estructura de item
                            const nombre = item.repuesto?.nombre || item.name || "Sin nombre";
                            const unidad = item.repuesto?.unidad || item.unit || "-";

                            // id para asociar label con checkbox
                            const checkboxId = `item-checkbox-${item.id}`;

                            return (
                              <TableRow
                                key={item.id}
                                className={cn(
                                  "hover:bg-blue-50/50 dark:hover:bg-blue-900/20 border-b dark:border-slate-800 last:border-0",
                                  isQuoted && "bg-gray-50/50 dark:bg-slate-900/40 opacity-60",
                                )}
                              >
                                <TableCell className="py-2 pl-5">
                                  <Checkbox id={checkboxId} checked={selectedItems.includes(item.id)} onCheckedChange={() => handleItemToggle(item.id)} disabled={isQuoted} />
                                </TableCell>
                                <TableCell className={cn("py-2 text-sm font-medium", isQuoted ? "text-gray-500 dark:text-slate-500" : "text-gray-900 dark:text-slate-200")}>
                                  <label htmlFor={checkboxId} className={cn("cursor-pointer select-none", isQuoted ? "text-gray-500 dark:text-slate-500" : "text-gray-900 dark:text-slate-200")}>
                                    {nombre}
                                  </label>
                                </TableCell>
                                <TableCell className="py-2 text-center">
                                  <Badge variant="secondary" className="text-xs font-semibold">
                                    {cantidadPendiente}
                                  </Badge>
                                </TableCell>
                                <TableCell className={cn("py-2 text-sm", isQuoted ? "text-gray-500 dark:text-slate-500" : "text-gray-600 dark:text-slate-400")}>{unidad}</TableCell>
                                <TableCell className="py-2">
                                  {isQuoted ? (
                                    <div className="flex flex-wrap gap-1">
                                      <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800">
                                        Cotizado en:
                                      </Badge>
                                      {folios.map((folio, idx) => (
                                        <Badge key={idx} variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800">
                                          {folio}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <Badge variant="outline" className="text-xs text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950/30">
                                      Disponible
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Cotización general */}
                {/* <div className="space-y-4">
              <h3 className="text-lg font-medium">Opciones de Cotización</h3>
              <FormField
                control={form.control}
                name="incluirCotizacionGeneral"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={incluirCotizacionGeneral}
                        onCheckedChange={(checked) => {
                          const value = !!checked;
                          setIncluirCotizacionGeneral(value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Incluir Cotización General</FormLabel>
                      <p className="text-sm text-muted-foreground">Crear una cotización sin proveedor específico para búsqueda abierta</p>
                    </div>
                  </FormItem>
                )}
              />
            </div> */}

                {/* Selección de proveedores */}
                <div className="border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-900/50 pl-5 pr-4 py-3 border-b dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-200 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Seleccionar Proveedores
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs dark:bg-slate-800 dark:text-slate-300">
                        {selectedProveedores.length} seleccionado{selectedProveedores.length !== 1 ? "s" : ""}
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowNewProveedorDialog(true);
                        }}
                        className="h-8 text-xs gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Nuevo Proveedor
                      </Button>
                    </div>
                  </div>

                  {/* Filtro de búsqueda mejorado */}
                  <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-slate-900/50 dark:to-slate-950 border-b dark:border-slate-800">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Buscar por RUT, razón social o email..."
                        value={proveedorFilter}
                        onChange={(e) => setProveedorFilter(e.target.value)}
                        className="pl-10 pr-10 h-10 text-sm border-gray-300 dark:border-slate-700 dark:bg-slate-950 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white shadow-sm"
                      />
                      {proveedorFilter && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 transition-colors"
                          onClick={handleClearProveedorFilter}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {proveedorFilter && filteredProveedores.length > 0 && (
                      <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                        <span className="font-medium">{filteredProveedores.length}</span>
                        {filteredProveedores.length === 1 ? "resultado encontrado" : "resultados encontrados"}
                      </p>
                    )}
                  </div>

                  {loadingProveedores ? (
                    <div className="p-8 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-600" />
                      <p className="text-sm text-muted-foreground">Cargando proveedores...</p>
                    </div>
                  ) : filteredProveedores.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">{proveedorFilter ? "No se encontraron proveedores que coincidan con la búsqueda" : "No hay proveedores disponibles"}</p>
                    </div>
                  ) : (
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto custom-scrollbar">
                      {filteredProveedores.map((proveedor) => {
                        const isSelected = selectedProveedores.includes(proveedor.id);

                        return (
                          <Card
                            key={proveedor.id}
                            className={cn(
                              "cursor-pointer transition-all duration-200 border-2 group",
                              isSelected
                                ? "border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/40 shadow-md ring-2 ring-blue-200 dark:ring-blue-900/50"
                                : "border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-lg hover:scale-[1.02]",
                            )}
                            onClick={(e) => {
                              e.preventDefault();
                              handleProveedorToggle(proveedor.id);
                            }}
                          >
                            <CardHeader className="p-3 pb-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0 flex items-start gap-2">
                                  <div
                                    className={cn(
                                      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                                      isSelected
                                        ? "bg-blue-500 text-white"
                                        : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-950/50 group-hover:text-blue-600 dark:group-hover:text-blue-400",
                                    )}
                                  >
                                    <Building2 className="h-5 w-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <CardTitle className="text-sm font-semibold truncate text-gray-900 dark:text-slate-200 leading-tight">{proveedor.razonSocial || proveedor.nombre}</CardTitle>
                                    <CardDescription className="flex items-center text-xs mt-1">
                                      <CreditCard className="h-3 w-3 mr-1 flex-shrink-0 text-gray-500 dark:text-slate-500" />
                                      <span className="text-gray-600 dark:text-slate-400 truncate">{proveedor.rutProveedor || "Sin RUT"}</span>
                                    </CardDescription>
                                  </div>
                                </div>
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                >
                                  <Checkbox checked={isSelected} onCheckedChange={() => handleProveedorToggle(proveedor.id)} className="mt-0.5" />
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                              {proveedor.email && (
                                <div
                                  className={cn(
                                    "flex items-center text-xs rounded px-2 py-1.5 transition-colors",
                                    isSelected ? "bg-white/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300" : "bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400",
                                  )}
                                >
                                  <MailIcon className="h-3 w-3 mr-1.5 flex-shrink-0" />
                                  <span className="truncate font-medium">{proveedor.email}</span>
                                </div>
                              )}
                              {proveedor.telefono && (
                                <div
                                  className={cn(
                                    "flex items-center text-xs rounded px-2 py-1.5 mt-1.5 transition-colors",
                                    isSelected ? "bg-white/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300" : "bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400",
                                  )}
                                >
                                  <span className="mr-1.5">📞</span>
                                  <span className="truncate font-medium">{proveedor.telefono}</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Resumen de cotizaciones a crear */}
                {(selectedProveedores.length > 0 || incluirCotizacionGeneral) && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-200 dark:border-blue-900/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Resumen de Cotizaciones a Crear
                      </h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center py-1.5 px-3 bg-white dark:bg-slate-900 rounded">
                        <span className="text-gray-700 dark:text-slate-300 font-medium">Proveedores seleccionados:</span>
                        <Badge variant="secondary" className="font-semibold dark:bg-slate-800 dark:text-slate-100">
                          {selectedProveedores.length}
                        </Badge>
                      </div>
                      {incluirCotizacionGeneral && (
                        <div className="flex justify-between items-center py-1.5 px-3 bg-white dark:bg-slate-900 rounded">
                          <span className="text-gray-700 dark:text-slate-300 font-medium">Cotización general:</span>
                          <Badge variant="secondary" className="font-semibold dark:bg-slate-800 dark:text-slate-100">
                            1
                          </Badge>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-2 px-3 bg-blue-600 dark:bg-blue-700 text-white rounded mt-2 shadow-sm">
                        <span className="font-semibold">Total cotizaciones:</span>
                        <Badge className="bg-white text-blue-600 dark:text-blue-700 font-bold">{selectedProveedores.length + (incluirCotizacionGeneral ? 1 : 0)}</Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Errores de validación */}
                {selectedItems.length === 0 && availableItems.length > 0 && (
                  <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border-l-4 border-red-500 rounded-r p-3">
                    <span className="font-semibold">⚠</span>
                    <span>Debe seleccionar al menos un item para enviar a cotización.</span>
                  </div>
                )}
                {selectedItems.length > 0 && selectedProveedores.length === 0 && !incluirCotizacionGeneral && (
                  <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border-l-4 border-red-500 rounded-r p-3">
                    <span className="font-semibold">⚠</span>
                    <span>Debe seleccionar al menos un proveedor.</span>
                  </div>
                )}
              </div>

              {/* Botones de acción - Footer fijo */}
              <div className="flex justify-end gap-3 px-6 py-3 border-t bg-gray-50 dark:bg-slate-900 flex-shrink-0">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="min-w-24 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400">
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || selectedItems.length === 0 || (selectedProveedores.length === 0 && !incluirCotizacionGeneral)}
                  className="min-w-40 bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isCreating ? "Creando..." : "Procesando..."}
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Crear {selectedProveedores.length + (incluirCotizacionGeneral ? 1 : 0) > 1 ? "Cotizaciones" : "Cotización"}
                      {selectedProveedores.length + (incluirCotizacionGeneral ? 1 : 0) > 1 && (
                        <Badge variant="secondary" className="ml-2 bg-white text-blue-600 font-bold">
                          {selectedProveedores.length + (incluirCotizacionGeneral ? 1 : 0)}
                        </Badge>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Sub-diálogo: Crear Proveedor rápido */}
      <Dialog open={showNewProveedorDialog} onOpenChange={setShowNewProveedorDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Nuevo Proveedor
            </DialogTitle>
          </DialogHeader>
          <ProveedorForm
            showHeader={false}
            onCancel={() => setShowNewProveedorDialog(false)}
            onSuccess={(newProveedor) => {
              // Invalidar la query para que la lista se refresque
              queryClient.invalidateQueries({ queryKey: ["proveedores-cotizacion"] });
              // Pre-seleccionar el nuevo proveedor
              if (newProveedor?.id) {
                setSelectedProveedores((prev) => [...prev, newProveedor.id]);
              }
              setShowNewProveedorDialog(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
