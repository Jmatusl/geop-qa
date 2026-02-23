"use client";

import { useState, useMemo } from "react";
import { useMenuTree, useDeleteMenu, MenuItem } from "@/lib/hooks/use-menus";
import { getMenuColumns, SortDirection } from "@/components/menus/menus-table-columns";
import { DataTable } from "@/components/ui/data-table"; // DataTable genérico reutilizado
import { MenuForm } from "@/components/menus/menu-form";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Network, List as ListIcon } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MenuTreeEditor } from "@/components/menus/visual-editor/menu-tree-editor";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { flattenTree, cn } from "@/lib/utils";

export default function MenusPage() {
    // Para tabla plana, usamos paginación local o mostramos todo.
    // Al ser configuración de sistema, es raro tener 1000 items. Mejor mostrar todo scrollable.
    const [search, setSearch] = useState("");
    const [mode, setMode] = useState<'table' | 'create' | 'edit'>('table');
    const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: SortDirection }>({ key: null, direction: null });
    const [pageIndex, setPageIndex] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Estado para Delete Dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [menuToDelete, setMenuToDelete] = useState<MenuItem | null>(null);

    const { data: treeData, isLoading, isFetching, refetch } = useMenuTree();
    const { mutate: deleteMenu } = useDeleteMenu();

    // Aplanar datos para la tabla
    const flatData = useMemo(() => {
        if (!treeData) return [];
        let flattened = flattenTree(treeData);

        if (search) {
            flattened = flattened.filter(item =>
                item.title.toLowerCase().includes(search.toLowerCase()) ||
                item.key.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Aplicar ordenamiento
        if (sortConfig.key && sortConfig.direction) {
            flattened.sort((a, b) => {
                const { key, direction } = sortConfig;
                let valA: any = "";
                let valB: any = "";

                switch (key) {
                    case "title":
                        valA = a.title.toLowerCase();
                        valB = b.title.toLowerCase();
                        break;
                    case "icon":
                        valA = a.icon?.toLowerCase() || "";
                        valB = b.icon?.toLowerCase() || "";
                        break;
                    case "path":
                        valA = a.path?.toLowerCase() || "";
                        valB = b.path?.toLowerCase() || "";
                        break;
                    case "order":
                        valA = a.order;
                        valB = b.order;
                        break;
                    case "enabled":
                        valA = a.enabled ? 1 : 0;
                        valB = b.enabled ? 1 : 0;
                        break;
                    default:
                        return 0;
                }

                if (valA < valB) return direction === "asc" ? -1 : 1;
                if (valA > valB) return direction === "asc" ? 1 : -1;
                return 0;
            });
        }

        return flattened;
    }, [treeData, search, sortConfig]);

    const handleCreate = () => {
        setSelectedMenu(null);
        setMode('create');
    };

    const handleEdit = (item: MenuItem) => {
        setSelectedMenu(item);
        setMode('edit');
    };

    const handleDelete = (item: MenuItem) => {
        setMenuToDelete(item);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!menuToDelete) return;
        deleteMenu(menuToDelete.id, {
            onSuccess: () => {
                toast.success(`Menú ${menuToDelete.title} eliminado`);
                setDeleteDialogOpen(false);
                setMenuToDelete(null);
                refetch();
            }
        });
    };

    const handleSort = (key: string) => {
        setSortConfig((current) => {
            if (current.key === key) {
                if (current.direction === "asc") return { key, direction: "desc" };
                if (current.direction === "desc") return { key: null, direction: null };
                return { key, direction: "asc" };
            }
            return { key, direction: "asc" };
        });
    };

    // Paginación local
    const paginatedData = useMemo(() => {
        const start = (pageIndex - 1) * pageSize;
        const end = start + pageSize;
        return flatData.slice(start, end);
    }, [flatData, pageIndex, pageSize]);

    const pageCount = Math.ceil(flatData.length / pageSize);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setPageIndex(1);
    };

    const handleCancel = () => {
        setMode('table');
        setSelectedMenu(null);
    };

    const handleSuccess = () => {
        setMode('table');
        setSelectedMenu(null);
        refetch();
        toast.success(mode === 'create' ? "Menú creado" : "Menú actualizado");
    };

    const columns = useMemo(() => getMenuColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
        currentSort: sortConfig,
        onSort: handleSort
    }), [sortConfig]);

    // VISTA FORMULARIO
    if (mode === 'create' || mode === 'edit') {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        {mode === 'create' ? 'Crear Menú' : 'Editar Menú'}
                    </h1>
                </div>
                <MenuForm
                    mode={mode}
                    initialData={selectedMenu}
                    onCancel={handleCancel}
                    onSuccess={handleSuccess}
                />
            </div>
        );
    }

    // VISTA TABLA / EDITOR
    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-3">
                            <Network className="h-8 w-8 text-[#283c7f]" />
                            Gestión de Menús
                        </h1>
                        <p className="text-muted-foreground mt-1">Configure la estructura de navegación y el control de acceso.</p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto justify-end">
                        <Button
                            variant="outline"
                            onClick={() => refetch()}
                            disabled={isLoading || isFetching}
                            title="Recargar"
                        >
                            <RefreshCw className={cn("h-4 w-4", (isLoading || isFetching) && "animate-spin")} />
                        </Button>
                        <Button onClick={handleCreate} className="bg-[#283c7f] hover:bg-[#1e2d5f] text-white shadow-md">
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Item
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="visual" className="w-full">
                    <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 mb-6">
                        <TabsTrigger value="visual" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 shadow-sm">
                            <Network className="h-4 w-4" /> Editor Visual
                        </TabsTrigger>
                        <TabsTrigger value="table" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 shadow-sm">
                            <ListIcon className="h-4 w-4" /> Listado Plano
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="visual" className="mt-0 border-none p-0 focus-visible:ring-0">
                        <MenuTreeEditor
                            items={treeData || []}
                            onEdit={handleEdit}
                            onDelete={(id) => {
                                const item = flatData.find(i => i.id === id);
                                if (item) handleDelete(item as any);
                            }}
                            onRefresh={refetch}
                        />
                    </TabsContent>

                    <TabsContent value="table" className="mt-0 border-none p-0 focus-visible:ring-0">
                        <div className="bg-white dark:bg-slate-950 rounded-xl border shadow-sm overflow-hidden">
                            <DataTable
                                columns={columns}
                                data={paginatedData}
                                pageCount={pageCount}
                                totalRows={flatData.length}
                                pageIndex={pageIndex}
                                pageSize={pageSize}
                                onPageChange={setPageIndex}
                                onPageSizeChange={(size) => {
                                    setPageSize(size);
                                    setPageIndex(1);
                                }}
                                onSearchChange={handleSearchChange}
                                isLoading={isLoading}
                            />
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el menú <strong>{menuToDelete?.title}</strong> y todos sus submenús asociados de forma permanente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setMenuToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
