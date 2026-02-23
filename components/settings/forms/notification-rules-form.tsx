"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useUpdateSetting, AppSetting } from "@/lib/hooks/use-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";

interface ThresholdConfig {
  days: number;
  name: string;
  targetRoles: string[]; // Simplificado a array de strings por ahora
  digestRoles: string[];
  requiresAck: boolean;
  channels: string[];
}

interface NotificationConfigValues {
  unconfirmedRetryLimit: number;
  thresholds: ThresholdConfig[];
}

interface NotificationRulesFormProps {
  setting: AppSetting;
}

export function NotificationRulesForm({ setting }: NotificationRulesFormProps) {
  const { mutate: updateSetting, isPending } = useUpdateSetting();

  const form = useForm<NotificationConfigValues>({
    defaultValues: setting.value || { unconfirmedRetryLimit: 5, thresholds: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "thresholds",
  });

  useEffect(() => {
    if (setting.value) form.reset(setting.value);
  }, [setting.value, form]);

  const onSubmit = (data: NotificationConfigValues) => {
    // Ensure numbers are numbers
    const safeData = {
      ...data,
      unconfirmedRetryLimit: Number(data.unconfirmedRetryLimit),
      thresholds: data.thresholds
        .map((t) => ({
          ...t,
          days: Number(t.days),
        }))
        .sort((a, b) => b.days - a.days), // Auto sort desc
    };
    updateSetting({ id: setting.id, value: safeData });
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Reglas de Notificación de Vencimiento</CardTitle>
        <CardDescription>Define en qué momentos se deben disparar alertas antes de que venza una certificación.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="w-full max-w-xs">
              <FormField
                control={form.control}
                name="unconfirmedRetryLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Límite de Reintentos (Sin Confirmación)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>Cuántas veces insistir si require lectura.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Umbrales Definidos</h3>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex flex-col gap-4 rounded-md border p-4 bg-card shadow-sm md:flex-row md:items-start">
                    <div className="w-24 shrink-0">
                      <FormField
                        control={form.control}
                        name={`thresholds.${index}.days`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Días Antes</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} className="font-bold text-center" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name={`thresholds.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Nombre Etapa</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ej: Crítica" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="flex items-center space-x-2 pt-6">
                          <FormField
                            control={form.control}
                            name={`thresholds.${index}.requiresAck`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center gap-2 space-y-0">
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">Requiere Confirmación</FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        <span className="font-semibold">Destino:</span> {form.watch(`thresholds.${index}.targetRoles`)?.join(", ") || "USUARIO"}
                      </div>
                    </div>

                    <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive self-center" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() =>
                  append({
                    days: 15,
                    name: "Nueva Etapa",
                    targetRoles: ["USUARIO"],
                    digestRoles: ["ADMIN"],
                    requiresAck: false,
                    channels: ["email"],
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar Umbral
              </Button>
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
                    <span>Guardar Reglas</span>
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
