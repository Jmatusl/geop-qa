"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useRequirements, ActRequirementFilters } from "@/lib/hooks/actividades/use-requirements";
import { StatusBadge } from "@/components/actividades/StatusBadge";
import { PriorityBadge } from "@/components/actividades/PriorityBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Plus, Paperclip, ArrowUp, ArrowDown, Filter, ChevronsRight, ChevronsLeft } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { BadgesHeader } from "./BadgesHeader";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, Edit, RefreshCcw, CheckCircle, CheckCheck, Trash2, AlertTriangle, Mail, MessageSquare, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { solicitarRevision, aprobarRevision, aprobarRequerimiento, bulkSolicitarRevision, bulkAprobarRevision, bulkAprobarFinal } from "../../[id]/actions";
import { RequirementPopover } from "@/components/actividades/RequirementPopover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Catalogs {
  statuses: { id: string; name: string; code: string; colorHex: string | null }[];
  priorities: { id: string; name: string; code: string; colorHex: string }[];
  activityTypes: { id: string; name: string; code: string }[];
}

interface ListadoDesktopProps {
  catalogs: Catalogs;
  permissions: { autoriza: boolean; chequea: boolean; revisa: boolean; recepciona: boolean };
}

type SortField = "folio" | "title" | "createdAt" | "estimatedDate" | "applicant" | "ship" | "priority" | "status" | "userCheckRequerido" | "isApproved";
type SortDir = "asc" | "desc" | null;

/**
 * Configuración de columnas sortables (Regla 12 del proyecto)
 * Define qué campos pueden ser ordenados directamente desde el encabezado
 */
const SORTABLE_COLUMNS: Record<SortField, boolean> = {
  folio: true,
  title: true,
  createdAt: true,
  estimatedDate: false,
  applicant: true,
  ship: true,
  priority: true,
  status: true,
  userCheckRequerido: true,
  isApproved: true,
};

