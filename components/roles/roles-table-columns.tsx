"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Role } from "@/lib/hooks/use-roles";

import { ArrowUp, ArrowDown } from "lucide-react";

export type SortDirection = "asc" | "desc" | null;

interface GetRolesColumnsProps {
    onEdit: (role: Role) => void;
    onDelete: (role: Role) => void;
    currentSort: { key: string | null; direction: SortDirection };
    onSort: (key: string) => void;
}

const SortableHeader = ({ title, sortKey, currentSort, onSort }: { title: string, sortKey: string, currentSort: { key: string | null, direction: SortDirection }, onSort: (key: string) => void }) => {
    const isSorted = currentSort.key === sortKey;
    const direction = isSorted ? currentSort.direction : null;

    return (
        <Button
            variant="ghost"
            onClick={() => onSort(sortKey)}
            className="-ml-4 h-8 data-[state=open]:bg-accent hover:bg-accent/50"
        >
            <span>{title}</span>
            {direction === "asc" && <ArrowUp className="ml-2 h-4 w-4" />}
            {direction === "desc" && <ArrowDown className="ml-2 h-4 w-4" />}
            {!direction && <div className="ml-2 h-4 w-4" aria-hidden="true" />}
        </Button>
    );
};

// Configuración de columnas ordenables
const SORTABLE_COLUMNS = {
    code: true,
    name: true,
    description: true,
    status: true
};

export const getRolesColumns = ({ onEdit, onDelete, currentSort, onSort }: GetRolesColumnsProps): ColumnDef<Role>[] => [
    {
        accessorKey: "code",
        header: () => SORTABLE_COLUMNS.code
            ? <SortableHeader title="Código" sortKey="code" currentSort={currentSort} onSort={onSort} />
            : "Código",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>
    },
    {
        accessorKey: "name",
        header: () => SORTABLE_COLUMNS.name
            ? <SortableHeader title="Nombre" sortKey="name" currentSort={currentSort} onSort={onSort} />
            : "Nombre",
    },
    {
        accessorKey: "description",
        header: () => SORTABLE_COLUMNS.description
            ? <SortableHeader title="Descripción" sortKey="description" currentSort={currentSort} onSort={onSort} />
            : "Descripción",
        cell: ({ row }) => {
            const desc = row.original.description;
            return <span className="text-muted-foreground truncate max-w-[300px] block" title={desc || ""}>{desc || "-"}</span>
        }
    },
    {
        accessorKey: "isActive",
        header: () => SORTABLE_COLUMNS.status
            ? <SortableHeader title="Estado" sortKey="isActive" currentSort={currentSort} onSort={onSort} />
            : "Estado",
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
            const role = row.original;

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
                        <DropdownMenuItem
                            onClick={() => navigator.clipboard.writeText(role.id)}
                        >
                            Copiar ID rol
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit(role)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => onDelete(role)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Desactivar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
