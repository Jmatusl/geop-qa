"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useUpdateSetting, AppSetting } from "@/lib/hooks/use-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";

const emailConfigSchema = z.object({
  enabled: z.boolean(),
  provider: z.string().min(1, "Proveedor requerido"),
  from_name: z.string().min(1, "Nombre remitente requerido"),
  from_email: z.string().email("Email inválido"),
  resend_api_key: z
    .string()
    .min(1, "API Key requerida")
    .refine((val) => val.startsWith("re_"), "Debe comenzar con 're_'"),
  send_notifications: z.boolean(),
  show_client_logo: z.boolean().default(true),
});

type EmailConfigValues = z.infer<typeof emailConfigSchema>;

interface EmailConfigFormProps {
  setting: AppSetting;
}

export function EmailConfigForm({ setting }: EmailConfigFormProps) {
  const { mutate: updateSetting, isPending } = useUpdateSetting();
  const [showApiKey, setShowApiKey] = useState(false);

  const form = useForm<EmailConfigValues>({
    resolver: zodResolver(emailConfigSchema),
    defaultValues: setting.value || {
      enabled: true,
      provider: "resend",
      from_name: "Sistema Certificaciones",
      from_email: "no-reply@example.com",
      resend_api_key: "",
      send_notifications: true,
      show_client_logo: true,
    },
  });

  // Reset form when setting data changes (e.g. after refetch)
  useEffect(() => {
    if (setting.value) {
      form.reset(setting.value);
    }
  }, [setting.value, form]);

  const onSubmit = (data: EmailConfigValues) => {
    updateSetting({
      id: setting.id,
      value: {
        ...setting.value, // Preserve other fields like 'templates' if they exist but are not in this form
        ...data,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Proveedor de Correo (Resend)</CardTitle>
        <CardDescription>Configura las credenciales de API para el servicio de envío de correos transaccionales.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Habilitar Servicio</FormLabel>
                <FormDescription>Activa o desactiva la integración global con Resend.</FormDescription>
              </div>
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="from_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Remitente</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Sistema Certificaciones" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="from_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Remitente</FormLabel>
                    <FormControl>
                      <Input placeholder="no-reply@tu-dominio.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="resend_api_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resend API Key</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showApiKey ? "text" : "password"} placeholder="re_1234..." {...field} autoComplete="new-password" className="pr-10" />
                      <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowApiKey(!showApiKey)}>
                        {showApiKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>La clave debe comenzar con "re_".</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/20">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Incluir Logo Cliente</FormLabel>
                <FormDescription>Define si se agrega automáticamente el logo del cliente en el encabezado de los correos.</FormDescription>
              </div>
              <FormField
                control={form.control}
                name="show_client_logo"
                render={({ field }) => (
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                )}
              />
            </div>

            <div className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/20">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Envío de Notificaciones</FormLabel>
                <FormDescription>Interruptor maestro para detener todos los correos automáticos sin borrar la credencial.</FormDescription>
              </div>
              <FormField
                control={form.control}
                name="send_notifications"
                render={({ field }) => (
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending} className="bg-[#283c7f] hover:bg-[#1f2f65] text-white">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4 text-white" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
