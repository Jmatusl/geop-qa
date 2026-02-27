/**
 * Componente: Formulario de Unidad de Medida
 * Archivo: components/units/unit-form.tsx
 * 
 * Formulario reutilizable para crear y editar unidades
 */

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UnitMaster } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { createUnitSchema, unitCategories, unitCategoryLabels, type UnitFormData } from "@/lib/validations/units";

interface UnitFormProps {
  initialData?: UnitMaster | null;
  onSubmit: (data: UnitFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function UnitForm({ initialData, onSubmit, onCancel, isLoading }: UnitFormProps) {
  const isEditing = !!initialData;

  const form = useForm<UnitFormData>({
    resolver: zodResolver(createUnitSchema),
    defaultValues: {
      code: initialData?.code || "",
      name: initialData?.name || "",
      symbol: initialData?.symbol || "",
      category: (initialData?.category as UnitFormData["category"]) || "quantity",
      description: initialData?.description || "",
      conversionFactor: initialData?.conversionFactor || undefined,
      baseUnit: initialData?.baseUnit || "",
      isActive: initialData?.isActive ?? true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Código */}
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="KG"
                    className="font-mono uppercase"
                    autoComplete="off"
                    disabled={isEditing}
                  />
                </FormControl>
                <FormDescription>
                  {isEditing ? "El código no se puede modificar" : "Código único en mayúsculas (ej: KG, L, M)"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Nombre */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Kilogramo"
                    autoComplete="off"
                  />
                </FormControl>
                <FormDescription>
                  Nombre completo de la unidad
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Símbolo */}
          <FormField
            control={form.control}
            name="symbol"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Símbolo *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="kg"
                    className="font-mono"
                    autoComplete="off"
                  />
                </FormControl>
                <FormDescription>
                  Símbolo corto (ej: kg, L, m)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Categoría */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {unitCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {unitCategoryLabels[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Tipo de magnitud que mide
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Factor de Conversión */}
          <FormField
            control={form.control}
            name="conversionFactor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Factor de Conversión</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="any"
                    placeholder="1"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? null : parseFloat(value));
                    }}
                    autoComplete="off"
                  />
                </FormControl>
                <FormDescription>
                  Factor multiplicador a la unidad base (opcional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Unidad Base */}
          <FormField
            control={form.control}
            name="baseUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unidad Base</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    placeholder="KG"
                    className="font-mono uppercase"
                    autoComplete="off"
                  />
                </FormControl>
                <FormDescription>
                  Unidad de referencia para conversiones (opcional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Descripción */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value || ""}
                  placeholder="Descripción opcional de la unidad..."
                  rows={3}
                  className="resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Estado Activo */}
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Estado Activo</FormLabel>
                <FormDescription>
                  Las unidades inactivas no estarán disponibles para nuevas solicitudes
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Botones de Acción */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Guardar Cambios" : "Crear Unidad"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
