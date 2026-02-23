"use client";

import { useForm } from "react-hook-form";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useUpdateSetting, AppSetting } from "@/lib/hooks/use-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";

interface PersonImageConfigValues {
  maxSizeKb: number;
  allowedFormats: string[];
  aspectRatio: number;
  targetResolution: number;
}

interface PersonImageConfigFormProps {
  setting: AppSetting;
}

const AVAILABLE_FORMATS = [
  { id: "image/jpeg", label: "JPEG (.jpg)" },
  { id: "image/png", label: "PNG (.png)" },
  { id: "image/webp", label: "WebP (.webp)" },
];

export function PersonImageConfigForm({ setting }: PersonImageConfigFormProps) {
  const { mutate: updateSetting, isPending } = useUpdateSetting();

  const form = useForm<PersonImageConfigValues>({
    defaultValues: setting.value || {
      maxSizeKb: 3000,
      allowedFormats: ["image/jpeg", "image/png"],
      aspectRatio: 1,
      targetResolution: 1024,
    },
  });

  useEffect(() => {
    if (setting.value) form.reset(setting.value);
  }, [setting.value, form]);

  const onSubmit = (data: PersonImageConfigValues) => {
    const safeData = {
      ...data,
      maxSizeKb: Number(data.maxSizeKb),
      aspectRatio: Number(data.aspectRatio),
      targetResolution: Number(data.targetResolution),
    };
    updateSetting({ id: setting.id, value: safeData });
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Fotos de Perfil</CardTitle>
        <CardDescription>Restricciones y procesamiento para las imágenes de trabajadores.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="maxSizeKb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso Máximo (KB)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>Ej: 3000 KB = 3MB</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetResolution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resolución Objetivo (px)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>Las imágenes se redimensionarán a este ancho/alto.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="allowedFormats"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Formatos Permitidos</FormLabel>
                    <FormDescription>Selecciona qué tipos de archivo puede subir el usuario.</FormDescription>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {AVAILABLE_FORMATS.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="allowedFormats"
                        render={({ field }) => {
                          return (
                            <FormItem key={item.id} className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.id)}
                                  onCheckedChange={(checked) => {
                                    return checked ? field.onChange([...field.value, item.id]) : field.onChange(field.value?.filter((value) => value !== item.id));
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">{item.label}</FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
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
                    <span>Guardar Configuración</span>
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
