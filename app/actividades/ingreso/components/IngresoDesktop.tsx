"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { crearRequerimientoSchema, type CrearRequerimientoData } from "@/lib/validations/actividades";
import { crearRequerimiento } from "../actions";
import { actualizarRequerimiento } from "@/app/actividades/[id]/actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Save, Loader2, ClipboardList, X, Check, ChevronsUpDown, Calendar as CalendarIcon, Clock, Paperclip, Anchor, User as UserIcon, LayoutGrid, Search, CheckCircle2, FileText, Upload, ImageIcon } from "lucide-react";
import { resizeImage } from "@/lib/utils/image-utils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { RequerimientoActividadEditor } from "./RequerimientoActividadEditor";
import { SolicitanteDialog } from "./SolicitanteDialog";
import { MasterActivityDialog } from "./MasterActivityDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LockIcon } from "lucide-react";
import WorkflowBar from "@/app/actividades/[id]/components/WorkflowBar";
import { EmailPdfModal } from "@/components/actividades/EmailPdfModal";

interface Catalogs {
  activityTypes: { id: string; name: string; code: string }[];
  priorities: { id: string; name: string; colorHex: string; code?: string }[];
  locations: { id: string; name: string; commune: string | null }[];
  users: { id: string; firstName: string; lastName: string; email: string }[];
  ships: { id: string; name: string }[];
  masterActivityNames: { id: string; name: string; description?: string | null; defaultAreaId?: string | null; defaultApplicantUserId?: string | null; defaultDescription?: string | null }[];
  areas: { id: string; name: string }[];
  suppliers: { id: string; fantasyName: string | null; rut: string; legalName: string | null }[];
}

interface IngresoDesktopProps {
  catalogs: Catalogs;
  currentUser?: { id: string; firstName: string; lastName: string };
  initialData?: any;
  requirementId?: string;
  isEditing?: boolean;
  permissions?: { autoriza: boolean; chequea: boolean; revisa: boolean; recepciona: boolean };
}

const MAX_FILES = 8;
const MAX_HEIGHT_PX = 1080;

interface UploadedAttachment {
  id?: string; // ID en base de datos (si isExisting)
  storagePath: string;
  publicUrl: string;
  fileSize: number;
  mimeType: string;
  previewUrl: string;
  fileName: string;
  isExisting?: boolean; // Marca si ya existe en BD
}

