"use client";

import React, { useMemo, useState } from "react";
import { ColumnDef, flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel, useReactTable, SortingState } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, ArrowUpDown, Search, Package, History, Tag, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface GlobalInventarioItem {
  id: string;
  folio: string;
  fecha: string;
  totalItems: number;
  totalPrice: number;
  warehouseName: string;
  movementType: string;
  reason: string | null;
  observations: string | null;
  countArticulos: number;
}

export function GlobalInventarioV2Table() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [bodegaFilter, setBodegaFilter] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "fecha", desc: true }]);

  const { data, isLoading } = useQuery({
    queryKey: ["global-inventario-movimientos", bodegaFilter, globalFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "1000",
        search: globalFilter,
      });
      if (bodegaFilter !== "all") params.append("warehouseId", bodegaFilter);

      const res = await fetch(`/api/v1/bodega/movimientos?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar movimientos");
      const json = await res.json();

      return json.data.map((item: any) => ({
        id: item.id,
        folio: item.folio,
        fecha: item.createdAt,
        totalItems: item.totalItems,
        totalPrice: item.totalPrice,
        warehouseName: item.warehouse?.name || "Sin Bodega",
        movementType: item.movementType,
        reason: item.reason,
        observations: item.observations,
        countArticulos: item._count?.items || 0,
      })) as GlobalInventarioItem[];
    },
  });

  const allItems: GlobalInventarioItem[] = data || [];

  // Obtener bodegas para el filtro (podríamos usar el hook useBodegaWarehouses idealmente)
  const { data: bodegasData } = useQuery({
    queryKey: ["bodega-warehouses-simple"],
    queryFn: async () => {
      const res = await fetch("/api/v1/bodega/bodegas?limit=100");
      return res.json();
    },
  });
  const warehouses = bodegasData?.data || [];

  const columns = useMemo<ColumnDef<GlobalInventarioItem>[]>(
    () => [
      {
        id: "movimiento",
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              onClick={() => {
                if (isSorted === "asc") column.toggleSorting(true);
                else if (isSorted === "desc") column.clearSorting();
                else column.toggleSorting(false);
              }}
              className="-ml-4 hover:bg-transparent"
            >
              Movimiento
              {isSorted === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4 text-blue-500" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4 text-blue-500" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <Link href={`/bodega/movimientos/${row.original.id}`} className="font-black text-[#283c7f] dark:text-blue-400 uppercase tracking-tighter text-sm hover:underline flex items-center gap-1.5">
              {row.original.folio}
              <ExternalLink className="w-3.5 h-3.5 opacity-50" />
            </Link>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="h-4 px-1 text-[11px] font-black uppercase bg-slate-50 text-slate-500 border-slate-200">
                {row.original.countArticulos} ARTÍCULOS
              </Badge>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "warehouseName",
        header: "Bodega",
        cell: ({ row }) => (
          <Badge variant="outline" className="bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 text-[10px] font-black uppercase border-sky-200 dark:border-sky-800">
            {row.original.warehouseName}
          </Badge>
        ),
      },
      {
        id: "fecha",
        accessorKey: "fecha",
        header: "Fecha / Tipo",
        cell: ({ row }) => {
          const date = new Date(row.original.fecha);
          const type = row.original.movementType;

          const getBadgeStyle = (folio: string, type: string) => {
            if (folio.includes("TRANSFERENCIA") || type.includes("TRANSFERENCIA")) return { label: "TRANSFERENCIA", className: "bg-blue-50 text-blue-600 border-blue-200" };
            if (folio.includes("_OC") || type === "INGRESO") return { label: "INGRESO OC", className: "bg-emerald-50 text-emerald-600 border-emerald-200" };
            if (folio.includes("EGRESO") || type.includes("SALIDA")) return { label: "EGRESO", className: "bg-red-50 text-red-600 border-red-200" };
            return { label: type, className: "bg-slate-50 text-slate-600 border-slate-200" };
          };

          const style = getBadgeStyle(row.original.folio, type);

          return (
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                {date.toLocaleDateString("es-CL")} {date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <Badge variant="outline" className={`h-4 px-1.5 text-[8px] font-black uppercase ${style.className}`}>
                {style.label}
              </Badge>
            </div>
          );
        },
      },
      {
        id: "referencia",
        header: "Nota / Referencia",
        cell: ({ row }) => {
          const label = row.original.reason || row.original.observations || "—";
          return <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight max-w-[250px] line-clamp-2 leading-tight">{label}</div>;
        },
      },
      {
        id: "cantidad_valor",
        header: () => <div className="text-right">Cantidad / Valor Total</div>,
        cell: ({ row }) => {
          const isEgress = row.original.movementType?.includes("SALIDA") || row.original.folio?.includes("EGRESO");

          return (
            <div className="text-right space-y-1 min-w-[120px]">
              <div className="flex items-baseline justify-end gap-1">
                <span className={`text-sm font-black ${isEgress ? "text-red-600" : "text-emerald-700 dark:text-emerald-400"}`}>
                  {isEgress ? "-" : "+"}
                  {(row.original.totalItems ?? 0).toLocaleString("es-CL")}
                </span>
                <span className="text-[9px] text-gray-400 font-bold uppercase ml-0.5">UDS TOTALES</span>
              </div>

              <div className="flex flex-col items-end leading-none">
                <div className="text-[11px] font-black text-blue-700 dark:text-blue-400 tracking-tight">${(row.original.totalPrice ?? 0).toLocaleString("es-CL")}</div>
                <div className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">VALORIZACIÓN TOTAL</div>
              </div>
            </div>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: allItems,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableSortingRemoval: true,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full border-b border-gray-100 dark:border-gray-800 last:border-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por folio, referencia..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 h-10"
            />
          </div>

          <Select value={bodegaFilter} onValueChange={setBodegaFilter}>
            <SelectTrigger className="w-[200px] h-10 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-xs font-bold uppercase">
              <SelectValue placeholder="Todas las bodegas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-bold uppercase">
                Todas las bodegas
              </SelectItem>
              {warehouses.map((w: any) => (
                <SelectItem key={w.id} value={w.id} className="text-xs font-bold uppercase">
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-tighter">{allItems.length} MOVIMIENTOS</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-gray-100 dark:border-gray-800">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 py-3 h-auto">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="group border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3 leading-tight">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center text-gray-400">
                  No se encontraron movimientos registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
          Página <span className="text-gray-900 dark:text-gray-100">{table.getState().pagination.pageIndex + 1}</span> de {table.getPageCount() || 1}
        </div>
        <div className="flex items-center gap-2">
          <Select value={`${table.getState().pagination.pageSize}`} onValueChange={(val) => table.setPageSize(Number(val))}>
            <SelectTrigger className="w-[100px] h-8 text-[11px] font-bold rounded-lg border-gray-200 dark:border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={`${size}`} className="text-[11px]">
                  {size} p/pág
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-gray-200 dark:border-gray-700" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-gray-200 dark:border-gray-700" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
