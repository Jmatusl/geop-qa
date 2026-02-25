"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ClipboardList, ChevronDown, ChevronUp, Paperclip, AlertTriangle, Upload, ImageIcon, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { resizeImage } from "@/lib/utils/image-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { CrearRequerimientoData } from "@/lib/validations/actividades";

interface Catalogs {
  activityTypes: { id: string; name: string }[];
  locations: { id: string; name: string; commune: string | null }[];
  users: { id: string; firstName: string; lastName: string; email: string }[];
  suppliers: { id: string; fantasyName: string | null; rut: string; legalName: string | null }[];
  masterActivityNames: { id: string; name: string; description?: string | null; defaultAreaId?: string | null; defaultApplicantUserId?: string | null; defaultDescription?: string | null }[];
}

interface RequerimientoActividadEditorProps {
  catalogs: Catalogs;
  isApproved?: boolean;
  onActivityAttachmentsChange?: (attachments: { [activityId: string]: UploadedAttachment[] }) => void;
}

// Interfaz para archivos adjuntos por actividad
interface UploadedAttachment {
  id?: string; // ID en BD (si viene de base de datos)
  storagePath: string;
  publicUrl: string;
  fileSize: number;
  mimeType: string;
  previewUrl: string;
  fileName: string;
  isExisting?: boolean; // Indica si ya existe en BD
}

// Constantes para upload
const MAX_FILES = 8;
const MAX_HEIGHT_PX = 1080;

