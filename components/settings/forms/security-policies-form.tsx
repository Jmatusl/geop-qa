"use client";

import { useForm } from "react-hook-form";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useUpdateSetting, AppSetting } from "@/lib/hooks/use-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";
import { Separator } from "@/components/ui/separator";

interface SecurityPoliciesConfigValues {
  session: {
    allow_multiple_sessions: boolean;
    max_concurrent_sessions: number;
  };
  password: {
    min_length: number;
    require_number: boolean;
    require_lowercase: boolean;
    require_uppercase: boolean;
    require_special_char: boolean;
  };
  account_lockout: {
    enabled: boolean;
    max_failed_attempts: number;
    lockout_duration_minutes: number;
  };
}

interface SecurityPoliciesFormProps {
  setting: AppSetting;
}

export function SecurityPoliciesForm({ setting }: SecurityPoliciesFormProps) {
  const { mutate: updateSetting, isPending } = useUpdateSetting();

  const form = useForm<SecurityPoliciesConfigValues>({
    defaultValues: setting.value,
  });

  useEffect(() => {
    if (setting.value) form.reset(setting.value);
  }, [setting.value, form]);

  const onSubmit = (data: SecurityPoliciesConfigValues) => {
    const safeData = {
      ...data,
      session: {
        ...data.session,
        max_concurrent_sessions: Number(data.session.max_concurrent_sessions),
      },
      password: {
        ...data.password,
        min_length: Number(data.password.min_length),
      },
      account_lockout: {
        ...data.account_lockout,
        max_failed_attempts: Number(data.account_lockout.max_failed_attempts),
        lockout_duration_minutes: Number(data.account_lockout.lockout_duration_minutes),
      },
    };
    updateSetting({ id: setting.id, value: safeData });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Políticas de Seguridad</CardTitle>
        <CardDescription>Reglas para contraseñas, sesiones simultáneas y bloqueos de cuenta.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Session Policies */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Control de Sesiones</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="session.allow_multiple_sessions"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Múltiples Sesiones</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="session.max_concurrent_sessions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máx. Sesiones Simultáneas</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Password Policies */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Requisitos de Contraseña</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="password.min_length"
                  render={({ field }) => (
                    <FormItem className="col-span-2 md:col-span-4">
                      <FormLabel>Longitud Mínima</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="max-w-[120px]" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password.require_number"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel>Números</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password.require_lowercase"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel>Minúsculas</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password.require_uppercase"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel>Mayúsculas</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password.require_special_char"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel>Símbolos</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Lockout Policies */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Bloqueo de Cuenta</h4>
              <div className="flex flex-row items-center space-x-4 mb-4">
                <FormField
                  control={form.control}
                  name="account_lockout.enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel>Habilitar Bloqueo</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="account_lockout.max_failed_attempts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intentos Fallidos</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} disabled={!form.watch("account_lockout.enabled")} />
                      </FormControl>
                      <FormDescription>Antes de bloquear.</FormDescription>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="account_lockout.lockout_duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duración Bloqueo (Min)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} disabled={!form.watch("account_lockout.enabled")} />
                      </FormControl>
                      <FormDescription>Tiempo de espera para desbloqueo.</FormDescription>
                    </FormItem>
                  )}
                />
              </div>
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
                    <span>Guardar Políticas</span>
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
