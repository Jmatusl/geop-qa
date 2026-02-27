"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, Building2, Calendar, Package, AlertCircle, ChevronDown, DollarSign, Calculator, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";
import { receiveSupplierResponseInternal } from "@/actions/solicitud-insumos/cotizacionActions";
import { createCotizacionAdjunto } from "@/actions/solicitud-insumos/cotizacionActions";

const itemResponseSchema = z.object({
  id: z.number(),
  unitPrice: z.coerce
    .number()
    .min(0, "El precio unitario no puede ser negativo")
    .nullable()
    .optional()
    .transform((val) => val ?? 0),
  totalPrice: z.coerce
    .number()
    .min(0, "El precio total no puede ser negativo")
    .nullable()
    .optional()
    .transform((val) => val ?? 0),
  leadTime: z.coerce.number().int().positive("El tiempo de entrega debe ser mayor a 0").optional(),
  supplierSku: z.string().max(100, "El SKU es muy largo").optional(),
  disponibilidad: z.string().max(100, "La disponibilidad es muy larga").optional(),
  marcaProveedor: z.string().max(100, "La marca es muy larga").optional(),
  modeloProveedor: z.string().max(100, "El modelo es muy largo").optional(),
  observaciones: z.string().max(500, "Las observaciones son muy largas").optional(),
  cotizado: z.boolean().default(true).optional(), // Nuevo campo: indica si fue cotizado por el proveedor
});

const responseSchema = z
  .object({
    id: z.number(),
    observacionesDelProveedor: z.string().max(500, "Las observaciones son muy largas").optional(),
    leadTime: z.coerce.number().int().positive().optional(),
    condicionesPago: z.string().max(200, "Las condiciones de pago son muy largas").optional(),
    validezCotizacion: z.date().optional(),
    neto: z.coerce.number().min(0, "El neto no puede ser negativo").optional(),
    iva: z.coerce.number().min(0, "El IVA no puede ser negativo").optional(),
    totalEstimado: z.coerce.number().min(0, "El total no puede ser negativo").optional(),
    items: z.array(itemResponseSchema),
  })
  .refine(
    (data) => {
      // Validar que al menos un item fue cotizado
      return data.items.some((item) => {
        const cotizado = item.cotizado !== false;
        return cotizado;
      });
    },
    {
      message: "Debe cotizar al menos un item o marcar items como no cotizados",
      path: ["items"],
    },
  )
  .refine(
    (data) => {
      // El neto es OBLIGATORIO y debe ser un número válido mayor a 0
      if (data.neto === undefined || data.neto === null) {
        return false; // Rechazar si está vacío
      }
      const netoValue = typeof data.neto === "string" ? parseFloat(data.neto) : data.neto;
      if (isNaN(netoValue) || netoValue <= 0) {
        return false; // Rechazar si es 0, negativo o NaN
      }
      return true;
    },
    {
      message: "El neto (subtotal) es obligatorio y debe ser mayor a 0",
      path: ["neto"],
    },
  )
  .refine(
    (data) => {
      // Si se ingresa IVA, validar que haya neto
      if (data.iva !== undefined && data.iva !== null) {
        const ivaValue = typeof data.iva === "string" ? parseFloat(data.iva) : data.iva;
        if (!isNaN(ivaValue) && ivaValue > 0) {
          // Si hay IVA, debe haber neto
          if (!data.neto || data.neto <= 0) {
            return false;
          }
        }
      }
      return true;
    },
    {
      message: "Debe ingresar el neto antes del IVA",
      path: ["iva"],
    },
  )
  .refine(
    (data) => {
      // Si se ingresa total, debe ser mayor a 0. Permite undefined (campo vacío)
      if (data.totalEstimado !== undefined && data.totalEstimado !== null) {
        const totalValue = typeof data.totalEstimado === "string" ? parseFloat(data.totalEstimado) : data.totalEstimado;
        if (isNaN(totalValue) || totalValue <= 0) {
          return false; // Si tiene valor pero es <= 0 o NaN, rechazar
        }
      }
      return true; // Si es undefined o null, permitir
    },
    {
      message: "El total debe ser mayor a 0",
      path: ["totalEstimado"],
    },
  )
  .refine(
    (data) => {
      // Si se ingresan neto, iva y total, validar que sean consistentes
      const neto = typeof data.neto === "string" ? parseFloat(data.neto) : data.neto || 0;
      const iva = typeof data.iva === "string" ? parseFloat(data.iva) : data.iva || 0;
      const total = typeof data.totalEstimado === "string" ? parseFloat(data.totalEstimado) : data.totalEstimado || 0;

      // Solo validar si hay valores ingresados
      if (neto > 0 && total > 0) {
        const expectedTotal = neto + iva;
        // Permitir una pequeña diferencia por redondeo
        const diff = Math.abs(expectedTotal - total);
        return diff < 1;
      }
      return true;
    },
    {
      message: "El total debe ser igual a neto + IVA",
      path: ["totalEstimado"],
    },
  );