export function RequerimientoActividadEditor({ catalogs, isApproved = false, onActivityAttachmentsChange }: RequerimientoActividadEditorProps) {
  const router = useRouter();
  const { control, register, setValue, watch, getValues } = useFormContext<CrearRequerimientoData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "actividades",
  });

  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const scrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [shouldScrollTo, setShouldScrollTo] = useState<string | null>(null);

  // Estados para manejo de adjuntos por actividad
  const [activityAttachments, setActivityAttachments] = useState<{ [activityId: string]: UploadedAttachment[] }>({});
  const [showAttachments, setShowAttachments] = useState<{ [activityId: string]: boolean }>({});
  const [isResizing, setIsResizing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingAttachment, setDeletingAttachment] = useState<{ activityId: string; index: number } | null>(null);
  const fileInputRefs = useRef<{ [activityId: string]: HTMLInputElement | null }>({});

  // Notificar al padre cuando cambien los adjuntos
  useEffect(() => {
    if (onActivityAttachmentsChange) {
      onActivityAttachmentsChange(activityAttachments);
    }
  }, [activityAttachments, onActivityAttachmentsChange]);

  const addActividad = () => {
    append({
      name: "",
      description: "",
      statusActivity: "PENDIENTE",
      supplierId: "",
      startDate: undefined,
      endDate: undefined,
      locationId: "",
      estimatedValue: 0,
    });

    // Expand and scroll to the new activity
    setShouldScrollTo("LAST_ITEM");
  };

  useEffect(() => {
    if (shouldScrollTo === "LAST_ITEM" && fields.length > 0) {
      const lastField = fields[fields.length - 1];
      setExpandedActivity(lastField.id);

      setTimeout(() => {
        const el = scrollRefs.current[lastField.id];
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);

      setShouldScrollTo(null);
    }
  }, [fields.length, shouldScrollTo]);

  // Cargar adjuntos existentes de las actividades (si vienen del servidor)
  useEffect(() => {
    const actividades = getValues("actividades");
    if (actividades && actividades.length > 0) {
      const existingAttachments: { [activityId: string]: UploadedAttachment[] } = {};
      
      actividades.forEach((act: any) => {
        if (act.id && act.attachments && act.attachments.length > 0) {
          existingAttachments[act.id] = act.attachments.map((att: any) => ({
            id: att.id,
            storagePath: att.storagePath,
            publicUrl: att.publicUrl,
            fileName: att.fileName,
            fileSize: att.fileSize || 0,
            mimeType: att.mimeType || "application/octet-stream",
            previewUrl: att.publicUrl,
            isExisting: true,
          }));
        }
      });

      if (Object.keys(existingAttachments).length > 0) {
        setActivityAttachments(existingAttachments);
      }
    }
  }, []); // Solo ejecutar al montar

  const updateValorEstimadoRequerimiento = () => {
    // removed: valor estimado por actividad (suma ahora gestionada en el requerimiento si aplica)
  };

  // Función para manejar selección y upload de archivos por actividad
  const handleFileSelect = async (activityId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const currentAttachments = activityAttachments[activityId] || [];
    const totalFiles = currentAttachments.length + files.length;

    if (totalFiles > MAX_FILES) {
      toast.error(`Máximo ${MAX_FILES} archivos permitidos`);
      return;
    }

    try {
      setIsResizing(true);

      // Procesar cada archivo (redimensionar imágenes si aplica)
      const processedFiles = await Promise.all(
        files.map(async (file) => {
          if (file.type.startsWith("image/")) {
            return await resizeImage(file, MAX_HEIGHT_PX);
          }
          return file;
        })
      );

      setIsResizing(false);
      setIsUploading(true);

      const formData = new FormData();
      processedFiles.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/actividades/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al subir archivos");
      }

      const data = await response.json();
      const uploadedPaths = data.urls as string[];

      // Crear objetos de adjuntos con preview
      const uploadedAttachments: UploadedAttachment[] = await Promise.all(
        processedFiles.map(async (file, idx) => {
          const previewUrl = URL.createObjectURL(file);
          return {
            storagePath: uploadedPaths[idx],
            publicUrl: `/api/v1/storage/signed-url?key=${encodeURIComponent(uploadedPaths[idx])}&redirect=true`,
            fileSize: file.size,
            mimeType: file.type,
            previewUrl,
            fileName: file.name,
            isExisting: false, // Marcar explícitamente como archivo nuevo
          };
        })
      );

      // Si la actividad ya existe (tiene UUID), guardar inmediatamente en BD
      const isExistingActivity = activityId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      
      if (isExistingActivity) {
        // Guardar cada adjunto en la base de datos
        const savedAttachments: UploadedAttachment[] = [];
        
        for (const attachment of uploadedAttachments) {
          try {
            const saveResponse = await fetch("/api/actividades/activity-attachments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                activityId,
                storagePath: attachment.storagePath,
                publicUrl: attachment.publicUrl,
                fileName: attachment.fileName,
                fileSize: attachment.fileSize,
                mimeType: attachment.mimeType,
              }),
            });

            if (!saveResponse.ok) {
              const errorData = await saveResponse.json();
              throw new Error(errorData.error || "Error al guardar adjunto");
            }

            const { attachment: savedAttachment } = await saveResponse.json();
            
            // Marcar como existente y agregar ID de BD
            savedAttachments.push({
              ...attachment,
              id: savedAttachment.id,
              isExisting: true,
            });
          } catch (error) {
            console.error("Error guardando adjunto en BD:", error);
            toast.error("Error al guardar adjunto en la base de datos");
            // Mantener como no guardado para que se intente en el próximo save
            savedAttachments.push(attachment);
          }
        }

        setActivityAttachments((prev) => ({
          ...prev,
          [activityId]: [...(prev[activityId] || []), ...savedAttachments],
        }));
        
        toast.success(`${savedAttachments.length} archivo(s) guardado(s) automáticamente`);
        
        // Refrescar para actualizar la vista
        router.refresh();
      } else {
        // Actividad nueva: mantener en estado local hasta guardar el requerimiento
        setActivityAttachments((prev) => ({
          ...prev,
          [activityId]: [...(prev[activityId] || []), ...uploadedAttachments],
        }));
        
        toast.success(`${uploadedAttachments.length} archivo(s) adjuntado(s) (se guardarán al actualizar el requerimiento)`);
      }

      setShowAttachments((prev) => ({ ...prev, [activityId]: true }));
    } catch (error) {
      console.error("Error al subir archivos:", error);
      toast.error("Error al subir archivos");
    } finally {
      setIsResizing(false);
      setIsUploading(false);
      if (event.target) event.target.value = "";
    }
  };

  // Función para eliminar un archivo adjunto
  const handleDeleteAttachment = async (activityId: string, index: number) => {
    const attachment = activityAttachments[activityId]?.[index];
    if (!attachment) return;

    setDeletingAttachment({ activityId, index });

    // Si es un adjunto existente en BD, eliminarlo del servidor
    if (attachment.isExisting && attachment.id) {
      try {
        const res = await fetch(`/api/actividades/activity-attachments/${attachment.id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Error al eliminar el archivo");
          setDeletingAttachment(null);
          return;
        }

        // Eliminar del estado local
        setActivityAttachments((prev) => ({
          ...prev,
          [activityId]: (prev[activityId] || []).filter((_, i) => i !== index),
        }));
        setDeletingAttachment(null);
        toast.success("Archivo eliminado de la base de datos");
        
        // Forzar refresco de la página para sincronizar
        router.refresh();
      } catch (error) {
        toast.error("Error de conexión al eliminar archivo");
        setDeletingAttachment(null);
      }
    } else {
      // Si es un adjunto nuevo (no guardado aún), solo eliminarlo del estado
      setTimeout(() => {
        setActivityAttachments((prev) => ({
          ...prev,
          [activityId]: (prev[activityId] || []).filter((_, i) => i !== index),
        }));
        setDeletingAttachment(null);
        toast.success("Archivo eliminado");
      }, 200);
    }
  };

  const isBusy = isResizing || isUploading;

  return (
    <Card className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm gap-2">
      <CardHeader className="px-4 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#283c7f] text-white text-xs font-bold font-mono">2</span>
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Actividades</CardTitle>
          {fields.length > 0 && (
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {fields.length}
            </Badge>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addActividad} disabled={isApproved} className="gap-2 border-slate-200 hover:border-[#283c7f] hover:text-[#283c7f] transition-all">
          <Plus className="h-4 w-4" />
          Agregar Actividad
        </Button>
      </CardHeader>
      <CardContent className="p-2 pt-0">
        {fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <ClipboardList className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
            <h3 className="text-lg font-medium text-slate-400">No hay actividades registradas</h3>
            <p className="text-slate-400 text-sm mb-4">Agregue al menos una actividad para continuar con el requerimiento.</p>
            <Button type="button" variant="outline" onClick={addActividad} className="gap-2 border-[#283c7f] text-[#283c7f] hover:bg-[#283c7f] hover:text-white">
              <Plus className="h-4 w-4" />
              Agregar Primera Actividad
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <Collapsible
                key={field.id}
                open={expandedActivity === field.id}
                onOpenChange={(isOpen) => setExpandedActivity(isOpen ? field.id : null)}
                className="group border border-border rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/20 data-[state=open]:border-[#283c7f]/30 data-[state=open]:shadow-md transition-all"
              >
                <div
                  ref={(el) => {
                    scrollRefs.current[field.id] = el;
                  }}
                  className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-transparent group-data-[state=open]:border-border group-data-[state=open]:bg-slate-50/80 dark:group-data-[state=open]:bg-slate-800/50 transition-colors"
                >
                  <button 
                    type="button" 
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setExpandedActivity(expandedActivity === field.id ? null : field.id);
                    }}
                    className="flex items-center gap-3 flex-1 text-left cursor-pointer disabled:cursor-pointer disabled:opacity-100"
                  >
                    <div className={cn("p-1.5 rounded-lg transition-colors", expandedActivity === field.id ? "bg-[#283c7f] text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800")}>
                      {expandedActivity === field.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                    <span
                      className={cn(
                        "font-bold uppercase text-sm tracking-wide line-clamp-1",
                        expandedActivity === field.id ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400",
                      )}
                    >
                      {watch(`actividades.${index}.name`) || `SIN NOMBRE (ACTIVIDAD #${index + 1})`}
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
                      onClick={() => remove(index)}
                      disabled={isApproved}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <CollapsibleContent className="p-3 space-y-3 animate-in slide-in-from-top-2 duration-300">
                  {/* Primera fila: Nombre (2/3) + Estado (1/3) */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <FormField
                        control={control}
                        name={`actividades.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold uppercase text-slate-500">
                              Nombre de la Actividad <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                onChange={(e) => field.onChange(e.target.value)}
                                placeholder="Ej: Pintura de casco"
                                className="w-full h-9 bg-white dark:bg-slate-900"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={control}
                      name={`actividades.${index}.statusActivity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-slate-500">Estado</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-full bg-white dark:bg-slate-900 h-9">
                                <SelectValue placeholder="Estado..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PENDIENTE">PENDIENTE</SelectItem>
                              <SelectItem value="EN_PROGRESO">EN PROGRESO</SelectItem>
                              <SelectItem value="COMPLETADO">COMPLETADO</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Segunda fila: Proveedor + Fecha Inicio + Fecha Fin */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Proveedor con truncado */}
                    <FormField
                      control={control}
                      name={`actividades.${index}.supplierId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-slate-500">Proveedor</FormLabel>
                          <div className="flex items-center gap-0 min-w-0">
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="min-w-0 bg-white dark:bg-slate-900 h-9">
                                  <SelectValue placeholder="Seleccionar proveedor..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {catalogs.suppliers.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.fantasyName || s.legalName} ({s.rut})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Button type="button" variant="outline" size="icon" className="shrink-0 h-9 w-9" title="Nuevo Proveedor">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name={`actividades.${index}.startDate`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-slate-500">Fecha Inicio Planeada</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className="w-full bg-white dark:bg-slate-900 h-9" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name={`actividades.${index}.endDate`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-slate-500">Fecha Fin Planeada</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className="w-full bg-white dark:bg-slate-900 h-9" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Tercera fila: Lugar + Adjuntos (Side by Side) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <FormField
                      control={control}
                      name={`actividades.${index}.locationId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-slate-500">Lugar</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger className="w-full bg-white dark:bg-slate-900 h-9">
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                              <SelectContent>
                                {catalogs.locations.map((loc) => (
                                  <SelectItem key={loc.id} value={loc.id}>
                                    {loc.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Adjuntos — visible cuando la actividad ya existe (modo edición) */}
                    {watch(`actividades.${index}.id`) && (
                      <div className="mt-0 lg:mt-5 self-start lg:self-center">
                        <Button
                          type="button"
                          variant={showAttachments[watch(`actividades.${index}.id`) || ""] ? "secondary" : "outline"}
                          onClick={() => {
                            const activityId = watch(`actividades.${index}.id`);
                            if (activityId) {
                              setShowAttachments((prev) => ({ ...prev, [activityId]: !prev[activityId] }));
                            }
                          }}
                          className="gap-2 transition-all"
                        >
                          <Paperclip 
                            className={cn(
                              "h-4 w-4", 
                              showAttachments[watch(`actividades.${index}.id`) || ""] 
                                ? "text-blue-600" 
                                : "text-slate-400"
                            )} 
                          />
                          <span className="truncate">Evidencia</span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "ml-1 shrink-0",
                              (activityAttachments[watch(`actividades.${index}.id`) || ""] || []).length > 0
                                ? "bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300"
                                : "bg-slate-200 text-slate-600 dark:bg-slate-800"
                            )}
                          >
                            {(activityAttachments[watch(`actividades.${index}.id`) || ""] || []).length}
                          </Badge>
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Panel de Adjuntos (Expandible) — Ancho Completo */}
                  {watch(`actividades.${index}.id`) && showAttachments[watch(`actividades.${index}.id`) || ""] && (
                    <div className="lg:col-span-2">
                      <Card className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm">
                        <CardHeader className="px-4 border-b">
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">
                              Evidencia de la Actividad
                            </CardTitle>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const activityId = watch(`actividades.${index}.id`);
                                if (activityId) {
                                  fileInputRefs.current[activityId]?.click();
                                }
                              }}
                              disabled={isBusy}
                              className="gap-2 h-8 text-xs"
                            >
                              {isResizing ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Procesando...
                                </>
                              ) : isUploading ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Subiendo...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-3 w-3" />
                                  Subir Archivos
                                </>
                              )}
                            </Button>
                            <input
                              ref={(el) => {
                                const activityId = watch(`actividades.${index}.id`);
                                if (activityId) {
                                  fileInputRefs.current[activityId] = el;
                                }
                              }}
                              type="file"
                              multiple
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const activityId = watch(`actividades.${index}.id`);
                                if (activityId) {
                                  handleFileSelect(activityId, e);
                                }
                              }}
                            />
                          </div>
                        </CardHeader>
                        <CardContent className="p-4">
                          {(activityAttachments[watch(`actividades.${index}.id`) || ""] || []).length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                              <Paperclip className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
                              <p className="text-sm text-muted-foreground">
                                No hay evidencia adjunta.
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Adjunta fotos o PDF del estado actual
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {(activityAttachments[watch(`actividades.${index}.id`) || ""] || []).map((attachment, idx) => {
                                const isPDF = attachment.mimeType === "application/pdf";
                                const activityId = watch(`actividades.${index}.id`);
                                const isDeleting = deletingAttachment?.activityId === activityId && deletingAttachment?.index === idx;

                                return (
                                  <div
                                    key={idx}
                                    className={cn(
                                      "group relative aspect-square rounded-lg border border-border bg-slate-100 dark:bg-slate-800 shadow-sm flex flex-col items-center justify-center p-3",
                                      isDeleting && "opacity-50"
                                    )}
                                  >
                                    {isPDF ? (
                                      <div className="flex flex-col items-center justify-center text-red-500 gap-2 text-center">
                                        <FileText className="h-12 w-12" />
                                        <span className="text-[10px] uppercase font-bold">PDF</span>
                                        <span className="text-[9px] text-muted-foreground line-clamp-2 max-w-full">
                                          {attachment.fileName}
                                        </span>
                                      </div>
                                    ) : (
                                      <>
                                        <img
                                          src={attachment.previewUrl}
                                          alt={attachment.fileName}
                                          className="w-full h-full object-cover absolute inset-0"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/60 to-transparent p-2">
                                          <p className="text-[10px] text-white truncate">
                                            {attachment.fileName}
                                          </p>
                                        </div>
                                      </>
                                    )}

                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="icon"
                                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => {
                                        const activityId = watch(`actividades.${index}.id`);
                                        if (activityId) {
                                          handleDeleteAttachment(activityId, idx);
                                        }
                                      }}
                                      disabled={isDeleting}
                                    >
                                      {isDeleting ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Descripción de la Actividad */}
                  <FormField
                    control={control}
                    name={`actividades.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase text-slate-500">
                          Descripción
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Describe de qué se trata esta actividad..."
                            className="w-full min-h-20 bg-white dark:bg-slate-900 resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </CollapsibleContent>
              </Collapsible>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addActividad}
              disabled={isApproved}
              className="w-full border-dashed border-2 py-4 h-auto text-slate-500 hover:text-[#283c7f] hover:border-[#283c7f] bg-transparent"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar otra actividad
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
