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
  articuloId: string;
  articuloNombre: string;
  articuloSku: string;
  loteCode: string;
  fechaCreacion: string;
  cantidad: number; // Saldo actual
  cantidadOriginal: number; // Cantidad inicial
  precioUnitario: number | null;
  bodegaNombre: string;
  status: string;
}

export function GlobalInventarioV2Table() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [bodegaFilter, setBodegaFilter] = useState("all");
  const [showExhausted, setShowExhausted] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([{ id: "fechaCreacion", desc: true }]);

  const { data, isLoading } = useQuery({
    queryKey: ["global-inventario-v2", bodegaFilter, showExhausted],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "1000", // Carga masiva para filtrado en cliente
      });
      if (bodegaFilter !== "all") params.append("warehouseId", bodegaFilter);
      if (!showExhausted) params.append("status", "ACTIVO");

      const res = await fetch(`/api/v1/bodega/lotes?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar inventario");
      const json = await res.json();

      // Mapear data del nuevo API al formato de la tabla
      return json.data.map((item: any) => ({
        id: item.id,
        articuloId: item.article.id,
        articuloNombre: item.article.name,
        articuloSku: item.article.code,
        loteCode: item.loteCode,
        fechaCreacion: item.createdAt,
        cantidad: Number(item.quantity),
        cantidadOriginal: Number(item.initialQuantity),
        precioUnitario: item.unitCost ? Number(item.unitCost) : null,
        bodegaNombre: item.warehouse.name,
        status: item.status,
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
              Artículo
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
            <div className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight leading-tight text-[11px]">{row.original.articuloNombre}</div>
            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold">
              <Tag className="w-3 h-3 text-blue-500" />
              {row.original.articuloSku}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "bodegaNombre",
        header: "Bodega",
        cell: ({ row }) => (
          <Badge variant="outline" className="bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 text-[10px] font-black uppercase border-sky-200 dark:border-sky-800 whitespace-nowrap">
            {row.original.bodegaNombre}
          </Badge>
        ),
      },
      {
        accessorKey: "fechaCreacion",
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
              className="-ml-4 hover:bg-transparent text-left justify-start"
            >
              Ingreso
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
        cell: ({ row }) => {
          const date = new Date(row.original.fechaCreacion);
          const formattedDate = date.toLocaleDateString("es-CL");

          return (
            <div className="space-y-1">
              <div className="text-[11px] font-medium text-gray-700 dark:text-gray-300">{formattedDate}</div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <Badge
                  variant="outline"
                  className={`h-4 px-1 text-[8px] font-black uppercase bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800`}
                >
                  LOTE
                </Badge>
                <Link href={`/bodega/lotes?id=${row.original.id}`} className="hover:text-blue-600 hover:underline transition-colors flex items-center gap-1">
                  {row.original.loteCode}
                  <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                </Link>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "cantidad",
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <div className="text-right">
              <Button
                variant="ghost"
                onClick={() => {
                  if (isSorted === "asc") column.toggleSorting(true);
                  else if (isSorted === "desc") column.clearSorting();
                  else column.toggleSorting(false);
                }}
                className="hover:bg-transparent"
              >
                Stock
                {isSorted === "asc" ? (
                  <ArrowUp className="ml-2 h-4 w-4 text-blue-500" />
                ) : isSorted === "desc" ? (
                  <ArrowDown className="ml-2 h-4 w-4 text-blue-500" />
                ) : (
                  <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                )}
              </Button>
            </div>
          );
        },
        cell: ({ row }) => {
          const saldo = row.original.cantidad;
          const original = row.original.cantidadOriginal || saldo;
          const porcentaje = Math.min(Math.round((saldo / original) * 100), 100);

          return (
            <div className="text-right space-y-1.5 min-w-[100px]">
              <div>
                <div className="flex items-baseline justify-end gap-1">
                  <span className="text-sm font-black text-gray-900 dark:text-gray-100">{saldo}</span>
                  <span className="text-[10px] text-gray-400 font-bold">/ {original}</span>
                  <span className="text-[9px] text-gray-400 font-black uppercase ml-1">UDS</span>
                </div>

                <div className="h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full mt-1 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${porcentaje > 50 ? "bg-emerald-500" : porcentaje > 20 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col items-end gap-0.5">
                {row.original.precioUnitario && <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">${row.original.precioUnitario.toLocaleString("es-CL")} c/u</div>}
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
        <div className="flex gap-4">
          <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
        </div>
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
              placeholder="Buscar por artículo, SKU..."
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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
            <Switch id="show-exhausted" checked={showExhausted} onCheckedChange={setShowExhausted} />
            <Label htmlFor="show-exhausted" className="text-[10px] font-black uppercase text-gray-400 cursor-pointer">
              Ver Agotados
            </Label>
          </div>

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
                <TableCell colSpan={4} className="h-48 text-center text-gray-400">
                  No se encontraron registros de inventario
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
