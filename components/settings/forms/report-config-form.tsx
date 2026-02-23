"use client";

import { useForm } from "react-hook-form";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useUpdateSetting, AppSetting } from "@/lib/hooks/use-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface ReportLogoConfig {
  ubication: string;
  logo: string;
  logo_base64: string;
  width: number;
  height: number;
  offset?: { top: number; left: number };
}

interface ReportConfigValues {
  excel: ReportLogoConfig;
  pdf: ReportLogoConfig;
}

interface ReportConfigFormProps {
  setting: AppSetting;
}

export function ReportConfigForm({ setting }: ReportConfigFormProps) {
  const { mutate: updateSetting, isPending } = useUpdateSetting();

  const form = useForm<ReportConfigValues>({
    defaultValues: setting.value,
  });

  useEffect(() => {
    if (setting.value) form.reset(setting.value);
  }, [setting.value, form]);

  const onSubmit = (data: ReportConfigValues) => {
    // Ensure numbers
    const safeData = {
      excel: {
        ...data.excel,
        width: Number(data.excel.width),
        height: Number(data.excel.height),
        offset: data.excel.offset
          ? {
              top: Number(data.excel.offset.top),
              left: Number(data.excel.offset.left),
            }
          : undefined,
      },
      pdf: {
        ...data.pdf,
        width: Number(data.pdf.width),
        height: Number(data.pdf.height),
        offset: data.pdf.offset
          ? {
              top: Number(data.pdf.offset.top),
              left: Number(data.pdf.offset.left),
            }
          : undefined,
      },
    };
    updateSetting({ id: setting.id, value: safeData });
  };

  const renderConfig = (type: "excel" | "pdf") => {
    const logoBase64 = form.watch(`${type}.logo_base64`);
    const logoUrl = form.watch(`${type}.logo`);
    const width = form.watch(`${type}.width`);
    const height = form.watch(`${type}.height`);

    const hasPreview = logoBase64 || logoUrl;

    return (
      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name={`${type}.logo`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ruta Logo (Local/Bucket)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`${type}.ubication`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ubicación</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="top-left" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name={`${type}.width`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ancho (px)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`${type}.height`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alto (px)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name={`${type}.logo_base64`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Base64 (Opcional - Para PDF Offline)</FormLabel>
              <FormControl>
                <Textarea className="h-24 font-mono text-[10px]" {...field} />
              </FormControl>
              <FormDescription>Usado si no se puede acceder a la ruta remota.</FormDescription>
            </FormItem>
          )}
        />

        {/* PREVIEW SECTION */}
        <div className="space-y-2">
          <FormLabel>Vista Previa del Logotipo (Tamaño Real Reporte)</FormLabel>
          <div className="p-4 border rounded-xl bg-muted/10 flex items-center justify-center min-h-[140px] overflow-auto">
            {hasPreview ? (
              <div
                className="bg-white shadow-sm border rounded-sm flex items-center justify-center p-2"
                style={{
                  width: "fit-content",
                  height: "fit-content",
                }}
              >
                <img
                  src={logoBase64 || logoUrl}
                  alt={`Preview ${type}`}
                  style={{
                    width: width ? `${width}px` : "auto",
                    height: height ? `${height}px` : "auto",
                    objectFit: "contain",
                  }}
                  onError={(e) => {
                    // Fallback if image fails to load
                    (e.target as HTMLImageElement).src = "https://placehold.co/200x100?text=Error+Carga";
                  }}
                />
              </div>
            ) : (
              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground italic">No hay imagen configurada</p>
                <p className="text-[10px] text-muted-foreground/60">Configura una ruta o Base64 arriba</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Marcas en Reportes</CardTitle>
        <CardDescription>Personaliza los logotipos y encabezados para los informes generados.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="excel" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="excel">Excel</TabsTrigger>
                <TabsTrigger value="pdf">PDF</TabsTrigger>
              </TabsList>
              <TabsContent value="excel">{renderConfig("excel")}</TabsContent>
              <TabsContent value="pdf">{renderConfig("pdf")}</TabsContent>
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
                    <span>Guardar Branding</span>
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
