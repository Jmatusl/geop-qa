"use client";

import { useState, useMemo } from "react";
import { useWorkGroups, useDeleteWorkGroup, WorkGroup } from "@/lib/hooks/use-work-groups";
import { getWorkGroupsColumns, SortDirection } from "./columns";
import { WorkGroupForm } from "@/components/organization/work-group-form";
import { BaseMaintainer } from "@/components/maintainer/base-maintainer";
import maintenanceConfig from "@/lib/config/ui/maintainers.json";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function DeleteAlertDialog({ open, onOpenChange, onConfirm, title, description }: { open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void, title: string, description: string }) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white">
                        Eliminar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export default function WorkGroupsPage() {
    // @ts-ignore
    const { work_groups: texts } = maintenanceConfig;
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: SortDirection }>({ key: null, direction: null });

    const { data: queryData, isLoading, isFetching, refetch } = useWorkGroups(page, pageSize, search) as any;
    const { mutate: deleteItem } = useDeleteWorkGroup();

    const items = queryData?.data || [];
    const meta = queryData?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

    const sortedItems = useMemo(() => {
        if (!sortConfig.key || !sortConfig.direction) return items;

        return [...items].sort((a: WorkGroup, b: WorkGroup) => {
            const { key, direction } = sortConfig;
            let valA: any = "";
            let valB: any = "";

            switch (key) {
                case "code":
                    valA = a.code.toLowerCase();
                    valB = b.code.toLowerCase();
                    break;
                case "name":
                    valA = a.name.toLowerCase();
                    valB = b.name.toLowerCase();
                    break;
                case "isActive":
                    valA = a.isActive ? 1 : 0;
                    valB = b.isActive ? 1 : 0;
                    break;
                case "createdAt":
                    valA = new Date(a.createdAt).getTime();
                    valB = new Date(b.createdAt).getTime();
                    break;
                default:
                    return 0;
            }

            if (valA < valB) return direction === "asc" ? -1 : 1;
            if (valA > valB) return direction === "asc" ? 1 : -1;
            return 0;
        });
    }, [items, sortConfig]);

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

    const handleDelete = (item: WorkGroup) => {
        setDeleteTarget(item);
    };

    const [deleteTarget, setDeleteTarget] = useState<WorkGroup | null>(null);

    const checkDelete = () => {
        if (!deleteTarget) return;
        deleteItem(deleteTarget.id, {
            onSuccess: () => {
                refetch();
                setDeleteTarget(null);
            },
            onError: (err) => {
                toast.error("Error al eliminar (posiblemente referenciado)");
            }
        });
    };

    return (
        <>
            <BaseMaintainer<WorkGroup>
                title={texts?.header?.title || "Grupos de Trabajo"}
                description={texts?.header?.description || "Gestión de grupos"}
                addNewLabel={texts?.actions?.add_new || "Nuevo Grupo"}
                getColumns={(handlers) => getWorkGroupsColumns({
                    ...handlers,
                    currentSort: sortConfig,
                    onSort: handleSort
                })}
                onDelete={handleDelete}
                data={sortedItems}
                isLoading={isLoading}
                meta={meta}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                onSearchChange={(value) => {
                    setSearch(value);
                    setPage(1);
                }}
                onRefresh={() => refetch()}
                isRefreshing={isLoading || isFetching}
                renderForm={(mode, initialData, onCancel, onSuccess) => (
                    <WorkGroupForm
                        mode={mode}
                        initialData={initialData}
                        onCancel={onCancel}
                        onSuccess={() => {
                            refetch();
                            onSuccess();
                        }}
                    />
                )}
            />

            <DeleteAlertDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                onConfirm={checkDelete}
                title={`¿Eliminar grupo ${deleteTarget?.name}?`}
                description="Esta acción no se puede deshacer."
            />
        </>
    );
}
