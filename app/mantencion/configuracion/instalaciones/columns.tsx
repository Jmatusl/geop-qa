"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Installation } from "@/lib/hooks/mantencion/use-installations";

export type SortDirection = "asc" | "desc" | null;

interface GetColumnsProps {
  onEdit: (item: Installation) => void;
  onDelete: (item: Installation) => void;
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

export const getInstallationsColumns = ({ onEdit, onDelete, currentSort, onSort }: GetColumnsProps): ColumnDef<Installation>[] => [
  {
    accessorKey: "name",
    header: () => <SortableHeader title="Instalación" sortKey="name" currentSort={currentSort} onSort={onSort} />,
  },
  {
    accessorKey: "installationType",
    header: () => <SortableHeader title="Tipo" sortKey="installationType" currentSort={currentSort} onSort={onSort} />,
    cell: ({ row }) => <span className="font-medium text-xs text-muted-foreground">{row.original.installationType || "S/T"}</span>,
  },
  {
    accessorKey: "farmingCenter.name",
    header: "Centro de Cultivo",
    cell: ({ row }) => {
      return <span className="text-sm">{row.original.farmingCenter?.name || "N/A"}</span>;
    },
  },
  {
    accessorKey: "isActive",
    header: () => <SortableHeader title="Estado" sortKey="isActive" currentSort={currentSort} onSort={onSort} />,
    cell: ({ row }) => {
      const isActive = row.original.isActive;
      return (
        <Badge variant={isActive ? "outline" : "destructive"} className={isActive ? "text-green-600 border-green-600" : ""}>
          {isActive ? "Operativa" : "Fuera de Servicio"}
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
