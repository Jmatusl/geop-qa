"use client";

import React, { useMemo, useState } from "react";
import { ColumnDef, flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel, useReactTable, SortingState } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, ArrowUpDown, Search, Package, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface GlobalInventarioItem {
  id: string;
  articuloId: string;
  articuloNombre: string;
  articuloSku: string;
  cantidad: number;
  precioUnitario: number | null;
  bodegaNombre: string;
  bodegaId: string;
}

export function StockGlobalTable() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [bodegaFilter, setBodegaFilter] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "bodegaNombre", desc: false },
    { id: "articuloNombre", desc: false },
  ]);

  const { data, isLoading } = useQuery({
    queryKey: ["global-inventario-v2", bodegaFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "1000",
        status: "ACTIVO",
      });
      if (bodegaFilter !== "all") params.append("warehouseId", bodegaFilter);

      const res = await fetch(`/api/v1/bodega/lotes?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar inventario");
      const json = await res.json();

      return json.data.map((item: any) => ({
        id: item.id,
        articuloId: item.article.id,
        articuloNombre: item.article.name,
        articuloSku: item.article.code,
        cantidad: Number(item.quantity),
        precioUnitario: item.unitCost ? Number(item.unitCost) : null,
        bodegaNombre: item.warehouse.name,
        bodegaId: item.warehouse.id,
      })) as GlobalInventarioItem[];
    },
  });

  const allItems: GlobalInventarioItem[] = data || [];

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
        accessorKey: "articuloNombre",
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
              Descripción / N° de parte
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
          <div className="space-y-1">
            <div className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight text-[11px]">{row.original.articuloNombre}</div>
            <div className="text-[10px] text-gray-400 font-medium">{row.original.articuloSku}</div>
          </div>
        ),
      },
      {
        accessorKey: "cantidad",
        header: () => <div className="text-center">Cantidad</div>,
        cell: ({ row }) => <div className="font-black text-center text-sm">{row.original.cantidad}</div>,
      },
      {
        accessorKey: "bodegaNombre",
        header: "Ubicación",
        cell: ({ row }) => (
          <Badge variant="outline" className="bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 text-[10px] font-black uppercase border-sky-200 dark:border-sky-800 whitespace-nowrap">
            {row.original.bodegaNombre}
          </Badge>
        ),
      },
      {
        accessorKey: "precioUnitario",
        header: () => <div className="text-right">Valor Unit. (CLP)</div>,
        cell: ({ row }) => (
          <div className="text-right font-bold text-emerald-600 dark:text-emerald-400">{row.original.precioUnitario ? `$${row.original.precioUnitario.toLocaleString("es-CL")}` : "$0"}</div>
        ),
      },
      {
        id: "totalClp",
        header: () => <div className="text-right">Total CLP</div>,
        cell: ({ row }) => {
          const total = (row.original.cantidad || 0) * (row.original.precioUnitario || 0);
          return <div className="text-right font-black text-blue-600 dark:text-blue-400 tracking-tight">${total.toLocaleString("es-CL")}</div>;
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
              placeholder="Buscar artículo..."
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
            <span className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-tighter">{allItems.length} REGISTROS</span>
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
                    {flexRender(header.column.columnDef.header, header.getContext())}
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
                  No se encontraron registros
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
