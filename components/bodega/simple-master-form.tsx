"use client";

import { useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { bodegaSimpleMasterSchema } from "@/lib/validations/bodega-master";

type FormValues = z.infer<typeof bodegaSimpleMasterSchema>;

interface SimpleMasterFormProps {
  initialData?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    isActive: boolean;
  };
  onSubmit: (data: FormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SimpleMasterForm({ initialData, onSubmit, onCancel, isLoading = false }: SimpleMasterFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(bodegaSimpleMasterSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      isActive: true,
    },
  });

  // Poblar el formulario con los datos iniciales en cuanto estén disponibles.
  // Se usa reset() para que react-hook-form actualice todos los campos correctamente.
  useEffect(() => {
    if (initialData) {
      reset({
        code: initialData.code ?? "",
        name: initialData.name ?? "",
        description: initialData.description ?? "",
        isActive: initialData.isActive ?? true,
      });
    }
    // Solo ejecutar cuando cambia el id del ítem — no en cada re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id]);

  const isActive = watch("isActive");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4 pb-20 lg:pb-0" autoComplete="off">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="code">Código</Label>
          <Input id="code" {...register("code")} className="w-full" autoComplete="off" />
          {errors.code ? <p className="text-sm text-destructive">{errors.code.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" {...register("name")} className="w-full" autoComplete="off" />
          {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" {...register("description")} className="w-full" autoComplete="off" />
        {errors.description ? <p className="text-sm text-destructive">{errors.description.message}</p> : null}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border p-4">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Estado</p>
          <p className="text-xs text-muted-foreground">Define si el registro está disponible</p>
        </div>
        <Switch checked={isActive} onCheckedChange={(value) => setValue("isActive", value)} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-white p-4 shadow-lg dark:bg-slate-900 lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <div className="flex w-full items-center gap-2 lg:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} className="w-full lg:w-auto dark:text-white">
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading} className="w-full bg-[#283c7f] text-white hover:bg-[#24366f] lg:w-auto">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" /> : <Save className="mr-2 h-4 w-4 text-white" />}
            Guardar
          </Button>
        </div>
      </div>
    </form>
  );
}
