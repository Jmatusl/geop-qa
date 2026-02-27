// CreateSolicitudForm.tsx — actualizado
"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import SolicitudFormHeader from "./SolicitudFormHeader";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, ArrowLeft, Loader2, Save, Info, Check } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SolicitudInsumosCreateSchema, type SolicitudInsumosCreateData } from "@/validations/solicitud-insumos/schemas";
import { createSolicitudInsumos, getFormData, updateSolicitudInsumos, getHistoricalItems } from "@/actions/solicitud-insumos/solicitudActions";
// NO usar useShipsQuery - las naves vienen de selectShips prop (como RequerimientoActividadEditor)
import { useSolicitantesQuery } from "@/hooks/useSolicitante";
import { useAreasQuery } from "@/hooks/useArea";
import { buildShipSelector } from "@/utils/shipSelector";

// ⬇️ Importa la nueva tabla estable personalizada
import ItemsTableStable, { type ItemRow } from "./ItemsTableStable";

// Helpers seguros
const toStr = (v: unknown) => (v == null ? "" : String(v));
const trimToUndef = (v: unknown) => {
  const s = toStr(v).trim();
  return s ? s : undefined;
};

// Parse various date representations into a Date or undefined
const parseDate = (v: unknown): Date | undefined => {
  if (v == null) return undefined;
  if (v instanceof Date) return v;
  const s = String(v);
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
};

interface CreateSolicitudFormProps {
  onCancel?: () => void;
  onSuccess?: () => void;
  defaultValues?: any;
  isEditMode?: boolean;
  selectShips?: {
    isAllowed: boolean;
    shipId?: number | null;
    userOnShip?: any[];
    shipSelect?: { id: number; name: string }[];
  };
  // catálogos provistos por el padre (opcionalmente desde DB)
  categories?: { id: string; label: string }[];
  urgencies?: { id: ItemRow["urgency"]; label: string }[];
  permisos?: {
    gestionaCotizaciones?: boolean;
    apruebaCotizaciones?: boolean;
    autorizaCotizaciones?: boolean;
  };
}