export default function ListadoDesktop({ catalogs, permissions }: ListadoDesktopProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<ActRequirementFilters>({ page: 1, pageSize: 25 });
  const [sort, setSort] = useState<{ field: SortField | null; dir: SortDir }>({ field: null, dir: null });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  
  // Estados para AlertDialogs
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null);
  const [confirmReviewId, setConfirmReviewId] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useRequirements(filters);

  const requirements = data?.data ?? [];
  const total = data?.total ?? 0;

  // Ordenamiento local
  const sorted = sort.field
    ? [...requirements].sort((a, b) => {
        const field = sort.field!;
        const va = (a as any)[field];
        const vb = (b as any)[field];
        
        // Manejo especial para fechas
        if (field === "createdAt" || field === "estimatedDate") {
          const dateA = va ? new Date(va).getTime() : 0;
          const dateB = vb ? new Date(vb).getTime() : 0;
          return sort.dir === "asc" ? dateA - dateB : dateB - dateA;
        }
        
        // Manejo especial para objetos anidados
        if (field === "applicant") {
          const nameA = va ? `${va.firstName} ${va.lastName}`.toLowerCase() : "";
          const nameB = vb ? `${vb.firstName} ${vb.lastName}`.toLowerCase() : "";
          const cmp = nameA.localeCompare(nameB);
          return sort.dir === "asc" ? cmp : -cmp;
        }
        if (field === "ship") {
          const nameA = (va?.name || "").toLowerCase();
          const nameB = (vb?.name || "").toLowerCase();
          const cmp = nameA.localeCompare(nameB);
          return sort.dir === "asc" ? cmp : -cmp;
        }
        if (field === "priority" || field === "status") {
          const nameA = (va?.name || "").toLowerCase();
          const nameB = (vb?.name || "").toLowerCase();
          const cmp = nameA.localeCompare(nameB);
          return sort.dir === "asc" ? cmp : -cmp;
        }
        
        // Booleanos (userCheckRequerido, isApproved)
        if (field === "userCheckRequerido" || field === "isApproved") {
          const valA = va ? 1 : 0;
          const valB = vb ? 1 : 0;
          return sort.dir === "asc" ? valA - valB : valB - valA;
        }
        
        // Comparación por defecto (strings)
        const cmp = String(va ?? "").localeCompare(String(vb ?? ""));
        return sort.dir === "asc" ? cmp : -cmp;
      })
    : requirements;

  const toggleAll = () => {
    if (selectedIds.size === sorted.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map((r) => r.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const cycleSort = (field: SortField) => {
    setSort((prev) => {
      if (prev.field !== field) return { field, dir: "asc" };
      if (prev.dir === "asc") return { field, dir: "desc" };
      if (prev.dir === "desc") return { field: null, dir: null };
      return { field, dir: "asc" };
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort.field !== field) return <div className="w-4 h-4" />;
    if (sort.dir === "asc") return <ArrowUp className="w-4 h-4" />;
    return <ArrowDown className="w-4 h-4" />;
  };

  const setFilter = (key: keyof ActRequirementFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
  };

  // Helper para recepción count (Versión corregida que cuenta recepciones con isAccepted === true)
  const getRecepCount = (item: any) => {
    const activities = item.activities || [];
    const completed = activities.filter((a: any) => a.receptions?.some((r: any) => r.isAccepted === true)).length;
    return { completed, total: activities.length };
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Requerimientos y Actividades</h1>
          <BadgesHeader permissions={permissions} />
        </div>
        <Button size="sm" className="gap-1.5 bg-[#283c7f] hover:bg-[#1e3065] text-white" asChild>
          <Link href="/actividades/ingreso">
            <Plus className="h-4 w-4 text-white" />
            Nuevo Requerimiento
          </Link>
        </Button>
      </div>

      {/* Card principal */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-wrap items-center gap-3 bg-slate-50/50 dark:bg-slate-800/20">
          <Input placeholder="Buscar folio o solicitante..." className="w-64 bg-white dark:bg-slate-950" autoComplete="off" onChange={(e) => setFilter("q", e.target.value)} />

          <div className="flex-1" />

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-300">
              {permissions.autoriza && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-amber-100 text-amber-700 hover:bg-amber-200 gap-1.5 dark:bg-amber-900/30 dark:text-amber-400"
                    onClick={async () => {
                      const r = await bulkSolicitarRevision(Array.from(selectedIds));
                      if (r.success) {
                        toast.success("Revisiones solicitadas");
                        refetch();
                        setSelectedIds(new Set());
                      } else toast.error(r.error);
                    }}
                  >
                    <RefreshCcw className="h-4 w-4" />({selectedIds.size}) Solicitar Revisión
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 gap-1.5 dark:bg-emerald-900/30 dark:text-emerald-400"
                    onClick={async () => {
                      const r = await bulkAprobarFinal(Array.from(selectedIds));
                      if (r.success) {
                        toast.success("Requerimientos aprobados");
                        refetch();
                        setSelectedIds(new Set());
                      } else toast.error(r.error);
                    }}
                  >
                    <CheckCheck className="h-4 w-4" />({selectedIds.size}) Aprobar
                  </Button>
                </>
              )}
              {permissions.revisa && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-blue-100 text-blue-700 hover:bg-blue-200 gap-1.5 dark:bg-blue-900/30 dark:text-blue-400"
                  onClick={async () => {
                    const r = await bulkAprobarRevision(Array.from(selectedIds));
                    if (r.success) {
                      toast.success("Revisiones aprobadas");
                      refetch();
                      setSelectedIds(new Set());
                    } else toast.error(r.error);
                  }}
                >
                  <CheckCircle className="h-4 w-4" />({selectedIds.size}) Aprobar Revisión
                </Button>
              )}
            </div>
          )}

          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5 dark:text-white">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto rounded-xl border border-border bg-white dark:bg-slate-900/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 dark:bg-slate-900/80">
                <th className="px-2 py-3.5 text-center w-4">
                  <Checkbox checked={selectedIds.size === sorted.length && sorted.length > 0} onCheckedChange={toggleAll} />
                </th>
                <th className="px-2 py-3.5 text-left font-semibold text-slate-600 dark:text-slate-300 w-14">
                  {SORTABLE_COLUMNS.folio ? (
                    <button onClick={() => cycleSort("folio")} className="-ml-1 h-8 inline-flex items-center gap-1.5 px-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
                      <span>Folio</span>
                      <SortIcon field="folio" />
                    </button>
                  ) : (
                    <span>Folio</span>
                  )}
                </th>
                <th className="px-4 py-3.5 text-left font-semibold text-slate-600 dark:text-slate-300 max-w-55">
                  {SORTABLE_COLUMNS.title ? (
                    <button onClick={() => cycleSort("title")} className="-ml-2 h-8 inline-flex items-center gap-1.5 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
                      <span>Nombre</span>
                      <SortIcon field="title" />
                    </button>
                  ) : (
                    <span>Nombre</span>
                  )}
                </th>
                <th className="px-4 py-3.5 text-left font-semibold text-slate-600 dark:text-slate-300 w-32">
                  {SORTABLE_COLUMNS.applicant ? (
                    <button onClick={() => cycleSort("applicant")} className="-ml-2 h-8 inline-flex items-center gap-1.5 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
                      <span>Solicitante</span>
                      <SortIcon field="applicant" />
                    </button>
                  ) : (
                    <span>Solicitante</span>
                  )}
                </th>
                <th className="px-4 py-3.5 text-left font-semibold text-slate-600 dark:text-slate-300 w-28">
                  {SORTABLE_COLUMNS.ship ? (
                    <button onClick={() => cycleSort("ship")} className="-ml-2 h-8 inline-flex items-center gap-1.5 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
                      <span>Nave</span>
                      <SortIcon field="ship" />
                    </button>
                  ) : (
                    <span>Nave</span>
                  )}
                </th>
                <th className="px-4 py-3.5 text-center font-semibold text-slate-600 dark:text-slate-300 w-22">
                  {SORTABLE_COLUMNS.priority ? (
                    <button onClick={() => cycleSort("priority")} className="-ml-2 h-8 inline-flex items-center gap-1.5 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors justify-center">
                      <span>Prioridad</span>
                      <SortIcon field="priority" />
                    </button>
                  ) : (
                    <span>Prioridad</span>
                  )}
                </th>
                <th className="px-4 py-3.5 text-center font-semibold text-slate-600 dark:text-slate-300 w-24">
                  {SORTABLE_COLUMNS.status ? (
                    <button onClick={() => cycleSort("status")} className="-ml-2 h-8 inline-flex items-center gap-1.5 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors justify-center">
                      <span>Estado</span>
                      <SortIcon field="status" />
                    </button>
                  ) : (
                    <span>Estado</span>
                  )}
                </th>
                <th className="px-4 py-3.5 text-center font-semibold text-slate-600 dark:text-slate-300 w-22">Recepción</th>
                <th className="px-4 py-3.5 text-center font-semibold text-slate-600 dark:text-slate-300 w-24">
                  {SORTABLE_COLUMNS.userCheckRequerido ? (
                    <button onClick={() => cycleSort("userCheckRequerido")} className="-ml-2 h-8 inline-flex items-center gap-1.5 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors justify-center">
                      <span>Revisión</span>
                      <SortIcon field="userCheckRequerido" />
                    </button>
                  ) : (
                    <span>Revisión</span>
                  )}
                </th>
                <th className="px-4 py-3.5 text-center font-semibold text-slate-600 dark:text-slate-300 w-20">
                  {SORTABLE_COLUMNS.isApproved ? (
                    <button onClick={() => cycleSort("isApproved")} className="-ml-2 h-8 inline-flex items-center gap-1.5 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors justify-center">
                      <span>Aprobado</span>
                      <SortIcon field="isApproved" />
                    </button>
                  ) : (
                    <span>Aprobado</span>
                  )}
                </th>
                <th className="px-4 py-3.5 text-right font-semibold text-slate-600 dark:text-slate-300 w-16">Acc.</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-3 text-center">
                        <Skeleton className="h-4 w-4 mx-auto" />
                      </td>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : sorted.map((req) => {
                    const recep = getRecepCount(req);
                    return (
                      <tr key={req.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer">
                      <td className="px-2 py-3 text-center">
                        <Checkbox checked={selectedIds.has(req.id)} onCheckedChange={() => toggleOne(req.id)} />
                      </td>
                      <td className="px-2 py-3 font-mono text-xs font-bold whitespace-nowrap">
                        <RequirementPopover
                            id={req.id}
                            folio={req.folio}
                            folioPrefix={req.folioPrefix}
                            title={req.title}
                            description={req.description || ""}
                            createdAt={req.createdAt}
                            status={req.status}
                            priority={req.priority}
                            applicant={req.applicant}
                            activitiesCount={req.activities?.length || 0}
                            attachmentsCount={req._count?.attachments || 0}
                            isApproved={req.isApproved}
                          />
                        </td>
                        <td className="px-4 py-3 max-w-55 overflow-hidden">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => router.push(`/actividades/${req.id}`)}
                                  className="text-left font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 truncate block transition-colors"
                                >
                                  {req.title}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent align="start">{req.title}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {req.applicant ? `${req.applicant.firstName} ${req.applicant.lastName}` : <span className="italic text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 truncate">
                          {req.ship?.name || <span className="text-slate-400 italic">No asig.</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center">
                            <PriorityBadge name={req.priority.name} colorHex={req.priority.colorHex} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center">
                            <StatusBadge name={req.status.name} colorHex={req.status.colorHex} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                              {recep.completed}/{recep.total}
                            </span>
                            {recep.completed === recep.total && recep.total > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                                  </TooltipTrigger>
                                  <TooltipContent>Recepcionado</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {req.userCheckRequerido ? (
                            <Badge className={`${req.userCheckRequeridoAprobado ? "bg-emerald-500 hover:bg-emerald-600" : "bg-blue-500 hover:bg-blue-600"} text-white border-none py-0.5 text-[10px]`}>
                              {req.userCheckRequeridoAprobado ? "Revisado" : "En revisión"}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-xs italic">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <TooltipProvider>
                              {/* Estado Aprobado */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="shrink-0">
                                    {req.isApproved ? (
                                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {req.isApproved ? (
                                    <span>Aprobado el {req.approvedAt ? format(new Date(req.approvedAt), "dd/MM/yyyy") : "—"}</span>
                                  ) : (
                                    "No aprobado"
                                  )}
                                </TooltipContent>
                              </Tooltip>

                              {/* Correos enviados */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button 
                                    disabled={!req.emailsSent || req.emailsSent.length === 0}
                                    className={`${req.emailsSent && req.emailsSent.length > 0 ? "text-blue-500 dark:text-blue-400 cursor-help" : "opacity-40 cursor-not-allowed"} shrink-0 transition-colors`}
                                  >
                                    <Mail className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm">
                                  {req.emailsSent && req.emailsSent.length > 0 ? (
                                    <div className="space-y-2">
                                      <p className="font-semibold text-xs border-b pb-1">
                                        Correos enviados ({req.emailsSent.length})
                                      </p>
                                      {req.emailsSent.slice(0, 3).map((email, idx) => (
                                        <div key={email.id} className="text-xs space-y-0.5">
                                          {email.requirementFolio && (
                                            <p className="font-bold">{email.requirementFolio}</p>
                                          )}
                                          {email.providerName && (
                                            <p className="font-medium">{email.providerName}</p>
                                          )}
                                          <p>Para: {email.recipient}</p>
                                          <p className="opacity-80">
                                            Usuario: {email.sentBy.firstName} {email.sentBy.lastName}
                                          </p>
                                          <p className="opacity-80">
                                            {format(new Date(email.sentAt), "dd/MM/yyyy, HH:mm", { locale: es })}
                                          </p>
                                          {idx < Math.min(2, (req.emailsSent?.length || 0) - 1) && (
                                            <div className="border-t pt-1 mt-1" />
                                          )}
                                        </div>
                                      ))}
                                      {req.emailsSent.length > 3 && (
                                        <p className="text-xs italic pt-1 opacity-60">
                                          ...y {req.emailsSent.length - 3} más
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    "No se han enviado correos"
                                  )}
                                </TooltipContent>
                              </Tooltip>

                              {/* Observaciones */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button 
                                    disabled={!req.userCheckObservaciones} 
                                    className={`${req.userCheckObservaciones ? "text-amber-600 dark:text-amber-400 cursor-help" : "opacity-40 cursor-not-allowed"} shrink-0 transition-colors`}
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-md">
                                  {req.userCheckObservaciones ? (
                                    <div className="space-y-2">
                                      <p className="font-semibold text-xs border-b pb-1">
                                        Observaciones de revisión
                                      </p>
                                      <p className="text-xs leading-relaxed whitespace-pre-wrap">
                                        {req.userCheckObservaciones}
                                      </p>
                                      {req.userCheckedBy && req.userCheckedAt && (
                                        <div className="text-xs opacity-80 border-t pt-2 space-y-0.5">
                                          <p>
                                            <span className="font-medium">Revisado por:</span>{" "}
                                            {req.userCheckedBy.firstName} {req.userCheckedBy.lastName}
                                          </p>
                                          <p>
                                            <span className="font-medium">Fecha:</span>{" "}
                                            {format(new Date(req.userCheckedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    "Sin observaciones"
                                  )}
                                </TooltipContent>
                              </Tooltip>

                              {/* Adjuntos */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button disabled={req._count.attachments === 0} className={`${req._count.attachments > 0 ? "text-slate-600 dark:text-slate-400" : "opacity-40 cursor-not-allowed"} shrink-0 transition-colors`}>
                                    <Paperclip className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>{req._count.attachments > 0 ? `${req._count.attachments} archivos` : "Sin archivos"}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-700">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => router.push(`/actividades/${req.id}`)}>
                                <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/actividades/${req.id}`)}>
                                <Edit className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {permissions.autoriza && !req.isApproved && (
                                <>
                                  <DropdownMenuItem
                                    disabled={req.userCheckRequerido}
                                    onClick={async () => {
                                      const obs = window.prompt("Observaciones de revisión (opcional):");
                                      if (obs !== null) {
                                        const r = await solicitarRevision(req.id, obs);
                                        if (r.success) {
                                          toast.success("Revisión solicitada");
                                          refetch();
                                        } else toast.error(r.error);
                                      }
                                    }}
                                  >
                                    <RefreshCcw className="mr-2 h-4 w-4" /> {req.userCheckRequerido ? "Revisión Pendiente" : "Solicitar Revisión"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setConfirmApproveId(req.id)}>
                                    <CheckCheck className="mr-2 h-4 w-4" /> Aprobar
                                  </DropdownMenuItem>
                                </>
                              )}

                              {permissions.revisa && req.userCheckRequerido && !req.userCheckRequeridoAprobado && (
                                <DropdownMenuItem onClick={() => setConfirmReviewId(req.id)}>
                                  <CheckCircle className="mr-2 h-4 w-4" /> Marcar como revisado
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />
                              {permissions.autoriza && (
                                <DropdownMenuItem
                                  className="text-red-600 dark:text-red-400"
                                  onClick={() => {
                                    /* DELETE logic */
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
              {!isLoading && sorted.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Filter className="h-8 w-8 opacity-30" />
                      <p className="text-slate-600 dark:text-slate-400">No se encontraron requerimientos.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación (Patrón DataTable - Sección 15) */}
        {total > 0 && (
          <div className="flex items-center justify-between px-2 py-3">
            {/* Sección Izquierda: Total de registros y selector de filas */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                Total: {total} registros
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">Mostrar:</span>
                <Select
                  value={String(filters.pageSize ?? 25)}
                  onValueChange={(value) => setFilters((p) => ({ ...p, pageSize: Number(value), page: 1 }))}
                >
                  <SelectTrigger className="h-8 w-17.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="40">40</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sección Derecha: Navegación y información de página */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Página {filters.page ?? 1}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden lg:flex h-8 w-8 p-0 dark:hover:bg-slate-700"
                  disabled={(filters.page ?? 1) <= 1 || isFetching}
                  onClick={() => setFilters((p) => ({ ...p, page: 1 }))}
                  title="Primera página"
                >
                  <span className="sr-only">Primera página</span>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 dark:hover:bg-slate-700"
                  disabled={(filters.page ?? 1) <= 1 || isFetching}
                  onClick={() => setFilters((p) => ({ ...p, page: Math.max(1, (p.page ?? 1) - 1) }))}
                  title="Página anterior"
                >
                  <span className="sr-only">Página anterior</span>
                  <span>‹</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 dark:hover:bg-slate-700"
                  disabled={sorted.length < (filters.pageSize ?? 25) || isFetching}
                  onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
                  title="Página siguiente"
                >
                  <span className="sr-only">Página siguiente</span>
                  <span>›</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden lg:flex h-8 w-8 p-0 dark:hover:bg-slate-700"
                  disabled={sorted.length < (filters.pageSize ?? 25) || isFetching}
                  onClick={() => {
                    const lastPage = Math.ceil(total / (filters.pageSize ?? 25));
                    setFilters((p) => ({ ...p, page: lastPage }));
                  }}
                  title="Última página"
                >
                  <span className="sr-only">Última página</span>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* AlertDialog para confirmar aprobación */}
        <AlertDialog open={!!confirmApproveId} onOpenChange={(open) => !open && setConfirmApproveId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Aprobación</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Está seguro de aprobar este requerimiento de forma definitiva? Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (confirmApproveId) {
                    const r = await aprobarRequerimiento(confirmApproveId);
                    if (r.success) {
                      toast.success("Requerimiento aprobado");
                      refetch();
                    } else {
                      toast.error(r.error);
                    }
                    setConfirmApproveId(null);
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Aprobar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* AlertDialog para confirmar revisión */}
        <AlertDialog open={!!confirmReviewId} onOpenChange={(open) => !open && setConfirmReviewId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Revisión</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Marcar este requerimiento como revisado? Esto indicará que ha pasado el proceso de revisión técnica.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (confirmReviewId) {
                    const r = await aprobarRevision(confirmReviewId);
                    if (r.success) {
                      toast.success("Marcado como revisado");
                      refetch();
                    } else {
                      toast.error(r.error);
                    }
                    setConfirmReviewId(null);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
