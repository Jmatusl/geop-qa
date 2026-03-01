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
import { useBodegaMovements } from "@/lib/hooks/bodega/use-bodega-movements";
import { useBodegaWarehouses } from "@/lib/hooks/bodega/use-bodega-warehouses";
import { cn } from "@/lib/utils";

const MOVEMENT_TYPES = ["INGRESO", "SALIDA", "AJUSTE", "RESERVA", "LIBERACION"];
const MOVEMENT_STATUSES = ["PENDIENTE", "APROBADO", "RECHAZADO", "APLICADO"];

function getStatusVariant(status: string) {
  if (status === "APLICADO") return "secondary" as const;
  if (status === "APROBADO") return "default" as const;
  return "outline" as const;
}

export default function DesktopView() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [movementType, setMovementType] = useState("");
  const [status, setStatus] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  const { data, isLoading, isFetching, refetch } = useBodegaMovements({
    page,
    pageSize: 20,
    search,
    movementType,
    status,
    warehouseId,
  });

  const { data: warehousesData } = useBodegaWarehouses(1, 100, "");
  const warehouses = warehousesData?.data ?? [];

  const movements = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const hasFilters = useMemo(() => Boolean(search || movementType || status || warehouseId), [search, movementType, status, warehouseId]);

  const clearFilters = () => {
    setSearch("");
    setMovementType("");
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
                value={movementType || "ALL"}
                onValueChange={(value) => {
                  setMovementType(value === "ALL" ? "" : value);
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
                <TableHead className="w-[140px]"></TableHead>
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
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                        Doc ref: {movement.request?.folio || movement.reason || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300 font-medium">
                      {movement.movementType === "INGRESO" && movement.request?.folio
                        ? "Ingreso Solicitud"
                        : movement.movementType === "SALIDA" && movement.request?.folio
                          ? "Egreso Solicitud"
                          : movement.movementType === "INGRESO"
                            ? "Ingreso OC"
                            : movement.movementType}
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
                          movement.status === "APLICADO" ? "bg-emerald-500" : movement.status === "APROBADO" ? "bg-indigo-500" : movement.status === "RECHAZADO" ? "bg-red-500" : "bg-amber-500",
                        )}
                      >
                        {movement.status === "APLICADO" ? "COMPLETADO" : movement.status}
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-40 cursor-not-allowed">
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-40 cursor-not-allowed">
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-40 cursor-not-allowed">
                          <Play className="h-4 w-4" />
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
    </div>
  );
}
