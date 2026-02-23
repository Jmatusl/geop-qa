"use client";

import { useForm } from "react-hook-form";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useUpdateSetting, AppSetting } from "@/lib/hooks/use-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";

interface ExpirationConfigValues {
  session_idle_minutes: number;
  activation_token_days: number;
  session_absolute_hours: number;
  password_reset_token_hours: number;
}

interface ExpirationConfigFormProps {
  setting: AppSetting;
}

export function ExpirationConfigForm({ setting }: ExpirationConfigFormProps) {
  const { mutate: updateSetting, isPending } = useUpdateSetting();

  const form = useForm<ExpirationConfigValues>({
    defaultValues: setting.value || {
      session_idle_minutes: 30,
      activation_token_days: 7,
      session_absolute_hours: 8,
      password_reset_token_hours: 24,
    },
  });

  useEffect(() => {
    if (setting.value) form.reset(setting.value);
  }, [setting.value, form]);

  const onSubmit = (data: ExpirationConfigValues) => {
    // Parse numbers just in case
    const safeData = {
      session_idle_minutes: Number(data.session_idle_minutes),
      activation_token_days: Number(data.activation_token_days),
      session_absolute_hours: Number(data.session_absolute_hours),
      password_reset_token_hours: Number(data.password_reset_token_hours),
    };
    updateSetting({ id: setting.id, value: safeData });
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Tiempos de Sesión y Tokens</CardTitle>
        <CardDescription>Controla cuánto tiempo duran las sesiones de usuario y los enlaces temporales.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="session_idle_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inactividad (Minutos)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>Tiempo sin uso para cerrar sesión.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="session_absolute_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sesión Absoluta (Horas)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>Duración máxima total de un login.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="activation_token_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Activación (Días)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password_reset_token_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Recuperación (Horas)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                    <span>Guardar Tiempos</span>
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
