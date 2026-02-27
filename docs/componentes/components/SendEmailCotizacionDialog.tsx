"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Mail, Loader2, AlertTriangle, Info } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getStatusLabel } from "@/utils/statusLabels";
import { formatearRut } from "@/lib/formats";
import { useCotizacion, useCotizacionActions } from "@/hooks/useCotizaciones";
import { EnviarCotizacionEmailSchema, type EnviarCotizacionEmailData } from "@/validations/solicitud-insumos/schemas";

interface Props {
  cotizacionId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SendEmailCotizacionDialog({ cotizacionId, open, onOpenChange }: Props) {
  const [isFechaOpen, setIsFechaOpen] = useState(false);

  const { data: cotizacionResp, isLoading } = useCotizacion(cotizacionId);
  const actions = useCotizacionActions();

  const cotizacion = cotizacionResp?.success ? cotizacionResp.data : null;

  const form = useForm<EnviarCotizacionEmailData>({
    resolver: zodResolver(EnviarCotizacionEmailSchema),
    defaultValues: {
      cotizacionId,
      proveedorId: 0, // Se actualizará con useEffect
      emailAddress: "",
      incluirAdjuntos: true,
      observaciones: "",
      fechaLimiteRespuesta: undefined,
    },
  });

  // Prellenar datos de la cotización cuando estén disponibles
  React.useEffect(() => {
    if (cotizacion && open) {
      // Proveedor ID
      if (cotizacion.proveedor?.id) {
        form.setValue("proveedorId", cotizacion.proveedor.id);
      }

      // Email del proveedor
      if (cotizacion.proveedor?.email) {
        form.setValue("emailAddress", cotizacion.proveedor.email);
      }

      // Fecha límite de respuesta
      if (cotizacion.fechaLimiteRespuesta) {
        form.setValue("fechaLimiteRespuesta", new Date(cotizacion.fechaLimiteRespuesta));
      }

      // Observaciones
      if (cotizacion.observaciones) {
        form.setValue("observaciones", cotizacion.observaciones);
      }
    }
  }, [cotizacion, open, form]);

  const onSubmit = async (data: EnviarCotizacionEmailData) => {
    // Verificar que tengamos el ID del proveedor
    if (!data.proveedorId || !cotizacion?.proveedor?.id) {
      console.error("No se encontró ID del proveedor");
      return;
    }

    console.log("Enviando cotización por email:", data);

    actions.sendEmail.mutate(data, {
      onSuccess: (result) => {
        console.log("Resultado del envío:", result);
        if (result.success) {
          onOpenChange(false);
          form.reset();
        } else {
          console.error("Error en el resultado:", result.message);
        }
      },
      onError: (error) => {
        console.error("Error al enviar email:", error);
      },
    });
  };

  const isSubmitting = actions.sendEmail.isPending;

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cargando cotización</DialogTitle>
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
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-red-600">Error: Cotización no encontrada</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Verificar si la cotización ya fue enviada
  const yaEnviada = cotizacion.status !== "PENDIENTE";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        {/* Header mejorado */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 dark:bg-black/20 rounded-lg p-2">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Enviar Cotización por Email</h2>
              <p className="text-blue-100 dark:text-blue-200 text-xs mt-0.5">Configure y envíe rápidamente</p>
            </div>
          </div>
        </div>

        {/* Contenido scrolleable */}
        <div className="px-3 py-0 space-y-2 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Información de la cotización */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-3 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Resumen de la Cotización</h3>
            <div className="grid grid-cols-3 gap-2">
              {/* Folio */}
              <div className="bg-white dark:bg-slate-950 rounded-lg p-2 border border-slate-200 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-0.5">Folio</p>
                <p className="text-base font-bold text-blue-600 dark:text-blue-400">{cotizacion.folio}</p>
              </div>
              {/* Estado */}
              <div className="bg-white dark:bg-slate-950 rounded-lg p-2 border border-slate-200 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-0.5">Estado</p>
                <p className="text-base font-bold text-slate-700 dark:text-slate-200">{getStatusLabel(cotizacion.status)}</p>
              </div>
              {/* Items */}
              <div className="bg-white dark:bg-slate-950 rounded-lg p-2 border border-slate-200 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-0.5">Items</p>
                <p className="text-base font-bold text-blue-600 dark:text-blue-400">{cotizacion.items?.length || 0}</p>
              </div>

              {/* Proveedor */}
              {cotizacion.proveedor ? (
                <>
                  <div className="bg-white dark:bg-slate-950 rounded-lg p-2 border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-0.5">Proveedor (RUT)</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatearRut(cotizacion.proveedor.rutProveedor || "") || "Sin RUT"}</p>
                  </div>
                  <div className="col-span-2 bg-white dark:bg-slate-950 rounded-lg p-2 border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-0.5">Razón Social</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{cotizacion.proveedor.razonSocial || cotizacion.proveedor.nombre || "Sin razón social"}</p>
                  </div>
                </>
              ) : (
                <div className="col-span-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg p-2 border border-amber-200 dark:border-amber-900/50">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-500 uppercase mb-0.5">Tipo de Cotización</p>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Cotización General (sin proveedor)</p>
                </div>
              )}
            </div>
          </div>

          {/* Advertencia si ya fue enviada */}
          {yaEnviada && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-400 uppercase tracking-tight text-[11px]">Atención:</p>
                <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                  Esta cotización ya fue enviada anteriormente. El estado actual es "{getStatusLabel(cotizacion.status)}".
                  {cotizacion.fechaEnvio && <> Enviada el {format(new Date(cotizacion.fechaEnvio), "dd/MM/yyyy HH:mm", { locale: es })}.</>}
                </p>
              </div>
            </div>
          )}

