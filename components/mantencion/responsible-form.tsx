"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { mntTechnicalResponsibleSchema } from "@/lib/validations/mantencion";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateResponsible, useUpdateResponsible, TechnicalResponsible } from "@/lib/hooks/mantencion/use-responsibles";
import { useAllAreas } from "@/lib/hooks/mantencion/use-areas";
import { useUsers } from "@/lib/hooks/use-users";
import { HardHat, Loader2, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import maintenanceConfig from "@/lib/config/ui/maintainers.json";
import { z } from "zod";

type FormValues = z.infer<typeof mntTechnicalResponsibleSchema>;

interface ResponsibleFormProps {
  mode: "create" | "edit";
  initialData?: TechnicalResponsible | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function ResponsibleForm({ mode, initialData, onCancel, onSuccess }: ResponsibleFormProps) {
  const { mutate: create, isPending: isCreating } = useCreateResponsible();
  const { mutate: update, isPending: isUpdating } = useUpdateResponsible();

  const { data: areas, isLoading: isLoadingAreas } = useAllAreas();
  const { data: usersData, isLoading: isLoadingUsers } = useUsers(1, 1000); // Fetch list of users

  const form = useForm<FormValues>({
    resolver: zodResolver(mntTechnicalResponsibleSchema),
    defaultValues: {
      name: "",
      userId: "",
      areaId: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (mode === "edit" && initialData) {
      form.reset({
        name: initialData.name,
        userId: initialData.userId,
        areaId: initialData.areaId,
        isActive: initialData.isActive,
      });
    }
  }, [mode, initialData, form]);

  const onSubmit = (data: FormValues) => {
    if (mode === "create") {
      create(data as Partial<TechnicalResponsible>, {
        onSuccess: () => {
          onSuccess();
          form.reset();
        },
      });
    } else {
      update(
        { id: initialData?.id!, ...(data as Partial<TechnicalResponsible>) },
        {
          onSuccess: () => {
            onSuccess();
            form.reset();
          },
        },
      );
    }
  };

  const { mnt_technical_responsibles: texts } = maintenanceConfig as any;
  const formTexts = texts?.form;

  return (
    <div className="w-full">
      <Card className="w-full border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pb-6">
          <CardTitle className="flex items-center gap-3 text-2xl font-bold">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <HardHat className="h-6 w-6 text-[#283c7f] dark:text-blue-400" />
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
                  name="userId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-base">{formTexts?.field_user}</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          const user: any = usersData?.data?.find((u: any) => u.id === val);
                          if (user && !form.getValues("name")) {
                            form.setValue("name", user.name || user.firstName || user.email || "");
                          }
                        }}
                        value={field.value || undefined}
                        disabled={isLoadingUsers || mode === "edit"}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 w-full">
                            <SelectValue placeholder={isLoadingUsers ? "Cargando..." : "Seleccione Cuenta"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {usersData?.data?.map((u: any) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} ({u.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-sm">La cuenta asociada debe existir en el sistema.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-base">{formTexts?.field_name}</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Pedro González" {...field} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="areaId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-base">{formTexts?.field_area}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined} disabled={isLoadingAreas}>
                        <FormControl>
                          <SelectTrigger className="h-11 w-full">
                            <SelectValue placeholder={isLoadingAreas ? "Cargando..." : "Seleccione Área"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {areas?.map((area) => (
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
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-xl border border-dashed p-5 col-span-1 md:col-span-2 bg-slate-50/50 dark:bg-slate-900/20">
                      <div className="space-y-1">
                        <FormLabel className="text-lg font-semibold">{formTexts?.field_active}</FormLabel>
                        <FormDescription className="text-sm">Indica si el responsable técnico está disponible para aprobar trabajos.</FormDescription>
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
