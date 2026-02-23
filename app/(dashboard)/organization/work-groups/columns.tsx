"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkGroup } from "@/lib/hooks/use-work-groups";

export type SortDirection = "asc" | "desc" | null;

interface GetWorkGroupsColumnsProps {
    onEdit: (item: WorkGroup) => void;
    onDelete: (item: WorkGroup) => void;
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

const SORTABLE_COLUMNS = {
    code: true,
    name: true,
    isActive: true,
    createdAt: true
};

export const getWorkGroupsColumns = ({ onEdit, onDelete, currentSort, onSort }: GetWorkGroupsColumnsProps): ColumnDef<WorkGroup>[] => [
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
        accessorKey: "isActive",
        header: () => SORTABLE_COLUMNS.isActive
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
        accessorKey: "createdAt",
        header: () => SORTABLE_COLUMNS.createdAt
            ? <SortableHeader title="Creado" sortKey="createdAt" currentSort={currentSort} onSort={onSort} />
            : "Creado",
        cell: ({ row }) => {
            return <span className="text-xs text-muted-foreground">{new Date(row.original.createdAt).toLocaleDateString()}</span>
        }
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
                        <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => onDelete(item)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
