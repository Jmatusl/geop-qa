"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatRUT } from "@/lib/utils/chile-utils";

import { ArrowUp, ArrowDown } from "lucide-react";

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  rut: string;
  role: {
    id: string; // ID necesario para edición
    name: string;
  };
  isActive: boolean;
  createdAt: string;
  isGoogleSsoEnabled: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  person?: {
    id: string;
    firstName: string;
    lastName: string;
    rut: string;
  };
  avatarUrl?: string | null;
};

export type SortDirection = "asc" | "desc" | null;

interface GetColumnsProps {
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
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

// Configuración de columnas ordenables
const SORTABLE_COLUMNS = {
  rut: true,
  fullName: true,
  email: true,
  role: true,
  status: true,
};

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export const getColumns = ({ onEdit, onDelete, currentSort, onSort }: GetColumnsProps): ColumnDef<User>[] => [
  {
    id: "avatar",
    header: "",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.avatarUrl || ""} alt={`${user.firstName} ${user.lastName}`} />
          <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-xs">
            {user.firstName.charAt(0)}
            {user.lastName.charAt(0)}
          </AvatarFallback>
        </Avatar>
      );
    },
    size: 50,
    enableSorting: false,
  },
  {
    accessorKey: "rut",
    header: () => (SORTABLE_COLUMNS.rut ? <SortableHeader title="RUT" sortKey="rut" currentSort={currentSort} onSort={onSort} /> : "RUT"),
    cell: ({ row }) => {
      const user = row.original;
      return (
        <Button
          variant="link"
          className="p-0 h-auto font-normal text-blue-600 dark:text-blue-400 hover:underline"
          onClick={() => onEdit(user)}
        >
          {formatRUT(user.rut)}
        </Button>
      );
    },
  },
  {
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    id: "fullName",
    header: () => (SORTABLE_COLUMNS.fullName ? <SortableHeader title="Nombre Completo" sortKey="fullName" currentSort={currentSort} onSort={onSort} /> : "Nombre Completo"),
  },
  {
    accessorKey: "email",
    header: () => (SORTABLE_COLUMNS.email ? <SortableHeader title="Email" sortKey="email" currentSort={currentSort} onSort={onSort} /> : "Email"),
  },
  {
    accessorKey: "role.name",
    // Nota: El ordenamiento por relación (rol) no está implementado en el backend por limitaciones de Prisma con relaciones 1-N.
    // Se mantiene la UI consistente, pero usará el ordenamiento por defecto.
    header: () => (SORTABLE_COLUMNS.role ? <SortableHeader title="Rol" sortKey="role.name" currentSort={currentSort} onSort={onSort} /> : "Rol"),
    cell: ({ row }) => {
      const roleName = row.original.role?.name || "N/A";
      return <Badge variant={roleName === "ADMIN" ? "default" : "secondary"}>{roleName}</Badge>;
    },
  },
  {
    accessorKey: "isActive",
    header: () => (SORTABLE_COLUMNS.status ? <SortableHeader title="Estado" sortKey="isActive" currentSort={currentSort} onSort={onSort} /> : "Estado"),
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
      const user = row.original;

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
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>Copiar ID usuario</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(user)}>
              <Edit className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(user)}>
              <Trash2 className="mr-2 h-4 w-4" /> Desactivar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
