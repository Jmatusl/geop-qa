"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Eye, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Person } from "@/lib/hooks/use-persons";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRUT } from "@/lib/utils/chile-utils";

export type SortDirection = "asc" | "desc" | null;

interface GetPersonsColumnsProps {
  //    onEdit: (item: Person) => void;
  onDelete: (item: Person) => void;
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

const SORTABLE_COLUMNS = {
  rut: true,
  firstName: true,
  email: true,
  isActive: true,
};

// Helper para obtener iniciales
const getInitials = (firstName: string, lastName: string) => {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
};

export const getPersonsColumns = ({ onDelete, currentSort, onSort }: GetPersonsColumnsProps): ColumnDef<Person>[] => [
  {
    accessorKey: "rut",
    header: () => (SORTABLE_COLUMNS.rut ? <SortableHeader title="RUT" sortKey="rut" currentSort={currentSort} onSort={onSort} /> : "RUT"),
    cell: ({ row }) => (
      <Link href={`/persons/${row.original.id}`} className="font-mono text-xs font-medium text-[#283c7f] hover:underline hover:text-blue-700 transition-colors">
        {formatRUT(row.original.rut)}
      </Link>
    ),
  },
  {
    accessorKey: "firstName",
    header: () => (SORTABLE_COLUMNS.firstName ? <SortableHeader title="Trabajador" sortKey="firstName" currentSort={currentSort} onSort={onSort} /> : "Trabajador"),
    cell: ({ row }) => {
      const p = row.original;
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={p.imagePath || ""} alt={p.firstName} />
            <AvatarFallback>{getInitials(p.firstName, p.lastName)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium text-sm">
              {p.firstName} {p.lastName}
            </span>
            <span className="text-xs text-muted-foreground">{p.email}</span>
          </div>
        </div>
      );
    },
  },
  {
    id: "jobPosition",
    header: "Cargo / Área",
    cell: ({ row }) => {
      // Find active job
      const activeJob = row.original.jobPositions?.find((j) => j.isActive)?.jobPosition;
      const activeArea = row.original.areas?.[0]?.area;

      return (
        <div className="flex flex-col text-xs">
          <span className="font-medium">{activeJob?.name || "Sin Cargo"}</span>
          <span className="text-muted-foreground">{activeArea?.name || "Sin Área"}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "isActive",
    header: () => (SORTABLE_COLUMNS.isActive ? <SortableHeader title="Estado" sortKey="isActive" currentSort={currentSort} onSort={onSort} /> : "Estado"),
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
            <DropdownMenuItem asChild>
              <Link href={`/persons/${item.id}`}>
                <Eye className="mr-2 h-4 w-4" /> Ver Ficha
              </Link>
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