          {/* Advertencia si no hay proveedor ID */}
          {!cotizacion?.proveedor?.id && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-red-800 dark:text-red-400 uppercase tracking-tight text-[11px]">Error:</p>
                <p className="text-red-700 dark:text-red-300">No se puede enviar la cotización porque no hay información del proveedor.</p>
              </div>
            </div>
          )}

          {/* Formulario */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
              {/* Email del Proveedor */}
              <FormField
                control={form.control}
                name="emailAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">
                      Email del Proveedor
                      {cotizacion.proveedor?.email && <span className="ml-2 text-xs text-green-600 font-normal">(prellenado)</span>}
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@proveedor.com" className="border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:border-blue-500 focus:ring-blue-200" {...field} />
                    </FormControl>
                    <FormMessage />
                    {!cotizacion.proveedor?.email && <p className="text-xs text-muted-foreground">No hay email configurado. Ingrese manualmente.</p>}
                  </FormItem>
                )}
              />

              {/* Fecha Límite de Respuesta */}
              <FormField
                control={form.control}
                name="fechaLimiteRespuesta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">
                      Fecha Límite de Respuesta (Opcional)
                      {cotizacion.fechaLimiteRespuesta && <span className="ml-2 text-xs text-green-600 font-normal">(prellenado)</span>}
                    </FormLabel>
                    <Popover open={isFechaOpen} onOpenChange={setIsFechaOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal border-slate-200 dark:border-slate-800 dark:bg-slate-950 hover:border-blue-300 dark:hover:border-blue-800",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha límite</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setIsFechaOpen(false);
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
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
                    <FormLabel className="text-sm font-semibold">
                      Observaciones Adicionales (Opcional)
                      {cotizacion.observaciones && <span className="ml-2 text-xs text-green-600 font-normal">(prellenado)</span>}
                    </FormLabel>
                    <div className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-400 dark:border-blue-700 rounded-r px-3 py-2 mb-3">
                      <p className="text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong className="font-semibold">Nota:</strong> La observación se precarga desde la creación de la solicitud, puede editarse aquí antes de enviar el email.
                        </span>
                      </p>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Instrucciones o detalles para el proveedor..."
                        className="min-h-[100px] border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:border-blue-500 focus:ring-blue-200 resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Incluir Adjuntos */}
              <FormField
                control={form.control}
                name="incluirAdjuntos"
                render={({ field }) => (
                  <FormItem className="flex items-start space-x-3 bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-900/50">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-1" />
                    </FormControl>
                    <div className="space-y-1 leading-none flex-1">
                      <FormLabel className="text-sm font-semibold cursor-pointer dark:text-slate-200">Incluir adjuntos y especificaciones técnicas</FormLabel>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Se incluirán automáticamente fichas técnicas y detalles de los items en el email.</p>
                    </div>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        {/* Footer con botones */}
        <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all"
            disabled={isSubmitting || !form.watch("emailAddress") || !form.watch("proveedorId")}
            onClick={() => form.handleSubmit(onSubmit)()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Enviar Email
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
