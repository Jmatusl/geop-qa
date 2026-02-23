"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, RefreshCw } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";

interface BaseMaintainerProps<TData> {
  title: string;
  description: string;
  addNewLabel: string;
  searchPlaceholder?: string; // Nuevo
  getColumns: (handlers: { onEdit: (item: TData) => void; onDelete: (item: TData) => void }) => ColumnDef<TData, any>[];
  onDelete: (item: TData) => void;
  data: TData[];
  isLoading: boolean;
  meta: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSearchChange: (search: string) => void;
  renderForm: (mode: "create" | "edit", initialData: TData | null, onCancel: () => void, onSuccess: () => void) => React.ReactNode;
  filters?: React.ReactNode;
  onPreEdit?: (item: TData) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  headerActions?: React.ReactNode;
  externalMode?: "table" | "create" | "edit";
  externalItem?: TData | null;
}

export function BaseMaintainer<TData>({
  title,
  description,
  addNewLabel,
  searchPlaceholder,
  getColumns,
  onDelete,
  data,
  isLoading,
  meta,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  renderForm,
  filters,
  onPreEdit,
  onRefresh,
  isRefreshing,
  headerActions,
  externalMode,
  externalItem,
}: BaseMaintainerProps<TData>) {
  const [mode, setMode] = useState<"table" | "create" | "edit">(externalMode || "table");
  const [selectedItem, setSelectedItem] = useState<TData | null>(externalItem || null);

  // Sync with external state if provided
  React.useEffect(() => {
    if (externalMode) {
      setMode(externalMode);
    }
    if (externalItem !== undefined) {
      setSelectedItem(externalItem);
    }
  }, [externalMode, externalItem]);

  const handleCreate = () => {
    setSelectedItem(null);
    setMode("create");
  };

  const handleEdit = (item: TData) => {
    if (onPreEdit) onPreEdit(item);
    setSelectedItem(item);
    setMode("edit");
  };

  const handleCancel = () => {
    setMode("table");
    setSelectedItem(null);
  };

  const handleSuccess = () => {
    setMode("table");
    setSelectedItem(null);
  };

  const columns = useMemo(() => {
    return getColumns({
      onEdit: handleEdit,
      onDelete: onDelete,
    });
  }, [getColumns, onDelete]);

  if (mode === "create" || mode === "edit") {
    return (
      <div className="space-y-6 w-full animate-in fade-in duration-300">
        <div className="flex items-center gap-4 border-b pb-4">
          <Button variant="ghost" size="icon" onClick={handleCancel} className="hover:bg-accent rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{mode === "create" ? `Nuevo ${addNewLabel}` : `Editar ${addNewLabel}`}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Complete los campos requeridos para el registro.</p>
          </div>
        </div>
        <div className="w-full">{renderForm(mode, selectedItem, handleCancel, handleSuccess)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
          <p className="text-muted-foreground text-lg">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
          {headerActions}
          {onRefresh && (
            <Button variant="outline" onClick={onRefresh} disabled={isLoading || isRefreshing} title="Recargar Datos" className="h-10 w-10 p-0 dark:text-white">
              <RefreshCw className={cn("h-4 w-4", (isLoading || isRefreshing) && "animate-spin")} />
            </Button>
          )}
          {addNewLabel && (
            <Button onClick={handleCreate} className="bg-[#283c7f] hover:bg-[#1e2d5f] text-white shadow-md h-10 px-4">
              <Plus className="mr-2 h-4 w-4 text-white" /> {addNewLabel}
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={data}
          pageCount={meta.totalPages}
          totalRows={meta.total}
          pageIndex={meta.page}
          pageSize={meta.limit}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          onSearchChange={onSearchChange}
          isLoading={isLoading}
          filters={filters}
          searchPlaceholder={searchPlaceholder} // Pasamos el placeholder
        />
      </div>
    </div>
  );
}

// Para usar esto, la Página seguirá gestionando el estado de la query (page, pageSize, search)
// y pasará los datos/meta/callbacks a este componente.
// También proporciona la función renderForm.
// La Página también necesita definir columnas, usualmente llamando a una función getColumns(handlers).
// Dado que handleEdit está dentro de BaseMaintainer, podríamos necesitar exponerlo o repensarlo.
// Dejemos que BaseMaintainer maneje el layout + estado de visualización.
