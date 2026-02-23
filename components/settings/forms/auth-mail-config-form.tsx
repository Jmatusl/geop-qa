"use client";

import { useForm } from "react-hook-form";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateSetting, AppSetting } from "@/lib/hooks/use-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// No strict schema validation needed as these are mostly free text, but we could add minLength
interface MailTemplateConfig {
  subject: string;
  title: string;
  greeting: string;
  instruction: string;
  button_text: string;
  expiration_text: string;
  ignore_text?: string;
}

interface AuthMailConfigValues {
  user_creation_mail: MailTemplateConfig;
  password_reset_mail: MailTemplateConfig;
}

interface AuthMailConfigFormProps {
  setting: AppSetting;
}

export function AuthMailConfigForm({ setting }: AuthMailConfigFormProps) {
  const { mutate: updateSetting, isPending } = useUpdateSetting();

  const form = useForm<AuthMailConfigValues>({
    defaultValues: setting.value || {},
  });

  useEffect(() => {
    if (setting.value) form.reset(setting.value);
  }, [setting.value, form]);

  const onSubmit = (data: AuthMailConfigValues) => {
    updateSetting({ id: setting.id, value: data });
  };

  const renderTemplateFields = (prefix: "user_creation_mail" | "password_reset_mail") => (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={`${prefix}.subject`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asunto del Correo</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`${prefix}.title`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título Principal (H1)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name={`${prefix}.greeting`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Saludo</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <p className="text-xs text-muted-foreground">Variable disponible: {"{{name}}"}</p>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`${prefix}.instruction`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Instrucciones</FormLabel>
            <FormControl>
              <Textarea className="resize-none" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={`${prefix}.button_text`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Texto del Botón</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Texto dentro del botón principal.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`${prefix}.expiration_text`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Texto de Expiración</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Variable: {"{{expiration}}"}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {prefix === "password_reset_mail" && (
        <FormField
          control={form.control}
          name={`${prefix}.ignore_text`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Texto Ignorar (Footer)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Correos de Autenticación</CardTitle>
        <CardDescription>Personaliza los textos para los correos automáticos de bienvenida y recuperación.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="creation" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="creation">Creación de Usuario</TabsTrigger>
                <TabsTrigger value="reset">Recuperación Contraseña</TabsTrigger>
              </TabsList>
              <TabsContent value="creation">{renderTemplateFields("user_creation_mail")}</TabsContent>
              <TabsContent value="reset">{renderTemplateFields("password_reset_mail")}</TabsContent>
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
                    <span>Guardar Textos</span>
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
