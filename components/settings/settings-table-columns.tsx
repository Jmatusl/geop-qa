"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, LayoutTemplate } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppSetting } from "@/lib/hooks/use-settings";
import { ArrowUp, ArrowDown } from "lucide-react";

export type SortDirection = "asc" | "desc" | null;

interface GetSettingColumnsProps {
    onEdit: (setting: AppSetting) => void;
    onDelete: (setting: AppSetting) => void;
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
    key: true,
    description: true,
    value: true,
    version: true,
    isActive: true
};

export const getSettingColumns = ({ onEdit, onDelete, currentSort, onSort }: GetSettingColumnsProps): ColumnDef<AppSetting>[] => [
    {
        accessorKey: "key",
        header: () => SORTABLE_COLUMNS.key
            ? <SortableHeader title="Clave (Key)" sortKey="key" currentSort={currentSort} onSort={onSort} />
            : "Clave (Key)",
        cell: ({ row }) => (
            <div className="flex items-center gap-2" title={row.original.hasCustomUi ? "Tiene UI de Configuración" : undefined}>
                {row.original.hasCustomUi && (
                    <LayoutTemplate className="h-4 w-4 text-blue-500" />
                )}
                <span className="font-mono font-medium">{row.original.key}</span>
            </div>
        )
    },
    {
        accessorKey: "description",
        header: () => SORTABLE_COLUMNS.description
            ? <SortableHeader title="Descripción" sortKey="description" currentSort={currentSort} onSort={onSort} />
            : "Descripción",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.description || "-"}</span>
    },
    {
        accessorKey: "value",
        header: () => SORTABLE_COLUMNS.value
            ? <SortableHeader title="Valor" sortKey="value" currentSort={currentSort} onSort={onSort} />
            : "Valor",
        cell: ({ row }) => {
            const value = row.original.value;
            const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            return <span className="text-xs font-mono truncate max-w-[200px] block" title={stringValue}>{stringValue}</span>
        }
    },
    {
        accessorKey: "version",
        header: () => SORTABLE_COLUMNS.version
            ? <SortableHeader title="Versión" sortKey="version" currentSort={currentSort} onSort={onSort} />
            : "Versión",
        cell: ({ row }) => <span className="text-xs">{row.original.version}</span>
    },
    {
        accessorKey: "isActive",
        header: () => SORTABLE_COLUMNS.isActive
            ? <SortableHeader title="Estado" sortKey="isActive" currentSort={currentSort} onSort={onSort} />
            : "Estado",
        cell: ({ row }) => {
            const active = row.original.isActive;
            return (
                <Badge variant={active ? "outline" : "destructive"} className={active ? "text-green-600 border-green-600" : ""}>
                    {active ? "Activo" : "Inactivo"}
                </Badge>
            );
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const setting = row.original;

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
                            onClick={() => navigator.clipboard.writeText(setting.key)}
                        >
                            Copiar Key
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit(setting)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => onDelete(setting)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
