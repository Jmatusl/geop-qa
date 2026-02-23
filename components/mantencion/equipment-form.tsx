import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { mntEquipmentSchema } from "@/lib/validations/mantencion";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateEquipment, useUpdateEquipment, Equipment } from "@/lib/hooks/mantencion/use-equipments";
import { useAllAreas } from "@/lib/hooks/mantencion/use-areas";
import { useAllSystems } from "@/lib/hooks/mantencion/use-systems";
import { useAllResponsibles } from "@/lib/hooks/mantencion/use-responsibles";
import { useAllInstallations } from "@/lib/hooks/mantencion/use-installations";
import { Loader2, Save, X, Wrench, Calendar as CalendarIcon, FileText, ImageIcon, Users, DollarSign, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import maintenanceConfig from "@/lib/config/ui/maintainers.json";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type FormValues = z.infer<typeof mntEquipmentSchema>;

interface EquipmentFormProps {
  mode: "create" | "edit";
  initialData?: Equipment | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function EquipmentForm({ mode, initialData, onCancel, onSuccess }: EquipmentFormProps) {
  const { mutate: create, isPending: isCreating } = useCreateEquipment();
  const { mutate: update, isPending: isUpdating } = useUpdateEquipment();

  const { data: areas, isLoading: isLoadingAreas } = useAllAreas();
  const { data: systems, isLoading: isLoadingSystems } = useAllSystems();
  const { data: responsibles, isLoading: isLoadingResponsibles } = useAllResponsibles();
  const { data: installations, isLoading: isLoadingInstallations } = useAllInstallations();

  const form = useForm<FormValues>({
    resolver: zodResolver(mntEquipmentSchema),
    defaultValues: {
      name: "",
      brand: "",
      model: "",
      partNumber: "",
      serialNumber: "",
      installationId: "",
      areaId: "",
      systemId: "",
      technicalComments: "",
      prevInstructions: "",
      estimatedLife: "",
      commissioningDate: null,
      imageUrl: "",
      imageDescription: "",
      datasheetUrl: "",
      datasheetName: "",
      referencePrice: undefined,
      responsibleIds: [],
      isActive: true,
    },
  });

  const watchAreaId = form.watch("areaId");
  const filteredSystems = systems?.filter((sys) => sys.areaId === watchAreaId) || [];

  useEffect(() => {
    if (mode === "edit" && initialData) {
      form.reset({
        name: initialData.name,
        brand: initialData.brand || "",
        model: initialData.model || "",
        partNumber: initialData.partNumber || "",
        serialNumber: initialData.serialNumber || "",
        installationId: initialData.installationId || "",
        areaId: initialData.areaId,
        systemId: initialData.systemId,
        technicalComments: initialData.technicalComments || "",
        prevInstructions: initialData.prevInstructions || "",
        estimatedLife: initialData.estimatedLife || "",
        commissioningDate: initialData.commissioningDate ? new Date(initialData.commissioningDate) : null,
        imageUrl: initialData.imageUrl || "",
        imageDescription: initialData.imageDescription || "",
        datasheetUrl: initialData.datasheetUrl || "",
        datasheetName: initialData.datasheetName || "",
        referencePrice: initialData.referencePrice ? Number(initialData.referencePrice) : undefined,
        responsibleIds: initialData.responsibles?.map((r) => r.responsibleId) || [],
        isActive: initialData.isActive,
      });
    }
  }, [mode, initialData, form]);

  const onSubmit = (data: FormValues) => {
    if (mode === "create") {
      create(data as any, {
        onSuccess: () => {
          onSuccess();
          form.reset();
        },
      });
    } else {
      update(
        { id: initialData?.id!, ...(data as any) },
        {
          onSuccess: () => {
            onSuccess();
            form.reset();
          },
        },
      );
    }
  };

  const { mnt_equipments: texts } = maintenanceConfig as any;
  const formTexts = texts?.form;

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingDatasheet, setIsUploadingDatasheet] = useState(false);

  const fileInputImageRef = useRef<HTMLInputElement>(null);
  const fileInputDatasheetRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "datasheet") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append("files", file);

    const setUploading = type === "image" ? setIsUploadingImage : setIsUploadingDatasheet;
    setUploading(true);

    try {
      const resp = await fetch("/api/mantencion/upload", {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) throw new Error("Error en la subida");

      const result = await resp.json();
      if (result.success && result.urls && result.urls.length > 0) {
        const url = result.urls[0];
        if (type === "image") {
          form.setValue("imageUrl", url);
          // If no description yet, maybe use the filename?
          if (!form.getValues("imageDescription")) {
            form.setValue("imageDescription", file.name);
          }
        } else {
          form.setValue("datasheetUrl", url);
          if (!form.getValues("datasheetName")) {
            form.setValue("datasheetName", file.name);
          }
        }
        toast.success("Archivo subido correctamente");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Error al subir el archivo");
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  const estimatedLifeOptions = ["1 año", "2 años", "3 años", "5 años", "10 años", "15 años", "2.000 horas", "5.000 horas", "10.000 horas"];

  return (
    <div className="w-full">
      <Card className="w-full border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pb-6">
          <CardTitle className="flex items-center gap-3 text-2xl font-bold">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Wrench className="h-6 w-6 text-[#283c7f] dark:text-blue-400" />
            </div>
            {mode === "create" ? formTexts?.create_title : formTexts?.edit_title}
          </CardTitle>
          <CardDescription className="text-base mt-2">{formTexts?.description}</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                {/* Nombre (Full Width on Mobile, 2 Cols on MD+) */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 lg:col-span-2">
                      <FormLabel className="text-base font-bold uppercase tracking-tight">{formTexts?.field_name} *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Bomba Centrífuga" {...field} className="h-11 w-full bg-white dark:bg-slate-950" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Precio Referencial */}
                <FormField
                  control={form.control}
                  name="referencePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-bold uppercase tracking-tight">{formTexts?.field_price}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input
                            type="number"
                            placeholder="0.00"
                            className="pl-10 h-11 w-full bg-white dark:bg-slate-950"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            value={field.value || ""}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-bold tracking-tight">{formTexts?.field_brand}</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Grundfos..." {...field} value={field.value || ""} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-bold tracking-tight">{formTexts?.field_model}</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: CRN 10-14..." {...field} value={field.value || ""} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-bold tracking-tight">{formTexts?.field_serial}</FormLabel>
                      <FormControl>
                        <Input placeholder="Número de serie..." {...field} value={field.value || ""} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="partNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-bold tracking-tight">{formTexts?.field_part}</FormLabel>
                      <FormControl>
                        <Input placeholder="P/N..." {...field} value={field.value || ""} className="h-11 w-full" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="installationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-bold uppercase tracking-tight flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Instalación *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined} disabled={isLoadingInstallations}>
                        <FormControl>
                          <SelectTrigger className="h-11 w-full bg-white dark:bg-slate-950">
                            <SelectValue placeholder={isLoadingInstallations ? "Cargando..." : "Seleccione Instalación"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          {installations?.map((inst) => (
                            <SelectItem key={inst.id} value={inst.id}>
                              {inst.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="areaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-bold uppercase tracking-tight">{formTexts?.field_area} *</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          form.setValue("systemId", "");
                        }}
                        value={field.value || undefined}
                        disabled={isLoadingAreas}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 w-full">
                            <SelectValue placeholder={isLoadingAreas ? "Cargando..." : "Seleccione Área"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          {areas?.map((area) => (
                            <SelectItem key={area.id} value={area.id}>
                              {area.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="systemId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-bold uppercase tracking-tight">{formTexts?.field_system} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined} disabled={isLoadingSystems || !watchAreaId}>
                        <FormControl>
                          <SelectTrigger className="h-11 w-full">
                            <SelectValue placeholder={!watchAreaId ? "Seleccione un Área primero" : "Seleccione Sistema"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          {filteredSystems?.map((sys) => (
                            <SelectItem key={sys.id} value={sys.id}>
                              {sys.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fecha Puesta en Marcha */}
                <FormField
                  control={form.control}
                  name="commissioningDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-bold uppercase tracking-tight">{formTexts?.field_commissioning}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <CalendarIcon className="absolute left-3 top-3 h-5 w-5 text-muted-foreground pointer-events-none" />
                          <Input
                            type="date"
                            className="pl-10 h-11 w-full bg-white dark:bg-slate-950 appearance-none"
                            value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value + "T12:00:00") : null)}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Vida Útil */}
                <FormField
                  control={form.control}
                  name="estimatedLife"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-base font-bold uppercase tracking-tight flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-slate-500" />
                        {formTexts?.field_life}
                      </FormLabel>
                      <div className="flex gap-0 group">
                        <FormControl>
                          <Input
                            placeholder="Ej: 5 años..."
                            {...field}
                            value={field.value || ""}
                            className="h-11 rounded-r-none border-r-0 bg-white dark:bg-slate-950 focus-visible:ring-0 focus-visible:border-blue-500 transition-all font-medium"
                            autoComplete="off"
                          />
                        </FormControl>
                        <Select onValueChange={field.onChange}>
                          <SelectTrigger className="w-[110px] h-11 rounded-l-none border-l-0 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-slate-200 dark:border-slate-800">
                            <SelectValue placeholder="Sugerir" />
                          </SelectTrigger>
                          <SelectContent align="end" className="rounded-xl">
                            {estimatedLifeOptions.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <FormDescription className="text-[11px]">Periodo de renovación o mantención mayor proyectado.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Técnicos Responsables (Multi-Select Popover) */}
                <FormField
                  control={form.control}
                  name="responsibleIds"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-base font-bold uppercase tracking-tight flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {formTexts?.field_responsibles}
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn("w-full h-11 justify-between text-left font-normal bg-white dark:bg-slate-950 rounded-lg", !field.value?.length && "text-muted-foreground")}
                            >
                              {field.value?.length ? `${field.value.length} responsables seleccionados` : "Seleccione uno o más técnicos..."}
                              <Users className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-2 rounded-xl" align="start">
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {isLoadingResponsibles ? (
                              <p className="p-2 text-sm text-center italic">Cargando técnicos...</p>
                            ) : responsibles?.length ? (
                              responsibles.map((resp) => (
                                <div
                                  key={resp.id}
                                  className="flex items-center space-x-3 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                                  onClick={() => {
                                    const current = field.value || [];
                                    const next = current.includes(resp.id) ? current.filter((id) => id !== resp.id) : [...current, resp.id];
                                    field.onChange(next);
                                  }}
                                >
                                  <Checkbox
                                    checked={field.value?.includes(resp.id)}
                                    // Event controlled by the parent div
                                    onCheckedChange={() => {}}
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium leading-none">{resp.name}</span>
                                    <span className="text-xs text-muted-foreground">{resp.area?.name || "Sin área"}</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="p-4 text-sm text-center text-muted-foreground">No hay responsables técnicos registrados.</p>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Imagen y Ficha Técnica - Sección de Archivos Reimagined */}
                <div className="md:col-span-2 lg:col-span-3 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/50 dark:bg-slate-900/40 p-6 rounded-2xl border border-border">
                    {/* Imagen */}
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="imageDescription"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Descripción Imagen del Equipo</FormLabel>
                            <div className="flex gap-0 group">
                              <FormControl>
                                <Input
                                  placeholder="Ej: Vista frontal con panel abierto"
                                  {...field}
                                  value={field.value || ""}
                                  className="h-11 bg-white dark:bg-slate-950 rounded-r-none border-r-0 focus-visible:ring-0 focus-visible:border-blue-500 transition-all font-medium"
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={isUploadingImage}
                                onClick={() => fileInputImageRef.current?.click()}
                                className="h-11 rounded-l-none border-l-0 px-4 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-slate-200 dark:border-slate-800"
                              >
                                {isUploadingImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                              </Button>
                            </div>
                            <input type="file" ref={fileInputImageRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, "image")} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="imageUrl"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormControl>
                              <div className="flex gap-2">
                                <div className="relative group flex-1">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <ImageIcon className="h-4 w-4 text-slate-400" />
                                  </div>
                                  <Input
                                    placeholder="URL de la imagen (automático al subir)"
                                    {...field}
                                    value={field.value || ""}
                                    className="h-9 pl-9 text-xs bg-white/50 dark:bg-slate-950/50 italic border-dashed border-slate-300 dark:border-slate-700"
                                  />
                                  {field.value && (
                                    <div className="absolute inset-y-0 right-3 flex items-center">
                                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    </div>
                                  )}
                                </div>
                                {field.value && (
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      title="Ver imagen"
                                      className="h-9 w-9 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                      onClick={() => window.open(field.value!, "_blank")}
                                    >
                                      <ImageIcon className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      title="Limpiar"
                                      className="h-9 w-9 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                      onClick={() => form.setValue("imageUrl", "")}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {form.watch("imageUrl") && (
                        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex items-center justify-center group">
                          <img
                            src={form.watch("imageUrl")!}
                            alt="Preview"
                            className="h-full w-auto object-contain transition-transform group-hover:scale-105"
                            onError={(e) => (e.currentTarget.style.display = "none")}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button type="button" variant="secondary" size="sm" onClick={() => window.open(form.watch("imageUrl")!, "_blank")}>
                              Ampliar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ficha Técnica */}
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="datasheetName"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nombre de Ficha Técnica / Manual</FormLabel>
                            <div className="flex gap-0 group">
                              <FormControl>
                                <Input
                                  placeholder="Ej: Manual Técnico v2.0 - PDF"
                                  {...field}
                                  value={field.value || ""}
                                  className="h-11 bg-white dark:bg-slate-950 rounded-r-none border-r-0 focus-visible:ring-0 focus-visible:border-blue-500 transition-all font-medium"
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={isUploadingDatasheet}
                                onClick={() => fileInputDatasheetRef.current?.click()}
                                className="h-11 rounded-l-none border-l-0 px-4 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-slate-200 dark:border-slate-800"
                              >
                                {isUploadingDatasheet ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
                              </Button>
                            </div>
                            <input type="file" ref={fileInputDatasheetRef} className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => handleFileUpload(e, "datasheet")} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="datasheetUrl"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormControl>
                              <div className="flex gap-2">
                                <div className="relative group flex-1">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FileText className="h-4 w-4 text-slate-400" />
                                  </div>
                                  <Input
                                    placeholder="URL del documento (automático al subir)"
                                    {...field}
                                    value={field.value || ""}
                                    className="h-9 pl-9 text-xs bg-white/50 dark:bg-slate-950/50 italic border-dashed border-slate-300 dark:border-slate-700"
                                  />
                                  {field.value && (
                                    <div className="absolute inset-y-0 right-3 flex items-center">
                                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    </div>
                                  )}
                                </div>
                                {field.value && (
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      title="Ver documento"
                                      className="h-9 w-9 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                      onClick={() => window.open(field.value!, "_blank")}
                                    >
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      title="Limpiar"
                                      className="h-9 w-9 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                      onClick={() => form.setValue("datasheetUrl", "")}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {form.watch("datasheetUrl") && (
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-900/10">
                          <div className="p-2 bg-emerald-500 rounded-lg text-white">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 truncate">{form.watch("datasheetName") || "Documento Adjunto"}</p>
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-500 truncate">{form.watch("datasheetUrl")}</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs border-emerald-200 dark:border-emerald-800"
                            onClick={() => window.open(form.watch("datasheetUrl")!, "_blank")}
                          >
                            Ver PDF
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="technicalComments"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 lg:col-span-3">
                      <FormLabel className="text-base font-bold uppercase tracking-tight">{formTexts?.field_notes}</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Especificaciones, voltaje, presión..." {...field} value={field.value || ""} className="min-h-[100px] w-full bg-white dark:bg-slate-950" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prevInstructions"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 lg:col-span-3">
                      <FormLabel className="text-base font-bold uppercase tracking-tight">Instrucciones Previas a Solicitud</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Indique qué debe verificar el usuario antes de crear el ticket (ej: revisar brecker, nivel de aceite)..."
                          {...field}
                          value={field.value || ""}
                          className="min-h-[80px] w-full bg-white dark:bg-slate-950"
                        />
                      </FormControl>
                      <FormDescription className="text-xs italic">Estas instrucciones se mostrarán al usuario al momento de reportar una falla en este equipo.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6 col-span-1 md:col-span-2 lg:col-span-3 bg-slate-50/50 dark:bg-slate-900/40">
                      <div className="space-y-1">
                        <FormLabel className="text-lg font-extrabold uppercase tracking-tight">{formTexts?.field_active}</FormLabel>
                        <FormDescription className="text-sm">Indica si el equipo actualmente está en el lugar y disponible para requerimientos.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} className="scale-125 data-[state=checked]:bg-emerald-500" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-5 pt-10 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="ghost" onClick={onCancel} className="h-12 px-8 rounded-xl font-semibold dark:text-white transition-all hover:bg-slate-100">
                  <X className="mr-2 h-4 w-4" /> Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="h-12 px-10 rounded-xl font-bold bg-[#1e3a6e] hover:bg-[#283c7f] text-white shadow-xl shadow-blue-900/30 transition-all active:scale-95"
                >
                  {isCreating || isUpdating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                  Guardar Ficha de Equipo
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
