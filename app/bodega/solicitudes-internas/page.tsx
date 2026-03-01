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
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Plus, RefreshCw, Search, Package, Zap } from "lucide-react";
import { BodegaBreadcrumb } from "@/components/bodega/BodegaBreadcrumb";
import { EstadisticasWidget } from "@/components/bodega/solicitudes-internas/EstadisticasWidget";
import { useBodegaAuth } from "@/lib/hooks/bodega/use-bodega-auth";

export default function BodegaSolicitudesInternasPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [soloMias, setSoloMias] = useState(false);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const { user, isBodegaAdmin, isStaff } = useBodegaAuth() || { user: null, isBodegaAdmin: true, isStaff: true }; // Fallback para dev

  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: SortDirection }>({ key: null, direction: null });
  const [filters, setFilters] = useState<BodegaInternalRequestFilters>({
    page: 1,
    pageSize: 20,
    search: "",
    statusCode: "",
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

  const columns = useMemo(() => getRequestColumns({ currentSort: sortConfig, onSort: handleSort }), [sortConfig]);
  const table = useReactTable({ data: sortedData, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="w-full space-y-6 pb-12 p-0">
      {/* BREADCRUMBS */}
      <BodegaBreadcrumb
        items={[
          { label: "Bodega", href: "/bodega" },
          { label: "Solicitudes Internas", href: "/bodega/solicitudes-internas" },
        ]}
      />

      {/* HEADER PRINCIPAL - Estilo AIRE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Solicitudes Internas</h1>
          <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-wide">Gestiona solicitudes de artículos entre áreas</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isLoading || isFetching} className="h-10 w-10 text-slate-400 hover:text-blue-600 transition-colors">
            <RefreshCw className={`h-5 w-5 ${isLoading || isFetching ? "animate-spin" : ""}`} />
          </Button>

          {isBodegaAdmin || isStaff ? (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => router.push("/bodega/ingreso-bodega")}
                className="h-10 px-6 rounded-md bg-[#283c7f] hover:bg-[#283c7f]/90 text-white font-black uppercase text-[11px] tracking-widest transition-all shadow-sm border-none"
              >
                <Package className="h-4 w-4 mr-2" />
                Registrar Ingreso
              </Button>
              <Button
                onClick={() => router.push("/bodega/retiro-bodega")}
                className="h-10 px-6 rounded-md bg-[#f97316] hover:bg-[#ea580c] text-white font-black uppercase text-[11px] tracking-widest transition-all shadow-sm border-none"
              >
                <Zap className="h-4 w-4 mr-2" />
                Retiro Artículos
              </Button>
            </div>
          ) : (
            <Button asChild className="h-10 px-6 rounded-md bg-[#283c7f] hover:bg-[#283c7f]/90 text-white font-black uppercase text-[11px] tracking-widest shadow-sm transition-all border-none">
              <Link href="/bodega/solicitudes-internas/nueva" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nueva Solicitud
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* DASHBOARD DE ESTADÍSTICAS */}
      <div className="relative">
        <EstadisticasWidget soloMias={soloMias} setSoloMias={setSoloMias} />
      </div>
      {/* FILTROS TIPO LEGACY */}
      <div className="bg-[#f8fafc] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 mb-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-[#283c7f] dark:text-blue-400 mb-2 block">Estado</label>
            <Select value={filters.statusCode || "TODOS"} onValueChange={(value) => setFilters((prev) => ({ ...prev, page: 1, statusCode: value === "TODOS" ? "" : value }))}>
              <SelectTrigger className="w-full h-10 text-[11px] font-bold uppercase bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-md">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS" className="text-[11px] font-bold uppercase">
                  Todos
                </SelectItem>
                <SelectItem value="PENDIENTE" className="text-[11px] font-bold uppercase">
                  Pendiente
                </SelectItem>
                <SelectItem value="APROBADA" className="text-[11px] font-bold uppercase">
                  Aprobada
                </SelectItem>
                <SelectItem value="RECHAZADA" className="text-[11px] font-bold uppercase">
                  Rechazada
                </SelectItem>
                <SelectItem value="EN_PREPARACION" className="text-[11px] font-bold uppercase">
                  En Preparación
                </SelectItem>
                <SelectItem value="LISTA_PARA_ENTREGA" className="text-[11px] font-bold uppercase">
                  Lista para Entrega
                </SelectItem>
                <SelectItem value="ENTREGADA" className="text-[11px] font-bold uppercase">
                  Entregada
                </SelectItem>
                <SelectItem value="ANULADA" className="text-[11px] font-bold uppercase">
                  Anulada
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-[#283c7f] dark:text-blue-400 mb-2 block">Prioridad</label>
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
              <SelectTrigger className="w-full h-10 text-[11px] font-bold uppercase bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-md">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS" className="text-[11px] font-bold uppercase">
                  Todas
                </SelectItem>
                <SelectItem value="BAJA" className="text-[11px] font-bold uppercase">
                  Baja
                </SelectItem>
                <SelectItem value="NORMAL" className="text-[11px] font-bold uppercase">
                  Normal
                </SelectItem>
                <SelectItem value="ALTA" className="text-[11px] font-bold uppercase">
                  Alta
                </SelectItem>
                <SelectItem value="URGENTE" className="text-[11px] font-bold uppercase">
                  Urgente
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-[#283c7f] dark:text-blue-400 mb-2 block">Desde</label>
            <Input
              type="date"
              className="w-full h-10 text-[11px] font-bold uppercase bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-md"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-[#283c7f] dark:text-blue-400 mb-2 block">Hasta</label>
            <Input
              type="date"
              className="w-full h-10 text-[11px] font-bold uppercase bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-md"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* TABLA BASE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/20">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="h-12 border-b">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-[10px] font-black uppercase text-[#283c7f] dark:text-blue-400 tracking-widest px-4">
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
                      <span className="text-[10px] font-black uppercase tracking-widest">Cargando solicitudes...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors border-b last:border-0 h-16">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 text-[11px] font-medium text-slate-600 dark:text-slate-300">
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
                      <span className="text-[10px] font-black uppercase tracking-widest">No hay solicitudes internas para mostrar</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* FOOTER PAGINACIÓN - TIPO AIRY */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
            Total: <span className="text-slate-900 dark:text-white">{data?.meta.total ?? 0}</span> registros
          </p>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mr-2">
              Página <span className="text-slate-900 dark:text-white">{filters.page}</span>
            </span>

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
                <SelectTrigger className="w-20 h-8 text-[10px] font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 30, 40, 50, 100].map((size) => (
                    <SelectItem key={size} value={String(size)} className="text-[10px] font-bold">
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex border rounded overflow-hidden">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-none border-r border-slate-100 dark:border-slate-800 text-slate-400 hover:text-blue-600"
                  onClick={() => setFilters((prev) => ({ ...prev, page: 1 }))}
                  disabled={(filters.page ?? 1) <= 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-none border-r border-slate-100 dark:border-slate-800 text-slate-400 hover:text-blue-600"
                  onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, (prev.page ?? 1) - 1) }))}
                  disabled={(filters.page ?? 1) <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-none border-r border-slate-100 dark:border-slate-800 text-slate-400 hover:text-blue-600"
                  onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(totalPages, (prev.page ?? 1) + 1) }))}
                  disabled={(filters.page ?? 1) >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-none text-slate-400 hover:text-blue-600"
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
    </div>
  );
}
