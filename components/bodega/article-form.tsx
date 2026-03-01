"use client";

/**
 * COMPONENTE - FORMULARIO DE ARTÍCULO (AUTOCONTENIDO)
 *
 * Usado en:
 * - /bodega/maestros/articulos → BaseMaintainer (onSubmit externo)
 * - CrearArticuloDialog (popup desde ingreso/retiro) → onSuccess devuelve el objeto creado
 *
 * PATRÓN: Un solo componente, dos modos de uso.
 * - Modo Mantenedor: recibe `onSubmit` externo, sin mutaciones internas.
 * - Modo Dialog: recibe `onSuccess` con callback que recibe el artículo creado.
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, Wand2, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { bodegaArticleSchema } from "@/lib/validations/bodega-master";
import { useCreateBodegaArticle, useUpdateBodegaArticle, type BodegaArticle } from "@/lib/hooks/bodega/use-bodega-articles";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type FormValues = z.infer<typeof bodegaArticleSchema>;

interface ArticleFormProps {
  // ── Modo Mantenedor ───────────────────────────────────────────────────────
  initialData?: Partial<BodegaArticle & { id: string }>;
  /** Llamado externamente por BaseMaintainer. Si se provee, el formulario no hace mutaciones internas. */
  onSubmit?: (data: FormValues) => Promise<void>;
  isLoading?: boolean;

  // ── Modo Dialog ───────────────────────────────────────────────────────────
  /** Llamado tras crear/actualizar internamente. Recibe el objeto devuelto por la API. */
  onSuccess?: (articulo?: BodegaArticle) => void;

  // ── Compartido ────────────────────────────────────────────────────────────
  onCancel?: () => void;
  /** Si es true, los botones son inline (sin barra fija inferior). Usar siempre dentro de Dialog/Sheet. */
  inDialog?: boolean;
  /** Si se omite showExtendedFields, el formulario muestra TODOS los campos del legacy */
  compactMode?: boolean;
}

