"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, Folder, File } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MenuItem } from "@/lib/hooks/use-menus";
import * as LucideIcons from "lucide-react";
import React from "react";

// Helper para renderizar iconos dinámicos
const DynamicIcon = ({ name, className }: { name?: string, className?: string }) => {
    if (!name) return null;
    const Icon = (LucideIcons as any)[name];
    if (!Icon) return null;
    return <Icon className={className} />;
};

import { ArrowUp, ArrowDown } from "lucide-react";

export type SortDirection = "asc" | "desc" | null;

interface GetMenuColumnsProps {
    onEdit: (item: MenuItem) => void;
    onDelete: (item: MenuItem) => void;
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
    title: true,
    icon: true,
    path: true,
    order: true,
    status: true
};

// Extendemos MenuItem para incluir depth calculado en frontend
export type FlatMenuItem = MenuItem & { depth: number };

export const getMenuColumns = ({ onEdit, onDelete, currentSort, onSort }: GetMenuColumnsProps): ColumnDef<FlatMenuItem>[] => [
    {
        accessorKey: "title",
        header: () => SORTABLE_COLUMNS.title
            ? <SortableHeader title="Título" sortKey="title" currentSort={currentSort} onSort={onSort} />
            : "Título",
        cell: ({ row }) => {
            const item = row.original;
            const paddingLeft = item.depth * 20; // 20px por nivel

            return (
                <div className="flex items-center" style={{ paddingLeft: `${paddingLeft}px` }}>
                    {item.children && item.children.length > 0 ? (
                        <Folder className="h-4 w-4 mr-2 text-blue-500" />
                    ) : (
                        <File className="h-4 w-4 mr-2 text-gray-400" />
                    )}
                    <span className="font-medium">{item.title}</span>
                </div>
            );
        }
    },
    {
        accessorKey: "icon",
        header: () => SORTABLE_COLUMNS.icon
            ? <SortableHeader title="Icono" sortKey="icon" currentSort={currentSort} onSort={onSort} />
            : "Icono",
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <DynamicIcon name={row.original.icon} className="h-4 w-4" />
                <span className="text-xs text-muted-foreground">{row.original.icon}</span>
            </div>
        )
    },
    {
        accessorKey: "path",
        header: () => SORTABLE_COLUMNS.path
            ? <SortableHeader title="Ruta" sortKey="path" currentSort={currentSort} onSort={onSort} />
            : "Ruta",
        cell: ({ row }) => <span className="text-sm text-muted-foreground font-mono">{row.original.path || "-"}</span>
    },
    {
        accessorKey: "order",
        header: () => SORTABLE_COLUMNS.order
            ? <SortableHeader title="Orden" sortKey="order" currentSort={currentSort} onSort={onSort} />
            : "Orden",
        cell: ({ row }) => <span className="text-xs">{row.original.order}</span>
    },
    {
        accessorKey: "enabled",
        header: () => SORTABLE_COLUMNS.status
            ? <SortableHeader title="Estado" sortKey="enabled" currentSort={currentSort} onSort={onSort} />
            : "Estado",
        cell: ({ row }) => {
            const enabled = row.original.enabled;
            return (
                <Badge variant={enabled ? "outline" : "destructive"} className={enabled ? "text-green-600 border-green-600" : ""}>
                    {enabled ? "Visible" : "Oculto"}
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
                        <DropdownMenuItem
                            onClick={() => navigator.clipboard.writeText(item.key)}
                        >
                            Copiar Key
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit(item)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
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
