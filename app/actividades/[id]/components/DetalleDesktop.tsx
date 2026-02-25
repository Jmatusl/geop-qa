"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { crearRequerimientoSchema, type CrearRequerimientoData } from "@/lib/validations/actividades";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/actividades/StatusBadge";
import { PriorityBadge } from "@/components/actividades/PriorityBadge";
import {
  cambiarEstadoRequerimiento,
  agregarComentario,
  toggleActivityCheck,
  solicitarRevision,
  aprobarRevision,
  aprobarRequerimiento,
  actualizarRequerimiento,
} from "../actions";
import {
  ChevronLeft,
  ClipboardList,
  Clock,
  User,
  Calendar as CalendarIcon,
  MapPin,
  CheckCircle,
  MessageSquare,
  Paperclip,
  GitBranch,
  RefreshCw,
  Loader2,
  CheckCheck,
  RefreshCcw,
  AlertTriangle,
  Anchor,
  Search,
  Check,
  Trash2,
  Save,
  X,
  Plus,
  LayoutGrid,
  User as UserIcon,
  Building2,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { RequerimientoActividadEditor } from "../../ingreso/components/RequerimientoActividadEditor";
import { MasterActivityDialog } from "../../ingreso/components/MasterActivityDialog";
import { SolicitanteDialog } from "../../ingreso/components/SolicitanteDialog";
import { actualizarRequerimiento as actionActualizarRequerimiento } from "../actions";

interface Req {
  id: string;
  folio: number;
  folioPrefix: string;
  title: string | null;
  masterActivityName?: { name: string } | null;
  masterActivityNameText?: string | null;
  description: string;
  observations?: string | null;
  estimatedDate?: Date | string | null;
  estimatedTime?: string | null;
  isApproved: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  activityType: { id: string; name: string };
  priority: { id: string; name: string; colorHex: string };
  status: { id: string; name: string; code: string; colorHex: string | null };
  location?: { id: string; name: string } | null;
  area?: { id: string; name: string } | null;
  ship?: { id: string; name: string } | null;
  applicant?: { id: string; firstName: string; lastName: string; email?: string | null } | null;
  nombreSolicitante?: string | null;
  responsible?: { id: string; firstName: string; lastName: string; email?: string | null } | null;
  createdBy: { firstName: string; lastName: string };
  activities: (any & { isChecked: boolean; checkedBy?: { firstName: string; lastName: string } })[];
  comments: any[];
  attachments: any[];
  timeline: any[];
}

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

interface DetalleDesktopProps {
  requirement: Req;
  statuses: { id: string; name: string; code: string; colorHex: string | null }[];
  users: { id: string; firstName: string; lastName: string }[];
  currentUser: { id: string; firstName?: string; lastName?: string };
  permissions: { autoriza: boolean; chequea: boolean; revisa: boolean; recepciona: boolean };
  catalogs: Catalogs;
}

export default function DetalleDesktop({ requirement, statuses, users, currentUser, permissions, catalogs }: DetalleDesktopProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);

  // Estados para diálogos y popovers (Master Activity)
  const [openMasterActName, setOpenMasterActName] = useState(false);
  const [openMasterModal, setOpenMasterModal] = useState(false);
  const [localMasters, setLocalMasters] = useState(catalogs.masterActivityNames);

  // Estados para solicitante
  const [openSolicitanteSearch, setOpenSolicitanteSearch] = useState(false);
  const [openSolicitanteModal, setOpenSolicitanteModal] = useState(false);
  const [localUsers, setLocalUsers] = useState(catalogs.users);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [statusComment, setStatusComment] = useState("");

  // Estados para adjuntos
  type UploadedAttachment = { storagePath: string; publicUrl: string; fileName: string; fileSize: number; mimeType: string };
  const [newAttachments, setNewAttachments] = useState<UploadedAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const folio = `${requirement.folioPrefix}-${String(requirement.folio).padStart(4, "0")}`;

  // Función para subir archivos
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append("files", file);
      });

      const response = await fetch("/api/actividades/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Error al subir archivos");

      const result = await response.json();
      if (result.success && result.urls) {
        const uploaded: UploadedAttachment[] = Array.from(files).map((file, i) => ({
          storagePath: result.urls[i],
          publicUrl: `/api/v1/storage/signed-url?key=${encodeURIComponent(result.urls[i])}&redirect=true`,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }));
        setNewAttachments(prev => [...prev, ...uploaded]);
        setHasChanges(true);
        toast.success(`${files.length} archivo(s) subido(s)`);
      }
    } catch (error) {
      toast.error("Error al subir archivos");
    } finally {
      setIsUploading(false);
    }
  };

  const removeNewAttachment = (index: number) => {
    setNewAttachments(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  // Configuración del formulario React Hook Form para edición
  const methods = useForm<CrearRequerimientoData>({
    resolver: zodResolver(crearRequerimientoSchema),
    defaultValues: {
      title: requirement.title || "",
      masterActivityNameId: (requirement as any).masterActivityNameId || "",
      masterActivityNameText: requirement.masterActivityName?.name || requirement.masterActivityNameText || "",
      priorityId: requirement.priority.id,
      description: requirement.description,
      locationId: requirement.location?.id || "",
      areaId: requirement.area?.id || "",
      shipId: requirement.ship?.id || "",
      estimatedDate: requirement.estimatedDate ? format(new Date(requirement.estimatedDate), "yyyy-MM-dd") : "",
      estimatedTime: requirement.estimatedTime || "",
      applicantUserId: requirement.applicant?.id || "",
      nombreSolicitante: requirement.nombreSolicitante || "",
      responsibleUserId: requirement.responsible?.id || "",
      estimatedValue: (requirement as any).estimatedValue || 0,
      actividades: requirement.activities.map((a: any) => ({
        id: a.id,
        name: a.name,
        statusActivity: a.statusActivity,
        supplierId: a.supplierId || "",
        plannedStartDate: a.plannedStartDate ? format(new Date(a.plannedStartDate), "yyyy-MM-dd") : "",
        plannedEndDate: a.plannedEndDate ? format(new Date(a.plannedEndDate), "yyyy-MM-dd") : "",
        location: a.location || "",
        estimatedValue: a.estimatedValue || 0,
      })),
    },
  });

  const { handleSubmit, watch, setValue } = methods;

  const onUpdateSubmit = (data: CrearRequerimientoData) => {
    startTransition(async () => {
      try {
        const payload = {
          ...data,
          adjuntos: newAttachments,
        };
        const result = await actualizarRequerimiento(requirement.id, payload);
        if (result.success) {
          toast.success("Requerimiento actualizado correctamente");
          setIsEditing(false);
          setHasChanges(false);
          setNewAttachments([]); // Limpiar adjuntos nuevos
          router.refresh();
        } else {
          toast.error(result.error || "Error al actualizar");
        }
      } catch (err) {
        toast.error("Error al guardar cambios");
      }
    });
  };

  const handleChangeStatus = () => {
    if (!selectedStatus) {
      toast.error("Seleccione un estado");
      return;
    }
    startTransition(async () => {
      const r = await cambiarEstadoRequerimiento(requirement.id, { statusId: selectedStatus, comment: statusComment });
      if (r.success) {
        toast.success("Estado actualizado");
        setStatusDialogOpen(false);
        router.refresh();
      } else toast.error(r.error ?? "Error al cambiar estado");
    });
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    startTransition(async () => {
      const r = await agregarComentario(requirement.id, { comment: commentText });
      if (r.success) {
        toast.success("Comentario agregado");
        setCommentText("");
        router.refresh();
      } else toast.error(r.error ?? "Error al comentar");
    });
  };

  const handleToggleCheck = (actId: string, current: boolean) => {
    startTransition(async () => {
      const r = await toggleActivityCheck(actId, !current);
      if (r.success) {
        toast.success(current ? "Check removido" : "Actividad chequeada");
        router.refresh();
      } else toast.error(r.error ?? "Error");
    });
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onUpdateSubmit)} onChange={() => setHasChanges(true)}>
          {/* Header del Formulario/Detalle */}
          <div className="bg-gray-50 dark:bg-gray-900 border-b p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => router.push("/actividades/listado")}
                  className="mt-1 text-muted-foreground hover:text-slate-900 dark:hover:text-white transition-colors p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="outline" className="font-mono text-[14px] font-bold border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                      {folio}
                    </Badge>
                    <StatusBadge name={requirement.status.name} colorHex={requirement.status.colorHex} />
                    <PriorityBadge name={requirement.priority.name} colorHex={requirement.priority.colorHex} />
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase leading-none">
                    {watch("title") || requirement.title || "DETALLE DE REQUERIMIENTO"}
                  </h1>
                  <div className="text-muted-foreground mt-2 flex items-center gap-2 text-sm font-medium">
                    <ClipboardList className="h-4 w-4" /> {requirement.activityType.name}
                    <Separator orientation="vertical" className="h-3 mx-1" />
                    <User className="h-4 w-4" /> {requirement.createdBy.firstName} {requirement.createdBy.lastName}
                    <Separator orientation="vertical" className="h-3 mx-1" />
                    <CalendarIcon className="h-4 w-4" /> {format(new Date(requirement.createdAt), "dd/MM/yyyy", { locale: es })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                {!isEditing ? (
                  <>
                    <Button type="button" variant="outline" onClick={() => router.refresh()} className="gap-2 dark:text-white shadow-sm">
                      <RefreshCw className="h-4 w-4" /> Refrescar
                    </Button>

                    {!requirement.isApproved && permissions.autoriza && (
                      <Button type="button" onClick={() => setIsEditing(true)} className="bg-amber-500 hover:bg-amber-600 text-white gap-2 shadow-sm">
                        <Plus className="h-4 w-4 text-white" /> Editar
                      </Button>
                    )}

                    {!requirement.isApproved && (
                      <>
                        {permissions.autoriza && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              className="border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 gap-2 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                              onClick={async () => {
                                const obs = window.prompt("Observaciones de revisión (opcional):");
                                if (obs !== null) {
                                  const r = await solicitarRevision(requirement.id, obs);
                                  if (r.success) {
                                    toast.success("Revisión solicitada");
                                    router.refresh();
                                  } else toast.error(r.error);
                                }
                              }}
                            >
                              <RefreshCcw className="h-4 w-4" /> Solicitar Revisión
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 gap-2 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                              onClick={() => setShowApprovalDialog(true)}
                            >
                              <CheckCheck className="h-4 w-4" /> Aprobar Final
                            </Button>
                          </>
                        )}
                      </>
                    )}
                    <Button type="button" onClick={() => setStatusDialogOpen(true)} className="bg-[#283c7f] hover:bg-[#1e3065] text-white gap-2 shadow-sm">
                      <GitBranch className="h-4 w-4 text-white" /> Estado
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsEditing(false);
                        setNewAttachments([]); // Limpiar adjuntos nuevos al cancelar
                        setHasChanges(false);
                      }} 
                      className="gap-2 dark:text-white shadow-sm"
                    >
                      <X className="h-4 w-4" /> Cancelar
                    </Button>
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm min-w-35">
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4 text-white" />}
                      Guardar Cambios
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6 px-6">
            {/* CARD 1: INFORMACIÓN GENERAL */}
            <Card className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm overflow-hidden">
              <CardHeader className="px-6 py-4 border-b bg-slate-50/50 dark:bg-slate-800/30 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#283c7f] text-white text-xs font-bold font-mono">1</span>
                  <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Información General</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Folio (Read only) */}
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase text-slate-500">Folio (Auto)</FormLabel>
                      <FormControl>
                        <Input value={folio} disabled className="bg-slate-50 dark:bg-slate-800/50 border-dashed font-mono font-bold text-blue-600" />
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
                                            if (m.defaultDescription) setValue("description", m.defaultDescription || "");

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
                          <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className="w-full h-9 bg-white dark:bg-slate-900 border-slate-200">
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {catalogs.ships.map((s: any) => (
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
                                      {localUsers.map((u: any) => (
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
                                            <span className="font-medium">
                                              {u.firstName} {u.lastName}
                                            </span>
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
                              {catalogs.priorities.map((p: any) => (
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

                    {/* Área (Combobox) */}
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
                                  {field.value
                                    ? (catalogs.areas as any[]).find((a) => a.id === field.value)?.name || "Seleccionar área..."
                                    : "Seleccionar área..."}
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
                                    {(catalogs.areas as any[]).map((a) => (
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

                    {/* Adjuntos — colocado a la derecha del Área */}
                    <div className="mt-0 lg:mt-6 self-start lg:self-center">
                      <Button type="button" variant="outline" className="gap-2 transition-all">
                        <Paperclip className="h-4 w-4 text-slate-400" />
                        Documentos Adjuntos
                        <Badge variant="secondary" className="ml-1 bg-slate-200 text-slate-600 dark:bg-slate-800">
                          {requirement.attachments.length}
                        </Badge>
                      </Button>
                    </div>

                    {/* Descripción */}
                    <FormField
                      control={methods.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="lg:col-span-4">
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
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
                    {/* Vista de lectura estática */}
                    <div className="space-y-1">
                      <p className="text-xs font-bold uppercase text-slate-500">Nave / Ubicación</p>
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 text-sm">
                        <Anchor className="h-4 w-4 text-slate-400" /> {requirement.ship?.name || "N/A"}
                        <Separator orientation="vertical" className="h-3 mx-1" />
                        <MapPin className="h-4 w-4 text-slate-400" /> {requirement.location?.name || "N/A"}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-bold uppercase text-slate-500">Área Responsable</p>
                      <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <LayoutGrid className="h-4 w-4 text-slate-400" /> {requirement.area?.name || "N/A"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-bold uppercase text-slate-500">Solicitante</p>
                      <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <UserIcon className="h-4 w-4 text-slate-400" /> {requirement.applicant?.firstName} {requirement.applicant?.lastName}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-bold uppercase text-slate-500">Fecha Estimada</p>
                      <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {requirement.estimatedDate ? format(new Date(requirement.estimatedDate), "PPP", { locale: es }) : "No definida"}
                      </p>
                    </div>

                    <div className="lg:col-span-4 space-y-1 pt-4 border-t">
                      <p className="text-xs font-bold uppercase text-slate-500 mb-2">Descripción</p>
                      <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed italic">
                          {requirement.description || "Sin descripción detallada."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CARD 2: DETALLE DE ACTIVIDADES */}
            <Card className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm overflow-hidden">
              <CardHeader className="px-6 py-4 border-b bg-slate-50/50 dark:bg-slate-800/30 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#283c7f] text-white text-xs font-bold font-mono">2</span>
                  <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Actividades Registradas</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isEditing ? (
                  <div className="p-6">
                    <RequerimientoActividadEditor catalogs={catalogs as any} isApproved={requirement.isApproved} />
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {requirement.activities.length === 0 ? (
                      <p className="p-12 text-center text-sm text-muted-foreground italic">No hay actividades registradas para este requerimiento.</p>
                    ) : (
                      requirement.activities.map((act) => (
                        <div key={act.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div
                                className={cn(
                                  "mt-1 w-3 h-3 rounded-full shadow-sm shrink-0",
                                  act.statusActivity === "COMPLETADO" ? "bg-emerald-500" : act.statusActivity === "EN_PROGRESO" ? "bg-blue-500 animate-pulse" : "bg-slate-300"
                                )}
                              />
                              <div className="space-y-1">
                                <p className={cn("text-base font-bold", act.isChecked ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white")}>
                                  {act.name}
                                  {act.isChecked && <CheckCircle className="inline-block h-4 w-4 ml-1.5 text-emerald-500" />}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                  {act.supplier && (
                                    <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-400">
                                      <Building2 className="h-3.5 w-3.5" /> {act.supplier.fantasyName || act.supplier.legalName}
                                    </span>
                                  )}
                                  {act.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3.5 w-3.5" /> {act.location}
                                    </span>
                                  )}
                                  {(act.plannedStartDate || act.plannedEndDate) && (
                                    <span className="flex items-center gap-1">
                                      <CalendarIcon className="h-3.5 w-3.5" />
                                      {act.plannedStartDate ? format(new Date(act.plannedStartDate), "dd/MM/yy") : "--"} al{" "}
                                      {act.plannedEndDate ? format(new Date(act.plannedEndDate), "dd/MM/yy") : "--"}
                                    </span>
                                  )}
                                </div>
                                {act.isChecked && act.checkedBy && (
                                  <p className="text-[10px] uppercase font-extrabold text-emerald-600/70 pt-1">
                                    Verificado por {act.checkedBy.firstName} el {act.checkedAt ? format(new Date(act.checkedAt), "dd/MM/yy HH:mm") : "--"}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 ml-4">
                              {requirement.isApproved && permissions.chequea && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleCheck(act.id, act.isChecked)}
                                  disabled={isPending}
                                  className={cn(
                                    "h-9 px-3 gap-2 border-2",
                                    act.isChecked 
                                      ? "text-emerald-600 border-emerald-500 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20" 
                                      : "text-slate-500 border-slate-200 hover:border-emerald-500 hover:text-emerald-600"
                                  )}
                                >
                                  {act.isChecked ? <CheckCircle className="h-4 w-4" /> : <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />}
                                  {act.isChecked ? "Verificado" : "Marcar Verificado"}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* CARD 3: ADJUNTOS */}
                <Card className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
                  <CardHeader className="px-6 py-4 border-b bg-slate-50/50 dark:bg-slate-800/30 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#283c7f] text-white text-xs font-bold font-mono">3</span>
                        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Archivos Adjuntos</CardTitle>
                      </div>
                      <Badge variant="secondary" className="rounded-full px-2.5">{requirement.attachments.length + newAttachments.length}</Badge>
                  </CardHeader>
                  <CardContent className="p-4 flex-1">
                    {/* Botón de subir archivos en modo edición */}
                    {isEditing && (
                      <div className="mb-4">
                        <label htmlFor="file-upload-detalle" className="cursor-pointer">
                          <div className={cn(
                            "flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed transition-all",
                            isUploading 
                              ? "border-slate-300 bg-slate-50 dark:bg-slate-800/30 cursor-not-allowed"
                              : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                          )}>
                            {isUploading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Subiendo...</span>
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Agregar archivos</span>
                              </>
                            )}
                          </div>
                        </label>
                        <input
                          id="file-upload-detalle"
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => handleFileUpload(e.target.files)}
                          disabled={isUploading}
                        />
                      </div>
                    )}

                    {/* Mostrar adjuntos nuevos (aún no guardados) */}
                    {newAttachments.length > 0 && (
                      <div className="mb-4 space-y-2">
                        <p className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400 mb-2">Nuevos (sin guardar)</p>
                        {newAttachments.map((att, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600">
                              <Paperclip className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate text-slate-700 dark:text-slate-300">{att.fileName}</p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                {(att.fileSize / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            {isEditing && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeNewAttachment(idx)}
                                className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Adjuntos existentes */}
                    {requirement.attachments.length > 0 && (
                      <div className="space-y-2">
                        {isEditing && <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Archivos Guardados</p>}
                        {requirement.attachments.map((a: any) => (
                          <a
                            key={a.id}
                            href={a.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group"
                          >
                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                <Paperclip className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate text-slate-700 dark:text-slate-300 group-hover:text-blue-600 transition-colors">{a.fileName}</p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                {a.uploadedBy.firstName} · {format(new Date(a.createdAt), "dd/MM/yy", { locale: es })}
                              </p>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Mensaje cuando no hay adjuntos */}
                    {requirement.attachments.length === 0 && newAttachments.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground opacity-50">
                        <Paperclip className="h-8 w-8 mb-2" />
                        <p className="text-sm italic">Sin archivos adjuntos registrados.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* CARD 4: SEGUIMIENTO Y SECO */}
                 <Card className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
                  <CardHeader className="px-6 py-4 border-b bg-slate-50/50 dark:bg-slate-800/30">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#283c7f] text-white text-xs font-bold font-mono">4</span>
                        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Seguimiento y Control</CardTitle>
                      </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4 flex-1">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600">
                                <User className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase text-slate-400">Responsable Asignado</p>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {requirement.responsible ? `${requirement.responsible.firstName} ${requirement.responsible.lastName}` : "No asignado"}
                                </p>
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-2">Resumen de Control</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-lg border border-border">
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Verificadas</p>
                                    <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                        {requirement.activities.filter(a => a.isChecked).length} / {requirement.activities.length}
                                    </p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-lg border border-border">
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Aprobación Final</p>
                                    <p className={cn("text-lg font-bold", requirement.isApproved ? "text-emerald-500" : "text-amber-500")}>
                                        {requirement.isApproved ? "SÍ" : "NO"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                  </CardContent>
                </Card>
            </div>

            {/* TABS DE CIERRE: COMENTARIOS E HISTORIAL */}
            <Card className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm overflow-hidden">
                <Tabs defaultValue="comentarios" className="w-full">
                    <TabsList className="w-full rounded-none h-12 bg-slate-50 dark:bg-slate-800/50 border-b p-0 gap-0">
                        <TabsTrigger value="comentarios" className="flex-1 h-full rounded-none data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:border-b-2 data-[state=active]:border-[#283c7f] px-6 gap-2 font-bold uppercase text-xs tracking-widest transition-all">
                           <MessageSquare className="h-4 w-4" /> Comentarios ({requirement.comments.length})
                        </TabsTrigger>
                        <TabsTrigger value="historial" className="flex-1 h-full rounded-none data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:border-b-2 data-[state=active]:border-[#283c7f] px-6 gap-2 font-bold uppercase text-xs tracking-widest transition-all">
                           <RefreshCcw className="h-4 w-4" /> Historial de Cambios
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="comentarios" className="p-6 m-0 focus-visible:ring-0">
                        <div className="space-y-6">
                            <div className="space-y-4 max-h-100 overflow-y-auto pr-2">
                                {requirement.comments.length === 0 ? (
                                    <p className="text-center py-6 text-sm text-muted-foreground italic">No hay comentarios aún.</p>
                                ) : (
                                    requirement.comments.map((c: any) => (
                                        <div key={c.id} className="flex gap-4 group">
                                            <div className="shrink-0 w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-[#283c7f] border-2 border-white dark:border-slate-800 shadow-sm">
                                                {c.user.firstName?.[0]}{c.user.lastName?.[0]}
                                            </div>
                                            <div className="flex-1 bg-slate-50 dark:bg-slate-800/40 rounded-2xl rounded-tl-none px-4 py-3 border border-slate-100 dark:border-slate-800 flex flex-col shadow-sm">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{c.user.firstName} {c.user.lastName}</span>
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                                                        {format(new Date(c.createdAt), "dd MMM, HH:mm", { locale: es })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{c.comment}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Input nuevo comentario */}
                            <div className="pt-6 border-t flex gap-4">
                                <div className="shrink-0 w-10 h-10 rounded-full bg-[#283c7f] flex items-center justify-center text-white text-sm font-bold shadow-md">
                                    {currentUser?.firstName?.[0] || "U"}
                                </div>
                                <div className="flex-1 space-y-3">
                                    <Textarea 
                                        value={commentText} 
                                        onChange={(e) => setCommentText(e.target.value)} 
                                        placeholder="Presione para escribir una nota o comentario..." 
                                        rows={3} 
                                        className="w-full resize-none rounded-xl border-2 focus-visible:ring-offset-0 focus-visible:ring-[#283c7f] transition-all" 
                                    />
                                    <div className="flex justify-end">
                                        <Button 
                                            type="button"
                                            size="sm" 
                                            onClick={handleAddComment} 
                                            disabled={isPending || !commentText.trim()} 
                                            className="bg-[#283c7f] hover:bg-[#1e3065] text-white gap-2 rounded-lg px-6 font-bold shadow-lg shadow-blue-900/20"
                                        >
                                            {isPending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white" />}
                                            Enviar Comentario
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="historial" className="p-6 m-0 focus-visible:ring-0">
                        <div className="relative">
                            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-800" />
                            <div className="space-y-6">
                                {requirement.timeline.map((entry: any, i: number) => (
                                    <div key={entry.id} className="flex gap-6 relative">
                                        <div className="z-10 shrink-0 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border-2 border-[#283c7f] flex items-center justify-center shadow-sm">
                                            <div className="w-2 h-2 rounded-full bg-[#283c7f] animate-pulse" />
                                        </div>
                                        <div className="flex-1 min-w-0 -mt-0.5">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-xs font-extrabold text-[#283c7f] dark:text-blue-400 uppercase tracking-wider">
                                                    {entry.action === "CREATE" ? "CREACIÓN" : 
                                                     entry.action === "STATUS_CHANGE" ? "CAMBIO DE ESTADO" : 
                                                     entry.action === "COMMENT" ? "COMENTARIO" : "ACCIÓN SISTEMA"}
                                                </p>
                                                <span className="text-[10px] font-bold text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                    {format(new Date(entry.createdAt), "dd/MM/yy HH:mm", { locale: es })}
                                                </span>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
                                                    {entry.changedBy?.firstName} {entry.changedBy?.lastName}
                                                </p>
                                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                                    {entry.action === "CREATE" && "Inició el proceso de requerimiento."}
                                                    {entry.action === "STATUS_CHANGE" && (
                                                        <>
                                                            Cambió estado de <span className="font-bold underline">{entry.prevStatus?.name || "Borrador"}</span> a <span className="font-bold underline text-blue-600">{entry.newStatus?.name}</span>
                                                        </>
                                                    ) }
                                                    {entry.action === "COMMENT" && "Agregó una nota técnica al expediente."}
                                                    {entry.action === "ASSIGN" && "Reasignó la responsabilidad del requerimiento."}
                                                </p>
                                                {entry.comment && <p className="mt-2 text-xs italic text-muted-foreground border-l-2 pl-3 py-1">"{entry.comment}"</p>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </Card>
          </div>
        </form>
      </FormProvider>

      {/* Diálogo: Cambiar Estado (Mantenido igual) */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl shadow-2xl p-0 overflow-hidden border-none">
          <DialogHeader className="p-6 bg-[#283c7f] text-white">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <GitBranch className="h-6 w-6 text-white" />
                Cambiar Estado del Requerimiento
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-6 bg-white dark:bg-slate-900">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-400">Seleccionar Nuevo Estado</Label>
              <Select onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full h-12 rounded-xl border-2 focus:ring-[#283c7f]">
                  <SelectValue placeholder="Estado de destino..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {statuses
                    .filter((s) => s.id !== requirement.status.id)
                    .filter((s) => {
                      if (s.code === "CMP") return permissions.recepciona;
                      return permissions.autoriza;
                    })
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id} className="rounded-lg my-1">
                        {s.name}
                      </SelectItem>
                    ))}
                  {statuses.filter((s) => s.id !== requirement.status.id).filter((s) => (s.code === "CMP" ? permissions.recepciona : permissions.autoriza)).length === 0 && (
                    <p className="text-xs text-muted-foreground p-4 text-center">No tiene permisos para modificar el estado actual.</p>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-400">Comentario de Gestión (opcional)</Label>
              <Textarea 
                value={statusComment} 
                onChange={(e) => setStatusComment(e.target.value)} 
                placeholder="Escriba el motivo del cambio de estado..." 
                rows={4} 
                className="w-full resize-none rounded-xl border-2 focus-visible:ring-[#283c7f]" 
              />
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 dark:bg-slate-800/50 flex flex-row gap-2 border-t">
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)} className="flex-1 h-12 rounded-xl font-bold dark:text-white">
              Cancelar
            </Button>
            <Button onClick={handleChangeStatus} disabled={isPending || !selectedStatus} className="flex-1 h-12 rounded-xl bg-[#283c7f] hover:bg-[#1e3065] text-white font-bold shadow-lg shadow-blue-900/20">
              {isPending ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : "Confirmar Cambio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog para confirmar aprobación definitiva */}
      <AlertDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Aprobación Definitiva</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de aprobar este requerimiento de forma definitiva? Esta acción marcará el requerimiento como aprobado y no podrá ser modificado posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const r = await aprobarRequerimiento(requirement.id);
                if (r.success) {
                  toast.success("Requerimiento aprobado exitosamente");
                  router.refresh();
                } else {
                  toast.error(r.error || "Error al aprobar");
                }
                setShowApprovalDialog(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Aprobar Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MasterActivityDialog
        open={openMasterModal}
        onOpenChange={setOpenMasterModal}
        catalogs={catalogs}
        onSuccess={(newMaster) => {
          setLocalMasters((prev: any) => [...prev, newMaster]);
          setValue("masterActivityNameId", newMaster.id);
          setValue("masterActivityNameText", newMaster.name);
          setValue("title", newMaster.name);
        }}
      />

      <SolicitanteDialog
        open={openSolicitanteModal}
        onOpenChange={setOpenSolicitanteModal}
        onSuccess={(newUser) => {
          setLocalUsers((prev: any) => [...prev, newUser]);
          setValue("applicantUserId", newUser.id);
          setValue("nombreSolicitante", `${newUser.firstName} ${newUser.lastName}`);
        }}
      />
    </div>
  );
}

