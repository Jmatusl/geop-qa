/**
 * Componente: Formulario Ingreso de Solicitud de Insumos (Desktop)
 * Archivo: app/insumos/ingreso/components/IngresoDesktop.tsx
 *
 * Vista de escritorio para crear solicitudes de insumos.
 * Optimizado para resolución HD (1280px+).
 */

"use client";

import { useState } from "react";
import { FormProvider } from "react-hook-form";
import { useSupplyRequestForm } from "@/lib/hooks/supply/use-supply-request-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RequestItemsGrid } from "@/components/supply/request-items-grid";
import { ArrowLeft, Plus, Save, X, Info, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import type { UnitMaster, MntSupplyCategory, MntInstallation } from "@prisma/client";

interface IngresoDesktopProps {
  categories: MntSupplyCategory[];
  units: UnitMaster[];
  installations: MntInstallation[];
  currentUserId: string;
  /** Nombre completo del usuario solicitante */
  currentUserName: string;
}

export default function IngresoDesktop({
  categories,
  units,
  installations,
  currentUserId,
  currentUserName,
}: IngresoDesktopProps) {
  const router = useRouter();

  /* Estado local: categoría por defecto para "Aplicar a todas" */
  const [defaultCategoryId, setDefaultCategoryId] = useState<string>(
    categories.length > 0 ? categories[0].id : ""
  );

  const { methods, handlers, state, data } = useSupplyRequestForm({
    categories,
    units,
    installations,
    currentUserId,
  });

  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = methods;

  /* Aplica la categoría por defecto a todos los ítems existentes */
  const applyDefaultCategory = () => {
    if (!defaultCategoryId) return;
    const updated = watch("items").map((item) => ({
      ...item,
      categoryId: defaultCategoryId,
    }));
    setValue("items", updated, { shouldValidate: true });
  };

  /* Ítems que pasan validación mínima (nombre + unidad + cantidad > 0) */
  const validItemsCount = state.items.filter(
    (item) => item.itemName.trim().length >= 2 && (item as any).unit && item.quantity > 0
  ).length;

  return (
    <div className="w-full">
      {/* ── Header de página ─────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-2xl font-bold tracking-tight">
            Crear Solicitud de Insumos
          </h1>
          <span className="inline-flex items-center gap-1 rounded-md border border-blue-500 px-2 py-0.5 text-xs font-medium text-blue-600 dark:border-blue-400 dark:text-blue-400">
            <Plus className="h-3 w-3" />
            Nuevo
          </span>
          {state.itemsCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              {state.itemsCount} {state.itemsCount === 1 ? "ítem" : "ítems"}
            </span>
          )}
        </div>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={handlers.handleSubmit} className="space-y-4">

          {/* ── Card: Información General ──────────────────────── */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm p-6">
            <h2 className="text-base font-semibold text-blue-600 dark:text-blue-400 mb-5">
              Información General
            </h2>

            {/* Fila 1: Nave + Solicitante */}
            <div className="grid grid-cols-2 gap-6 mb-5">

              {/* NAVE */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    NAVE <span className="text-red-500">*</span>
                  </span>
                  <button
                    type="button"
                    className="text-xs text-blue-500 underline underline-offset-2 hover:text-blue-700 transition-colors"
                  >
                    Naves disponibles
                  </button>
                </div>
                <Select
                  value={watch("installationId")}
                  onValueChange={(value) => setValue("installationId", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccione nave" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.installations.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.installationId && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.installationId.message}
                  </p>
                )}
              </div>

              {/* SOLICITANTE */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                  SOLICITANTE <span className="text-red-500">*</span>
                </span>
                <Input
                  value={currentUserName}
                  readOnly
                  autoComplete="off"
                  className="bg-muted/50 cursor-default text-muted-foreground"
                />
              </div>
            </div>

            {/* Fila 2: Categoría por defecto */}
            <div className="mb-5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                CATEGORÍA POR DEFECTO
              </span>
              <div className="flex items-center gap-2">
                <Select
                  value={defaultCategoryId}
                  onValueChange={setDefaultCategoryId}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccione categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="shrink-0 h-9 w-9 rounded-md border border-border flex items-center justify-center hover:bg-accent text-muted-foreground transition-colors"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="max-w-xs text-xs">
                        Al hacer clic en &quot;Aplicar a todas&quot; se asignará esta
                        categoría a todos los ítems de la tabla.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={applyDefaultCategory}
                  disabled={!defaultCategoryId || state.itemsCount === 0}
                  className="shrink-0 gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950"
                >
                  <Check className="h-3.5 w-3.5" />
                  Aplicar a todas
                </Button>
              </div>
            </div>

            {/* Fila 3: Descripción Solicitante */}
            <div className="mb-5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                DESCRIPCIÓN SOLICITANTE <span className="text-red-500">*</span>
              </span>
              <Textarea
                {...register("title")}
                autoComplete="off"
                placeholder="Descripción general de la solicitud"
                className="h-24 resize-none"
              />
              {errors.title && (
                <p className="text-xs text-destructive mt-1">
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Fila 4: Observaciones Internas */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                OBSERVACIONES INTERNAS (OPCIONAL)
              </span>
              <Textarea
                {...register("observations")}
                autoComplete="off"
                placeholder="Notas internas adicionales que solo verán los usuarios del sistema"
                className="h-24 resize-none"
              />
            </div>
          </div>

          {/* ── Card: Items Solicitados ────────────────────────── */}
          <RequestItemsGrid
            items={state.items}
            categories={data.categories}
            units={data.units}
            onAddItem={handlers.addItem}
            onRemoveItem={handlers.removeItem}
            onUpdateItem={handlers.updateItem}
            validItemsCount={validItemsCount}
          />

          {errors.items && (
            <p className="text-sm text-destructive px-1">{errors.items.message}</p>
          )}

          {/* ── Footer: Resumen + Acciones ─────────────────────── */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm px-6 py-4">
            <div className="flex items-center justify-between">

              {/* Resumen */}
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Ítems
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    {state.itemsCount}
                  </p>
                </div>
                {state.totalEstimatedValue > 0 && (
                  <>
                    <div className="h-10 w-px bg-border" />
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Valor Estimado
                      </p>
                      <p className="text-xl font-bold font-mono tabular-nums">
                        {new Intl.NumberFormat("es-CL", {
                          style: "currency",
                          currency: "CLP",
                          minimumFractionDigits: 0,
                        }).format(state.totalEstimatedValue)}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={state.isSubmitting}
                  className="dark:text-white"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={state.isSubmitting}
                  className="bg-[#283c7f] hover:bg-[#1e2f63]"
                >
                  <Save className="h-4 w-4 mr-2 text-white" />
                  <span className="text-white">
                    {state.isSubmitting ? "Guardando..." : "Crear Solicitud"}
                  </span>
                </Button>
              </div>
            </div>
          </div>

        </form>
      </FormProvider>
    </div>
  );
}
