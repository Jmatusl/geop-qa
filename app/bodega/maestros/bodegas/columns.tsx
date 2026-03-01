"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, Edit, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BodegaWarehouse } from "@/lib/hooks/bodega/use-bodega-warehouses";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SortDirection = "asc" | "desc" | null;

interface GetWarehouseColumnsProps {
  onEdit: (item: BodegaWarehouse) => void;
  onDelete: (item: BodegaWarehouse) => void;
  currentSort: { key: string | null; direction: SortDirection };
  onSort: (key: string) => void;
}

const SORTABLE_COLUMNS: Record<string, boolean> = {
  code: true,
  name: true,
  location: true,
  isActive: true,
};

function SortableHeader({
  title,
  sortKey,
  currentSort,
  onSort,
}: {
  title: string;
  sortKey: string;
  currentSort: { key: string | null; direction: SortDirection };
  onSort: (key: string) => void;
}) {
  const isSorted = currentSort.key === sortKey;
  const direction = isSorted ? currentSort.direction : null;

  return (
    <Button variant="ghost" className="-ml-4 h-8 hover:bg-accent/50" onClick={() => onSort(sortKey)}>
      <span>{title}</span>
      <div className="ml-2 flex h-4 w-4 items-center justify-center">
        {direction === "asc" ? (
          <ArrowUp className="h-4 w-4" />
        ) : direction === "desc" ? (
          <ArrowDown className="h-4 w-4" />
        ) : (
          <div className="h-4 w-4" />
        )}
      </div>
    </Button>
  );
}

export const getWarehouseColumns = ({ onEdit, onDelete, currentSort, onSort }: GetWarehouseColumnsProps): ColumnDef<BodegaWarehouse>[] => [
  {
    accessorKey: "code",
    header: () =>
      SORTABLE_COLUMNS.code ? (
        <SortableHeader title="Código" sortKey="code" currentSort={currentSort} onSort={onSort} />
      ) : (
        "Código"
      ),
    cell: ({ row }) => <span className="whitespace-nowrap font-medium">{row.original.code}</span>,
  },
  {
    accessorKey: "name",
    header: () =>
      SORTABLE_COLUMNS.name ? (
        <SortableHeader title="Nombre" sortKey="name" currentSort={currentSort} onSort={onSort} />
      ) : (
        "Nombre"
      ),
    cell: ({ row }) => <span className="line-clamp-1 max-w-70">{row.original.name}</span>,
  },
  {
    accessorKey: "location",
    header: () =>
      SORTABLE_COLUMNS.location ? (
        <SortableHeader title="Ubicación" sortKey="location" currentSort={currentSort} onSort={onSort} />
      ) : (
        "Ubicación"
      ),
    cell: ({ row }) => <span className="line-clamp-1 max-w-60">{row.original.location || "-"}</span>,
  },
  {
    accessorKey: "isActive",
    header: () =>
      SORTABLE_COLUMNS.isActive ? (
        <SortableHeader title="Estado" sortKey="isActive" currentSort={currentSort} onSort={onSort} />
      ) : (
        "Estado"
      ),
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">Activa</Badge>
      ) : (
        <Badge variant="secondary">Inactiva</Badge>
      ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const item = row.original;

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
            <DropdownMenuItem onClick={() => onEdit(item)}>
              <Edit className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(item)}>
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
