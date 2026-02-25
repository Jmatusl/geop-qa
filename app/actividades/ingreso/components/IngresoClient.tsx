"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronLeft, ClipboardList, Plus, Save, Loader2, Trash2, Paperclip, Anchor, User as UserIcon, LayoutGrid, Clock, Calendar as CalendarIcon, Search, X, Check, CheckCircle2, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { MasterActivityDialog } from "./MasterActivityDialog";
import { SolicitanteDialog } from "./SolicitanteDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, LockIcon } from "lucide-react";
import WorkflowBar from "@/app/actividades/[id]/components/WorkflowBar";

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

interface IngresoClientProps {
  catalogs: Catalogs;
  currentUser: { id: string; firstName: string; lastName: string };
  initialData?: any;
  requirementId?: string;
  isEditing?: boolean;
  permissions?: { autoriza: boolean; chequea: boolean; revisa: boolean; recepciona: boolean };
}

export default function IngresoClient({ catalogs, currentUser, initialData, requirementId, isEditing = false, permissions }: IngresoClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showActividades, setShowActividades] = useState(true);
  const [openMasterModal, setOpenMasterModal] = useState(false);
  const [openMasterActName, setOpenMasterActName] = useState(false);
  const [localMasters, setLocalMasters] = useState(catalogs.masterActivityNames);
  const [openSolicitanteModal, setOpenSolicitanteModal] = useState(false);
  const [openSolicitanteSearch, setOpenSolicitanteSearch] = useState(false);
  const [localUsers, setLocalUsers] = useState(catalogs.users);

  // Determinar si el usuario puede editar
  const isCreator = initialData?.createdById === currentUser.id;
  const hasEditPermission = permissions?.autoriza || permissions?.chequea;
  const hasSolicitadoRevision = initialData?.userCheckRequerido === true;
  const estaAprobado = initialData?.isApproved === true;
  
  // SEGURIDAD: Bloquear edición si hay solicitud de revisión activa o está aprobado
  const canEdit = !isEditing || ((isCreator || hasEditPermission) && !hasSolicitadoRevision && !estaAprobado);

  // Defaults: prioridad 'MEDIA' si existe, fecha/hora actuales
  const defaultPriorityId = catalogs.priorities.find((p) => p.code === "MEDIA")?.id || catalogs.priorities.find((p) => p.name.toLowerCase() === "media")?.id || "";
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
        applicantUserId: initialData.applicantUserId || currentUser.id,
        nombreSolicitante: initialData.applicant ? `${initialData.applicant.firstName} ${initialData.applicant.lastName}` : `${currentUser.firstName} ${currentUser.lastName}`,
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
        applicantUserId: currentUser.id,
        nombreSolicitante: `${currentUser.firstName} ${currentUser.lastName}`,
        responsibleUserId: "",
        estimatedValue: 0,
        actividades: [],
        notifyUserIds: [],
      };

  const methods = useForm<CrearRequerimientoData>({
    resolver: zodResolver(crearRequerimientoSchema),
    defaultValues: computedDefaults,
  });

  const { handleSubmit, control, setValue, watch } = methods;

  const totalEstimado = watch("estimatedValue") || 0;

  const [nextFolio, setNextFolio] = useState<string>("REQ-NEW");

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

  const { fields, append, remove } = useFieldArray({ control: methods.control, name: "actividades" });

  const onSubmit = (data: CrearRequerimientoData) => {
    startTransition(async () => {
      if (isEditing && requirementId) {
        const result = await actualizarRequerimiento(requirementId, data);
        if (result.success) {
          toast.success("Requerimiento actualizado");
          router.push(`/actividades/${requirementId}`);
          router.refresh();
        } else {
          toast.error(result.error ?? "Error al actualizar");
        }
      } else {
        const result = await crearRequerimiento(data);
        if (result.success) {
          toast.success(`Requerimiento ${result.folio} creado`);
          router.push(`/actividades/${result.id}`);
        } else {
          toast.error(result.error ?? "Error al crear");
        }
      }
    });
  };

  // Renderizado de la vista móvil del formulario
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header móvil Estándar */}
      <div className="bg-white dark:bg-slate-900 border-b border-border sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1.5 rounded-lg border border-border bg-white dark:bg-slate-900">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-1 rounded">
              <ClipboardList className="h-5 w-5 text-[#283c7f] dark:text-blue-400" />
            </div>
            <span className="font-extrabold uppercase tracking-wide text-sm text-slate-900 dark:text-white">{isEditing ? "EDITAR" : "NUEVO REQUERIMIENTO"}</span>
          </div>
          <p className="text-[10px] font-mono font-bold text-slate-400">{format(new Date(), "dd-MM-yy")}</p>
        </div>
        
        {/* Solo mostrar badges si NO está aprobado (el TIP ya lo indica) */}
        {!estaAprobado && (
          <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
            {isEditing && initialData?.status ? (
              <Badge 
                variant="outline" 
                className="text-xs px-2 py-0.5 border"
                style={{
                  backgroundColor: `${initialData.status.colorHex}20`,
                  borderColor: initialData.status.colorHex,
                  color: initialData.status.colorHex
                }}
              >
                {initialData.status.name.toUpperCase()}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs px-2 py-0.5 border-amber-200 bg-amber-50 text-amber-700">
                BORRADOR
              </Badge>
            )}

            {isEditing && initialData?.userCheckRequerido && (
              initialData.userCheckRequeridoAprobado ? (
                <Badge variant="outline" className="text-xs px-2 py-0.5 border-emerald-200 bg-emerald-50 text-emerald-700">
                  ✓ REVISADO
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs px-2 py-0.5 border-blue-200 bg-blue-50 text-blue-700">
                  EN REVISIÓN
                </Badge>
              )
            )}
          </div>
        )}
      </div>

      {/* Barra de Workflow (solo en modo edición y no aprobado) */}
      {isEditing && initialData && !estaAprobado && (
        <div className="p-3 pt-0">
          <WorkflowBar requirement={initialData} permissions={permissions || {}} />
        </div>
      )}

      {/* Formulario */}
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="flex-1 pb-20">
          <fieldset disabled={!canEdit} className="space-y-4">
            <div className="p-3 space-y-4">
              {/* TIP de Aprobación Visual (solo cuando está aprobado) */}
              {estaAprobado && initialData && (
                <Alert className="bg-linear-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 border-2 border-emerald-300 dark:border-emerald-700 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-emerald-500 p-1.5 shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">Requerimiento aprobado</h3>
                      <p className="text-xs text-emerald-800 dark:text-emerald-200">
                        Aprobado el {initialData.approvedAt ? format(new Date(initialData.approvedAt), "dd/MM/yyyy 'a las' HH:mm", { locale: es }) : format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                      </p>
                      {initialData.approvedBy && (
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">
                          por <strong>{initialData.approvedBy.firstName} {initialData.approvedBy.lastName}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                </Alert>
              )}

              {/* Alerta de solo lectura (para otros casos) */}
              {!canEdit && !estaAprobado && (
                <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                  <LockIcon className="h-4 w-4 stroke-amber-600 dark:stroke-amber-400" />
                  <AlertDescription className="text-sm text-amber-800 dark:text-amber-300">
                    {hasSolicitadoRevision ? (
                      <><strong>Revisión Pendiente:</strong> Este requerimiento tiene una solicitud de revisión activa y no se puede modificar hasta que se complete el proceso de revisión.</>
                    ) : (
                      <><strong>Modo solo lectura:</strong> No tienes permisos para editar este requerimiento.</>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Folio (Auto) - móvil */}
            <div>
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase">Folio (Auto)</FormLabel>
                <FormControl>
                  <Input value={nextFolio} disabled className="bg-slate-50 dark:bg-slate-800/50 border-dashed font-mono font-bold text-blue-600 h-11" />
                </FormControl>
              </FormItem>
            </div>
            {/* Sección 1: Datos Base */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-6 bg-[#283c7f] rounded-full" />
                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-widest">Información Base</h3>
              </div>

              {/* Nave */}
              <FormField
                control={methods.control}
                name="shipId"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="text-xs font-bold uppercase">Nave / Instalación</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full h-12 bg-white dark:bg-slate-900 border-slate-200">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {catalogs.ships.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Tipo de Actividad */}


              {/* Actividad Maestra */}
              <FormField
                control={methods.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase">Tipo de Actividad Solicitada</FormLabel>
                    <div className="flex bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm focus-within:ring-1 focus-within:ring-ring">
                      <Popover open={openMasterActName} onOpenChange={setOpenMasterActName}>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="ghost" className="rounded-none rounded-l-md border-r px-3 text-muted-foreground hover:text-foreground h-12" title="Buscar en maestro">
                            <Search className="h-5 w-5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
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
                          placeholder="Ingrese nombre..."
                          className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 shadow-none h-12 px-3 bg-transparent"
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
                          className="rounded-none px-2 text-muted-foreground hover:text-foreground h-12"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        type="button"
                        onClick={() => setOpenMasterModal(true)}
                        className="rounded-none rounded-r-md border-y-0 border-r-0 border-l bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 h-12 px-3 text-[#283c7f] dark:text-blue-400"
                        title="Agregar al maestro"
                      >
                        <Plus className="h-5 w-5 border border-current rounded" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                {/* Fecha */}
                <FormField
                  control={methods.control}
                  name="estimatedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase">Fecha Tentativa</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input type="date" {...field} className="h-12 pl-10 bg-white dark:bg-slate-900" />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                {/* Hora */}
                <FormField
                  control={methods.control}
                  name="estimatedTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase">Hora</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input type="time" {...field} className="h-12 pl-10 bg-white dark:bg-slate-900" />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Solicitante — combobox + input libre + modal */}
              <FormField
                control={methods.control}
                name="nombreSolicitante"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase">Solicitante</FormLabel>
                    <div className="flex bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 shadow-sm focus-within:ring-1 focus-within:ring-ring">
                      <Popover open={openSolicitanteSearch} onOpenChange={setOpenSolicitanteSearch}>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="ghost" className="rounded-none rounded-l-md border-r px-3 text-muted-foreground hover:text-foreground h-12" title="Buscar solicitante">
                            <Search className="h-5 w-5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
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

                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            setValue("applicantUserId", "");
                          }}
                          placeholder="Nombre del solicitante..."
                          className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 shadow-none h-12 px-3 bg-transparent"
                        />
                      </FormControl>

                      {field.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            field.onChange("");
                            setValue("applicantUserId", "");
                          }}
                          className="rounded-none px-2 text-muted-foreground hover:text-foreground h-12"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setOpenSolicitanteModal(true)}
                        className="rounded-none rounded-r-md border-y-0 border-r-0 border-l bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 h-12 px-3"
                        title="Agregar nuevo solicitante"
                      >
                        <Plus className="h-5 w-5 border border-[#283c7f] dark:border-blue-400 rounded text-[#283c7f] dark:text-blue-400" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={methods.control}
                  name="priorityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase">Prioridad</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full h-12 bg-white dark:bg-slate-900 border-slate-200">
                            <SelectValue placeholder="Nivel..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {catalogs.priorities.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={methods.control}
                  name="areaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase">Área</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full h-12 bg-white dark:bg-slate-900 border-slate-200">
                            <SelectValue placeholder="Área..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {catalogs.areas.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                {/* Adjuntos junto a Área (móvil: tercera columna) */}
                <div className="flex items-end justify-end">
                  <Button type="button" variant="outline" className="h-12 px-3 gap-2 border-dashed border-slate-300">
                    <Paperclip className="h-4 w-4" />
                    Adjuntos
                    <Badge className="bg-slate-400 text-white">0</Badge>
                  </Button>
                </div>
              </div>

              <FormField
                control={methods.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase">Descripción del Trabajo</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Detalle la solicitud..." rows={3} className="bg-white dark:bg-slate-900 resize-none" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

              {/* Nota: el control de adjuntos está junto a Área (botón en tercera columna) — botón compacto removido */}

            {/* Sección Actividades */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                  <h3 className="text-xs font-bold uppercase text-slate-500 tracking-widest">Actividades ({fields.length})</h3>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowActividades(!showActividades)} className="text-xs font-bold text-[#283c7f]">
                  {showActividades ? "CONTRAER" : "EXPANDIR"}
                </Button>
              </div>

              {showActividades && (
                <div className="space-y-3">
                  {fields.map((field, i) => (
                    <div key={field.id} className="bg-white dark:bg-slate-900 rounded-xl border border-border p-3 shadow-sm space-y-3 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ITEM #{i + 1}</span>
                        <button type="button" onClick={() => remove(i)} className="text-red-500 p-1">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <Input {...methods.register(`actividades.${i}.name`)} placeholder="Nombre de actividad *" className="h-11" />
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="date" {...methods.register(`actividades.${i}.startDate`)} className="h-11" />
                          <Input type="date" {...methods.register(`actividades.${i}.endDate`)} className="h-11" />
                        </div>
                        <Select onValueChange={(val) => methods.setValue(`actividades.${i}.responsibleUserId`, val)}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Responsable..." />
                          </SelectTrigger>
                          <SelectContent>
                            {catalogs.users.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.firstName} {u.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      append({
                        name: "",
                        description: "",
                        locationId: "",
                        startDate: undefined,
                        endDate: undefined,
                        statusActivity: "PENDIENTE",
                        responsibleUserId: "",
                        supplierId: "",
                        estimatedValue: 0,
                      })
                    }
                    className="w-full h-14 border-2 border-dashed border-slate-300 text-slate-500 gap-2 bg-transparent"
                  >
                    <Plus className="h-5 w-5" />
                    AGREGAR ACTIVIDAD
                  </Button>
                </div>
              )}
            </div>
          </div>
          </fieldset>
        </form>
      </FormProvider>

      {/* Botones finales (móvil): botón normal en lugar de barra flotante */}
      <div className="lg:hidden w-full px-4 py-6">
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()} className="h-12 border-slate-200">
            VOLVER
          </Button>
          <Button 
            type="button" 
            onClick={methods.handleSubmit(onSubmit)} 
            disabled={isPending || !canEdit} 
            className="flex-1 h-12 gap-2 bg-[#283c7f] hover:bg-[#1e3065] text-white font-bold shadow-lg shadow-blue-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {isPending ? "GUARDANDO..." : (isEditing ? "ACTUALIZAR SOLICITUD" : "REGISTRAR SOLICITUD")}
          </Button>
        </div>
      </div>

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