export function ArticleForm({ initialData, onSubmit: externalSubmit, isLoading = false, onSuccess, onCancel, inDialog = false, compactMode = false }: ArticleFormProps) {
  // Mutaciones internas (sólo úsadas en Modo Dialog, cuando no hay onSubmit externo)
  const crearMutation = useCreateBodegaArticle();
  const actualizarMutation = useUpdateBodegaArticle();

  const form = useForm<FormValues>({
    resolver: zodResolver(bodegaArticleSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      partNumber: "",
      brand: "",
      model: "",
      internalCode: "",
      articleType: "repuesto",
      quality: "",
      minimumStock: 0,
      isCritical: false,
      unit: "UNI",
      isActive: true,
    },
  });

  // Rellenar cuando hay datos iniciales (edición)
  useEffect(() => {
    if (initialData) {
      form.reset({
        code: initialData.code || "",
        name: initialData.name || "",
        description: initialData.description || "",
        partNumber: (initialData as any).partNumber || "",
        brand: (initialData as any).brand || "",
        model: (initialData as any).model || "",
        internalCode: (initialData as any).internalCode || "",
        articleType: (initialData as any).articleType || "repuesto",
        quality: (initialData as any).quality || "",
        minimumStock: Number(initialData.minimumStock || 0),
        isCritical: (initialData as any).isCritical || false,
        unit: initialData.unit || "UNI",
        isActive: initialData.isActive ?? true,
      });
    } else {
      form.reset({
        code: "",
        name: "",
        description: "",
        partNumber: "",
        brand: "",
        model: "",
        internalCode: "",
        articleType: "repuesto",
        quality: "",
        minimumStock: 0,
        isCritical: false,
        unit: "UNI",
        isActive: true,
      });
    }
  }, [initialData, form]);

  // Generador de SKU a partir del nombre
  const generateSku = (name: string) => {
    if (!name) {
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const numbers = "0123456789";
      const gen = (chars: string, len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      return `${gen(letters, 3)}-${gen(numbers, 3)}-${gen(letters, 2)}`;
    }
    return name
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 8)
      .replace(/-$/, "");
  };

  const handleNameBlur = () => {
    const sku = form.getValues("code");
    const name = form.getValues("name");
    if (!sku && name) form.setValue("code", generateSku(name), { shouldValidate: true });
  };

  // Envío del formulario
  const handleSubmit = async (data: FormValues) => {
    // Modo Mantenedor: delegar al padre
    if (externalSubmit) {
      await externalSubmit(data);
      return;
    }

    // Modo Dialog: mutación interna
    if (initialData?.id) {
      actualizarMutation.mutate(
        { id: initialData.id, ...data },
        {
          onSuccess: (updated) => onSuccess?.(updated),
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      crearMutation.mutate(data, {
        onSuccess: (nuevo) => onSuccess?.(nuevo),
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const isPending = isLoading || crearMutation.isPending || actualizarMutation.isPending;
  const currentCode = form.watch("code");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="w-full space-y-4 pb-20 lg:pb-0" autoComplete="off">
        {/* Sección de campos */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* NOMBRE */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#283c7f] dark:text-blue-400 font-bold flex items-center gap-1 text-[11px] uppercase">
                  Nombre *
                  <Badge variant="outline" className="text-[9px] py-0 px-1 border-[#283c7f] text-[#283c7f] dark:border-blue-400 dark:text-blue-400">
                    OBLIGATORIO
                  </Badge>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Nombre del artículo"
                    className="w-full"
                    onBlur={(e) => {
                      field.onBlur();
                      handleNameBlur();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* ID ARTÍCULO (SKU / CODE) */}
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#283c7f] dark:text-blue-400 font-bold flex items-center gap-1 text-[11px] uppercase">
                  ID Artículo *
                  <Badge variant="outline" className="text-[9px] py-0 px-1 border-[#283c7f] text-[#283c7f] dark:border-blue-400 dark:text-blue-400">
                    OBLIGATORIO
                  </Badge>
                </FormLabel>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="ID de artículo único"
                        disabled={!!initialData?.id}
                        className={cn("w-full pr-8", currentCode && currentCode.length >= 3 && "border-emerald-500 focus-visible:ring-emerald-500")}
                      />
                    </FormControl>
                    {currentCode && currentCode.length >= 3 && <CheckCircle2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={!!initialData?.id}
                    onClick={() => {
                      const name = form.getValues("name");
                      form.setValue("code", generateSku(name), { shouldValidate: true });
                    }}
                    title="Generar ID sugerido"
                    className="shrink-0"
                  >
                    <Wand2 className="h-4 w-4 text-[#283c7f] dark:text-blue-400" />
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Nº DE PARTE */}
          <FormField
            control={form.control}
            name="partNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#283c7f] dark:text-blue-400 font-bold flex items-center gap-1 text-[11px] uppercase">
                  N° de Parte *
                  <Badge variant="outline" className="text-[9px] py-0 px-1 border-[#283c7f] text-[#283c7f] dark:border-blue-400 dark:text-blue-400">
                    OBLIGATORIO
                  </Badge>
                </FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} placeholder="P/N del Fabricante" className="w-full" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* FABRICANTE / MARCA */}
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[#283c7f] dark:text-blue-400 font-bold flex items-center gap-1 text-[11px] uppercase">
                  Fabricante / Marca *
                  <Badge variant="outline" className="text-[9px] py-0 px-1 border-[#283c7f] text-[#283c7f] dark:border-blue-400 dark:text-blue-400">
                    OBLIGATORIO
                  </Badge>
                </FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} placeholder="Ej: Caterpillar, Fleetguard..." className="w-full" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* MODELO */}
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] font-bold uppercase">Modelo</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} placeholder="Ej: V8, 320D..." className="w-full" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* CÓDIGO INTERNO */}
          <FormField
            control={form.control}
            name="internalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] font-bold uppercase">Código Interno</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} placeholder="Código" className="w-full" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* TIPO DE ARTÍCULO */}
          <FormField
            control={form.control}
            name="articleType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] font-bold uppercase">Tipo de Artículo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccione tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="repuesto">Repuesto</SelectItem>
                    <SelectItem value="consumible">Consumible</SelectItem>
                    <SelectItem value="herramienta">Herramienta</SelectItem>
                    <SelectItem value="insumo">Insumo</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* CALIDAD */}
          <FormField
            control={form.control}
            name="quality"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] font-bold uppercase">Calidad</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccione calidad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="original">Original</SelectItem>
                    <SelectItem value="compatible">Compatible</SelectItem>
                    <SelectItem value="generico">Genérico</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* STOCK MÍNIMO */}
          <FormField
            control={form.control}
            name="minimumStock"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] font-bold uppercase">Stock Mínimo</FormLabel>
                <FormControl>
                  <Input type="number" {...field} value={field.value ?? 0} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)} className="w-full" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* UNIDAD (oculta — valor por defecto UNI) */}
          <input type="hidden" {...form.register("unit")} />

          {/* ESTADO (solo en modo mantenedor / edición) */}
          {initialData?.id && (
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-medium">Estado</FormLabel>
                    <FormDescription className="text-xs">Define si el artículo está disponible</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          {/* DESCRIPCIÓN */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel className="text-[11px] font-bold uppercase">Descripción</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value ?? ""} rows={3} className="w-full" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* ARTÍCULO CRÍTICO */}
          <FormField
            control={form.control}
            name="isCritical"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3 col-span-1 md:col-span-2">
                <div className="space-y-0.5">
                  <FormLabel className="text-[11px] font-bold uppercase">Artículo Crítico</FormLabel>
                  <FormDescription className="text-xs">Requiere atención especial</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Botones de acción */}
        <div
          className={
            inDialog
              ? "flex items-center justify-end gap-3 pt-4 border-t mt-4"
              : "fixed bottom-0 left-0 right-0 border-t border-border bg-white p-4 shadow-lg dark:bg-slate-900 lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
          }
        >
          <div className={inDialog ? "flex items-center gap-2" : "flex w-full items-center gap-2 lg:justify-end"}>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} className="w-full lg:w-auto">
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={isPending} className="w-full bg-[#283c7f] text-white hover:bg-[#24366f] lg:w-auto">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" /> : <Save className="mr-2 h-4 w-4 text-white" />}
              {initialData?.id ? "Actualizar" : "Guardar"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
