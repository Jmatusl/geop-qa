"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Signature } from "@/lib/hooks/use-signatures";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

export type SortDirection = "asc" | "desc" | null;

interface ColumnHandlers {
  onEdit: (item: Signature) => void;
  onDelete: (item: Signature) => void;
  onSort: (key: string) => void;
  currentSort: { key: string | null; direction: SortDirection };
}

export const getSignaturesColumns = ({ onEdit, onDelete, onSort, currentSort }: ColumnHandlers): ColumnDef<Signature>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label="Select row" />,
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    accessorKey: "data",
    header: "Vista Previa",
    cell: ({ row }) => {
      const data = row.getValue("data") as string;
      return (
        <div className="flex items-center justify-start h-12 w-24 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-border p-1">
          <img src={data} alt="Firma" className="max-h-full max-w-full object-contain mx-auto" />
        </div>
      );
    },
    size: 100,
  },
  {
    accessorKey: "name",
    header: () => (
      <Button variant="ghost" className="p-0 font-bold hover:bg-transparent" onClick={() => onSort("name")}>
        Nombre
        <ArrowUpDown className={`ml-2 h-4 w-4 ${currentSort.key === "name" ? "text-primary opacity-100" : "opacity-50"}`} />
      </Button>
    ),
    cell: ({ row }) => <span className="font-bold">{row.getValue("name")}</span>,
  },
  {
    accessorKey: "user",
    header: "Usuario Asociado",
    cell: ({ row }) => {
      const user = row.original.user;
      return user ? (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{`${user.firstName} ${user.lastName}`}</span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground italic">No asociado</span>
      );
    },
  },
  {
    accessorKey: "isActive",
    header: () => (
      <Button variant="ghost" className="p-0 font-bold hover:bg-transparent" onClick={() => onSort("isActive")}>
        Estado
        <ArrowUpDown className={`ml-2 h-4 w-4 ${currentSort.key === "isActive" ? "text-primary opacity-100" : "opacity-50"}`} />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <Badge
          variant={row.getValue("isActive") ? "outline" : "secondary"}
          className={row.getValue("isActive") ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-slate-400 bg-slate-50 border-slate-200"}
        >
          {row.getValue("isActive") ? "Activo" : "Inactivo"}
        </Badge>
        {row.original.isDefault && (
          <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200 w-fit">
            Favorita
          </Badge>
        )}
      </div>
    ),
    size: 100,
  },
  {
    accessorKey: "createdAt",
    header: "Creada el",
    cell: ({ row }) => format(new Date(row.getValue("createdAt")), "dd/MM/yyyy HH:mm"),
    size: 150,
  },
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => (
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => onEdit(row.original)}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => onDelete(row.original)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
    size: 80,
  },
];
