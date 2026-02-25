"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Supplier } from "@/lib/hooks/mantencion/use-suppliers";
import { formatRUT } from "@/lib/utils/chile-utils";

export type SortDirection = "asc" | "desc" | null;

interface GetColumnsProps {
  onEdit: (item: Supplier) => void;
  onDelete: (item: Supplier) => void;
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

export const getSuppliersColumns = ({ onEdit, onDelete, currentSort, onSort }: GetColumnsProps): ColumnDef<Supplier>[] => [
  {
    accessorKey: "rut",
    header: () => <SortableHeader title="RUT" sortKey="rut" currentSort={currentSort} onSort={onSort} />,
    cell: ({ row }) => <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">{formatRUT(row.original.rut)}</span>,
  },
  {
    accessorKey: "legalName",
    header: () => <SortableHeader title="Razón Social" sortKey="legalName" currentSort={currentSort} onSort={onSort} />,
    cell: ({ row }) => <span className="font-semibold text-[#283c7f]">{row.original.legalName || row.original.fantasyName || "-"}</span>,
  },
  {
    accessorKey: "businessLine",
    header: "Giro Comercial",
    cell: ({ row }) => <span className="text-muted-foreground text-sm line-clamp-1">{row.original.businessLine}</span>,
  },
  {
    accessorKey: "address",
    header: "Ubicación",
    cell: ({ row }) => <span className="text-muted-foreground text-sm line-clamp-1">{row.original.address || "-"}</span>,
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
