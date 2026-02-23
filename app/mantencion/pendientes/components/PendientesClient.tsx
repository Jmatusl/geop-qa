"use client";

import { useState, useTransition } from "react";
import { flexRender, getCoreRowModel, useReactTable, getPaginationRowModel, getSortedRowModel, SortingState } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, RefreshCw, ClipboardCheck, Info, MapPin, Wrench, Calendar, User, Eye, Check, X, ImageIcon, ChevronRight } from "lucide-react";
import { getColumns, PendingRequest } from "./columns";
import { approveRequest, rejectRequest } from "../actions";
import { format } from "date-fns";
import { es } from "date-fns/locale/es";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";

interface PendientesClientProps {
  initialData: PendingRequest[];
}

export default function PendientesMobile({ initialData }: PendientesClientProps) {
  const [data, setData] = useState<PendingRequest[]>(initialData);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Table setup
  const columns = getColumns({
    onApprove: (id) => setApproveId(id),
    onReject: (id) => setRejectId(id),
    onViewDetails: () => {}, // No longer used as columns use Link directly
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  const handleApprove = async () => {
    if (!approveId) return;

    startTransition(async () => {
      const result = await approveRequest(approveId);
      if (result.success) {
        toast.success("Requerimiento aprobado exitosamente");
        setData((prev) => prev.filter((r) => r.id !== approveId));
        setApproveId(null);
      } else {
        toast.error(`Error: ${result.error}`);
      }
    });
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;

    startTransition(async () => {
      const result = await rejectRequest(rejectId, rejectReason);
      if (result.success) {
        toast.success("Requerimiento rechazado");
        setData((prev) => prev.filter((r) => r.id !== rejectId));
        setRejectId(null);
        setRejectReason("");
      } else {
        toast.error(`Error: ${result.error}`);
      }
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // En una implementación real llamaríamos a una acción para traer datos frescos
    // Por ahora simulamos un delay
    setTimeout(() => {
      setIsRefreshing(false);
      toast.info("Bandeja actualizada");
    }, 1000);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header adaptable */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-blue-600" />
            Bandeja de Aprobaciones
          </h1>
          <p className="text-sm text-muted-foreground">Gestione las solicitudes pendientes de validación técnica y operativa.</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="w-full sm:w-auto gap-2 rounded-xl">
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Actualizando..." : "Refrescar"}
        </Button>
      </div>

      {/* Vista Desktop (Tabla) */}
      <div className="hidden lg:block">
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="font-bold text-slate-700 dark:text-slate-300">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-40 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Info className="h-8 w-8 opacity-20" />
                      <p className="font-medium">No hay requerimientos pendientes de aprobación.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Vista Móvil (Cards) */}
      <div className="lg:hidden space-y-4">
        {data.length > 0 ? (
          data.map((req) => (
            <Card key={req.id} className="rounded-2xl border-border/60 shadow-md overflow-hidden active:scale-[0.98] transition-transform">
              <CardHeader className="p-4 bg-slate-50/50 dark:bg-slate-900/30 flex-row items-center justify-between space-y-0">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-blue-600 font-mono tracking-wider uppercase">
                    Folio #{req.folioPrefix}-{req.folio}
                  </span>
                  <CardTitle className="text-base truncate max-w-[200px]">{req.equipment.name}</CardTitle>
                </div>
                <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-tight">
                  {req.type.name}
                </Badge>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="font-medium">{req.installation.name}</span>
                </div>
                <p className="text-sm line-clamp-2 text-slate-700 dark:text-slate-300 italic px-2 border-l-2 border-slate-200 dark:border-slate-800">&quot;{req.description}&quot;</p>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(req.createdAt, "dd MMM, HH:mm")}
                  </div>
                  {req.evidences.length > 0 && (
                    <div className="flex items-center gap-1 font-bold text-emerald-600">
                      <ImageIcon className="h-3 w-3" />
                      {req.evidences.length} fotos
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="p-2 bg-slate-50/30 dark:bg-slate-900/10 border-t flex flex-row gap-2">
                <Button variant="ghost" size="sm" className="flex-1 gap-1 text-xs rounded-xl h-10" asChild>
                  <Link href={`/mantencion/gestion/${req.id}`}>
                    <Eye className="h-3.5 w-3.5" />
                    Detalle
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 gap-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl h-10"
                  onClick={() => setRejectId(req.id)}
                >
                  <X className="h-3.5 w-3.5" />
                  Rechazar
                </Button>
                <Button variant="secondary" size="sm" className="flex-1 gap-1 text-xs bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl h-10" onClick={() => setApproveId(req.id)}>
                  <Check className="h-3.5 w-3.5" />
                  Aprobar
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center text-muted-foreground bg-slate-50/50 dark:bg-slate-900/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <ClipboardCheck className="h-12 w-12 mb-4 opacity-10" />
            <p className="font-semibold text-slate-900 dark:text-slate-100">Bandeja limpia</p>
            <p className="text-sm lg:max-w-xs">No tienes requerimientos pendientes que requieran tu validación en este momento.</p>
          </div>
        )}
      </div>

      {/* Modal Detalle Requerimiento Eliminado - Ahora es página individual */}

      {/* Modal Confirmar Aprobación */}
      <AlertDialog open={!!approveId} onOpenChange={() => setApproveId(null)}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <AlertDialogTitle className="text-xl">¿Confirmar Aprobación?</AlertDialogTitle>
            <AlertDialogDescription>
              Al aprobar esta solicitud, el requerimiento pasará al estado <span className="font-bold text-slate-900 dark:text-slate-100 italic">"APROBADO"</span> y el equipo técnico podrá iniciar la
              gestión de mantenimiento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl" disabled={isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleApprove();
              }}
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar Aprobación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Confirmar Rechazo */}
      <Dialog
        open={!!rejectId}
        onOpenChange={() => {
          setRejectId(null);
          setRejectReason("");
        }}
      >
        <DialogContent className="rounded-2xl border-none shadow-2xl">
          <DialogHeader>
            <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-4">
              <X className="h-6 w-6 text-rose-600" />
            </div>
            <DialogTitle className="text-xl text-rose-600 font-bold">Rechazar Requerimiento</DialogTitle>
            <DialogDescription>Por favor, indique el motivo por el cual está rechazando esta solicitud. Su comentario será visible para el solicitante.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Ej: El equipo no presenta fallas al momento de la inspección o duplicado con folio #102..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[120px] rounded-xl focus:ring-rose-500 border-slate-200 dark:border-slate-800"
              autoFocus
            />
            {rejectReason.trim().length > 0 && rejectReason.trim().length < 5 && (
              <p className="text-[10px] text-rose-500 font-bold mt-1 uppercase italic tracking-wider">Mínimo 5 caracteres requeridos</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => setRejectId(null)} disabled={isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" className="bg-rose-600 hover:bg-rose-700 rounded-xl gap-2" onClick={handleReject} disabled={isPending || rejectReason.trim().length < 5}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar Rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
