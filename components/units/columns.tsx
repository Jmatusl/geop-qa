/**
 * Definición de Columnas: Tabla de Unidades
 * Archivo: components/units/columns.tsx
 * 
 * Configuración de columnas para DataTable del mantenedor de unidades
 */

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { UnitMaster } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ArrowUp, ArrowDown, Pencil, Trash2 } from "lucide-react";
import { unitCategoryLabels } from "@/lib/validations/units";

// Configuración de columnas sortables
const SORTABLE_COLUMNS = {
  code: true,
  name: true,
  category: true,
  symbol: false,
  isActive: false,
};

/**
 * Componente de header sortable
 */
function SortableHeader({
  column,
  children,
  isSortable = true,
}: {
  column: any;
  children: React.ReactNode;
  isSortable?: boolean;
}) {
  if (!isSortable) {
    return (
      <div className="flex items-center gap-2">
        {children}
        <div className="w-4 h-4" /> {/* Reserva de espacio */}
      </div>
    );
  }

  const isSorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent hover:bg-accent/50"
      onClick={() => column.toggleSorting()}
    >
      {children}
      <div className="ml-2 w-4 h-4 flex items-center justify-center">
        {isSorted === "asc" && <ArrowUp className="h-4 w-4" />}
        {isSorted === "desc" && <ArrowDown className="h-4 w-4" />}
      </div>
    </Button>
  );
}

interface ColumnsProps {
  onEdit: (unit: UnitMaster) => void;
  onDelete: (unit: UnitMaster) => void;
}

export function getColumns({ onEdit, onDelete }: ColumnsProps): ColumnDef<UnitMaster>[] {
  return [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <SortableHeader column={column} isSortable={SORTABLE_COLUMNS.code}>
          Código
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <Button
          variant="link"
          className="font-mono font-semibold p-0 h-auto"
          onClick={() => onEdit(row.original)}
        >
          {row.original.code}
        </Button>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortableHeader column={column} isSortable={SORTABLE_COLUMNS.name}>
          Nombre
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.original.name}</div>
      ),
    },
    {
      accessorKey: "symbol",
      header: ({ column }) => (
        <SortableHeader column={column} isSortable={SORTABLE_COLUMNS.symbol}>
          Símbolo
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="font-mono text-slate-600 dark:text-slate-400">
          {row.original.symbol}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: ({ column }) => (
        <SortableHeader column={column} isSortable={SORTABLE_COLUMNS.category}>
          Categoría
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const category = row.original.category as keyof typeof unitCategoryLabels;
        const label = unitCategoryLabels[category] || category;
        
        return (
          <Badge variant="outline" className="capitalize">
            {label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "conversionFactor",
      header: "Factor Conv.",
      cell: ({ row }) => {
        const factor = row.original.conversionFactor;
        if (factor === null) return <span className="text-slate-400">-</span>;
        return <div className="text-sm">{factor}</div>;
      },
    },
    {
      accessorKey: "baseUnit",
      header: "Unidad Base",
      cell: ({ row }) => {
        const baseUnit = row.original.baseUnit;
        if (!baseUnit) return <span className="text-slate-400">-</span>;
        return <div className="font-mono text-sm">{baseUnit}</div>;
      },
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => (
        <SortableHeader column={column} isSortable={SORTABLE_COLUMNS.isActive}>
          Estado
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "outline"}>
          {row.original.isActive ? "Activa" : "Inactiva"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const unit = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(unit)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(unit)}
                className="text-red-600 dark:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
