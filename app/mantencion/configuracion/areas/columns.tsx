"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Area } from "@/lib/hooks/mantencion/use-areas";

export type SortDirection = "asc" | "desc" | null;

interface GetColumnsProps {
  onEdit: (item: Area) => void;
  onDelete: (item: Area) => void;
  currentSort: { key: string | null; direction: SortDirection };
  onSort: (key: string) => void;
}

const SortableHeader = ({ title, sortKey, currentSort, onSort }: { title: string; sortKey: string; currentSort: { key: string | null; direction: SortDirection }; onSort: (key: string) => void }) => {
  const isSorted = currentSort.key === sortKey;
  const direction = isSorted ? currentSort.direction : null;

  return (
    <Button variant="ghost" onClick={() => onSort(sortKey)} className="-ml-4 h-8 data-[state=open]:bg-accent hover:bg-accent/50">
      <span>{title}</span>
      {direction === "asc" && <ArrowUp className="ml-2 h-4 w-4" />}
      {direction === "desc" && <ArrowDown className="ml-2 h-4 w-4" />}
      {!direction && <div className="ml-2 h-4 w-4" aria-hidden="true" />}
    </Button>
  );
};

export const getAreasColumns = ({ onEdit, onDelete, currentSort, onSort }: GetColumnsProps): ColumnDef<Area>[] => [
  {
    accessorKey: "name",
    header: () => <SortableHeader title="Área" sortKey="name" currentSort={currentSort} onSort={onSort} />,
    cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
  },
  {
    accessorKey: "description",
    header: "Descripción",
    cell: ({ row }) => <span className="text-muted-foreground text-sm line-clamp-1">{row.original.description || "Sin descripción"}</span>,
  },
  {
    accessorKey: "isActive",
    header: () => <SortableHeader title="Estado" sortKey="isActive" currentSort={currentSort} onSort={onSort} />,
    cell: ({ row }) => {
      const isActive = row.original.isActive;
      return (
        <Badge variant={isActive ? "outline" : "destructive"} className={isActive ? "text-green-600 border-green-600" : ""}>
          {isActive ? "Activo" : "Inactivo"}
        </Badge>
      );
    },
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
            <DropdownMenuItem className="text-red-600 focus:text-red-600 dark:text-red-500" onClick={() => onDelete(item)}>
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
