"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { mntSupplierSchema } from "@/lib/validations/mantencion";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useCreateSupplier, useUpdateSupplier, Supplier } from "@/lib/hooks/mantencion/use-suppliers";
import { Truck, Loader2, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import maintenanceConfig from "@/lib/config/ui/maintainers.json";
import { z } from "zod";

type FormValues = z.infer<typeof mntSupplierSchema>;

interface SupplierFormProps {
  mode: "create" | "edit";
  initialData?: Supplier | null;
  onCancel: () => void;
  onSuccess: (data?: any) => void;
}

export function SupplierForm({ mode, initialData, onCancel, onSuccess }: SupplierFormProps) {
  const { mutate: create, isPending: isCreating } = useCreateSupplier();
  const { mutate: update, isPending: isUpdating } = useUpdateSupplier();

  const form = useForm<FormValues>({
    resolver: zodResolver(mntSupplierSchema),
    defaultValues: {
      rut: "",
      businessLine: "",
      legalName: "",
      fantasyName: "",
      contactName: "",
      phone: "",
      contactEmail: "",
      address: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (mode === "edit" && initialData) {
      form.reset({
        rut: initialData.rut,
        businessLine: initialData.businessLine,
        legalName: initialData.legalName || "",
        fantasyName: initialData.fantasyName || "",
        contactName: initialData.contactName || "",
        phone: initialData.phone || "",
        contactEmail: initialData.contactEmail || "",
        address: initialData.address || "",
        isActive: initialData.isActive,
      });
    }
  }, [mode, initialData, form]);

  const onSubmit = (data: FormValues) => {
    // clean up optional fields
    const payload = {
      ...data,
      legalName: data.legalName || null,
      fantasyName: data.fantasyName || null,
      contactName: data.contactName || null,
      phone: data.phone || null,
      contactEmail: data.contactEmail || null,
      address: data.address || null,
    };

    if (mode === "create") {
      create(payload as Partial<Supplier>, {
        onSuccess: (res) => {
          onSuccess(res);
          form.reset();
        },
      });
    } else {
      update(
        { id: initialData?.id!, ...(payload as Partial<Supplier>) },
        {
          onSuccess: () => {
            onSuccess();
            form.reset();
          },
        },
      );
    }
  };

  const { mnt_suppliers: texts } = maintenanceConfig as any;
  const formTexts = texts?.form;

  return (
    <div className="w-full">
      <Card className="w-full border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pb-6">
          <CardTitle className="flex items-center gap-3 text-2xl font-bold">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Truck className="h-6 w-6 text-[#283c7f] dark:text-blue-400" />
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
                  name="rut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">{formTexts?.field_rut}</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: 76123456-K" {...field} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="businessLine"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">{formTexts?.field_line}</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Venta de Motores" {...field} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="legalName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">{formTexts?.field_legal}</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Motores SA" {...field} value={field.value || ""} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fantasyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">{formTexts?.field_fantasy}</FormLabel>
                      <FormControl>
                        <Input placeholder="Comercial Motores" {...field} value={field.value || ""} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">{formTexts?.field_contact}</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: María José" {...field} value={field.value || ""} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">{formTexts?.field_phone}</FormLabel>
                      <FormControl>
                        <Input placeholder="+569..." {...field} value={field.value || ""} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">{formTexts?.field_email}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="ventas@motores.cl" {...field} value={field.value || ""} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">{formTexts?.field_address}</FormLabel>
                      <FormControl>
                        <Input placeholder="Calle Principal 123" {...field} value={field.value || ""} className="h-11 w-full" autoComplete="off" />
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
                        <FormDescription className="text-sm">Habilitar proveedor para ser seleccionado en nuevas ordenes o solicitudes.</FormDescription>
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
