"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { StatusBadge } from "@/components/actividades/StatusBadge";
import { PriorityBadge } from "@/components/actividades/PriorityBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cambiarEstadoRequerimiento, agregarComentario, toggleActivityCheck, solicitarRevision, aprobarRevision, aprobarRequerimiento, actualizarRequerimiento } from "../actions";
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
import { ChevronLeft, ClipboardList, GitBranch, MessageSquare, CheckCircle, Loader2, RefreshCw, CheckCheck, RefreshCcw, AlertTriangle, Save, X, Edit2, Search, Plus, Check, Anchor, Calendar as CalendarIcon, Clock, LayoutGrid, Paperclip, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { crearRequerimientoSchema, CrearRequerimientoData } from "@/lib/validations/actividades";
import { RequerimientoActividadEditor } from "../../ingreso/components/RequerimientoActividadEditor";
import { MasterActivityDialog } from "../../ingreso/components/MasterActivityDialog";
import { SolicitanteDialog } from "../../ingreso/components/SolicitanteDialog";
import { cn } from "@/lib/utils";

interface DetalleClientProps {
  requirement: any;
  statuses: { id: string; name: string; code: string; colorHex: string | null }[];
  catalogs: {
    activityTypes: { id: string; name: string; code: string }[];
    priorities: { id: string; name: string; colorHex: string; code?: string }[];
    locations: { id: string; name: string; commune: string | null }[];
    users: { id: string; firstName: string; lastName: string; email: string }[];
    ships: { id: string; name: string }[];
    masterActivityNames: { id: string; name: string; description?: string | null; defaultAreaId?: string | null; defaultApplicantUserId?: string | null; defaultDescription?: string | null }[];
    areas: { id: string; name: string }[];
    suppliers: { id: string; legalName: string; fantasyName: string | null }[];
  };
  currentUser: any;
  permissions: { autoriza: boolean; chequea: boolean; revisa: boolean; recepciona: boolean };
}

export default function DetalleClient({ requirement, statuses, catalogs, currentUser, permissions }: DetalleClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editModeParam = searchParams.get("edit") === "true";
  
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"view" | "edit">(editModeParam ? "edit" : "view");
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [activeTab, setActiveTab] = useState<"info" | "actividades" | "comentarios">("info");

  // Estados para diálogos y popovers (Master Activity)
  const [openMasterActName, setOpenMasterActName] = useState(false);
  const [openMasterModal, setOpenMasterModal] = useState(false);
  const [localMasters, setLocalMasters] = useState(catalogs.masterActivityNames);

  // Estados para solicitante
  const [openSolicitanteSearch, setOpenSolicitanteSearch] = useState(false);
  const [openSolicitanteModal, setOpenSolicitanteModal] = useState(false);
  const [localUsers, setLocalUsers] = useState(catalogs.users);

  const folio = `${requirement.folioPrefix}-${String(requirement.folio).padStart(4, "0")}`;

  // Formulario para edición
  const form = useForm<CrearRequerimientoData>({
    resolver: zodResolver(crearRequerimientoSchema),
    defaultValues: {
      title: requirement.title || "",
      description: requirement.description || "",
      priorityId: requirement.priorityId,
      locationId: requirement.locationId || "",
      areaId: requirement.areaId || "",
      shipId: requirement.shipId || "",
      estimatedDate: requirement.estimatedDate ? new Date(requirement.estimatedDate).toISOString() : undefined,
      estimatedTime: requirement.estimatedTime || "",
      applicantUserId: requirement.applicantUserId || "",
      nombreSolicitante: requirement.nombreSolicitante || "",
      estimatedValue: Number(requirement.estimatedValue) || 0,
      masterActivityNameId: requirement.masterActivityNameId || "",
      actividades: requirement.activities.map((a: any) => ({
        id: a.id,
        name: a.name,
        description: a.description || "",
        locationId: a.locationId || "",
        startDate: a.startDate ? new Date(a.startDate).toISOString() : undefined,
        endDate: a.endDate ? new Date(a.endDate).toISOString() : undefined,
        statusActivity: a.statusActivity,
        supplierId: a.supplierId || "",
        estimatedValue: Number(a.estimatedValue) || 0,
      })),
      notifyUserIds: [], // Omitido según modelo actual
    },
  });

  const onUpdateSubmit = (data: CrearRequerimientoData) => {
    startTransition(async () => {
      const res = await actualizarRequerimiento(requirement.id, data);
      if (res.success) {
        toast.success("Requerimiento actualizado correctamente");
        setMode("view");
        router.refresh();
      } else {
        toast.error(res.error || "Error al actualizar");
      }
    });
  };

  const handleChangeStatus = () => {
    if (!selectedStatus) {
      toast.error("Seleccione un estado");
      return;
    }
    startTransition(async () => {
      const r = await cambiarEstadoRequerimiento(requirement.id, { statusId: selectedStatus });
      if (r.success) {
        toast.success("Estado actualizado");
        setStatusDialogOpen(false);
        router.refresh();
      } else toast.error(r.error ?? "Error");
    });
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    startTransition(async () => {
      const r = await agregarComentario(requirement.id, { comment: commentText });
      if (r.success) {
        toast.success("Comentario enviado");
        setCommentText("");
        router.refresh();
      } else toast.error(r.error ?? "Error");
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

  if (mode === "edit") {
    return (
      <FormProvider {...form}>
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
          {/* Header móvil Edición */}
          <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <button onClick={() => setMode("view")} className="p-1.5 rounded-lg border border-border hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
              <div className="flex flex-col">
                <span className="font-extrabold uppercase tracking-wide text-xs text-slate-500">Editando</span>
                <span className="font-mono text-sm font-extrabold text-blue-600 dark:text-blue-400">{folio}</span>
              </div>
            </div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase">{format(new Date(), "dd-MM-yy")}</div>
          </div>

          <form onSubmit={form.handleSubmit(onUpdateSubmit)} className="flex-1 pb-24">
            <div className="p-4 space-y-6">
              {/* Folio (Read only) */}
              <div>
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase">Folio (Auto)</FormLabel>
                  <FormControl>
                    <Input value={folio} disabled className="bg-slate-50 dark:bg-slate-800/50 border-dashed font-mono font-bold text-blue-600 h-11" />
                  </FormControl>
                </FormItem>
              </div>

              {/* Sección 1: Datos Base */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-6 bg-[#283c7f] rounded-full" />
                  <h3 className="text-xs font-bold uppercase text-slate-500 tracking-widest">Información Base</h3>
                </div>

                {/* Nave */}
                <FormField
                  control={form.control}
                  name="shipId"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-xs font-bold uppercase">Nave / Instalación</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
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

                {/* Actividad Maestra */}
                <FormField
                  control={form.control}
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
                                        form.setValue("masterActivityNameId", m.id);
                                        form.setValue("masterActivityNameText", m.name);

                                        // Auto-fill defaults
                                        if (m.defaultAreaId) form.setValue("areaId", m.defaultAreaId);
                                        if (m.defaultApplicantUserId) form.setValue("applicantUserId", m.defaultApplicantUserId);
                                        if (m.defaultDescription) form.setValue("description", m.defaultDescription || "");

                                        setOpenMasterActName(false);
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", form.watch("masterActivityNameId") === m.id ? "opacity-100" : "opacity-0")} />
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
                              form.setValue("masterActivityNameId", "");
                              form.setValue("masterActivityNameText", "");
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
                              form.setValue("masterActivityNameId", "");
                              form.setValue("masterActivityNameText", "");
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
                    control={form.control}
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
                    control={form.control}
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
                  control={form.control}
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
                                  {localUsers.map((u: any) => (
                                    <CommandItem
                                      key={u.id}
                                      value={`${u.firstName} ${u.lastName} ${u.email}`}
                                      onSelect={() => {
                                        const fullName = `${u.firstName} ${u.lastName}`;
                                        field.onChange(fullName);
                                        form.setValue("applicantUserId", u.id);
                                        setOpenSolicitanteSearch(false);
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", form.watch("applicantUserId") === u.id ? "opacity-100" : "opacity-0")} />
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
                              form.setValue("applicantUserId", "");
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
                              form.setValue("applicantUserId", "");
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
                    control={form.control}
                    name="priorityId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase">Prioridad</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
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
                    control={form.control}
                    name="areaId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase">Área</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
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
                      <Badge className="bg-slate-400 text-white">{requirement.attachments.length}</Badge>
                    </Button>
                  </div>
                </div>

                <FormField
                  control={form.control}
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

              {/* Sección Actividades */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                  <h3 className="text-xs font-bold uppercase text-slate-500 tracking-widest">Actividades</h3>
                </div>
                <RequerimientoActividadEditor catalogs={catalogs as any} isApproved={requirement.isApproved} />
              </div>
            </div>

            {/* Barra fija inferior Guardar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t p-3 shadow-lg flex gap-3 z-50">
              <Button type="button" variant="outline" onClick={() => setMode("view")} className="flex-1 dark:text-white" disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-2 bg-[#283c7f] hover:bg-[#1e3065] text-white gap-2" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4 text-white" />}
                Guardar Cambios
              </Button>
            </div>
          </form>
        </div>
      </FormProvider>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header móvil Vista */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/actividades/listado")}
            className="p-1.5 rounded-lg border border-border hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <ClipboardList className="h-5 w-5 text-[#283c7f]" />
          <span className="font-mono text-sm font-extrabold text-blue-600 dark:text-blue-400">{folio}</span>
        </div>
        <StatusBadge name={requirement.status.name} colorHex={requirement.status.colorHex} />
      </div>

      {/* Info principal */}
      <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b">
        <h1 className="font-bold text-slate-900 dark:text-white leading-snug">
          {requirement.title || requirement.masterActivityName?.name || requirement.masterActivityNameText || "Sin título"}
        </h1>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <PriorityBadge name={requirement.priority.name} colorHex={requirement.priority.colorHex} />
          <span className="text-xs text-muted-foreground">{requirement.activityType.name}</span>
        </div>
      </div>

      {/* Tabs móvil */}
      <div className="flex border-b bg-white dark:bg-slate-900 sticky top-14.25 z-10 shadow-sm">
        {[
          { key: "info", label: "Info" },
          { key: "actividades", label: `Actividades (${requirement.activities.length})` },
          { key: "comentarios", label: `Comentarios (${requirement.comments.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 px-3 py-3 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === tab.key
                ? "text-[#283c7f] border-[#283c7f] dark:text-blue-400"
                : "text-muted-foreground border-transparent hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido por tab */}
      <div className="flex-1 overflow-y-auto pb-24">
        {activeTab === "info" && (
          <div className="p-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Descripción</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                {requirement.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-slate-900 rounded-xl border p-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Solicitante</p>
                <p className="text-xs font-semibold mt-1">
                  {requirement.applicant ? `${requirement.applicant.firstName} ${requirement.applicant.lastName}` : "No asignado"}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border p-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Responsable</p>
                <p className="text-xs font-semibold mt-1">
                  {requirement.responsible ? `${requirement.responsible.firstName} ${requirement.responsible.lastName}` : "No asignado"}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border p-3 shadow-sm flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-medium">Creado el</span>
              <span className="font-semibold">{format(new Date(requirement.createdAt), "dd/MM/yyyy")}</span>
            </div>

            {requirement.estimatedDate && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border p-3 shadow-sm flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Fecha estimada</span>
                <span className="font-semibold">{format(new Date(requirement.estimatedDate), "dd/MM/yyyy")}</span>
              </div>
            )}
          </div>
        )}

        {activeTab === "actividades" && (
          <div className="p-4 space-y-3">
            {requirement.activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed">
                <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <ClipboardList className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-500">Sin actividades registradas.</p>
              </div>
            ) : (
              requirement.activities.map((act: any) => (
                <div key={act.id} className="bg-white dark:bg-slate-900 rounded-xl border p-4 flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${
                        act.statusActivity === "COMPLETADO" ? "bg-emerald-500" : act.statusActivity === "EN_PROGRESO" ? "bg-blue-500" : "bg-slate-300"
                      }`}
                    />
                    <div className="min-w-0">
                      <p
                        className={`font-bold text-sm leading-tight ${
                          act.isChecked ? "text-emerald-600 dark:text-emerald-400 line-through decoration-2" : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {act.name}
                      </p>
                      {act.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{act.description}</p>}
                      {act.isChecked && (
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle className="h-3 w-3 text-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">Verificado</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {requirement.isApproved && permissions.chequea && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleCheck(act.id, act.isChecked)}
                      disabled={isPending}
                      className={`shrink-0 h-10 w-10 p-0 rounded-full ${
                        act.isChecked
                          ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                          : "text-slate-400 border border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      {act.isChecked ? <CheckCircle className="h-6 w-6" /> : <RefreshCw className={`h-5 w-5 ${isPending ? "animate-spin" : ""}`} />}
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "comentarios" && (
          <div className="p-4 space-y-4">
            <div className="space-y-3">
              {requirement.comments.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8 italic">No hay comentarios aún.</p>
              ) : (
                requirement.comments.map((c: any) => (
                  <div key={c.id} className="bg-white dark:bg-slate-900 rounded-xl border p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-[#283c7f] dark:text-blue-400">
                        {c.user.firstName} {c.user.lastName}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">{format(new Date(c.createdAt), "dd/MM HH:mm")}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{c.comment}</p>
                  </div>
                ))
              )}
            </div>
            
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Nuevo Comentario</Label>
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Escriba aquí sus observaciones..."
                rows={3}
                className="w-full resize-none rounded-xl"
              />
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={isPending || !commentText.trim()}
                className="w-full bg-[#283c7f] hover:bg-[#1e3065] text-white gap-2 h-11 rounded-xl"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <MessageSquare className="h-4 w-4 text-white" />}
                Publicar Comentario
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Barra fija inferior Acciones */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t p-3 shadow-lg flex gap-2 z-40">
        <Button onClick={() => setStatusDialogOpen(true)} variant="outline" className="shrink-0 h-11 w-11 p-0 rounded-xl border-slate-200 dark:border-slate-800 dark:text-white">
          <GitBranch className="h-5 w-5" />
        </Button>

        {!requirement.isApproved ? (
          <>
            <Button onClick={() => setMode("edit")} variant="secondary" className="flex-1 h-11 rounded-xl gap-2 font-bold text-xs uppercase tracking-wide">
              <Edit2 className="h-4 w-4" /> Editar
            </Button>
            
            {permissions.autoriza && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold text-xs uppercase tracking-wide"
                  >
                    <CheckCheck className="h-4 w-4 text-white" /> Aprobar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Confirmar aprobación definitiva?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer y el requerimiento quedará marcado como aprobado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="dark:text-white">Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        const r = await aprobarRequerimiento(requirement.id);
                        if (r.success) {
                          toast.success("Aprobado");
                          router.refresh();
                        } else toast.error(r.error);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Sí, Aprobar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        ) : (
          <Button disabled className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-400 gap-2 font-bold text-xs uppercase tracking-wide">
            <CheckCircle className="h-4 w-4" /> Aprobado
          </Button>
        )}
      </div>

      {/* Diálogo estado */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Estado</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Nuevo estado..." />
              </SelectTrigger>
              <SelectContent>
                {statuses
                  .filter((s) => s.id !== requirement.status.id)
                  .filter((s) => (s.code === "CMP" ? permissions.recepciona : permissions.autoriza))
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                {statuses.filter((s) => s.id !== requirement.status.id).filter((s) => (s.code === "CMP" ? permissions.recepciona : permissions.autoriza)).length === 0 && (
                  <SelectItem value="none" disabled>
                    Sin permisos para otros estados
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)} className="dark:text-white">
              Cancelar
            </Button>
            <Button onClick={handleChangeStatus} disabled={isPending || !selectedStatus} className="bg-[#283c7f] text-white">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
