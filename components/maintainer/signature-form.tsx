"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SignatureCanvas } from "@/components/ui/signature-canvas";
import { useCreateSignature, useUpdateSignature, Signature } from "@/lib/hooks/use-signatures";
import { LayoutGrid, Loader2, Save, X, Upload, Pencil, Image as ImageIcon, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUsers } from "@/lib/hooks/use-users";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User as UserIcon } from "lucide-react";

const signatureSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  data: z.string().min(10, "La firma está vacía"),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  userId: z.string().uuid().optional().nullable(),
});

type FormValues = z.infer<typeof signatureSchema>;

interface SignatureFormProps {
  mode: "create" | "edit";
  initialData?: Signature | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function SignatureForm({ mode, initialData, onCancel, onSuccess }: SignatureFormProps) {
  const { mutate: create, isPending: isCreating } = useCreateSignature();
  const { mutate: update, isPending: isUpdating } = useUpdateSignature();
  const { data: usersData, isLoading: isLoadingUsers } = useUsers(1, 500); // Admin view can see up to 500 users
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<string>("draw");

  const form = useForm<FormValues>({
    resolver: zodResolver(signatureSchema),
    defaultValues: {
      name: "",
      data: "",
      isActive: true,
      isDefault: false,
      userId: null,
    },
  });

  useEffect(() => {
    if (mode === "edit" && initialData) {
      form.reset({
        name: initialData.name,
        data: initialData.data,
        isActive: initialData.isActive,
        isDefault: initialData.isDefault,
        userId: initialData.userId,
      });
    }
  }, [mode, initialData, form]);

  const onSubmit = (data: FormValues) => {
    if (mode === "create") {
      create(data as Partial<Signature>, {
        onSuccess: () => {
          onSuccess();
          form.reset();
        },
      });
    } else {
      update(
        { id: initialData?.id!, data: data as Partial<Signature> },
        {
          onSuccess: () => {
            onSuccess();
            form.reset();
          },
        },
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "image/png") {
      toast.error("Solo se permiten archivos PNG");
      return;
    }

    if (file.size > 50 * 1024) {
      toast.error("El archivo excede el límite de 50KB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      form.setValue("data", base64);
      toast.success("Imagen cargada correctamente");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full">
      <Card className="w-full border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pb-6">
          <CardTitle className="flex items-center gap-3 text-2xl font-bold">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Pencil className="h-6 w-6 text-[#283c7f] dark:text-blue-400" />
            </div>
            {mode === "create" ? "Nueva Firma" : "Editar Firma"}
          </CardTitle>
          <CardDescription className="text-base mt-2">Configure la firma digital para su uso en documentos oficiales.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel className="text-base font-bold">Nombre de la Firma</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Firma Formal, Media Firma..." {...field} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel className="text-base font-bold flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-slate-400" />
                        Vincular a Usuario
                      </FormLabel>
                      <div className="w-full">
                        <Select onValueChange={(val) => field.onChange(val === "none" ? null : val)} value={field.value || "none"} disabled={isLoadingUsers}>
                          <FormControl>
                            <SelectTrigger className="h-11 w-full">
                              <SelectValue placeholder={isLoadingUsers ? "Cargando..." : "Seleccione un usuario..."} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Sin vincular (Firma Global)</SelectItem>
                            {usersData?.data?.map((u: any) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.firstName} {u.lastName} ({u.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem className="md:col-span-2">
                  <FormLabel className="text-base font-bold">Contenido de la Firma</FormLabel>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                      <TabsTrigger value="draw" className="rounded-md font-bold transition-all gap-2 h-10">
                        <Pencil className="h-4 w-4" /> Dibujar Firma
                      </TabsTrigger>
                      <TabsTrigger value="upload" className="rounded-md font-bold transition-all gap-2 h-10">
                        <Upload className="h-4 w-4" /> Subir PNG
                      </TabsTrigger>
                    </TabsList>

                    <div className="mt-4 p-4 border rounded-xl bg-white dark:bg-slate-950/50">
                      <TabsContent value="draw" className="mt-0 focus-visible:outline-none">
                        <SignatureCanvas
                          onSave={(base64) => {
                            form.setValue("data", base64);
                            toast.success("Firma capturada correctamente");
                          }}
                        />
                      </TabsContent>

                      <TabsContent value="upload" className="mt-0 focus-visible:outline-none space-y-4">
                        <div className="flex gap-4 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-blue-500">
                          <div className="shrink-0">
                            <Info className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Recomendación para firmas</p>
                            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc pl-4">
                              <li>Peso objetivo: ≤ 30 KB (mejor performance en PDFs y emails).</li>
                              <li>Formato preferido: PNG con fondo transparente.</li>
                              <li>Dimensiones sugeridas: ~300–600 px de ancho, manteniendo proporción.</li>
                            </ul>
                            <p className="text-[11px] text-slate-500 dark:text-slate-500 leading-relaxed italic">
                              La aplicación intentará optimizar la imagen automáticamente, pero es mejor subir una versión ya optimizada para evitar pérdida de calidad.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 gap-4">
                          <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                            <ImageIcon className="h-8 w-8 text-slate-400" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Haga clic para subir su firma</p>
                            <p className="text-xs text-slate-400 mt-1">Solo formato PNG (Máx. 50KB)</p>
                          </div>
                          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="h-10 px-6 rounded-md font-bold dark:text-white">
                            Seleccionar Archivo
                          </Button>
                          <input ref={fileInputRef} type="file" accept="image/png" className="hidden" onChange={handleFileUpload} />
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>

                  {form.watch("data") && (
                    <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-2 block">Vista Previa Actual</label>
                      <div className="h-24 w-48 bg-emerald-50/30 dark:bg-emerald-900/10 border-2 border-emerald-100 dark:border-emerald-800/50 rounded-lg p-2 flex items-center justify-center">
                        <img src={form.watch("data")} alt="Firma preview" className="max-h-full max-w-full object-contain" />
                      </div>
                    </div>
                  )}
                  {form.formState.errors.data && <p className="text-destructive text-sm font-medium mt-2">{form.formState.errors.data.message}</p>}
                </FormItem>

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-xl border border-dashed p-5 col-span-1 md:col-span-1 bg-slate-50/50 dark:bg-slate-900/20">
                      <div className="space-y-1">
                        <FormLabel className="text-lg font-semibold">Firma Activa</FormLabel>
                        <FormDescription className="text-sm">Indica si esta firma está disponible para su uso.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} className="scale-110" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-xl border border-dashed p-5 col-span-1 md:col-span-1 bg-slate-50/50 dark:bg-slate-900/20">
                      <div className="space-y-1">
                        <FormLabel className="text-lg font-semibold">Predeterminada</FormLabel>
                        <FormDescription className="text-sm">Marcar como favorita para este usuario.</FormDescription>
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
                  Guardar Firma
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
