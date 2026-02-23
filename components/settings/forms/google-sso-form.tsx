"use client";

import { useForm } from "react-hook-form";
import { Loader2, Save, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useUpdateSetting, AppSetting } from "@/lib/hooks/use-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface GoogleSSOConfigValues {
  enabled: boolean;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
}

interface GoogleSSOFormProps {
  setting: AppSetting;
}

export function GoogleSSOForm({ setting }: GoogleSSOFormProps) {
  const { mutate: updateSetting, isPending } = useUpdateSetting();
  const [showSecret, setShowSecret] = useState(false);

  const form = useForm<GoogleSSOConfigValues>({
    defaultValues: setting.value || {
      enabled: false,
      client_id: "",
      client_secret: "",
      redirect_uri: "",
    },
  });

  useEffect(() => {
    if (setting.value) form.reset(setting.value);
  }, [setting.value, form]);

  const onSubmit = (data: GoogleSSOConfigValues) => {
    updateSetting({ id: setting.id, value: data });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Google SSO</CardTitle>
        <CardDescription>Permitir autenticación mediante cuentas de Google Workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Habilitar Google Login</FormLabel>
                <FormDescription>Mostrar botón de "Iniciar sesión con Google".</FormDescription>
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
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="client_secret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Secret</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showSecret ? "text" : "password"} {...field} />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowSecret(!showSecret)}>
                          {showSecret ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="redirect_uri"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Redirect URI</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="http://localhost:3000/api/v1/auth/google/callback" />
                  </FormControl>
                  <FormDescription>Debe coincidir con la configuración en Google Cloud Console.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isPending} className="bg-[#283c7f] hover:bg-[#1f2f65] text-white">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4 text-white" />
                    <span>Guardar SSO</span>
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
