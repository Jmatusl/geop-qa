"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { mntFarmingCenterSchema } from "@/lib/validations/mantencion";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateFarmingCenter, useUpdateFarmingCenter, FarmingCenter } from "@/lib/hooks/mantencion/use-farming-centers";
import { useAllProductionAreas } from "@/lib/hooks/mantencion/use-production-areas";
import { MapPin, Loader2, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import maintenanceConfig from "@/lib/config/ui/maintainers.json";
import { z } from "zod";

type FormValues = z.infer<typeof mntFarmingCenterSchema>;

interface FarmingCenterFormProps {
  mode: "create" | "edit";
  initialData?: FarmingCenter | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function FarmingCenterForm({ mode, initialData, onCancel, onSuccess }: FarmingCenterFormProps) {
  const { mutate: create, isPending: isCreating } = useCreateFarmingCenter();
  const { mutate: update, isPending: isUpdating } = useUpdateFarmingCenter();
  const { data: productionAreas, isLoading: isLoadingAreas } = useAllProductionAreas();

  const form = useForm<FormValues>({
    resolver: zodResolver(mntFarmingCenterSchema),
    defaultValues: {
      siepCode: "",
      name: "",
      latitude: "",
      longitude: "",
      responsibleName: "",
      commune: "",
      region: "",
      ownerCompany: "",
      productionAreaId: null,
      productionCycle: "",
      description: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (mode === "edit" && initialData) {
      form.reset({
        siepCode: initialData.siepCode,
        name: initialData.name,
        latitude: initialData.latitude ? initialData.latitude.toString() : "",
        longitude: initialData.longitude ? initialData.longitude.toString() : "",
        responsibleName: initialData.responsibleName || "",
        commune: initialData.commune || "",
        region: initialData.region || "",
        ownerCompany: initialData.ownerCompany || "",
        productionAreaId: initialData.productionAreaId,
        productionCycle: initialData.productionCycle || "",
        description: initialData.description || "",
        isActive: initialData.isActive,
      });
    }
  }, [mode, initialData, form]);

  const onSubmit = (data: FormValues) => {
    const payload = {
      ...data,
      latitude: data.latitude ? parseFloat(data.latitude) : null,
      longitude: data.longitude ? parseFloat(data.longitude) : null,
    } as Partial<FarmingCenter>;

    if (mode === "create") {
      create(payload, {
        onSuccess: () => {
          onSuccess();
          form.reset();
        },
      });
    } else {
      update(
        { id: initialData?.id!, ...payload },
        {
          onSuccess: () => {
            onSuccess();
            form.reset();
          },
        },
      );
    }
  };

  const { mnt_farming_centers: texts } = maintenanceConfig as any;
  const formTexts = texts?.form;

  return (
    <div className="w-full">
      <Card className="w-full border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pb-6">
          <CardTitle className="flex items-center gap-3 text-2xl font-bold">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <MapPin className="h-6 w-6 text-[#283c7f] dark:text-blue-400" />
            </div>
            {mode === "create" ? formTexts?.create_title : formTexts?.edit_title}
          </CardTitle>
          <CardDescription className="text-base mt-2">{formTexts?.description}</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <FormField
                  control={form.control}
                  name="siepCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">{formTexts?.field_siep}</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: 104234" {...field} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">{formTexts?.field_name}</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Centro Norte" {...field} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="productionAreaId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-base">Área de Producción</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined} disabled={isLoadingAreas}>
                        <FormControl>
                          <SelectTrigger className="h-11 w-full">
                            <SelectValue placeholder={isLoadingAreas ? "Cargando áreas..." : "Seleccione Área"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {productionAreas?.map((area) => (
                            <SelectItem key={area.id} value={area.id}>
                              {area.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Latitud</FormLabel>
                      <FormControl>
                        <Input placeholder="-41.32..." {...field} value={field.value || ""} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Longitud</FormLabel>
                      <FormControl>
                        <Input placeholder="-73.04..." {...field} value={field.value || ""} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="responsibleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Jefe de Centro</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del responsable..." {...field} value={field.value || ""} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="productionCycle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Ciclo de Producción</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Invierno 2026..." {...field} value={field.value || ""} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="commune"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Comuna</FormLabel>
                      <FormControl>
                        <Input placeholder="Comuna..." {...field} value={field.value || ""} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Región</FormLabel>
                      <FormControl>
                        <Input placeholder="Región..." {...field} value={field.value || ""} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ownerCompany"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Empresa Propietaria</FormLabel>
                      <FormControl>
                        <Input placeholder="Empresa..." {...field} value={field.value || ""} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-base">Descripción</FormLabel>
                      <FormControl>
                        <Input placeholder="Observaciones..." {...field} value={field.value || ""} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-xl border border-dashed p-5 col-span-1 md:col-span-2 bg-slate-50/50 dark:bg-slate-900/20">
                      <div className="space-y-1">
                        <FormLabel className="text-lg font-semibold">{formTexts?.field_active}</FormLabel>
                        <FormDescription className="text-sm">Indica si el centro de cultivo está operando.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} className="scale-110" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={onCancel} className="h-11 px-6 rounded-lg font-medium dark:text-white transition-all hover:bg-slate-50">
                  <X className="mr-2 h-4 w-4" /> Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="h-11 px-8 rounded-lg font-bold bg-[#283c7f] hover:bg-[#1e2d5f] text-white shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                >
                  {isCreating || isUpdating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                  Guardar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
