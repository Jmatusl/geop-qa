"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, Package, RefreshCw, Search, Zap, Filter, Eye, CheckCircle2, XCircle, Play } from "lucide-react";
import { BodegaBreadcrumb } from "@/components/bodega/BodegaBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBodegaMovements, useApproveBodegaMovement, useRejectBodegaMovement, useApplyBodegaMovement } from "@/lib/hooks/bodega/use-bodega-movements";
import { useBodegaWarehouses } from "@/lib/hooks/bodega/use-bodega-warehouses";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const MOVEMENT_TYPES = ["INGRESO", "SALIDA", "AJUSTE", "RESERVA", "LIBERACION"];
const MOVEMENT_STATUSES = ["PENDIENTE", "APROBADA", "RECHAZADA", "APLICADA", "COMPLETADA", "CANCELADA", "BORRADOR"];

function getStatusVariant(status: string) {
  if (status === "APLICADA") return "default" as const;
  if (status === "COMPLETADA") return "secondary" as const;
  if (status === "APROBADA") return "default" as const;
  return "outline" as const;
}

export default function DesktopView() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  // Estados para diálogos
  const [approvingId, setApprovingId] = useState<any>(null);
  const [rejectingId, setRejectingId] = useState<any>(null);
  const [applyingId, setApplyingId] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [applyObs, setApplyObs] = useState("");

  const approveMutation = useApproveBodegaMovement();
  const rejectMutation = useRejectBodegaMovement();
  const applyMutation = useApplyBodegaMovement();

  const { data, isLoading, isFetching, refetch } = useBodegaMovements({
    page,
    pageSize: 20,
    search,
    type,
    status,
    warehouseId,
  });

  const { data: warehousesData } = useBodegaWarehouses(1, 100, "");
  const warehouses = warehousesData?.data ?? [];

  const movements = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const hasFilters = useMemo(() => Boolean(search || type || status || warehouseId), [search, type, status, warehouseId]);

  const clearFilters = () => {
    setSearch("");
    setType("");
    setStatus("");
    setWarehouseId("");
    setPage(1);
  };

  return (
    <div className="w-full space-y-4 p-0">
      <BodegaBreadcrumb items={[{ label: "Bodega", href: "/bodega" }, { label: "Movimientos" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold text-[#283c7f] dark:text-blue-400 tracking-tight">Movimientos de Inventario</h1>
          <p className="text-[15px] text-slate-500 dark:text-slate-400 mt-1">Gestiona los movimientos de entrada y salida de artículos en bodega</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white uppercase font-bold tracking-wide">
          <Link href="/bodega/ingreso-bodega">
            <Package className="mr-2 h-4 w-4 text-white" />
            Registrar Ingreso
          </Link>
        </Button>
        <Button asChild className="bg-[#f07b32] hover:bg-[#e06b22] text-white uppercase font-bold tracking-wide">
          <Link href="/bodega/retiro-bodega">
            <Zap className="mr-2 h-4 w-4 text-white" />
            Retiro Artículos
          </Link>
        </Button>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white uppercase font-bold tracking-wide">
          <Link href="/bodega/movimiento-articulo">
            <ArrowRightLeft className="mr-2 h-4 w-4 text-white" />
            Movimiento
          </Link>
        </Button>
      </div>

      <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
        <CardHeader className="pb-3 border-b dark:border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-6 w-6 text-slate-700 dark:text-slate-300" strokeWidth={2.5} />
              <div>
                <CardTitle className="text-xl font-bold dark:text-white">Filtros</CardTitle>
                <CardDescription className="dark:text-slate-400">Busca y filtra los movimientos de inventario</CardDescription>
              </div>
            </div>
            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters} className="dark:text-slate-400 dark:hover:text-white">
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por número o descripción..."
              className="pl-9 bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-white"
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-1.5 flex flex-col">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tipo</label>
              <Select
                value={type || "ALL"}
                onValueChange={(value) => {
                  setType(value === "ALL" ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-white">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los tipos</SelectItem>
                  {MOVEMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 flex flex-col">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Estado</label>
              <Select
                value={status || "ALL"}
                onValueChange={(value) => {
                  setStatus(value === "ALL" ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-white">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los estados</SelectItem>
                  {MOVEMENT_STATUSES.map((movementStatus) => (
                    <SelectItem key={movementStatus} value={movementStatus}>
                      {movementStatus}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 flex flex-col">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Bodega Origen</label>
              <Select
                value={warehouseId || "ALL"}
                onValueChange={(value) => {
                  setWarehouseId(value === "ALL" ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-white">
                  <SelectValue placeholder="Todas las bodegas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas las bodegas</SelectItem>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 flex flex-col">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Bodega Destino</label>
              <Select disabled value="ALL">
                <SelectTrigger className="w-full bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-500">
                  <SelectValue placeholder="Todas las bodegas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas las bodegas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col bg-white dark:bg-slate-950">
        <CardHeader className="flex flex-row items-center justify-between py-5 border-b dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-white">Movimientos</h2>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">({meta?.total || 0} registros)</span>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading || isFetching} className="dark:border-slate-800 dark:hover:bg-slate-900 dark:text-slate-400">
            <RefreshCw className={cn("h-4 w-4", (isLoading || isFetching) && "animate-spin")} />
          </Button>
        </CardHeader>
        <div className="border-t dark:border-slate-800">
          <Table>
            <TableHeader className="bg-[#f8fafc] dark:bg-slate-900">
              <TableRow className="border-b shadow-sm dark:border-slate-800">
                <TableHead className="font-extrabold text-slate-900 dark:text-blue-500 text-xs uppercase tracking-wider h-12">Número</TableHead>
                <TableHead className="font-extrabold text-slate-900 dark:text-blue-500 text-xs uppercase tracking-wider">Tipo</TableHead>
                <TableHead className="font-extrabold text-slate-900 dark:text-blue-500 text-xs uppercase tracking-wider">Bodega Origen</TableHead>
                <TableHead className="font-extrabold text-slate-900 dark:text-blue-500 text-xs uppercase tracking-wider">Bodega Destino</TableHead>
                <TableHead className="font-extrabold text-slate-900 dark:text-blue-500 text-xs uppercase tracking-wider">Fecha</TableHead>
                <TableHead className="font-extrabold text-slate-900 dark:text-blue-500 text-xs uppercase tracking-wider">Estado</TableHead>
                <TableHead className="font-extrabold text-slate-900 dark:text-blue-500 text-xs uppercase tracking-wider">Creado</TableHead>
                <TableHead className="w-35"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center dark:text-slate-400">
                    Cargando movimientos...
                  </TableCell>
                </TableRow>
              ) : movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-slate-500 dark:text-slate-400">
                    No hay movimientos para los filtros seleccionados.
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((movement) => (
                  <TableRow key={movement.id} className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/40 border-b dark:border-slate-800 text-[13px]">
                    <TableCell>
                      <div className="font-bold text-slate-900 dark:text-white">{movement.folio}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-37.5">
                        Doc ref: {movement.request?.folio || movement.reason || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300 font-medium">
                      {movement.type === "INGRESO" && movement.request?.folio
                        ? "Ingreso Solicitud"
                        : movement.type === "SALIDA" && movement.request?.folio
                          ? "Egreso Solicitud"
                          : movement.type === "INGRESO"
                            ? "Ingreso OC"
                            : movement.type}
                    </TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300">{movement.warehouse.name}</TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300 italic">No asignado</TableCell>
                    <TableCell>
                      <div className="text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">{new Date(movement.createdAt).toLocaleDateString("es-CL")}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-500 whitespace-nowrap">
                        {new Date(movement.createdAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "px-2.5 py-0.5 whitespace-nowrap uppercase tracking-wider text-[10px] font-bold border-0 text-white shadow-sm",
                          movement.status === "APROBADA" && "bg-blue-500",
                          (movement.status === "APLICADA") && "bg-emerald-500",
                          movement.status === "COMPLETADA" && "bg-purple-600",
                          movement.status === "PENDIENTE" && "bg-amber-500",
                          (movement.status === "RECHAZADA" || movement.status === "CANCELADA") && "bg-red-500",
                          movement.status === "BORRADOR" && "bg-slate-400",
                        )}
                      >
                        {movement.status === "APLICADA" ? "EJECUTADO" : movement.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">{movement.creator.firstName}</div>
                      <div className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">{movement.creator.lastName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5 text-slate-400">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:text-slate-700 dark:hover:text-blue-400 dark:hover:bg-slate-900" asChild>
                          <Link href={`/bodega/movimientos/${movement.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>

                        {/* Aprobar */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setApprovingId(movement)}
                          disabled={movement.status !== "PENDIENTE" || approveMutation.isPending}
                          className={cn(
                            "h-8 w-8 rounded-full transition-all",
                            movement.status === "PENDIENTE"
                              ? "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                              : "text-slate-300 dark:text-slate-800 opacity-40 cursor-not-allowed",
                          )}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>

                        {/* Rechazar */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setRejectingId(movement);
                            setRejectReason("");
                          }}
                          disabled={movement.status !== "PENDIENTE" || rejectMutation.isPending}
                          className={cn(
                            "h-8 w-8 rounded-full transition-all",
                            movement.status === "PENDIENTE"
                              ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                              : "text-slate-300 dark:text-slate-800 opacity-40 cursor-not-allowed",
                          )}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>

                        {/* Aplicar (Play) */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setApplyingId(movement)}
                          disabled={movement.status !== "APROBADA" || applyMutation.isPending}
                          className={cn(
                            "h-8 w-8 rounded-full transition-all",
                            movement.status === "APROBADA"
                              ? "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                              : "text-slate-300 dark:text-slate-800 opacity-40 cursor-not-allowed",
                          )}
                        >
                          {applyMutation.isPending && applyingId?.id === movement.id ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> : <Play className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="p-4 flex items-center justify-between text-sm border-t dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10">
            <span className="text-slate-500 dark:text-slate-400">
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1 || isLoading || isFetching}
                className="dark:border-slate-800 dark:hover:bg-slate-900 dark:text-slate-400"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages || isLoading || isFetching}
                className="dark:border-slate-800 dark:hover:bg-slate-900 dark:text-slate-400"
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Diálogo Aprobar */}
      <AlertDialog open={!!approvingId} onOpenChange={(open) => !open && setApprovingId(null)}>
        <AlertDialogContent className="max-w-md rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">Aprobar Movimiento</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400 pt-2 space-y-4" asChild>
              <div>
                <p>
                  ¿Está seguro que desea aprobar el movimiento <span className="font-bold text-slate-900 dark:text-white">{approvingId?.folio}</span>?
                </p>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="text-sm">
                    <span className="font-bold uppercase text-[11px] text-slate-400 block tracking-widest">Tipo</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{approvingId?.type}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-bold uppercase text-[11px] text-slate-400 block tracking-widest">Descripción / Referencia</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{approvingId?.reason || "Sin descripción"}</span>
                  </div>
                </div>
                <p className="text-sm border-l-4 border-blue-500 pl-3 italic">Esta acción permitirá que el movimiento pueda ser ejecutado para actualizar el stock.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="rounded-lg h-11 px-6 border-slate-200 font-bold uppercase tracking-wide">
              <XCircle className="mr-2 h-4 w-4" /> Cancelar
            </AlertDialogCancel>
            <Button
              disabled={approveMutation.isPending}
              onClick={() => {
                approveMutation.mutate(approvingId.id, {
                  onSuccess: () => setApprovingId(null),
                });
              }}
              className="bg-[#283c7f] hover:bg-[#1e2d60] text-white rounded-lg h-11 px-6 font-bold uppercase tracking-wide shadow-lg shadow-blue-900/10"
            >
              {approveMutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Aprobar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo Rechazar */}
      <AlertDialog open={!!rejectingId} onOpenChange={(open) => !open && setRejectingId(null)}>
        <AlertDialogContent className="max-w-md rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-extrabold text-[#f07b32] dark:text-orange-400 uppercase tracking-tight flex items-center gap-2">
              <XCircle className="h-6 w-6" />
              Rechazar Movimiento
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400 pt-2 space-y-4" asChild>
              <div>
                <p>
                  Está a punto de rechazar el movimiento <span className="font-bold text-slate-900 dark:text-white">{rejectingId?.folio}</span>. Debe proporcionar un motivo de rechazo.
                </p>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="text-sm">
                    <span className="font-bold uppercase text-[11px] text-slate-400 block tracking-widest">Tipo</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{rejectingId?.type}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-bold uppercase text-[11px] text-slate-400 block tracking-widest">Descripción / Referencia</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{rejectingId?.reason || "Sin descripción"}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Motivo de Rechazo *</label>
                  <Textarea
                    placeholder="Ingrese el motivo por el cual rechaza este movimiento..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="min-h-25 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="rounded-lg h-11 px-6 border-slate-200 font-bold uppercase tracking-wide">Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              onClick={() => {
                rejectMutation.mutate(
                  { id: rejectingId.id, reason: rejectReason },
                  {
                    onSuccess: () => {
                      setRejectingId(null);
                      setRejectReason("");
                    },
                  },
                );
              }}
              className="bg-[#f28e8e] hover:bg-red-500 text-white rounded-lg h-11 px-6 font-bold uppercase tracking-wide shadow-lg shadow-red-900/10"
            >
              {rejectMutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4" />}
              Rechazar Movimiento
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo Aplicar (Ejecutar) */}
      <AlertDialog open={!!applyingId} onOpenChange={(open) => !open && setApplyingId(null)}>
        <AlertDialogContent className="max-w-md rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-tight flex items-center gap-2">
              <Play className="h-6 w-6" />
              Ejecutar Movimiento
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400 pt-2 space-y-4" asChild>
              <div>
                <p>
                  Se procederá a ejecutar el movimiento <span className="font-bold text-slate-900 dark:text-white">{applyingId?.folio}</span>.
                </p>
                <p className="font-bold text-blue-700 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 text-xs">
                  Esta acción es irreversible y actualizará físicamente los niveles de stock en la bodega de destino.
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Observaciones de Ejecución (Opcional)</label>
                  <Textarea
                    placeholder="Añada cualquier observación relevante sobre la ejecución física..."
                    value={applyObs}
                    onChange={(e) => setApplyObs(e.target.value)}
                    className="min-h-20 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="rounded-lg h-11 px-6 border-slate-200 font-bold uppercase tracking-wide">Cancelar</AlertDialogCancel>
            <Button
              disabled={applyMutation.isPending}
              onClick={() => {
                applyMutation.mutate(
                  { id: applyingId.id, observations: applyObs },
                  {
                    onSuccess: () => {
                      setApplyingId(null);
                      setApplyObs("");
                    },
                  },
                );
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-11 px-6 font-bold uppercase tracking-wide shadow-lg"
            >
              {applyMutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              Ejecutar Movimiento
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
