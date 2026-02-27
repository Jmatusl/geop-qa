"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SolicitudInsumosCreateSchema, type SolicitudInsumosCreateData } from "@/validations/solicitud-insumos/schemas";
import { createSolicitudInsumos, getFormData } from "@/actions/solicitud-insumos/solicitudActions";

interface CreateSolicitudDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const SHOW_AREA_PRIORITY_DATE = process.env.NEXT_PUBLIC_SHOW_AREA_PRIORITY_DATE === "true";

export default function CreateSolicitudDialog({ open, onOpenChange, onSuccess }: CreateSolicitudDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Obtener datos para los selectores
  const { data: formData, isLoading: isLoadingFormData } = useQuery({
    queryKey: ["form-data-solicitudes"],
    queryFn: getFormData,
  });

  const ships = formData?.success && formData.data ? formData.data.ships : [];
  const solicitantes = formData?.success && formData.data ? formData.data.solicitantes : [];
  const areas = formData?.success && formData.data ? formData.data.areas : [];

  const form = useForm<SolicitudInsumosCreateData>({
    resolver: zodResolver(SolicitudInsumosCreateSchema),
    defaultValues: {
      shipId: 0,
      solicitanteId: 0,
      prioridad: "NORMAL",
      descripcion: "",
      observaciones: "",
      items: [
        {
          name: "",
          categoriaInsumosId: undefined,
          quantity: 1,
          unit: "UNI",
          urgency: "NORMAL",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const createMutation = useMutation({
    mutationFn: createSolicitudInsumos,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        form.reset();
        onSuccess();
      } else {
        toast.error(result.message);
      }
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast.error("Error al crear la solicitud");
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: SolicitudInsumosCreateData) => {
    setIsSubmitting(true);
    createMutation.mutate(data);
  };

  const addItem = () => {
    append({
      name: "",
      categoriaInsumosId: undefined,
      quantity: 1,
      unit: "UNI",
      urgency: "NORMAL",
    });
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const categoryOptions = [
    { value: "consumible", label: "Consumible" },
    { value: "repuesto", label: "Repuesto" },
    { value: "herramienta", label: "Herramienta" },
    { value: "equipo", label: "Equipo" },
    { value: "otro", label: "Otro" },
  ];

  const prioridadOptions = [
    { value: "BAJA", label: "Baja" },
    { value: "NORMAL", label: "Normal" },
    { value: "ALTA", label: "Alta" },
    { value: "URGENTE", label: "Urgente" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Solicitud de Insumos</DialogTitle>
          <DialogDescription>Complete la información para crear una nueva solicitud de insumos.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Información Principal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Instalación */}
              <FormField
                control={form.control}
                name="shipId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instalación *</FormLabel>
                    <Select value={field.value?.toString() || ""} onValueChange={(value) => field.onChange(parseInt(value))} disabled={isLoadingFormData}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar instalación" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ships.map((ship) => (
                          <SelectItem key={ship.id} value={ship.id.toString()}>
                            {ship.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Solicitante */}
              <FormField
                control={form.control}
                name="solicitanteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Solicitante *</FormLabel>
                    <Select value={field.value?.toString() || ""} onValueChange={(value) => field.onChange(parseInt(value))} disabled={isLoadingFormData}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar solicitante" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {solicitantes.map((solicitante) => (
                          <SelectItem key={solicitante.id} value={solicitante.id.toString()}>
                            {solicitante.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {SHOW_AREA_PRIORITY_DATE && (
                <>
                  {/* Área */}
                  <FormField
                    control={form.control}
                    name="areaId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Área</FormLabel>
                        <Select value={field.value?.toString() || "NONE"} onValueChange={(value) => field.onChange(value === "NONE" ? undefined : parseInt(value))} disabled={isLoadingFormData}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar área (opcional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="NONE">Sin área específica</SelectItem>
                            {areas.map((area) => (
                              <SelectItem key={area.id} value={area.id.toString()}>
                                {area.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Prioridad */}
                  <FormField
                    control={form.control}
                    name="prioridad"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridad</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar prioridad" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {prioridadOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>

            {SHOW_AREA_PRIORITY_DATE && (
              /* Fecha Estimada de Entrega */
              <FormField
                control={form.control}
                name="fechaEstimadaEntrega"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha Estimada de Entrega</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus locale={es} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Descripción */}
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción *</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descripción general de la solicitud" className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Observaciones */}
            <FormField
              control={form.control}
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observaciones adicionales (opcional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Items Solicitados</h3>
                <Button type="button" onClick={addItem} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Item
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button type="button" variant="outline" size="sm" onClick={() => removeItem(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Nombre */}
                    <FormField
                      control={form.control}
                      name={`items.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre *</FormLabel>
                          <FormControl>
                            <Input placeholder="Nombre del item" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Categoría */}
                    <FormField
                      control={form.control}
                      name={`items.${index}.categoriaInsumosId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoría</FormLabel>
                          <Select value={field.value != null ? String(field.value) : ""} onValueChange={(v) => field.onChange(v === "" ? undefined : v)}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categoryOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Urgencia */}
                    <FormField
                      control={form.control}
                      name={`items.${index}.urgency`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Urgencia</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {prioridadOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Cantidad */}
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cantidad *</FormLabel>
                          <FormControl>
                            <Input type="number" min="0.01" step="0.01" placeholder="0" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Unidad */}
                    <FormField
                      control={form.control}
                      name={`items.${index}.unit`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unidad *</FormLabel>
                          <FormControl>
                            <Input placeholder="kg, litros, unidades, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Tamaño de paquete */}
                    <FormField
                      control={form.control}
                      name={`items.${index}.packageSize`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tamaño de Paquete</FormLabel>
                          <FormControl>
                            <Input placeholder="ej: caja de 12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Especificaciones técnicas */}
                  <FormField
                    control={form.control}
                    name={`items.${index}.technicalSpec`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Especificaciones Técnicas</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Especificaciones técnicas del item (opcional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Notas */}
                  <FormField
                    control={form.control}
                    name={`items.${index}.notes`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Notas adicionales sobre el item (opcional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-2 pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || isLoadingFormData}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Solicitud
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
