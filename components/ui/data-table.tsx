"use client";

import { useState, useEffect } from "react";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount: number;
  totalRows?: number; // Prop para total de registros
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSearchChange?: (search: string) => void;
  isLoading?: boolean;
  enableSearch?: boolean;
  filters?: React.ReactNode;
  searchPlaceholder?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  totalRows = 0,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  isLoading = false,
  enableSearch = true,
  filters,
  searchPlaceholder = "Buscar...",
}: DataTableProps<TData, TValue>) {
  const [searchValue, setSearchValue] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const table = useReactTable({
    data,
    columns,
    pageCount: pageCount,
    state: {
      pagination: {
        pageIndex: pageIndex - 1, // TanStack es 0-indexed
        pageSize: pageSize,
      },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === "function") {
        const newState = updater({
          pageIndex: pageIndex - 1, // Convert to 0-indexed for state
          pageSize: pageSize,
        });
        onPageChange(newState.pageIndex + 1); // Pass back 1-indexed
      }
    },
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleSearch = (value: string) => {
    setSearchValue(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  return (
    <div className="space-y-4">
      {(enableSearch || filters) && (
        <div className="flex flex-col sm:flex-row items-center gap-4 py-4">
          {enableSearch && (
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder={searchPlaceholder} value={searchValue} onChange={(event) => handleSearch(event.target.value)} className="pl-8" autoComplete="off" />
            </div>
          )}
          {filters && <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">{filters}</div>}
        </div>
      )}

      <div className="rounded-md border bg-white dark:bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>;
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Cargando datos...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No se encontraron resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer de Paginación Rediseñado */}
      <div className="flex items-center justify-between px-2">
        {/* Sección Izquierda: Total y Filas por página */}
        <div className="flex items-center space-x-6">
          <span className="text-sm text-muted-foreground">Total: {totalRows} registros</span>

          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Filas por página</p>
            {mounted ? (
              <Select
                value={`${pageSize}`}
                onValueChange={(value) => {
                  if (onPageSizeChange) {
                    onPageSizeChange(Number(value));
                  }
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50, 100].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="h-8 w-[70px] border rounded-md" /> // Placeholder while mounting
            )}
          </div>
        </div>

        {/* Sección Derecha: Navegación */}
        <div className="flex items-center space-x-4 lg:space-x-6">
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Página {pageIndex} de {pageCount}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => onPageChange(1)} disabled={pageIndex === 1 || isLoading}>
              <span className="sr-only">Ir a la primera página</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="h-8 w-8 p-0" onClick={() => onPageChange(pageIndex - 1)} disabled={pageIndex === 1 || isLoading}>
              <span className="sr-only">Ir a la página anterior</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="h-8 w-8 p-0" onClick={() => onPageChange(pageIndex + 1)} disabled={pageIndex === pageCount || isLoading}>
              <span className="sr-only">Ir a la página siguiente</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => onPageChange(pageCount)} disabled={pageIndex === pageCount || isLoading}>
              <span className="sr-only">Ir a la última página</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