type ResponseFormData = z.infer<typeof responseSchema>;

interface Props {
  cotizacion: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function ManualCotizacionDialog({ cotizacion, open, onOpenChange, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedMeta, setUploadedMeta] = useState<Array<{ key: string; url?: string | null; filename?: string | null; filesize?: number | null; filetype?: string | null }>>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isMontosOpen, setIsMontosOpen] = useState(true); // Estado para el collapsible de montos - expandido por defecto
  const [isItemsOpen, setIsItemsOpen] = useState(false); // Estado para el collapsible de items - colapsado por defecto

  // Constante para el IVA (19%)
  const IVA_RATE = 0.19;

  // Funciones de formateo para separador de miles
  const formatNumber = (value: number | string | undefined): string => {
    if (value === undefined || value === null || value === "") return "";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "";
    return Math.round(num)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseFormattedNumber = (value: string): number | undefined => {
    if (!value || value.trim() === "") return undefined;
    const parsed = parseFloat(value.replace(/\./g, ""));
    return isNaN(parsed) ? undefined : parsed;
  };

  // Validación temprana de datos
  if (!cotizacion || !cotizacion.items || !Array.isArray(cotizacion.items)) {
    return null;
  }

  const form = useForm<ResponseFormData>({
    resolver: zodResolver(responseSchema),
    defaultValues: {
      id: cotizacion.id,
      observacionesDelProveedor: "",
      leadTime: undefined,
      condicionesPago: "",
      validezCotizacion: undefined,
      neto: undefined,
      iva: undefined,
      totalEstimado: undefined,
      items: cotizacion.items.map((item: any) => ({
        id: item.id,
        unitPrice: 0,
        totalPrice: 0,
        leadTime: undefined,
        supplierSku: "",
        disponibilidad: "",
        marcaProveedor: "",
        modeloProveedor: "",
        observaciones: "",
        cotizado: true, // Por defecto, se asume que fue cotizado
      })),
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Calcular IVA y Total automáticamente cuando cambia el neto
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "neto") {
        const netoValue = value.neto;

        // Si el neto es undefined o null, limpiar IVA y Total
        if (netoValue === undefined || netoValue === null) {
          form.setValue("iva", undefined, { shouldValidate: false });
          form.setValue("totalEstimado", undefined, { shouldValidate: false });
          return;
        }

        const neto = typeof netoValue === "string" ? parseFloat(netoValue) : netoValue;

        // Si el neto no es un número válido o es 0, limpiar IVA y Total
        if (isNaN(neto) || neto <= 0) {
          form.setValue("iva", undefined, { shouldValidate: false });
          form.setValue("totalEstimado", undefined, { shouldValidate: false });
          return;
        }

        // Calcular IVA y Total
        const iva = Math.round(neto * IVA_RATE);
        const total = neto + iva;

        form.setValue("iva", iva, { shouldValidate: false });
        form.setValue("totalEstimado", total, { shouldValidate: false });
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Calcular precio total automáticamente
  const handleUnitPriceChange = (index: number, unitPrice: number) => {
    if (!cotizacion.items || !cotizacion.items[index]) return;

    const item = cotizacion.items[index];
    const quantity = Number(item.quantity) || 1;
    const totalPrice = unitPrice * quantity;
    form.setValue(`items.${index}.totalPrice`, totalPrice);
  };

  // Observar neto (dispara recalculos de IVA en efecto existente)
  const watchedNeto = form.watch("neto");

  // Sumar todos los Total Neto de los items (devuelve número)
  const computeItemsTotal = (): number => {
    let sum = 0;
    for (let i = 0; i < fields.length; i++) {
      const v = form.getValues(`items.${i}.totalPrice`);
      let num = 0;
      if (v !== undefined && v !== null) {
        num = typeof v === "string" ? (parseFormattedNumber(v) ?? 0) : (Number(v) ?? 0);
      }
      sum += num;
    }
    return sum;
  };

  // Handler que llena el campo neto con la suma de Totales Netos
  const handleFillNetoWithItemsTotal = () => {
    const sum = computeItemsTotal();
    if (!sum || sum <= 0) {
      // No hay totales válidos para sumar
      return;
    }

    const currentNeto = form.getValues("neto");
    // Verificar si hay un neto actual válido (diferente a undefined, null o 0)
    if (currentNeto !== undefined && currentNeto !== null) {
      const currentNetoNum = Number(currentNeto);
      if (!isNaN(currentNetoNum) && currentNetoNum > 0 && Math.abs(currentNetoNum - sum) > 0) {
        const confirmMsg = `El neto actual es ${formatNumber(currentNeto)}. Reemplazar por la suma (${formatNumber(sum)})?`;
        if (!confirm(confirmMsg)) return;
      }
    }

    // Asignar número puro (no formateado) para que las validaciones y el envío guarden números
    form.setValue("neto", sum, { shouldValidate: true });
  };

  const onSubmit = async (data: ResponseFormData) => {
    setIsSubmitting(true);

    try {
      // Asegurar que los valores estén sanitizados y sean números puros
      const processedData = {
        ...data,
        neto: typeof data.neto === "string" ? parseFormattedNumber(data.neto) : data.neto,
        iva: typeof data.iva === "string" ? parseFormattedNumber(data.iva) : data.iva,
        totalEstimado: typeof data.totalEstimado === "string" ? parseFormattedNumber(data.totalEstimado) : data.totalEstimado,
        items: data.items.map((item) => ({
          ...item,
          unitPrice: typeof item.unitPrice === "string" ? parseFormattedNumber(item.unitPrice) : item.unitPrice || 0,
          totalPrice: typeof item.totalPrice === "string" ? parseFormattedNumber(item.totalPrice) : item.totalPrice || 0,
        })),
      };

      const result = await receiveSupplierResponseInternal(cotizacion.id, processedData);

      if (result.success) {
        // Si hay archivos seleccionados, subirlos primero (si no se subieron aún)
        try {
          if (files.length > 0 && uploadedMeta.length === 0) {
            setUploading(true);
            const metas: typeof uploadedMeta = [];
            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              const fd = new FormData();
              fd.append("file", file);
              fd.append("filename", file.name);
              fd.append("contentType", file.type || "application/octet-stream");

              const res = await fetch("/api/uploads/r2-simple", { method: "POST", body: fd });
              const json = await res.json();
              if (!json?.success) throw new Error(json?.error || "Error al subir archivo");

              metas.push({ key: json.data.key, url: json.data.url, filename: json.data.filename, filesize: json.data.filesize, filetype: json.data.filetype });
            }
            setUploadedMeta(metas);
          }

          // Registrar adjuntos en la DB vinculados a la cotización
          for (const m of uploadedMeta.length > 0 ? uploadedMeta : []) {
            await createCotizacionAdjunto(cotizacion.id, {
              key: m.key,
              url: m.url || null,
              filename: m.filename || "",
              filesize: m.filesize || null,
              filetype: m.filetype || null,
            } as any);
          }
        } catch (e: any) {
          console.error("Error al subir/registrar adjuntos:", e);
          // No interrumpe el flujo principal
          toast.error("Error al subir adjuntos (se guardó la cotización)");
        } finally {
          setUploading(false);
        }

        toast.success("Cotización ingresada exitosamente");

        // Invalidar cache de react-query para refrescar CotizacionDetailDialog
        queryClient.invalidateQueries({ queryKey: ["cotizacion", cotizacion.id] });
        queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });

        onOpenChange(false);
        onSuccess?.();
        form.reset();
        // limpiar archivos
        setFiles([]);
        setUploadedMeta([]);
      } else {
        // Mostrar error con mensaje específico del servidor
        const errorMsg = result.message || "Error al ingresar la cotización";

        // Detectar si es error de valores demasiado altos
        if (
          errorMsg.toLowerCase().includes("demasiado alto") ||
          errorMsg.toLowerCase().includes("exceden") ||
          errorMsg.toLowerCase().includes("numeric") ||
          errorMsg.toLowerCase().includes("overflow")
        ) {
          toast.error("⚠️ Los valores son demasiado altos. Los montos y precios no pueden exceder 999.999.999.", {
            description: "Por favor, verifica los valores ingresados en Precio Unit., Total Neto, Neto, IVA o Total.",
          });
        } else if (errorMsg.toLowerCase().includes("validación")) {
          toast.error("❌ Error de validación: " + errorMsg);
        } else {
          toast.error(errorMsg);
        }
      }
    } catch (error) {
      console.error("Error submitting manual response:", error);
      toast.error("Error al ingresar la cotización");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Ingresar Cotización Manual - {cotizacion.folio}
          </DialogTitle>
          <DialogDescription>Complete los precios y detalles de la cotización recibida por correo o otros medios</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Información de la Cotización */}
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 dark:text-blue-400">
                <Building2 className="h-4 w-4" />
                Información de la Cotización
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Folio:</span>
                  <div className="font-medium dark:text-slate-200">{cotizacion.folio}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Proveedor:</span>
                  <div className="font-medium dark:text-slate-200">{cotizacion.proveedor?.razonSocial || "Cotización general"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Fecha de emisión:</span>
                  <div className="font-medium dark:text-slate-200">{format(new Date(cotizacion.createdAt), "dd/MM/yyyy", { locale: es })}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Adjuntos de la cotización manual */}
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg dark:text-slate-200">Adjuntar archivos (PDF / Excel)</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div>
                <input
                  id="manual-cotizacion-files"
                  type="file"
                  accept="application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  multiple
                  onChange={async (e) => {
                    const selected = Array.from(e.target.files || []);
                    if (selected.length === 0) return;
                    setFiles(selected);
                    // subir inmediatamente similar al patrón existente
                    setUploading(true);
                    try {
                      const metas: typeof uploadedMeta = [];
                      for (let i = 0; i < selected.length; i++) {
                        const file = selected[i];
                        const fd = new FormData();
                        fd.append("file", file);
                        fd.append("filename", file.name);
                        fd.append("contentType", file.type || "application/octet-stream");

                        const res = await fetch("/api/uploads/r2-simple", { method: "POST", body: fd });
                        const json = await res.json();
                        if (!json?.success) throw new Error(json?.error || "Error al subir archivo");

                        metas.push({ key: json.data.key, url: json.data.url, filename: json.data.filename, filesize: json.data.filesize, filetype: json.data.filetype });
                      }
                      setUploadedMeta(metas);
                      toast.success(`${metas.length} archivo(s) subido(s)`);
                    } catch (e: any) {
                      console.error("Error subiendo archivos:", e);
                      toast.error(e?.message || "Error al subir archivos");
                    } finally {
                      setUploading(false);
                    }
                  }}
                  className="sr-only"
                />

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById("manual-cotizacion-files") as HTMLInputElement | null;
                      input?.click();
                    }}
                    className="dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    Seleccionar archivos
                  </Button>
                  {files.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setFiles([]);
                        setUploadedMeta([]);
                      }}
                      className="dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      Limpiar
                    </Button>
                  )}
                </div>

                {uploading && <div className="text-sm text-muted-foreground mt-2">Subiendo archivos…</div>}

                {uploadedMeta.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {uploadedMeta.map((m, i) => (
                      <a
                        key={`${m.key}-${i}`}
                        href={m.url || "#"}
                        target={m.url ? "_blank" : undefined}
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-2 py-1 border rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50"
                      >
                        {m.filename}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Advertencia */}
          <div className="flex items-start gap-3 p-4 border border-orange-200 dark:border-orange-900/50 rounded-lg bg-orange-50 dark:bg-orange-950/20 shadow-sm">
            <AlertCircle className="h-5 w-5 text-orange-500 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-orange-800 dark:text-orange-400 uppercase tracking-tight text-[11px]">Ingreso Manual de Cotización</p>
              <p className="text-orange-700 dark:text-orange-300 mt-1">
                Esta función permite ingresar manualmente los datos de una cotización recibida por correo, teléfono u otros medios. La cotización cambiará automáticamente al estado "Recibida".
              </p>
            </div>
          </div>

          {/* Formulario */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              {/* Card Collapsible de Montos */}
              <Collapsible open={isMontosOpen} onOpenChange={setIsMontosOpen}>
                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors py-3 border-b dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2 dark:text-green-400">
                          <DollarSign className="h-5 w-5 text-green-600 dark:text-green-500" />
                          Montos de la Cotización
                        </CardTitle>
                        <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${isMontosOpen ? "rotate-180" : ""}`} />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-2 pb-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <FormField
                          control={form.control}
                          name="neto"
                          render={({ field }) => {
                            const itemsSum = computeItemsTotal();
                            const currentNeto = form.getValues("neto");
                            const showMismatch = itemsSum > 0 && currentNeto !== undefined && currentNeto !== null && Number(currentNeto) !== Number(itemsSum);

                            return (
                              <FormItem>
                                <FormLabel>
                                  Neto (Subtotal) <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="text"
                                      placeholder="Ingrese el neto"
                                      value={formatNumber(field.value)}
                                      onChange={(e) => {
                                        const parsed = parseFormattedNumber(e.target.value);
                                        field.onChange(parsed);
                                      }}
                                      onBlur={field.onBlur}
                                      className="flex-1"
                                    />
                                    <Button type="button" variant="outline" onClick={handleFillNetoWithItemsTotal} title="Sumar Totales Netos">
                                      <Calculator className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />

                                {showMismatch && <div className="text-sm text-red-600 mt-1">El neto ingresado no coincide con la suma de Totales Netos ({formatNumber(itemsSum)})</div>}
                              </FormItem>
                            );
                          }}
                        />

                        <FormField
                          control={form.control}
                          name="iva"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-300">IVA (19%)</FormLabel>
                              <FormControl>
                                <Input type="text" placeholder="0" value={formatNumber(field.value)} readOnly className="bg-gray-50 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="totalEstimado"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-slate-300">Total</FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder="0"
                                  value={formatNumber(field.value)}
                                  readOnly
                                  className="bg-gray-50 dark:bg-slate-950 dark:border-slate-800 font-semibold dark:text-slate-200"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Tabla de Items - Collapsible */}
              <Collapsible open={isItemsOpen} onOpenChange={setIsItemsOpen}>
                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors py-3 border-b dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg flex items-center gap-2 dark:text-blue-400">
                            <Package className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                            Items a Cotizar
                          </CardTitle>
                          <Badge
                            variant="outline"
                            className="text-xs font-normal bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 flex items-center gap-1"
                          >
                            <Info className="h-3 w-3" />
                            Precio Unit., Total Neto y Observaciones son valores opcionales
                          </Badge>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${isItemsOpen ? "rotate-180" : ""}`} />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-2 pb-3">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[80px]">Cotizado</TableHead>
                              <TableHead className="w-[200px]">Item</TableHead>
                              <TableHead className="w-[80px]">Cantidad</TableHead>
                              <TableHead className="w-[80px]">Unidad</TableHead>
                              <TableHead className="w-[120px]">Precio Unit.</TableHead>
                              <TableHead className="w-[120px]">Total Neto</TableHead>
                              {/* Entrega (días) column hidden */}
                              <TableHead className="w-[150px]">Observaciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fields.map((field, index) => {
                              const cotizacionItem = cotizacion.items?.[index];
                              if (!cotizacionItem) return null;

                              const isCotizado = form.watch(`items.${index}.cotizado`) !== false;
                              // Verificar si el item de la solicitud ya tiene una cotización aprobada
                              const isAlreadyApproved = cotizacionItem.solicitudItem?.approvedCotizacionId != null;

                              return (
                                <TableRow key={field.id} className={isAlreadyApproved ? "bg-gray-50 dark:bg-slate-800/50 opacity-60" : "dark:border-slate-800"}>
                                  <TableCell>
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.cotizado`}
                                      render={({ field }) => (
                                        <FormItem className="flex items-center justify-center">
                                          <FormControl>
                                            <input
                                              type="checkbox"
                                              checked={field.value !== false}
                                              onChange={(e) => {
                                                field.onChange(e.target.checked);
                                                // Si se desmarca, limpiar los valores
                                                if (!e.target.checked) {
                                                  form.setValue(`items.${index}.unitPrice`, 0);
                                                  form.setValue(`items.${index}.totalPrice`, 0);
                                                  form.setValue(`items.${index}.leadTime`, undefined);
                                                  form.setValue(`items.${index}.observaciones`, "");
                                                }
                                              }}
                                              disabled={isAlreadyApproved}
                                              className="h-4 w-4 rounded border-gray-300"
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="font-medium">{cotizacionItem.name}</div>
                                      {cotizacionItem.technicalSpec && <div className="text-sm text-muted-foreground">{cotizacionItem.technicalSpec}</div>}
                                      {isAlreadyApproved && (
                                        <Badge variant="default" className="text-xs bg-green-600">
                                          Ya aprobado - COT-{String(cotizacionItem.solicitudItem.approvedCotizacionId).padStart(4, "0")}
                                        </Badge>
                                      )}
                                      {!isCotizado && !isAlreadyApproved && (
                                        <Badge variant="destructive" className="text-xs">
                                          No cotizado
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">{Number(cotizacionItem.quantity)}</Badge>
                                  </TableCell>
                                  <TableCell>{cotizacionItem.unit}</TableCell>
                                  <TableCell>
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.unitPrice`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormControl>
                                            <Input
                                              type="text"
                                              placeholder="0"
                                              className="w-full"
                                              disabled={!isCotizado || isAlreadyApproved}
                                              value={formatNumber(field.value)}
                                              onChange={(e) => {
                                                const parsed = parseFormattedNumber(e.target.value);
                                                const value = parsed ?? 0;
                                                field.onChange(value);
                                                handleUnitPriceChange(index, value);
                                              }}
                                              onBlur={field.onBlur}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.totalPrice`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormControl>
                                            <Input type="text" placeholder="0" className="w-full" disabled={!isCotizado || isAlreadyApproved} value={formatNumber(field.value)} readOnly />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  </TableCell>
                                  {/* Entrega (días) column hidden */}
                                  <TableCell>
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.observaciones`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormControl>
                                            <Input
                                              placeholder={isAlreadyApproved ? "Ya aprobado" : isCotizado ? "Notas" : "No cotizado"}
                                              className="w-full"
                                              disabled={!isCotizado || isAlreadyApproved}
                                              {...field}
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Información General */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Información General</CardTitle>
                </CardHeader>
                <CardContent className="pt-2 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <FormField
                      control={form.control}
                      name="leadTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tiempo de Entrega General (días)</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" placeholder="7" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="condicionesPago"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condiciones de Pago</FormLabel>
                          <FormControl>
                            <Input placeholder="30 días, contado, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="validezCotizacion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Validez de la Cotización</FormLabel>
                          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button type="button" variant="outline" className="w-full pl-3 text-left font-normal" onClick={() => setIsCalendarOpen(true)}>
                                  {field.value ? format(field.value, "dd/MM/yyyy", { locale: es }) : <span>Seleccionar fecha</span>}
                                  <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  field.onChange(date);
                                  setIsCalendarOpen(false);
                                }}
                                locale={es}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="observacionesDelProveedor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observaciones del Proveedor a la Solicitud de Cotización (opcional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Incluya cualquier información adicional relevante para esta cotización..." rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Botones */}
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ingresando...
                    </>
                  ) : (
                    "Ingresar Cotización"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
