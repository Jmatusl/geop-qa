"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { MenuItem, useReorderMenus } from "@/lib/hooks/use-menus";
import { SortableMenuItem } from "./sortable-item";
import { Button } from "@/components/ui/button";
import { Save, RefreshCw, Network, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface MenuTreeEditorProps {
    items: MenuItem[]; // Estructura de árbol
    onEdit: (item: MenuItem) => void;
    onDelete: (id: string) => void;
    onRefresh: () => void;
}

export function MenuTreeEditor({ items: initialTree, onEdit, onDelete, onRefresh }: MenuTreeEditorProps) {
    const [tree, setTree] = useState<MenuItem[]>(initialTree);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(initialTree.map(i => i.id)));
    const { mutate: reorderMenus, isPending: isSaving } = useReorderMenus();

    // Sincronizar con props
    useEffect(() => {
        setTree(initialTree);
        // Expandir todos por defecto al inicio
        setExpandedIds(new Set(initialTree.map(i => i.id)));
    }, [initialTree]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Obtener lista plana para DndContext (necesita IDs planos)
    // Pero queremos mantener la estructura jerárquica visible.
    // Usaremos un truco: una sola lista plana que representa el orden visual actual.
    const flatItems = useMemo(() => {
        const result: (MenuItem & { depth: number })[] = [];
        tree.forEach((parent) => {
            result.push({ ...parent, depth: 0 });
            if (expandedIds.has(parent.id) && parent.children) {
                parent.children.forEach((child) => {
                    result.push({ ...child, depth: 1 });
                });
            }
        });
        return result;
    }, [tree, expandedIds]);

    const activeItem = activeId ? flatItems.find(i => i.id === activeId) : null;

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over || active.id === over.id) return;

        const activeItem = flatItems.find(i => i.id === active.id);
        const overItem = flatItems.find(i => i.id === over.id);

        if (!activeItem || !overItem) return;

        // Lógica de reordenamiento simplificada para 2 niveles
        setTree((prevTree) => {
            const newTree = JSON.parse(JSON.stringify(prevTree)) as MenuItem[];

            // 1. Encontrar donde estaba el item activo y removerlo
            let movedItem: MenuItem | null = null;

            // Buscar en raíces
            const activeRootIndex = newTree.findIndex(i => i.id === active.id);
            if (activeRootIndex !== -1) {
                movedItem = newTree.splice(activeRootIndex, 1)[0];
            } else {
                // Buscar en hijos
                for (const parent of newTree) {
                    if (parent.children) {
                        const childIndex = parent.children.findIndex(i => i.id === active.id);
                        if (childIndex !== -1) {
                            movedItem = parent.children.splice(childIndex, 1)[0];
                            break;
                        }
                    }
                }
            }

            if (!movedItem) return prevTree;

            // 2. Encontrar el destino (overItem) y su posición en el árbol
            const overRootIndex = newTree.findIndex(i => i.id === over.id);

            if (overRootIndex !== -1) {
                // El destino es un padre de nivel 0
                // Lo insertamos antes o después? @dnd-kit se encarga del índice.
                // Pero aquí ya removimos el item, así que re-calculamos el índice real de 'over'
                const finalOverIndex = newTree.findIndex(i => i.id === over.id);

                // Si movemos un item de nivel 1 a un "over" de nivel 0, se convierte en nivel 0
                // Si movemos un nivel 0 a otro nivel 0, se mantiene
                movedItem.parentId = undefined;
                newTree.splice(finalOverIndex, 0, movedItem);
            } else {
                // El destino es un hijo de nivel 1
                for (const parent of newTree) {
                    if (parent.children) {
                        const childIndex = parent.children.findIndex(i => i.id === over.id);
                        if (childIndex !== -1) {
                            // Insertamos en este padre
                            movedItem.parentId = parent.id;
                            parent.children.splice(childIndex, 0, movedItem);
                            break;
                        }
                    }
                }
            }

            return newTree;
        });
    };

    const handleSave = () => {
        // Preparar payload plano con parentId y order actualizado
        const updates: { id: string; parentId: string | null; order: number }[] = [];

        tree.forEach((parent, pIdx) => {
            updates.push({
                id: parent.id,
                parentId: null,
                order: pIdx * 10
            });

            if (parent.children) {
                parent.children.forEach((child, cIdx) => {
                    updates.push({
                        id: child.id,
                        parentId: parent.id,
                        order: cIdx * 10
                    });
                });
            }
        });

        reorderMenus(updates);
    };

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedIds);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedIds(newExpanded);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Network className="h-5 w-5 text-[#283c7f]" />
                    <div>
                        <h2 className="text-lg font-bold">Jerarquía de Menús</h2>
                        <p className="text-sm text-muted-foreground">Arrastre para organizar. Soporta hasta 2 niveles.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={onRefresh} className="h-9">
                        <RefreshCw className="mr-2 h-4 w-4" /> Recargar
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="h-9 bg-[#283c7f] hover:bg-[#1e2d5f]"
                    >
                        {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar Cambios
                    </Button>
                </div>
            </div>

            <Alert className="bg-blue-50/50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-800 dark:text-blue-300 font-bold">Tip de Organización</AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-400 text-xs">
                    Solo los items de Nivel 1 pueden tener submenús. No se puede anidar más de dos niveles por diseño.
                </AlertDescription>
            </Alert>

            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl border p-6 min-h-[400px]">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={flatItems.map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-1">
                            {flatItems.map((item) => (
                                <SortableMenuItem
                                    key={item.id}
                                    item={item}
                                    depth={item.depth}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    isExpanded={expandedIds.has(item.id)}
                                    onToggleExpand={() => toggleExpand(item.id)}
                                    hasChildren={(item.children?.length ?? 0) > 0}
                                />
                            ))}
                        </div>
                    </SortableContext>

                    <DragOverlay dropAnimation={{
                        sideEffects: defaultDropAnimationSideEffects({
                            styles: {
                                active: {
                                    opacity: '0.5',
                                },
                            },
                        }),
                    }}>
                        {activeId && activeItem ? (
                            <SortableMenuItem
                                item={activeItem}
                                depth={activeItem.depth}
                                onEdit={() => { }}
                                onDelete={() => { }}
                                hasChildren={(activeItem.children?.length ?? 0) > 0}
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
}