export default function IngresoDesktop({ catalogs, currentUser, initialData, requirementId, isEditing = false, permissions }: IngresoDesktopProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hasChanges, setHasChanges] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [openMasterModal, setOpenMasterModal] = useState(false);
  const [openMasterActName, setOpenMasterActName] = useState(false);
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [isResizing, setIsResizing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localMasters, setLocalMasters] = useState(catalogs.masterActivityNames);
  const [openSolicitanteModal, setOpenSolicitanteModal] = useState(false);
  const [openSolicitanteSearch, setOpenSolicitanteSearch] = useState(false);
  const [localUsers, setLocalUsers] = useState(catalogs.users);
  const [nextFolio, setNextFolio] = useState<string>(isEditing && initialData ? `${initialData.folioPrefix}-${String(initialData.folio).padStart(4, "0")}` : "REQ-NEW");
  const [showEmailPdfModal, setShowEmailPdfModal] = useState(false);
  const [activityAttachments, setActivityAttachments] = useState<{ [activityId: string]: any[] }>({});

  // Determinar si el usuario puede editar
  const isCreator = currentUser && initialData?.createdById === currentUser.id;
  const hasEditPermission = permissions?.autoriza || permissions?.chequea;
  const hasSolicitadoRevision = initialData?.userCheckRequerido === true;
  const estaAprobado = initialData?.isApproved === true;
  
  // SEGURIDAD: Bloquear edición si hay solicitud de revisión activa o está aprobado
  const canEdit = !isEditing || ((isCreator || hasEditPermission) && !hasSolicitadoRevision && !estaAprobado);

  // compute sensible defaults from catalogs
  const defaultPriorityId =
    catalogs.priorities.find((p) => p.code === "MEDIA")?.id || catalogs.priorities.find((p) => p.name.toLowerCase() === "media")?.id || "";
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const defaultEstimatedDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const defaultEstimatedTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // defaultValues: si hay initialData, usarlo; sino, valores por defecto
  const computedDefaults = initialData
    ? {
        title: initialData.title || "",
        masterActivityNameId: initialData.masterActivityNameId || "",
        masterActivityNameText: "",
        priorityId: initialData.priorityId || defaultPriorityId,
        description: initialData.description || "",
        locationId: initialData.locationId || "",
        areaId: initialData.areaId || "",
        shipId: initialData.shipId || "",
        estimatedDate: initialData.estimatedDate ? format(new Date(initialData.estimatedDate), "yyyy-MM-dd") : defaultEstimatedDate,
        estimatedTime: initialData.estimatedTime || defaultEstimatedTime,
        applicantUserId: initialData.applicantUserId || "",
        nombreSolicitante: initialData.applicant ? `${initialData.applicant.firstName} ${initialData.applicant.lastName}` : "",
        responsibleUserId: initialData.responsibleUserId || "",
        estimatedValue: initialData.estimatedValue || 0,
        actividades: initialData.activities?.map((act: any) => ({
          id: act.id,
          name: act.name,
          description: act.description || "",
          locationId: act.locationId || "",
          supplierId: act.supplierId || "",
          startDate: act.plannedStartDate ? format(new Date(act.plannedStartDate), "yyyy-MM-dd") : "",
          endDate: act.plannedEndDate ? format(new Date(act.plannedEndDate), "yyyy-MM-dd") : "",
          statusActivity: act.statusActivity || "PENDIENTE",
          estimatedValue: act.estimatedValue || 0,
          attachments: act.attachments || [], // Adjuntos de la actividad
        })) || [],
        notifyUserIds: [],
      }
    : {
        title: "",
        masterActivityNameId: "",
        masterActivityNameText: "",
        priorityId: defaultPriorityId,
        description: "",
        locationId: "",
        areaId: "",
        shipId: "",
        estimatedDate: defaultEstimatedDate,
        estimatedTime: defaultEstimatedTime,
        applicantUserId: "",
        nombreSolicitante: "",
        responsibleUserId: "",
        estimatedValue: 0,
        actividades: [],
        notifyUserIds: [],
      };

  const methods = useForm<CrearRequerimientoData>({
    resolver: zodResolver(crearRequerimientoSchema),
    defaultValues: computedDefaults,
  });

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = methods;

  // Manejo de archivos adjuntos
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    if (attachments.length + files.length > MAX_FILES) {
      toast.error(`Máximo ${MAX_FILES} archivos permitidos`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsResizing(true);
    const processedFiles: File[] = [];

    try {
      for (const file of files) {
        const processedFile = file.type.startsWith("image/") ? await resizeImage(file, MAX_HEIGHT_PX) : file;
        processedFiles.push(processedFile);
      }
    } catch {
      toast.error("Error al procesar archivos");
      setIsResizing(false);
      return;
    }

    setIsResizing(false);
    setIsUploading(true);

    try {
      const fd = new FormData();
      processedFiles.forEach((f) => fd.append("files", f));

      const res = await fetch("/api/actividades/upload", { method: "POST", body: fd });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error);

      const uploadedPaths = result.urls as string[];

      const newAttachments: UploadedAttachment[] = await Promise.all(
        processedFiles.map(async (file, idx) => {
          const previewUrl = URL.createObjectURL(file);
          return {
            storagePath: uploadedPaths[idx],
            publicUrl: `/api/v1/storage/signed-url?key=${encodeURIComponent(uploadedPaths[idx])}&redirect=true`,
            fileSize: file.size,
            mimeType: file.type,
            previewUrl,
            fileName: file.name,
            isExisting: false,
          };
        })
      );

      // Si estamos en modo edición, guardar automáticamente en BD
      if (isEditing && requirementId) {
        const savedAttachments: UploadedAttachment[] = [];
        
        for (const attachment of newAttachments) {
          try {
            const saveResponse = await fetch("/api/actividades/attachments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                requirementId,
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
            // Mantener como no guardado
            savedAttachments.push(attachment);
          }
        }

        setAttachments((prev) => [...prev, ...savedAttachments]);
        toast.success(`${savedAttachments.length} archivo(s) guardado(s) automáticamente`);
        router.refresh();
      } else {
        // Modo creación: mantener en estado local
        setAttachments((prev) => [...prev, ...newAttachments]);
        toast.success("Archivos adjuntados (se guardarán al crear el requerimiento)");
      }
      
      setShowAttachments(true);
    } catch (error: any) {
      toast.error(error.message || "Error al subir archivos");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAttachment = async (index: number) => {
    const attachment = attachments[index];
    
    // Si es un adjunto existente en BD, eliminarlo del servidor
    if (attachment.isExisting && attachment.id) {
      setDeletingIndex(index);
      
      try {
        const res = await fetch(`/api/actividades/attachments/${attachment.id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Error al eliminar el archivo");
          setDeletingIndex(null);
          return;
        }

        // Eliminar del estado local
        setAttachments((prev) => prev.filter((_, i) => i !== index));
        setDeletingIndex(null);
        toast.success("Archivo eliminado de la base de datos");
        
        // Forzar refresco de la página para sincronizar
        router.refresh();
      } catch (error) {
        toast.error("Error de conexión al eliminar archivo");
        setDeletingIndex(null);
      }
    } else {
      // Si es un adjunto nuevo (no guardado aún), solo eliminarlo del estado
      setDeletingIndex(index);
      setTimeout(() => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
        setDeletingIndex(null);
        toast.success("Archivo eliminado");
      }, 200);
    }
  };

  const isBusy = isPending || isResizing || isUploading;

  const onSubmit = (data: CrearRequerimientoData) => {
    // Agregar solo los adjuntos NUEVOS al payload (filtrar los existentes)
    const newAttachmentsPayload = attachments
      .filter(att => !att.isExisting)
      .map(att => ({
        storagePath: att.storagePath,
        publicUrl: att.publicUrl,
        fileName: att.fileName,
        fileSize: att.fileSize,
        mimeType: att.mimeType,
      }));

    // Preparar adjuntos de actividades (solo los nuevos) mapeados por ÍNDICE
    const activityAttachmentsPayload: { [activityIndex: string]: any[] } = {};
    
    // Obtener las actividades actuales del formulario
    const currentActividades = data.actividades || [];
    
    // Mapear adjuntos por índice en lugar de por ID
    currentActividades.forEach((act: any, index: number) => {
      // Buscar adjuntos usando el ID del campo (sea real o temporal)
      const activityId = act.id || `temp-${index}`;
      const attachmentsForThisActivity = activityAttachments[activityId] || [];
      
      const newAtts = attachmentsForThisActivity
        .filter(att => !att.isExisting)
        .map(att => ({
          storagePath: att.storagePath,
          publicUrl: att.publicUrl,
          fileName: att.fileName,
          fileSize: att.fileSize,
          mimeType: att.mimeType,
        }));
      
      if (newAtts.length > 0) {
        activityAttachmentsPayload[String(index)] = newAtts;
      }
    });

    const payload = {
      ...data,
      adjuntos: newAttachmentsPayload.length > 0 ? newAttachmentsPayload : undefined,
      activityAttachments: Object.keys(activityAttachmentsPayload).length > 0 ? activityAttachmentsPayload : undefined,
    };

    startTransition(async () => {
      if (isEditing && requirementId) {
        const result = await actualizarRequerimiento(requirementId, payload);
        if (result.success) {
          toast.success("Requerimiento actualizado exitosamente");
          setHasChanges(false);
          router.push(`/actividades/${requirementId}`);
          router.refresh();
        } else {
          toast.error(result.error ?? "Error al actualizar el requerimiento");
        }
      } else {
        const result = await crearRequerimiento(payload);
        if (result.success) {
          toast.success(`Requerimiento ${result.folio} creado exitosamente`, {
            action: { label: "Ver detalle", onClick: () => router.push(`/actividades/${result.id}`) },
          });
          setHasChanges(false);
          router.push(`/actividades/${result.id}`);
        } else {
          toast.error(result.error ?? "Error al crear el requerimiento");
        }
      }
    });
  };

  const onError = (errors: any) => {
    const findErrorMessage = (obj: any, path = ""): string | null => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (value && typeof value === "object") {
          const fieldError = value as any;
          if (fieldError.message) {
            return fieldError.message;
          }
          // Recurse into nested objects
          const nested = findErrorMessage(value, currentPath);
          if (nested) return nested;
        }
      }
      return null;
    };

    const errorMessage = findErrorMessage(errors);
    if (errorMessage) {
      toast.error(errorMessage);
    } else {
      toast.error("Por favor revise los campos obligatorios");
    }
  };

  const totalEstimado = watch("estimatedValue") || 0;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/v1/actividades/next-folio");
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && data?.folio) setNextFolio(data.folio as string);
      } catch (err) {
        // noop
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Cargar adjuntos existentes en modo edición
  useEffect(() => {
    if (isEditing && initialData?.attachments && initialData.attachments.length > 0) {
      const existingAttachments: UploadedAttachment[] = initialData.attachments.map((att: any) => ({
        id: att.id, // ID de base de datos
        storagePath: att.storagePath,
        publicUrl: att.publicUrl,
        fileName: att.fileName,
        fileSize: att.fileSize || 0,
        mimeType: att.mimeType || "application/octet-stream",
        previewUrl: att.publicUrl,
        isExisting: true, // Marcar como existente
      }));
      setAttachments(existingAttachments);
      if (existingAttachments.length > 0) {
        setShowAttachments(true);
      }
    }
  }, [isEditing, initialData]);

  // Renderizado de la vista de escritorio del formulario
  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit, onError)} onChange={() => setHasChanges(true)}>
          {/* Header del Formulario */}
          <div className="bg-gray-50 dark:bg-gray-900 p-4 mb-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">{isEditing ? initialData?.title || "Editar Requerimiento" : "Nuevo Requerimiento"}</h1>
                <p className="text-muted-foreground">Flujo operativo de gestión de actividades y mantenimiento.</p>
              </div>

              {/* Solo mostrar badges si NO está aprobado (el TIP ya lo indica) */}
              {!estaAprobado && (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Badge de Estado Dinámico */}
                  {isEditing && initialData?.status ? (
                    <Badge 
                      variant="outline" 
                      className="px-3 py-1 border-2"
                      style={{
                        backgroundColor: `${initialData.status.colorHex}20`,
                        borderColor: initialData.status.colorHex,
                        color: initialData.status.colorHex
                      }}
                    >
                      ESTADO: {initialData.status.name.toUpperCase()}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="px-3 py-1 border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                      ESTADO: BORRADOR
                    </Badge>
                  )}

                  {/* Badge de Revisión Dinámico */}
                  {isEditing && initialData?.userCheckRequerido && (
                    initialData.userCheckRequeridoAprobado ? (
                      <Badge variant="outline" className="px-3 py-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                        REVISIÓN: APROBADA
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="px-3 py-1 border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                        REVISIÓN: EN PROCESO
                      </Badge>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Barra de Workflow (solo en modo edición y no aprobado) */}
          {isEditing && initialData && !estaAprobado && (
            <div className="mb-4">
              <WorkflowBar requirement={initialData} permissions={permissions || {}} />
            </div>
          )}

          {/* TIP de Aprobación Visual (solo cuando está aprobado) */}
          {estaAprobado && initialData && (
            <Alert className="bg-linear-to-r from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 border-2 border-emerald-300 dark:border-emerald-700 mb-4 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-emerald-500 p-2 shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">Requerimiento aprobado</h3>
                    <Badge className="bg-emerald-600 text-white border-none text-xs">FINAL</Badge>
                  </div>
                  <div className="flex flex-col lg:flex-row lg:items-center gap-2 text-sm text-emerald-800 dark:text-emerald-200">
                    <span className="font-semibold">
                      Aprobado el {initialData.approvedAt ? format(new Date(initialData.approvedAt), "dd/MM/yyyy 'a las' HH:mm", { locale: es }) : format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                    </span>
                    {initialData.approvedBy && (
                      <>
                        <span className="hidden lg:inline text-emerald-600 dark:text-emerald-400">•</span>
                        <span>por <strong>{initialData.approvedBy.firstName} {initialData.approvedBy.lastName}</strong></span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-2">
                    Este requerimiento ha sido aprobado y no puede ser modificado. Puede generar el PDF para compartir.
                  </p>
                </div>
              </div>
            </Alert>
          )}

          {/* Alerta de solo lectura (para otros casos) */}
          {!canEdit && !estaAprobado && (
            <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 mb-4">
              <LockIcon className="h-4 w-4 stroke-amber-600 dark:stroke-amber-400" />
              <AlertDescription className="text-sm text-amber-800 dark:text-amber-300">
                {hasSolicitadoRevision ? (
                  <><strong>Revisión Pendiente:</strong> Este requerimiento tiene una solicitud de revisión activa y no se puede modificar hasta que se complete el proceso de revisión.</>
                ) : (
                  <><strong>Modo solo lectura:</strong> No tienes permisos para editar este requerimiento. Solo el creador o usuarios con permisos de "Autorizar" o "Chequear" pueden modificarlo.</>
                )}
              </AlertDescription>
            </Alert>
          )}

          <fieldset disabled={!canEdit}>
          <div className="space-y-4">
            {/* CARD INFORMACIÓN PRINCIPAL */}
            <Card className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm overflow-hidden">
              <CardHeader className="px-4 py-3 border-b bg-white dark:bg-slate-900 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#283c7f] text-white text-xs font-bold font-mono">1</span>
                  <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Información General</CardTitle>
                </div>
                <div className="text-xs font-mono font-bold text-slate-400">FECHA: {format(new Date(), "dd/MM/yyyy", { locale: es })}</div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Folio (Read only) */}
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-slate-500">Folio (Auto)</FormLabel>
                    <FormControl>
                      <Input value={nextFolio} disabled className="bg-slate-50 dark:bg-slate-800/50 border-dashed font-mono font-bold text-blue-600" />
                    </FormControl>
                  </FormItem>

                  {/* Nombre de Actividad (Select + Text) */}
                  <FormField
                    control={methods.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="lg:col-span-2">
                        <FormLabel className="text-xs font-bold uppercase text-slate-500">
                          Nombre de Actividad <span className="text-red-500">*</span>
                        </FormLabel>
                        <div className="flex bg-white dark:bg-slate-900 rounded-md border border-input shadow-sm focus-within:ring-1 focus-within:ring-ring">
                          <Popover open={openMasterActName} onOpenChange={setOpenMasterActName}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                className="rounded-none rounded-l-md border-r px-3 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 h-9"
                                title="Buscar en maestro"
                              >
                                <Search className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-96 p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Buscar actividad..." />
                                <CommandList>
                                  <CommandEmpty>No se encontró.</CommandEmpty>
                                  <CommandGroup>
                                    {localMasters.map((m) => (
                                      <CommandItem
                                        key={m.id}
                                        value={m.name}
                                        onSelect={() => {
                                          field.onChange(m.name);
                                          setValue("masterActivityNameId", m.id);
                                          setValue("masterActivityNameText", m.name);

                                          // Auto-fill defaults
                                          if (m.defaultAreaId) setValue("areaId", m.defaultAreaId);
                                          if (m.defaultApplicantUserId) setValue("applicantUserId", m.defaultApplicantUserId);
                                          if (m.defaultDescription) setValue("description", m.defaultDescription);

                                          setOpenMasterActName(false);
                                        }}
                                      >
                                        <Check className={cn("mr-2 h-4 w-4", watch("masterActivityNameId") === m.id ? "opacity-100" : "opacity-0")} />
                                        {m.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>

                          <FormControl>
                            <Input
                              {...field}
                              onChange={(e) => {
                                field.onChange(e.target.value);
                                setValue("masterActivityNameId", "");
                                setValue("masterActivityNameText", "");
                              }}
                              placeholder="Ingrese nombre de actividad"
                              className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 shadow-none h-9 px-3"
                            />
                          </FormControl>

                          {field.value && (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                field.onChange("");
                                setValue("masterActivityNameId", "");
                                setValue("masterActivityNameText", "");
                              }}
                              className="rounded-none px-2 text-muted-foreground hover:text-foreground h-9"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpenMasterModal(true)}
                            className="rounded-none rounded-r-md border-y-0 border-r-0 border-l bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 h-9 px-3"
                            title="Agregar al maestro"
                          >
                            <Plus className="h-4 w-4 text-[#283c7f] dark:text-blue-400" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />


                  {/* Nave / Instalación */}
                  <FormField
                    control={methods.control}
                    name="shipId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase text-slate-500">Nave / Instalación</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full h-9 bg-white dark:bg-slate-900 border-slate-200">
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {catalogs.ships.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                <div className="flex items-center gap-2">
                                  <Anchor className="h-3 w-3 opacity-60" />
                                  {s.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Fecha Tentativa */}
                  <FormField
                    control={methods.control}
                    name="estimatedDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase text-slate-500">Fecha Tentativa</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input type="date" {...field} className="pl-10" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Hora */}
                  <FormField
                    control={methods.control}
                    name="estimatedTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase text-slate-500">Hora</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input type="time" {...field} className="pl-10" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Solicitante — combobox + input libre + modal */}
                  <FormField
                    control={methods.control}
                    name="nombreSolicitante"
                    render={({ field }) => (
                      <FormItem className="lg:col-span-2">
                        <FormLabel className="text-xs font-bold uppercase text-slate-500">Solicitante</FormLabel>
                        <div className="flex gap-0">
                          {/* Combobox (Popover + Command) como botón principal */}
                          <Popover open={openSolicitanteSearch} onOpenChange={setOpenSolicitanteSearch}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("flex-1 justify-between h-9", !field.value && "text-muted-foreground")}>
                                <div className="flex items-center gap-2 truncate">
                                  <Search className="h-4 w-4 opacity-60" />
                                  <span className="truncate">{field.value ? field.value : "Seleccionar solicitante..."}</span>
                                </div>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-100 p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Buscar por nombre o email..." />
                                <CommandList>
                                  <CommandEmpty>No se encontró.</CommandEmpty>
                                  <CommandGroup>
                                    {localUsers.map((u) => (
                                      <CommandItem
                                        key={u.id}
                                        value={`${u.firstName} ${u.lastName} ${u.email}`}
                                        onSelect={() => {
                                          const fullName = `${u.firstName} ${u.lastName}`;
                                          field.onChange(fullName);
                                          setValue("applicantUserId", u.id);
                                          setOpenSolicitanteSearch(false);
                                        }}
                                      >
                                        <Check className={cn("mr-2 h-4 w-4", watch("applicantUserId") === u.id ? "opacity-100" : "opacity-0")} />
                                        <div className="flex flex-col">
                                          <span className="font-medium">{u.firstName} {u.lastName}</span>
                                          <span className="text-xs text-muted-foreground">{u.email}</span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>

                          {/* Botón agregar nuevo solicitante */}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpenSolicitanteModal(true)}
                            className="h-9 px-3"
                            title="Agregar nuevo solicitante"
                          >
                            <Plus className="h-4 w-4 text-[#283c7f] dark:text-blue-400" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Prioridad */}
                  <FormField
                    control={methods.control}
                    name="priorityId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase text-slate-500">
                          Prioridad <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full h-9 bg-white dark:bg-slate-900 border-slate-200">
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {catalogs.priorities.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.colorHex }} />
                                  {p.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Área (Combobox) + Adjuntos */}
                  <FormField
                    control={methods.control}
                    name="areaId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase text-slate-500">Área</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? catalogs.areas.find((a) => a.id === field.value)?.name : "Seleccionar área..."}
                                <LayoutGrid className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                              <CommandInput placeholder="Buscar área..." />
                              <CommandList>
                                <CommandEmpty>No se encontró.</CommandEmpty>
                                <CommandGroup>
                                  {catalogs.areas.map((a) => (
                                    <CommandItem key={a.id} value={a.name} onSelect={() => setValue("areaId", a.id)}>
                                      <Check className={cn("mr-2 h-4 w-4", field.value === a.id ? "opacity-100" : "opacity-0")} />
                                      {a.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Adjuntos — solo visible en modo edición */}
                  {isEditing && (
                    <div className="mt-0 lg:mt-5 self-start lg:self-center">
                      <Button type="button" variant={showAttachments ? "secondary" : "outline"} onClick={() => setShowAttachments(!showAttachments)} className="gap-2 transition-all">
                        <Paperclip className={cn("h-4 w-4", showAttachments ? "text-blue-600" : "text-slate-400")} />
                        Documentos Adjuntos
                        <Badge variant="secondary" className="ml-1 bg-slate-200 text-slate-600 dark:bg-slate-800">
                          {attachments.length}
                        </Badge>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Panel de Adjuntos (Expandible) — Ancho Completo */}
                {isEditing && showAttachments && (
                  <div className="lg:col-span-4">
                    <Card className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm mt-4">
                      <CardHeader className="px-4 border-b">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">Documentos Adjuntos</CardTitle>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isBusy || attachments.length >= MAX_FILES}
                            onClick={() => fileInputRef.current?.click()}
                            className="gap-2"
                          >
                            {isResizing || isUploading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            Adjuntar Archivo
                          </Button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,application/pdf"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        {attachments.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                            <Paperclip className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
                            <p className="text-sm text-muted-foreground">
                              No hay archivos adjuntos.
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Haz clic en "Adjuntar Archivo" para agregar documentos
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {attachments.map((att, idx) => {
                              const isPdf = att.mimeType.includes("pdf");
                              const isDeletingThis = deletingIndex === idx;

                              return (
                                <div
                                  key={idx}
                                  className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-slate-100 dark:bg-slate-800 shadow-sm flex flex-col items-center justify-center p-3"
                                >
                                  {isPdf ? (
                                    <div className="flex flex-col items-center justify-center text-red-500 gap-2 text-center">
                                      <FileText className="h-12 w-12" />
                                      <span className="text-[10px] uppercase font-bold">PDF</span>
                                      <span className="text-[9px] text-muted-foreground line-clamp-2 max-w-full">
                                        {att.fileName}
                                      </span>
                                    </div>
                                  ) : (
                                    <>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={att.previewUrl} alt="Adjunto" className="w-full h-full object-cover absolute inset-0" />
                                      <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/60 to-transparent p-2">
                                        <p className="text-[10px] text-white truncate">
                                          {att.fileName}
                                        </p>
                                      </div>
                                    </>
                                  )}

                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDeleteAttachment(idx)}
                                    disabled={isDeletingThis}
                                  >
                                    {isDeletingThis ? (
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

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">

                  {/* Descripción */}
                  <div className="lg:col-span-4 mt-6">
                    <FormField
                      control={methods.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-slate-500">
                            Descripción del Trabajo <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Detalles de la solicitud..." rows={4} className="resize-none" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Valor Estimado Total (oculto por requerimiento) */}
                  <FormItem className="hidden">
                    <FormLabel className="text-xs font-bold uppercase text-slate-500">Valor Estimado (Total)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</div>
                        <Input type="number" {...methods.register("estimatedValue", { valueAsNumber: true })} className="pl-7 bg-slate-50 dark:bg-slate-800/50 font-bold text-emerald-600" />
                      </div>
                    </FormControl>
                  </FormItem>
                </div>
              </CardContent>
            </Card>

            {/* CARD ACTIVIDADES */}
            <RequerimientoActividadEditor 
              catalogs={catalogs}
              onActivityAttachmentsChange={setActivityAttachments}
            />
          </div>
          </fieldset>

          {/* Botones finales (desktop): botón normal al final de la página */}
          <div className="w-full mt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => router.back()} className="dark:text-white">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isBusy || !canEdit} 
              className="bg-[#283c7f] hover:bg-[#1e2d5f] text-white px-6 h-11 font-bold shadow-lg shadow-blue-900/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
              {isPending ? "GUARDANDO..." : (isEditing ? "ACTUALIZAR REQUERIMIENTO" : "REGISTRAR REQUERIMIENTO")}
            </Button>

            {/* Botón Enviar PDF (solo si está aprobado) */}
            {estaAprobado && isEditing && initialData && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEmailPdfModal(true)}
                className="gap-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 px-6 h-11 font-bold"
              >
                <FileText className="h-5 w-5" />
                ENVIAR PDF
              </Button>
            )}
          </div>
        </form>
      </FormProvider>

      {/* Modal de Email PDF */}
      {estaAprobado && isEditing && initialData && (
        <EmailPdfModal
          open={showEmailPdfModal}
          onOpenChange={setShowEmailPdfModal}
          requirementId={initialData.id}
          requirementFolio={String(initialData.folio).padStart(4, "0")}
          requirementFolioPrefix={initialData.folioPrefix}
          providerEmail={initialData.activities?.[0]?.supplier?.contactEmail || ""}
          providerName={initialData.activities?.[0]?.supplier?.fantasyName || initialData.activities?.[0]?.supplier?.legalName || "Proveedor"}
          providerId={initialData.activities?.[0]?.supplier?.id || ""}
          providerAlternativeEmails={initialData.activities?.[0]?.supplier?.activityEmails as any || []}
        />
      )}

      <MasterActivityDialog
        open={openMasterModal}
        onOpenChange={setOpenMasterModal}
        catalogs={catalogs}
        onSuccess={(newMaster) => {
          setLocalMasters((prev) => [...prev, newMaster]);
          setValue("masterActivityNameId", newMaster.id);
          setValue("masterActivityNameText", newMaster.name);
          setValue("title", newMaster.name);
        }}
      />

      <SolicitanteDialog
        open={openSolicitanteModal}
        onOpenChange={setOpenSolicitanteModal}
        onSuccess={(newUser) => {
          setLocalUsers((prev) => [...prev, newUser]);
          setValue("applicantUserId", newUser.id);
          setValue("nombreSolicitante", `${newUser.firstName} ${newUser.lastName}`);
        }}
      />
    </div>
  );
}
