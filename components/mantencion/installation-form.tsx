"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { mntInstallationSchema } from "@/lib/validations/mantencion";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateInstallation, useUpdateInstallation, Installation } from "@/lib/hooks/mantencion/use-installations";
import { useAllFarmingCenters } from "@/lib/hooks/mantencion/use-farming-centers";
import { Loader2, Save, X, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import maintenanceConfig from "@/lib/config/ui/maintainers.json";
import { z } from "zod";

type FormValues = z.infer<typeof mntInstallationSchema>;

interface InstallationFormProps {
  mode: "create" | "edit";
  initialData?: Installation | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function InstallationForm({ mode, initialData, onCancel, onSuccess }: InstallationFormProps) {
  const { mutate: create, isPending: isCreating } = useCreateInstallation();
  const { mutate: update, isPending: isUpdating } = useUpdateInstallation();
  const { data: farmingCenters, isLoading: isLoadingCenters } = useAllFarmingCenters();

  const form = useForm<FormValues>({
    resolver: zodResolver(mntInstallationSchema),
    defaultValues: {
      name: "",
      folio: "",
      internalCode: "",
      installationType: "",
      latitude: "",
      longitude: "",
      farmingCenterId: null,
      description: "",
      observations: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (mode === "edit" && initialData) {
      form.reset({
        name: initialData.name,
        folio: initialData.folio || "",
        internalCode: initialData.internalCode || "",
        installationType: initialData.installationType || "",
        latitude: initialData.latitude ? initialData.latitude.toString() : "",
        longitude: initialData.longitude ? initialData.longitude.toString() : "",
        farmingCenterId: initialData.farmingCenterId,
        description: initialData.description || "",
        observations: initialData.observations || "",
        isActive: initialData.isActive,
      });
    }
  }, [mode, initialData, form]);

  const onSubmit = (data: FormValues) => {
    const payload = {
      ...data,
      latitude: data.latitude ? parseFloat(data.latitude) : null,
      longitude: data.longitude ? parseFloat(data.longitude) : null,
    } as Partial<Installation>;

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

  const { mnt_installations: texts } = maintenanceConfig as any;
  const formTexts = texts?.form;

  return (
    <div className="w-full">
      <Card className="w-full border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pb-6">
          <CardTitle className="flex items-center gap-3 text-2xl font-bold">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Building2 className="h-6 w-6 text-[#283c7f] dark:text-blue-400" />
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
                  name="name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-base">{formTexts?.field_name}</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Nave 1" {...field} className="w-full h-11" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="internalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">{formTexts?.field_internal_code}</FormLabel>
                      <FormControl>
                        <Input placeholder="Cod. Inst..." {...field} value={field.value || ""} className="w-full h-11" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="folio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">{formTexts?.field_folio}</FormLabel>
                      <FormControl>
                        <Input placeholder="Folio asociado..." {...field} value={field.value || ""} className="w-full h-11" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="farmingCenterId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-base">{formTexts?.field_center}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined} disabled={isLoadingCenters}>
                        <FormControl>
                          <SelectTrigger className="w-full h-11">
                            <SelectValue placeholder={isLoadingCenters ? "Cargando centros..." : "Seleccione Centro"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {farmingCenters?.map((center) => (
                            <SelectItem key={center.id} value={center.id}>
                              {center.siepCode} - {center.name}
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
                  name="installationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">{formTexts?.field_type}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger className="w-full h-11">
                            <SelectValue placeholder="Seleccione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NAVE">Nave</SelectItem>
                          <SelectItem value="BODEGA">Bodega</SelectItem>
                          <SelectItem value="OFICINA">Oficina</SelectItem>
                          <SelectItem value="PONTÓN">Pontón</SelectItem>
                          <SelectItem value="OTRO">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-base">{formTexts?.field_desc}</FormLabel>
                      <FormControl>
                        <Input placeholder="Descripción general..." {...field} value={field.value || ""} className="w-full h-11" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="observations"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-base">{formTexts?.field_obs}</FormLabel>
                      <FormControl>
                        <Input placeholder="Notas operativas..." {...field} value={field.value || ""} className="w-full h-11" autoComplete="off" />
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
                        <FormDescription className="text-sm">Indica si la instalación está en operación.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} className="scale-110" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end items-center gap-4 pt-8 border-t border-slate-100 dark:border-slate-800">
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
