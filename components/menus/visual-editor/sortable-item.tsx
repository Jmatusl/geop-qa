"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    GripVertical,
    Edit2,
    Trash2,
    ChevronRight,
    ChevronDown,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MenuItem } from "@/lib/hooks/use-menus";
import { Badge } from "@/components/ui/badge";

interface SortableMenuItemProps {
    item: MenuItem;
    depth?: number;
    onEdit: (item: MenuItem) => void;
    onDelete: (id: string) => void;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    hasChildren?: boolean;
}

export function SortableMenuItem({
    item,
    depth = 0,
    onEdit,
    onDelete,
    isExpanded,
    onToggleExpand,
    hasChildren
}: SortableMenuItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        marginLeft: `${depth * 24}px`,
    };

    // Dinámicamente obtener el icono de Lucide
    const IconComponent = item.icon ? (LucideIcons as any)[item.icon] : null;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group relative mb-2 flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm transition-all",
                isDragging && "z-50 opacity-50 ring-2 ring-primary",
                depth > 0 ? "border-l-4 border-l-slate-300 dark:border-l-slate-700 bg-slate-50/50 dark:bg-slate-900/50" : "border-slate-200 dark:border-slate-800"
            )}
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 transition-colors"
                title="Arrastrar para reordenar"
            >
                <GripVertical className="h-5 w-5" />
            </div>

            <div className="flex items-center gap-3 flex-1 min-w-0">
                {depth === 0 && hasChildren && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-800"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand?.();
                        }}
                    >
                        {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </Button>
                )}

                {!hasChildren && depth === 0 && <div className="w-6" />}

                <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
                    !item.enabled && "opacity-50"
                )}>
                    {IconComponent ? (
                        <IconComponent className="h-4 w-4" />
                    ) : (
                        <div className="h-1 w-1 rounded-full bg-current" />
                    )}
                </div>

                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-sm font-semibold truncate",
                            !item.enabled && "text-muted-foreground line-through"
                        )}>
                            {item.title}
                        </span>
                        {!item.enabled && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1">Oculto</Badge>
                        )}
                        {item.roles && item.roles.length > 0 && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 border-blue-200 text-blue-600 dark:border-blue-900 dark:text-blue-400">
                                {item.roles.length} Roles
                            </Badge>
                        )}
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate font-mono">
                        {item.path || "Submenú / Grupo"}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                    onClick={() => onEdit(item)}
                >
                    <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={() => onDelete(item.id)}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}
