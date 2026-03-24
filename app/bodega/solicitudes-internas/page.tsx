"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";
import { useBodegaInternalRequests, type BodegaInternalRequestListItem, type BodegaInternalRequestFilters } from "@/lib/hooks/bodega/use-bodega-internal-requests";
import { getRequestColumns, type SortDirection } from "./columns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Plus, RefreshCw, Package, Zap, AlertCircle, Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BodegaBreadcrumb } from "@/components/bodega/BodegaBreadcrumb";
import { EstadisticasWidget } from "@/components/bodega/solicitudes-internas/EstadisticasWidget";
import { useBodegaAuth } from "@/lib/hooks/bodega/use-bodega-auth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AprobarSolicitudDialog } from "@/components/bodega/solicitudes-internas/AprobarSolicitudDialog";
import { toast } from "sonner";

const PRIORITY_STYLES: Record<string, { label: string; color: string }> = {
  BAJA: { label: "Baja", color: "text-slate-400 border-slate-200 bg-slate-50 dark:bg-slate-900/50 dark:border-slate-700" },
  NORMAL: { label: "Normal", color: "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800" },
  ALTA: { label: "Alta", color: "text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800" },
  URGENTE: { label: "Urgente", color: "text-red-600 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800" },
};

export default function BodegaSolicitudesInternasPage() {
  const router = useRouter();
  const [soloMias, setSoloMias] = useState(false);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [solicitudAEnviar, setSolicitudAEnviar] = useState<string | null>(null);
  const [solicitudAEliminar, setSolicitudAEliminar] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // ID de la solicitud a aprobar — controla el modal reutilizable
  const [approveRequestId, setApproveRequestId] = useState<string | null>(null);

  // Item seleccionado para iniciar la preparación desde la lista
  const [itemAPreparar, setItemAPreparar] = useState<BodegaInternalRequestListItem | null>(null);

  const { user, isBodegaAdmin, isStaff } = useBodegaAuth() || { user: null, isBodegaAdmin: true, isStaff: true };

  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: SortDirection }>({ key: null, direction: null });
  const [filters, setFilters] = useState<BodegaInternalRequestFilters>({
    page: 1,
    pageSize: 20,
    search: "",
    status: "",
    priority: undefined,
  });

  const { data, isLoading, isFetching, refetch } = useBodegaInternalRequests({
    ...filters,
    requestedBy: soloMias ? user?.id : undefined,
    startDate: fechaDesde || undefined,
    endDate: fechaHasta || undefined,
  });

  const totalPages = data?.meta.totalPages ?? 1;

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current.key === key) return { key, direction: current.direction === "asc" ? "desc" : current.direction === "desc" ? null : "asc" };
      return { key, direction: "asc" };
    });
  };

  const handleEdit = (id: string) => {
    router.push(`/bodega/solicitudes-internas/${id}/editar`);
  };

  const handleSend = (id: string) => {
    setSolicitudAEnviar(id);
  };

  const handleDelete = (id: string) => {
    setSolicitudAEliminar(id);
  };

  const confirmSend = async () => {
    if (!solicitudAEnviar) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/v1/bodega/solicitudes-internas/${solicitudAEnviar}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDIENTE", observations: "Enviado desde el listado general" }),
      });

      if (!res.ok) throw new Error("Error al enviar solicitud");

      toast.success("Solicitud enviada para aprobación");
      refetch();
    } catch (err) {
      toast.error("Error al enviar la solicitud");
    } finally {
      setIsProcessing(false);
      setSolicitudAEnviar(null);
    }
  };

  const confirmDelete = async () => {
    if (!solicitudAEliminar) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/v1/bodega/solicitudes-internas/${solicitudAEliminar}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Error al eliminar solicitud");

      toast.success("Solicitud eliminada correctamente");
      refetch();
    } catch (err) {
      toast.error("Error al eliminar la solicitud");
    } finally {
      setIsProcessing(false);
      setSolicitudAEliminar(null);
    }
  };

  const sortedData = useMemo(() => {
    const rows = data?.data ?? [];
    if (!sortConfig.key || !sortConfig.direction) return rows;

    return [...rows].sort((a: BodegaInternalRequestListItem, b: BodegaInternalRequestListItem) => {
      const { key, direction } = sortConfig;
      let valueA: any = a[key as keyof BodegaInternalRequestListItem] ?? "";
      let valueB: any = b[key as keyof BodegaInternalRequestListItem] ?? "";

      if (key === "warehouse") {
        valueA = a.warehouse.name;
        valueB = b.warehouse.name;
      } else if (key === "requester") {
        valueA = `${a.requester.firstName} ${a.requester.lastName}`;
        valueB = `${b.requester.firstName} ${b.requester.lastName}`;
      } else if (key === "createdAt" || key === "requiredDate") {
        valueA = new Date(valueA).getTime();
        valueB = new Date(valueB).getTime();
      }

      if (typeof valueA === "string") valueA = valueA.toLowerCase();
      if (typeof valueB === "string") valueB = valueB.toLowerCase();

      if (valueA < valueB) return direction === "asc" ? -1 : 1;
      if (valueA > valueB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [data?.data, sortConfig]);

  const executeQuickAction = async (id: string, action: string, params: object = {}) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/v1/bodega/solicitudes-internas/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al ejecutar la acción");
      }

      toast.success("Acción ejecutada correctamente");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Ocurrió un error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Delega al modal reutilizable AprobarSolicitudDialog
  const handleApprove = (id: string) => setApproveRequestId(id);
  const handleReject = (id: string) => executeQuickAction(id, "rechazar", { reason: "Rechazo rápido desde lista" });

  const handlePrepare = (id: string) => {
    const item = data?.data.find((x) => x.id === id);
    if (item) setItemAPreparar(item);
  };

  const handleDeliver = (id: string) => {
    // La entrega requiere confirmar cantidades, RUT y firma en base64 usando React Signature Canvas.
    // Por lo tanto, no se puede hacer como quick action aquí; redirigimos al detalle.
    router.push(`/bodega/solicitudes-internas/${id}`);
  };
  const columns = useMemo(
    () =>
      getRequestColumns({
        currentSort: sortConfig,
        onSort: handleSort,
        onEdit: handleEdit,
        onSend: handleSend,
        onDelete: handleDelete,
        onApprove: handleApprove,
        onReject: handleReject,
        onPrepare: handlePrepare,
        onDeliver: handleDeliver,
      }),
    // Dependencia data?.data es IMPORTANTE para que handlePrepare no capture una versión `undefined` de primera carga
    [sortConfig, data?.data],
  );

  const table = useReactTable({ data: sortedData, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="w-full space-y-4 pb-12 p-0">
      <BodegaBreadcrumb
        items={[
          { label: "Bodega", href: "/bodega" },
          { label: "Solicitudes Internas", href: "/bodega/solicitudes-internas" },
        ]}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">Solicitudes Internas</h1>
          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Gestión Centralizada de Requerimientos</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isLoading || isFetching} className="h-10 w-10 text-slate-400 hover:text-blue-600 transition-colors">
            <RefreshCw className={`h-5 w-5 ${isLoading || isFetching ? "animate-spin" : ""}`} />
          </Button>

          {isBodegaAdmin || isStaff ? (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => router.push("/bodega/ingreso-bodega")}
                className="h-10 px-6 rounded-md bg-[#283c7f] hover:bg-[#283c7f]/90 text-white font-black uppercase text-[11px] tracking-widest transition-all shadow-sm border-none italic"
              >
                <Package className="h-4 w-4 mr-2" />
                Registrar Ingreso
              </Button>
              <Button
                onClick={() => router.push("/bodega/retiro-bodega")}
                className="h-10 px-6 rounded-md bg-[#f97316] hover:bg-[#ea580c] text-white font-black uppercase text-[11px] tracking-widest transition-all shadow-sm border-none italic"
              >
                <Zap className="h-4 w-4 mr-2" />
                Retiro Artículos
              </Button>
            </div>
          ) : (
            <Button asChild className="h-10 px-6 rounded-md bg-[#283c7f] hover:bg-[#283c7f]/90 text-white font-black uppercase text-[11px] tracking-widest shadow-sm transition-all border-none italic">
              <Link href="/bodega/solicitudes-internas/nueva" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nueva Solicitud
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="relative">
        <EstadisticasWidget soloMias={soloMias} setSoloMias={setSoloMias} />
      </div>

      <div className="bg-[#f8fafc] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[#283c7f] dark:text-blue-400 mb-1.5 block italic">Estado</label>
            <Select value={filters.status || "TODOS"} onValueChange={(value) => setFilters((prev) => ({ ...prev, page: 1, status: value === "TODOS" ? "" : value }))}>
              <SelectTrigger className="w-full h-9 text-[11px] font-bold uppercase bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-md">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS" className="text-[11px] font-bold uppercase italic">
                  Todos
                </SelectItem>
                <SelectItem value="BORRADOR" className="text-[11px] font-bold uppercase italic">
                  Borrador
                </SelectItem>
                <SelectItem value="PENDIENTE" className="text-[11px] font-bold uppercase italic">
                  Pendiente
                </SelectItem>
                <SelectItem value="APROBADA" className="text-[11px] font-bold uppercase italic">
                  Aprobada
                </SelectItem>
                <SelectItem value="RECHAZADA" className="text-[11px] font-bold uppercase italic">
                  Rechazada
                </SelectItem>
                <SelectItem value="EN_PREPARACION" className="text-[11px] font-bold uppercase italic">
                  En Preparación
                </SelectItem>
                <SelectItem value="LISTA_PARA_ENTREGA" className="text-[11px] font-bold uppercase italic">
                  Lista para Entrega
                </SelectItem>
                <SelectItem value="ENTREGADA" className="text-[11px] font-bold uppercase italic">
                  Entregada
                </SelectItem>
                <SelectItem value="ANULADA" className="text-[11px] font-bold uppercase italic">
                  Anulada
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[#283c7f] dark:text-blue-400 mb-1.5 block italic">Prioridad</label>
            <Select
              value={filters.priority || "TODAS"}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  page: 1,
                  priority: value === "TODAS" ? undefined : (value as "BAJA" | "NORMAL" | "ALTA" | "URGENTE"),
                }))
              }
            >
              <SelectTrigger className="w-full h-9 text-[11px] font-bold uppercase bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-md">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS" className="text-[11px] font-bold uppercase italic">
                  Todas
                </SelectItem>
                <SelectItem value="BAJA" className="text-[11px] font-bold uppercase italic">
                  Baja
                </SelectItem>
                <SelectItem value="NORMAL" className="text-[11px] font-bold uppercase italic">
                  Normal
                </SelectItem>
                <SelectItem value="ALTA" className="text-[11px] font-bold uppercase italic">
                  Alta
                </SelectItem>
                <SelectItem value="URGENTE" className="text-[11px] font-bold uppercase italic">
                  Urgente
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[#283c7f] dark:text-blue-400 mb-1.5 block italic">Desde</label>
            <Input
              type="date"
              className="w-full h-9 text-[11px] font-bold uppercase bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-md"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[#283c7f] dark:text-blue-400 mb-1.5 block italic">Hasta</label>
            <Input
              type="date"
              className="w-full h-9 text-[11px] font-bold uppercase bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-md"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-200 dark:border-slate-800 shadow-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="h-10 hover:bg-transparent border-none">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="px-4 py-0 h-10 align-middle">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <RefreshCw className="h-6 w-6 animate-spin opacity-20" />
                      <span className="text-[10px] font-black uppercase tracking-widest italic">Sincronizando solicitudes...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-colors border-b last:border-0 h-14">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-300">
                      <Package className="h-8 w-8 opacity-20" />
                      <span className="text-[10px] font-black uppercase tracking-widest italic">No se encontraron registros</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">
            Mostrando <span className="text-slate-900 dark:text-white">{((filters.page ?? 1) - 1) * (filters.pageSize ?? 20) + 1}</span> a{" "}
            <span className="text-slate-900 dark:text-white">{Math.min((filters.page ?? 1) * (filters.pageSize ?? 20), data?.meta.total ?? 0)}</span> de{" "}
            <span className="text-slate-900 dark:text-white">{data?.meta.total ?? 0}</span> registros
          </p>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Select
                value={String(filters.pageSize ?? 20)}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    page: 1,
                    pageSize: Number(value),
                  }))
                }
              >
                <SelectTrigger className="w-16 h-8 text-[10px] font-black bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((size) => (
                    <SelectItem key={size} value={String(size)} className="text-[10px] font-bold">
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex border rounded overflow-hidden ml-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-none border-r border-slate-100 dark:border-slate-800 text-slate-400 disabled:opacity-30"
                  onClick={() => setFilters((prev) => ({ ...prev, page: 1 }))}
                  disabled={(filters.page ?? 1) <= 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-none border-r border-slate-100 dark:border-slate-800 text-slate-400 disabled:opacity-30"
                  onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, (prev.page ?? 1) - 1) }))}
                  disabled={(filters.page ?? 1) <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-none border-r border-slate-100 dark:border-slate-800 text-slate-400 disabled:opacity-30"
                  onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(totalPages, (prev.page ?? 1) + 1) }))}
                  disabled={(filters.page ?? 1) >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-none text-slate-400 disabled:opacity-30"
                  onClick={() => setFilters((prev) => ({ ...prev, page: totalPages }))}
                  disabled={(filters.page ?? 1) >= totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={!!solicitudAEnviar} onOpenChange={() => setSolicitudAEnviar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="uppercase italic font-black text-[#283c7f]">¿Confirmar Envío?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-medium text-slate-500">
              La solicitud será enviada al supervisor para su aprobación. No podrá realizar cambios hasta que sea procesada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing} className="text-[10px] font-black uppercase tracking-widest italic">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmSend();
              }}
              disabled={isProcessing}
              className="bg-[#283c7f] text-white text-[10px] font-black uppercase tracking-widest italic h-9 px-6"
            >
              Confirmar y Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!solicitudAEliminar} onOpenChange={() => setSolicitudAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="uppercase italic font-black text-red-600">¿Eliminar Solicitud?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-medium text-slate-500">Esta acción eliminará la solicitud permanentemente. Esta operación no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing} className="text-[10px] font-black uppercase tracking-widest italic">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest italic h-9 px-6"
            >
              Eliminar Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de confirmación para PREPARAR, replicando el diseño del detalle */}
      <AlertDialog open={!!itemAPreparar} onOpenChange={(o) => (!o ? setItemAPreparar(null) : null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-md bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <AlertDialogTitle className="text-base font-black">Iniciar Preparación</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-[13px] text-slate-600 dark:text-slate-400">¿Estás seguro de iniciar la preparación de esta solicitud?</p>
                {itemAPreparar && (
                  <div className="rounded-md border border-border bg-slate-50 dark:bg-slate-900 divide-y divide-border/60 text-[12px]">
                    <div className="flex justify-between px-4 py-2">
                      <span className="text-slate-500 font-medium">Solicitud:</span>
                      <span className="font-black">{itemAPreparar.folio}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2">
                      <span className="text-slate-500 font-medium">Líneas de pedido:</span>
                      <span className="font-black">{itemAPreparar._count.items}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2 items-center">
                      <span className="text-slate-500 font-medium">Prioridad:</span>
                      <span
                        className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border", (PRIORITY_STYLES[itemAPreparar.priority] || PRIORITY_STYLES["NORMAL"]).color)}
                      >
                        {(PRIORITY_STYLES[itemAPreparar.priority] || PRIORITY_STYLES["NORMAL"]).label}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Una vez iniciada, deberás retirar todos los ítems de bodega para completar la solicitud.</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing} className="gap-1.5">
              <X className="w-3.5 h-3.5" /> Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (itemAPreparar) {
                  executeQuickAction(itemAPreparar.id, "preparar", { observations: "Preparación iniciada desde lista general" });
                  setItemAPreparar(null);
                }
              }}
              disabled={isProcessing}
              className="bg-[#283c7f] hover:bg-[#1e2e6b] text-white gap-1.5"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-white" />}
              Iniciar Preparación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de aprobación reutilizable */}
      <AprobarSolicitudDialog
        requestId={approveRequestId}
        open={!!approveRequestId}
        onOpenChange={(v) => {
          if (!v) setApproveRequestId(null);
        }}
        onSuccess={() => {
          setApproveRequestId(null);
          refetch();
        }}
      />
    </div>
  );
}
