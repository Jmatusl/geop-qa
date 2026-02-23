"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { mntApplicantSchema } from "@/lib/validations/mantencion";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { useCreateApplicant, useUpdateApplicant, Applicant } from "@/lib/hooks/mantencion/use-applicants";
import { useAllInstallations } from "@/lib/hooks/mantencion/use-installations";
import { useAllJobPositions } from "@/lib/hooks/mantencion/use-job-positions";
import { useUsers } from "@/lib/hooks/use-users";
import { LucideUser as UserIcon, Loader2, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import maintenanceConfig from "@/lib/config/ui/maintainers.json";
import { z } from "zod";

type FormValues = z.infer<typeof mntApplicantSchema>;

interface ApplicantFormProps {
  mode: "create" | "edit";
  initialData?: Applicant | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function ApplicantForm({ mode, initialData, onCancel, onSuccess }: ApplicantFormProps) {
  const { mutate: create, isPending: isCreating } = useCreateApplicant();
  const { mutate: update, isPending: isUpdating } = useUpdateApplicant();

  const { data: installations, isLoading: isLoadingInstallations } = useAllInstallations();
  const { data: jobPositions, isLoading: isLoadingJobPositions } = useAllJobPositions();
  const { data: usersData, isLoading: isLoadingUsers } = useUsers(1, 500); // Fetch up to 500 users for the dropdown

  const form = useForm<FormValues>({
    resolver: zodResolver(mntApplicantSchema),
    defaultValues: {
      name: "",
      email: "",
      jobPositionId: "",
      signatureUrl: "",
      installationIds: [],
      userId: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (mode === "edit" && initialData) {
      form.reset({
        name: initialData.name,
        email: initialData.email || "",
        jobPositionId: initialData.jobPositionId || "",
        signatureUrl: initialData.signatureUrl || "",
        installationIds: initialData.installations?.map((i) => i.id) || [],
        userId: initialData.userId || "",
        isActive: initialData.isActive,
      });
    }
  }, [mode, initialData, form]);

  const onSubmit = (data: FormValues) => {
    // Clean up empty strings for optional UUIDs/URLs
    const payload = {
      ...data,
      jobPositionId: data.jobPositionId || null,
      userId: data.userId || null,
      email: data.email || null,
      signatureUrl: data.signatureUrl || null,
    };

    if (mode === "create") {
      create(payload as Partial<Applicant>, {
        onSuccess: () => {
          onSuccess();
          form.reset();
        },
      });
    } else {
      update(
        { id: initialData?.id!, ...(payload as Partial<Applicant>) },
        {
          onSuccess: () => {
            onSuccess();
            form.reset();
          },
        },
      );
    }
  };

  const { mnt_applicants: texts } = maintenanceConfig as any;
  const formTexts = texts?.form;

  return (
    <div className="w-full">
      <Card className="w-full border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pb-6">
          <CardTitle className="flex items-center gap-3 text-2xl font-bold">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <UserIcon className="h-6 w-6 text-[#283c7f] dark:text-blue-400" />
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
                    <FormItem>
                      <FormLabel className="text-base">{formTexts?.field_name}</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Juan Pérez" {...field} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">{formTexts?.field_email}</FormLabel>
                      <FormControl>
                        <Input placeholder="juan.perez@empresa.com" type="email" {...field} value={field.value || ""} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="installationIds"
                  render={({ field }) => (
                    <FormItem className="flex flex-col h-full">
                      <FormLabel className="text-base">{formTexts?.field_installation || "Instalaciones Autorizadas"}</FormLabel>
                      <FormDescription className="text-xs">Si no selecciona ninguna, el solicitante será transversal (podrá ser seleccionado en todas las instalaciones).</FormDescription>
                      <div className="mt-auto w-full">
                        {isLoadingInstallations ? (
                          <div className="flex h-11 items-center justify-center text-sm text-muted-foreground border rounded-md">Cargando instalaciones...</div>
                        ) : (
                          <MultiSelect
                            options={installations?.map((inst) => ({ label: inst.name, value: inst.id })) || []}
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            placeholder="Seleccionar Instalaciones..."
                            variant="secondary"
                            maxCount={3}
                          />
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="jobPositionId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col h-full">
                      <FormLabel className="text-base">{formTexts?.field_job}</FormLabel>
                      <div className="mt-auto w-full">
                        <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"} disabled={isLoadingJobPositions}>
                          <FormControl>
                            <SelectTrigger className="h-11 w-full">
                              <SelectValue placeholder={isLoadingJobPositions ? "Cargando..." : "Seleccione Cargo"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Ninguno</SelectItem>
                            {jobPositions?.map((jp) => (
                              <SelectItem key={jp.id} value={jp.id}>
                                {jp.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col h-full">
                      <FormLabel className="text-base">Vincular Usuario del Sistema (Opcional)</FormLabel>
                      <FormDescription className="text-sm">Permite autocompletar en el ingreso de requerimientos si el usuario está logueado.</FormDescription>
                      <div className="mt-auto w-full">
                        <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"} disabled={isLoadingUsers}>
                          <FormControl>
                            <SelectTrigger className="h-11 w-full">
                              <SelectValue placeholder={isLoadingUsers ? "Cargando..." : "Vincular a cuenta..."} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Sin vincular</SelectItem>
                            {usersData?.data?.map((u: any) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name} ({u.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="signatureUrl"
                  render={({ field }) => (
                    <FormItem className="flex flex-col h-full">
                      <FormLabel className="text-base">URL Firma Digital (Opcional)</FormLabel>
                      <div className="mt-auto w-full">
                        <FormControl>
                          <Input placeholder="https://..." {...field} value={field.value || ""} className="h-11 w-full" autoComplete="off" />
                        </FormControl>
                      </div>
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
                        <FormDescription className="text-sm">Habilite o deshabilite la capacidad de este usuario para generar solicitudes.</FormDescription>
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
