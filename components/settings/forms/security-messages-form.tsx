"use client";

import { useForm } from "react-hook-form";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateSetting, AppSetting } from "@/lib/hooks/use-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SecurityMessagesConfigValues {
  session_limit: {
    title: string;
    message: string;
    btn_close_others: string;
    contact_admin: string;
  };
  lockout: {
    warning: string;
    locked: string;
    contact_admin: string;
  };
}

interface SecurityMessagesFormProps {
  setting: AppSetting;
}

export function SecurityMessagesForm({ setting }: SecurityMessagesFormProps) {
  const { mutate: updateSetting, isPending } = useUpdateSetting();

  const form = useForm<SecurityMessagesConfigValues>({
    defaultValues: setting.value,
  });

  useEffect(() => {
    if (setting.value) form.reset(setting.value);
  }, [setting.value, form]);

  const onSubmit = (data: SecurityMessagesConfigValues) => {
    updateSetting({ id: setting.id, value: data });
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Mensajes de Seguridad</CardTitle>
        <CardDescription>Textos mostrados al usuario en eventos de bloqueo o límite de sesiones.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="session" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="session">Límite de Sesiones</TabsTrigger>
                <TabsTrigger value="lockout">Bloqueo de Cuenta</TabsTrigger>
              </TabsList>

              <TabsContent value="session" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="session_limit.title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título Modal</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="session_limit.message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensaje Principal</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Vars: {"{{current}}"}, {"{{max}}"}
                      </p>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="session_limit.btn_close_others"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Botón Acción</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="session_limit.contact_admin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Texto Ayuda</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="lockout" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="lockout.warning"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Advertencia Previa</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Vars: {"{{current}}"}, {"{{max}}"}
                      </p>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lockout.locked"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensaje Bloqueo</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Var: {"{{minutes}}"}</p>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lockout.contact_admin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Texto Ayuda</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

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
                    <span>Guardar Mensajes</span>
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