export default function CreateSolicitudForm({ onCancel, onSuccess, defaultValues, isEditMode = false, selectShips, categories = [], urgencies = [], permisos }: CreateSolicitudFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const HIDE_OBSERVACIONES = true;
  const [isFechaOpen, setIsFechaOpen] = useState(false);
  const SHOW_AREA_PRIORITY_DATE = process.env.NEXT_PUBLIC_SHOW_AREA_PRIORITY_DATE === "true";

  // Estados locales para el selector de naves (igual que RequerimientoActividadEditor)
  // Inicializar con el valor correcto desde el principio
  const [selectedShipId, setSelectedShipId] = useState<number | null>(() => {
    if (isEditMode && defaultValues?.shipId) {
      return defaultValues.shipId;
    }
    // En modo creación, calcular el valor inicial
    try {
      const selector = buildShipSelector(selectShips as any, null);
      return selector.selectedId;
    } catch {
      return null;
    }
  });

  const [shipOptions, setShipOptions] = useState<{ id: number; name: string }[]>(() => {
    try {
      const existingShipId = isEditMode ? (defaultValues?.shipId ?? null) : null;
      const selector = buildShipSelector(selectShips as any, existingShipId);
      return selector.options;
    } catch {
      return [];
    }
  });

  // Estado de la grilla — usa el mismo tipo que el componente hijo
  const [itemsData, setItemsData] = useState<ItemRow[]>(() => {
    if (defaultValues?.items && Array.isArray(defaultValues.items) && defaultValues.items.length > 0) {
      return defaultValues.items.map((it: any) => ({
        id: it.id,
        name: it.name ?? "",
        // Prefer normalized categoriaInsumosId when present, otherwise fall back to category string
        category: it.categoriaInsumosId != null ? String(it.categoriaInsumosId) : String(it.category ?? "consumible"),
        categoriaInsumosId: it.categoriaInsumosId ?? (it.category && /^\d+$/.test(String(it.category)) ? Number(it.category) : undefined),
        quantity: it.quantity ?? 1,
        unit: it.unit ?? "UNI",
        packageSize: it.packageSize ?? "",
        technicalSpec: it.technicalSpec ?? "",
        neededByDate: (it.neededByDate ?? it.needed_by_date ?? it.fechaNecesaria ?? it.fecha) || undefined,
        urgency: it.urgency ?? "NORMAL",
        notes: it.notes ?? "",
      }));
    }
    // Use 'consumible' as a safe typed fallback only (actual catalog comes from `categories` prop)
    const safeFallback = "consumible" as unknown as ItemRow["category"];
    const seedCat = categories && categories.length > 0 ? (categories[0].id as unknown as ItemRow["category"]) : safeFallback;
    return [
      { name: "", category: seedCat, quantity: 1, unit: "UNI", packageSize: "", technicalSpec: "", urgency: "NORMAL", notes: "" },
      { name: "", category: seedCat, quantity: 1, unit: "UNI", packageSize: "", technicalSpec: "", urgency: "NORMAL", notes: "" },
      { name: "", category: seedCat, quantity: 1, unit: "UNI", packageSize: "", technicalSpec: "", urgency: "NORMAL", notes: "" },
    ];
  });
  // Keep a stable reference to the initial items so we can pass it once to the grid
  const initialItemsRef = useRef<ItemRow[] | undefined>(itemsData);

  // Datos para selects - NO usar useShipsQuery, usar selectShips.shipSelect del padre (como RequerimientoActividadEditor)
  const { data: solicitantesResp, isLoading: loadingSolicitantes } = useSolicitantesQuery();
  const { data: areasResp, isLoading: loadingAreas } = useAreasQuery();
  const { data: formData, isLoading: isLoadingFormData } = useQuery({ queryKey: ["form-data-solicitudes"], queryFn: getFormData });

  // Query para obtener items históricos (autocompletar)
  const { data: historicalDataRes } = useQuery({
    queryKey: ["historical-items-solicitud"],
    queryFn: () => getHistoricalItems(),
  });

  const historicalItems = historicalDataRes?.success ? historicalDataRes.data : [];

  // Las naves vienen SOLO de selectShips.shipSelect, no de useShipsQuery
  // ⚠️ IMPORTANTE: Usar useMemo para evitar loops infinitos en useEffect
  const shipsAll = useMemo(() => selectShips?.shipSelect ?? [], [selectShips?.shipSelect]);
  const solicitantesRaw: { id: number; name: string; shipId: number | null }[] =
    (solicitantesResp as any)?.map?.((s: any) => ({ id: s.id, name: s.name, shipId: s.shipId })) ?? formData?.data?.solicitantes ?? [];

  // Filtrar solicitantes por nave seleccionada
  // Los solicitantes sin nave (shipId = null) siempre se muestran (universales)
  const solicitantes: { id: number; name: string }[] = useMemo(() => {
    if (!selectedShipId) return [];
    return solicitantesRaw.filter((s) => s.shipId === selectedShipId || s.shipId === null).map((s) => ({ id: s.id, name: s.name }));
  }, [selectedShipId, solicitantesRaw]);

  const areas: { id: number; name: string }[] = (areasResp as any)?.map?.((a: any) => ({ id: a.id, name: a.name })) ?? formData?.data?.areas ?? [];
  const isLoadingSelectors = (loadingSolicitantes || loadingAreas) && !formData?.success;

  // Omitir shipId del formulario, se maneja con estado local selectedShipId (como RequerimientoActividadEditor)
  const form = useForm<Omit<SolicitudInsumosCreateData, "shipId">>({
    resolver: zodResolver(SolicitudInsumosCreateSchema.omit({ shipId: true })),
    defaultValues: {
      solicitanteId: defaultValues?.solicitanteId ?? 0,
      areaId: defaultValues?.areaId ?? (defaultValues?.area ? (defaultValues.area.id ?? undefined) : undefined),
      prioridad: defaultValues?.prioridad ?? "NORMAL",
      descripcion: defaultValues?.descripcion ?? "",
      descripcionInterna: defaultValues?.descripcionInterna ?? "",
      observaciones: defaultValues?.observaciones ?? "",
      // fallback: use solicitud.fechaEstimadaEntrega or first item's neededByDate
      fechaEstimadaEntrega: parseDate(defaultValues?.fechaEstimadaEntrega) ?? parseDate(defaultValues?.items?.[0]?.neededByDate),
      items: defaultValues?.items ?? [],
    },
  });

  // Apply server-provided defaultValues only once to avoid reset loops in edit mode
  const defaultAppliedRef = useRef(false);
  useEffect(() => {
    if (!defaultAppliedRef.current && defaultValues) {
      try {
        // mark applied to avoid re-applying on subsequent renders
        defaultAppliedRef.current = true;
        // reset form with server defaults (shipId se maneja con selectedShipId)
        form.reset({
          solicitanteId: defaultValues?.solicitanteId ?? 0,
          areaId: defaultValues?.areaId ?? (defaultValues?.area ? (defaultValues.area.id ?? undefined) : undefined),
          prioridad: defaultValues?.prioridad ?? "NORMAL",
          descripcion: defaultValues?.descripcion ?? "",
          descripcionInterna: defaultValues?.descripcionInterna ?? "",
          observaciones: defaultValues?.observaciones ?? "",
          fechaEstimadaEntrega: parseDate(defaultValues?.fechaEstimadaEntrega) ?? parseDate(defaultValues?.items?.[0]?.neededByDate),
          items: defaultValues?.items ?? [],
        });

        // initialize itemsData from defaults if present
        if (Array.isArray(defaultValues.items) && defaultValues.items.length > 0) {
          const mapped = defaultValues.items.map((it: any) => ({
            id: it.id,
            name: it.name ?? "",
            category: it.categoriaInsumosId != null ? String(it.categoriaInsumosId) : String(it.category ?? "consumible"),
            categoriaInsumosId: it.categoriaInsumosId ?? (it.category && /^\d+$/.test(String(it.category)) ? Number(it.category) : undefined),
            quantity: it.quantity == null ? 1 : Number(it.quantity),
            unit: it.unit ?? "UNI",
            packageSize: it.packageSize ?? "",
            technicalSpec: it.technicalSpec ?? "",
            neededByDate: (it.neededByDate ?? it.needed_by_date ?? it.fechaNecesaria ?? it.fecha) || undefined,
            urgency: it.urgency ?? "NORMAL",
            notes: it.notes ?? "",
          }));
          setItemsData(mapped as unknown as ItemRow[]);
          // also ensure initialItemsRef is seeded so the grid receives stable initial rows including ids
          initialItemsRef.current = mapped as unknown as ItemRow[];
        }
      } catch (e) {
        // ignore
      }
    }
  }, [defaultValues, form]);

  // Ya no necesitamos useEffect para inicializar porque se inicializa directamente en useState
  // El estado ya tiene el valor correcto desde el principio

  // Nombre de la nave predeterminada (si está disponible)
  const defaultShipId = (selectShips as any)?.shipId ?? selectedShipId ?? null;
  const defaultShipName = shipOptions.find((s) => s.id === defaultShipId)?.name ?? null;

  // Mantener el campo `items` del form sincronizado con `itemsData`.
  // Convertimos `quantity: null` a 0 para cumplir el tipo esperado por el schema
  useEffect(() => {
    try {
      const normalized = itemsData.map((it) => ({
        ...it,
        quantity: it.quantity == null ? 0 : it.quantity,
        // ensure neededByDate is a Date or undefined before sending to form
        neededByDate: it.neededByDate ? (it.neededByDate instanceof Date ? it.neededByDate : new Date(String(it.neededByDate))) : undefined,
      }));
      try {
        const current = form.getValues("items");
        const same = JSON.stringify(current) === JSON.stringify(normalized);
        if (!same) {
          form.setValue("items", normalized as any, { shouldValidate: false, shouldDirty: true, shouldTouch: false });
        }
      } catch (e) {
        form.setValue("items", normalized as any, { shouldValidate: false, shouldDirty: true, shouldTouch: false });
      }
    } catch (e) {
      // ignore
    }
  }, [itemsData, form]);

  // Permisos relacionados con cotizaciones: si el usuario no tiene ninguno, ocultar campos/acciones asociados
  const hasAnyCotizacionPermiso = permisos?.gestionaCotizaciones || permisos?.apruebaCotizaciones || permisos?.autorizaCotizaciones || false;

  useEffect(() => {
    const subscription = form.watch(() => {
      // Intentionally empty: removed debug logging
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Resetear solicitanteId cuando cambia la nave (si el solicitante actual no pertenece a la nueva nave)
  useEffect(() => {
    if (selectedShipId) {
      const currentSolicitanteId = form.getValues("solicitanteId");
      // Verificar si el solicitante actual pertenece a la nave seleccionada
      // Los solicitantes universales (shipId === null) son válidos para todas las naves
      const solicitantePertenece = solicitantesRaw.some((s) => s.id === currentSolicitanteId && (s.shipId === selectedShipId || s.shipId === null));

      if (currentSolicitanteId && !solicitantePertenece) {
        form.setValue("solicitanteId", 0, { shouldValidate: false, shouldDirty: true });
      }
    }
  }, [selectedShipId, solicitantesRaw, form]);

  const prioridadOptions = [
    { id: 1, value: "BAJA", label: "Baja" },
    { id: 2, value: "NORMAL", label: "Normal" },
    { id: 3, value: "ALTA", label: "Alta" },
    { id: 4, value: "URGENTE", label: "Urgente" },
  ];

  // Columnas visibles que controlan la grilla
  const columnVisibility = {
    name: true,
    category: true,
    quantity: true,
    unit: true,
    packageSize: false,
    urgency: true,
    technicalSpec: false,
    notes: false,
  } as const;

  // Estado para la categoría por defecto de nuevas filas. Inicializar desde categories (prop) si existe.
  const [initialCategory, setInitialCategory] = useState<ItemRow["category"] | "">(() => {
    const first = initialItemsRef.current?.[0];
    return (first?.category as ItemRow["category"]) ?? (categories && categories.length > 0 ? (categories[0].id as ItemRow["category"]) : "");
  });

  // Si las categories provienen después (prop dinámica), sincronizamos el initialCategory con la primera categoría disponible
  useEffect(() => {
    try {
      if (!initialCategory && categories && categories.length > 0) {
        setInitialCategory(categories[0].id as ItemRow["category"]);
      }
    } catch (e) {
      // ignore
    }
  }, [categories]);

  const createMutation = useMutation({
    mutationFn: createSolicitudInsumos,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        form.reset();
        const seedCat = (initialCategory ?? "consumible") as ItemRow["category"];
        const initialItems: ItemRow[] = [
          {
            name: "",
            category: seedCat,
            categoriaInsumosId: /^\d+$/.test(String(seedCat)) ? Number(seedCat) : undefined,
            quantity: 1,
            unit: "",
            packageSize: "",
            technicalSpec: "",
            urgency: "NORMAL",
            notes: "",
          },
          {
            name: "",
            category: seedCat,
            categoriaInsumosId: /^\d+$/.test(String(seedCat)) ? Number(seedCat) : undefined,
            quantity: 1,
            unit: "",
            packageSize: "",
            technicalSpec: "",
            urgency: "NORMAL",
            notes: "",
          },
          {
            name: "",
            category: seedCat,
            categoriaInsumosId: /^\d+$/.test(String(seedCat)) ? Number(seedCat) : undefined,
            quantity: 1,
            unit: "",
            packageSize: "",
            technicalSpec: "",
            urgency: "NORMAL",
            notes: "",
          },
        ];
        setItemsData(initialItems);
        form.setValue("items", [], { shouldValidate: false, shouldDirty: false, shouldTouch: false });
        try {
          router.refresh();
        } catch {}
        try {
          queryClient.invalidateQueries({ queryKey: ["solicitudes-insumos"] });
        } catch {}
        onSuccess?.();
      } else {
        // Response not successful
        toast.error(result.message);
      }
      setIsSubmitting(false);
    },
    onError: (error) => {
      // Mostrar detalles del error de la mutación en consola para debug
      console.error("Mutation createSolicitudInsumos error:", error);
      toast.error("Error al crear la solicitud");
      setIsSubmitting(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateSolicitudInsumos(id, data),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        try {
          router.refresh();
        } catch {}
        try {
          queryClient.invalidateQueries({ queryKey: ["solicitudes-insumos"] });
        } catch {}
        onSuccess?.();
      } else {
        toast.error(result.message || "Error al actualizar");
      }
      setIsSubmitting(false);
    },
    onError: (error) => {
      console.error("Mutation updateSolicitudInsumos error:", error);
      // si la respuesta incluye body del server, mostrarlo
      try {
        // @ts-ignore
        if (error?.response) console.error("Response:", error.response);
      } catch (e) {}
      toast.error("Error al actualizar la solicitud");
      setIsSubmitting(false);
    },
  });

  const computeCompleteItems = useCallback((data: ItemRow[]) => {
    return data
      .filter((item) => {
        if (!item) return false;
        const name = toStr(item.name).trim();
        const unit = toStr(item.unit).trim();
        const qty = Number(item.quantity ?? 0);
        return !!name && !!unit && qty > 0;
      })
      .map((item) => ({
        id: item.id,
        name: toStr(item.name).trim(),
        // Prefer normalized FK. If the grid stored a numeric category string, parse it to an id for compatibility.
        categoriaInsumosId: item.categoriaInsumosId != null ? Number(item.categoriaInsumosId) : item.category && /^\d+$/.test(String(item.category)) ? Number(item.category) : undefined,
        quantity: item.quantity ?? 0,
        unit: toStr(item.unit).trim(),
        packageSize: trimToUndef(item.packageSize),
        technicalSpec: trimToUndef(item.technicalSpec),
        neededByDate: item.neededByDate ? (item.neededByDate instanceof Date ? item.neededByDate : new Date(String(item.neededByDate))) : undefined,
        urgency: item.urgency,
        notes: trimToUndef(item.notes),
      }));
  }, []);

  // Devuelve filas inválidas con campos faltantes (nombre, unidad, cantidad)
  const computeInvalidRows = useCallback((data: ItemRow[]) => {
    return data
      .map((item, idx) => {
        const missing: string[] = [];
        const name = toStr(item?.name).trim();
        const unit = toStr(item?.unit).trim();
        const qty = Number(item?.quantity ?? 0);
        if (!name) missing.push("nombre");
        if (!unit) missing.push("unidad");
        if (!(qty > 0)) missing.push("cantidad > 0");
        return { index: idx, missing };
      })
      .filter((r) => r.missing.length > 0);
  }, []);

  const completeItemsCount = useMemo(() => computeCompleteItems(itemsData).length, [itemsData, computeCompleteItems]);

  const onSubmit = (data: Omit<SolicitudInsumosCreateData, "items" | "shipId">) => {
    // removed debug logs

    const completeItems = computeCompleteItems(itemsData);
    if (completeItems.length === 0) {
      toast.error("Debe agregar al menos un item válido (con nombre, unidad y cantidad > 0)");
      return;
    }

    // Usar selectedShipId del estado local en lugar del formulario (igual que RequerimientoActividadEditor)
    const finalData = {
      ...data,
      shipId: selectedShipId ?? (selectShips as any)?.shipId ?? 0,
      // categories come from DB as string ids; cast to any so backend receives them
      items: completeItems as any,
    } as any;
    setIsSubmitting(true);
    if (isEditMode && defaultValues?.id) {
      updateMutation.mutate({ id: defaultValues.id, data: finalData });
    } else {
      createMutation.mutate(finalData);
    }
  };

  const onInvalid = (errors: any) => {
    // Log Zod/validation errors to console for debugging
    try {
      console.error("Form validation errors:", errors);
      // También mostrar errores detallados si vienen de zod resolver
      // @ts-ignore
      if (errors?.root) console.error("Zod root errors:", errors.root);
    } catch (e) {
      console.error("Error logging validation errors", e);
    }
  };

  // Debug logging removed

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <SolicitudFormHeader
          mode={isEditMode ? "edit" : "create"}
          subtitle={isEditMode ? "Modifique los campos y guarde los cambios." : "Complete los datos para crear una nueva solicitud."}
          onBack={onCancel}
          isSubmitting={isSubmitting}
          itemsCount={itemsData.length}
          fechaEstimadaEntrega={form.watch("fechaEstimadaEntrega")}
          areaName={areas.find((a) => a.id === Number(form.watch("areaId")))?.name}
        />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
            <Card>
              <CardHeader className="border-b dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
                <CardTitle className="text-[#284893] dark:text-blue-400 font-bold">Información General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Instalación con badges y tooltips igual que requerimientos-actividades */}
                  {selectShips?.isAllowed ? (
                    // Usuario con permisos - mostrar badge "Naves disponibles" o "Predeterminado"
                    <div className="md:col-span-1 lg:col-span-1">
                      <div className="space-y-2">
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormLabel className="text-[#284893] dark:text-slate-300 font-semibold uppercase text-[11px] tracking-tight">Nave *</FormLabel>
                            {shipOptions.length > 1 && (selectShips as any)?.shipId ? (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="cursor-help">
                                    Predeterminado
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{defaultShipName ? `Valor predeterminado: ${defaultShipName}` : "Valor predeterminado: nave del usuario"}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="cursor-help">
                                    Naves disponibles
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Puede seleccionar una nave de la lista.</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <FormControl>
                            <Select
                              onValueChange={(value) => {
                                const v = value ? parseInt(value) : null;
                                setSelectedShipId(v);
                              }}
                              value={selectedShipId != null ? String(selectedShipId) : undefined}
                              disabled={isLoadingSelectors || shipOptions.length === 1}
                            >
                              <SelectTrigger className="dark:bg-slate-900/50 dark:text-slate-100 dark:border-slate-800">
                                <SelectValue placeholder={shipOptions.length > 0 ? "Seleccionar nave" : "Sin naves disponibles"} />
                              </SelectTrigger>
                              <SelectContent>
                                {shipOptions.map((s) => (
                                  <SelectItem key={s.id} value={s.id.toString()}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                          {!selectShips?.isAllowed && (selectShips as any)?.shipId && shipOptions.length > 1 && (
                            <div className="text-sm text-muted-foreground mt-1">El valor por defecto proviene del perfil del usuario, pero puedes seleccionar otra nave si tienes más asignadas.</div>
                          )}
                        </FormItem>
                      </div>
                    </div>
                  ) : (
                    // Usuario sin permisos - mostrar badge "Predeterminado" o placeholder invisible
                    <div className="md:col-span-1 lg:col-span-1">
                      <div className="space-y-2">
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormLabel className="text-[#284893] dark:text-slate-300 font-semibold uppercase text-[11px] tracking-tight">Nave *</FormLabel>
                            {shipOptions.length > 1 && (selectShips as any)?.shipId ? (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="cursor-help">
                                    Predeterminado
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{defaultShipName ? `Valor predeterminado: ${defaultShipName}` : "Valor predeterminado: nave del usuario"}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              // Placeholder para mantener el espacio cuando no existe el Badge/Tooltip
                              <span aria-hidden className="inline-block">
                                <Badge variant="outline" className="opacity-0">
                                  Naves disponibles
                                </Badge>
                              </span>
                            )}
                          </div>
                          <FormControl>
                            <Select
                              onValueChange={(value) => {
                                const v = value ? parseInt(value) : null;
                                setSelectedShipId(v);
                              }}
                              value={selectedShipId != null ? String(selectedShipId) : undefined}
                              disabled={isLoadingSelectors || shipOptions.length === 1}
                            >
                              <SelectTrigger className="dark:bg-slate-900/50 dark:text-slate-100 dark:border-slate-800">
                                <SelectValue placeholder={shipOptions.length > 0 ? "Seleccionar nave" : "Sin naves disponibles"} />
                              </SelectTrigger>
                              <SelectContent>
                                {shipOptions.map((s) => (
                                  <SelectItem key={s.id} value={s.id.toString()}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      </div>
                    </div>
                  )}

                  {/* Solicitante */}
                  <FormField
                    control={form.control}
                    name="solicitanteId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#284893] dark:text-slate-300 font-semibold tracking-tight uppercase text-[11px]">Solicitante *</FormLabel>
                        <Select value={field.value?.toString() || ""} onValueChange={(value) => field.onChange(parseInt(value))} disabled={isLoadingSelectors || solicitantes.length === 0}>
                          <FormControl>
                            <SelectTrigger className="dark:bg-slate-900/50 dark:text-slate-100 dark:border-slate-800 h-10">
                              <SelectValue placeholder={solicitantes.length === 0 ? "Sin solicitantes para esta nave" : "Seleccionar solicitante"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
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
                  {/* Categoría por defecto para nuevas filas (select + acción en la misma fila) */}
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-semibold text-[#284893] dark:text-slate-300 tracking-tight uppercase">Categoría por defecto</label>
                    <div className="mt-1 flex items-center gap-2">
                      <select
                        className="flex-1 h-10 rounded border border-input bg-white dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800 px-3 outline-none focus:ring-1 focus:ring-ring transition-colors"
                        value={initialCategory}
                        onChange={(e) => setInitialCategory(e.target.value as ItemRow["category"])}
                      >
                        {(categories && categories.length > 0 ? categories : []).map((c) => (
                          <option key={c.id} value={c.id} className="dark:bg-slate-900">
                            {c.label}
                          </option>
                        ))}
                      </select>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="Más información"
                            className="h-10 w-10 flex items-center justify-center rounded bg-transparent text-muted-foreground hover:text-gray-700 border-0"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <div className="max-w-xs text-sm">
                            Seleccione la categoría que se usará por defecto para nuevas filas. "Aplicar" reemplaza la categoría de todas las filas actuales. Si desea sólo asignar a filas vacías,
                            utilice la opción avanzada (por defecto no incluida).
                          </div>
                        </TooltipContent>
                      </Tooltip>

                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        className="h-10 flex items-center gap-2 px-3"
                        onClick={() => {
                          try {
                            const cat = initialCategory ?? "consumible";
                            const updated = itemsData.map((it) => ({
                              ...it,
                              category: cat,
                              categoriaInsumosId: /^\d+$/.test(String(cat)) ? Number(cat) : it.categoriaInsumosId,
                            }));
                            setItemsData(updated as unknown as ItemRow[]);
                            // keep the initial items ref in sync for the grid
                            initialItemsRef.current = updated as unknown as ItemRow[];
                            const label = (categories || []).find((x) => x.id === cat)?.label ?? cat;
                            toast.success(`Categoría '${label}' aplicada a ${updated.length} filas`);
                          } catch (e) {
                            console.error("Error applying category to rows", e);
                            toast.error("No se pudo aplicar la categoría");
                          }
                        }}
                        disabled={itemsData.length === 0 || !initialCategory}
                      >
                        <Check className="h-4 w-4" />
                        Aplicar a todas
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Área, Prioridad y Fecha Estimada en la misma fila (responsive) */}
                {SHOW_AREA_PRIORITY_DATE && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Área */}
                    <FormField
                      control={form.control}
                      name="areaId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#284893] dark:text-slate-300 font-semibold tracking-tight uppercase text-[11px]">Área</FormLabel>
                          <Select value={field.value?.toString() || "NONE"} onValueChange={(value) => field.onChange(value === "NONE" ? undefined : parseInt(value))} disabled={isLoadingSelectors}>
                            <FormControl>
                              <SelectTrigger className="dark:bg-slate-900/50 dark:text-slate-100 dark:border-slate-800 h-10">
                                <SelectValue placeholder="Seleccionar área (opcional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
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
                          <FormLabel className="text-[#284893] dark:text-slate-300 font-semibold tracking-tight uppercase text-[11px]">Prioridad</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="dark:bg-slate-900/50 dark:text-slate-100 dark:border-slate-800 h-10">
                                <SelectValue placeholder="Seleccionar prioridad" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
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

                    {/* Fecha Estimada de Entrega */}
                    <FormField
                      control={form.control}
                      name="fechaEstimadaEntrega"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#284893] dark:text-slate-300 font-semibold tracking-tight uppercase text-[11px]">Fecha Estimada de Entrega</FormLabel>
                          <Popover open={isFechaOpen} onOpenChange={setIsFechaOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn("w-full h-10 pl-3 text-left font-normal dark:bg-slate-900/50 dark:border-slate-800 transition-colors", !field.value && "text-muted-foreground")}
                                  onClick={() => setIsFechaOpen((prev) => !prev)}
                                >
                                  {field.value ? format(field.value, "dd/MM/yyyy", { locale: es }) : <span>Seleccionar fecha</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-70" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  field.onChange(date);
                                  if (date) setIsFechaOpen(false);
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
                  </div>
                )}

                {/* Descripción */}
                <FormField
                  control={form.control}
                  name="descripcion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#284893] dark:text-slate-300 font-semibold tracking-tight uppercase text-[11px]">Descripción solicitante *</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descripción general de la solicitud" className="min-h-[100px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Descripción Interna (solo usuarios con permisos de cotización) */}
                {hasAnyCotizacionPermiso && (
                  <FormField
                    control={form.control}
                    name="descripcionInterna"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#284893] dark:text-slate-300 font-semibold tracking-tight uppercase text-[11px]">Observaciones Internas (Opcional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Notas internas adicionales que solo verán los usuarios del sistema" className="min-h-[80px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Items Solicitados con DataSheetGrid */}
            <Card className="overflow-hidden border-gray-200 dark:border-slate-800 shadow-lg dark:bg-slate-900">
              <CardHeader className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-[#284893] dark:text-blue-400 font-bold">Items Solicitados</CardTitle>
                    <span className="text-xs text-muted-foreground">(requeridos: nombre, unidad, cantidad &gt; 0)</span>
                    <span
                      className={cn(
                        "text-xs rounded-full px-2.5 py-0.5 font-medium border transition-colors",
                        completeItemsCount > 0
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                          : "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
                      )}
                    >
                      válidos: {completeItemsCount}
                    </span>
                  </div>
                </div>
                {form.formState.errors?.items &&
                  (() => {
                    const invalid = computeInvalidRows(itemsData);
                    if (invalid.length === 0) return null;
                    return (
                      <ul className="mt-2 list-disc list-inside text-sm text-red-700">
                        {invalid.map((r) => (
                          <li key={r.index}>
                            Fila {r.index + 1}: falta {r.missing.join(", ")}
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
              </CardHeader>
              <CardContent className="p-0">
                {/* ⬇️ Integración real de la grilla */}
                <ItemsTableStable
                  defaultData={initialItemsRef.current}
                  visibleColumns={columnVisibility}
                  onValuesChange={(rows) => setItemsData(rows)}
                  initialCategory={initialCategory || undefined}
                  categories={categories}
                  urgencies={urgencies}
                  historicalItems={historicalItems}
                />
                {/* <pre>{JSON.stringify(itemsData, null, 2)}</pre> */}
                <div className="px-6 pb-4">
                  <p className="text-sm text-muted-foreground mt-2">Tip: Haga clic en una celda para editar. Use Tab/Enter para navegar.</p>
                </div>
              </CardContent>
            </Card>

            {/* Botones */}
            <div className="flex justify-end space-x-2 pt-6 border-t dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => (onCancel ? onCancel() : router.back())}
                disabled={isSubmitting}
                className="dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-blue-700 hover:bg-blue-800 text-white dark:bg-blue-600 dark:hover:bg-blue-700 shadow-md transition-all px-8"
                onClick={() => {
                  try {
                    (document.activeElement as HTMLElement | null)?.blur?.();
                  } catch {}
                }}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isEditMode ? "Guardar cambios" : "Crear Solicitud"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </TooltipProvider>
  );
}
