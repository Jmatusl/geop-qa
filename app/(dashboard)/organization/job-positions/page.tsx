"use client";

import { useState, useMemo } from "react";
import { useJobPositions, useDeleteJobPosition, JobPosition } from "@/lib/hooks/use-job-positions";
import { getJobPositionsColumns, SortDirection } from "./columns";
import { JobPositionForm } from "@/components/organization/job-position-form";
import { BaseMaintainer } from "@/components/maintainer/base-maintainer";
import maintenanceConfig from "@/lib/config/ui/maintainers.json";
import { toast } from "sonner";

export default function JobPositionsPage() {
    // @ts-ignore
    const { job_positions: texts } = maintenanceConfig;
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: SortDirection }>({ key: null, direction: null });

    const { data: queryData, isLoading, isFetching, refetch } = useJobPositions(page, pageSize, search) as any;
    const { mutate: deleteItem } = useDeleteJobPosition();

    const items = queryData?.data || [];
    const meta = queryData?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

    const sortedItems = useMemo(() => {
        if (!sortConfig.key || !sortConfig.direction) return items;

        return [...items].sort((a: JobPosition, b: JobPosition) => {
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

    const handleDelete = (item: JobPosition) => {
        // Usar AlertDialog idealmente, por simplicidad uso delete directo en el callback del componente BaseMaintainer si lo tuviera,
        // pero BaseMaintainer solo llama onDelete.
        // Implementar un confirm simple o custom dialog.
        // El User Rules dice: NO usar window.confirm(). Usar AlertDialog.
        // BaseMaintainer no tiene AlertDialog integrado... pero roles page usaba confirm()!
        // Wait, "RolesPage" snippet I saw earlier used: `if (confirm(...))`.
        // User rule 2.6 says: "Prohibición: No usar la función nativa window.confirm(). Usar exclusivamente el componente AlertDialog".
        // The existing RolesPage VIOLATES this rule. I must create a compliant version.
        // I will implement a local state for the Alert Dialog.

        setDeleteTarget(item);
    };

    const [deleteTarget, setDeleteTarget] = useState<JobPosition | null>(null);

    const checkDelete = () => {
        if (!deleteTarget) return;
        deleteItem(deleteTarget.id, {
            onSuccess: () => {
                refetch();
                setDeleteTarget(null);
            },
            onError: (err) => {
                // Error is handled in hook toast
                toast.error("Error al eliminar (posiblemente referenciado)");
            }
        });
    };

    // Note: I need to wrap BaseMaintainer with the AlertDialog.

    return (
        <>
            <BaseMaintainer<JobPosition>
                title={texts?.header?.title || "Cargos"}
                description={texts?.header?.description || "Gestión de cargos"}
                addNewLabel={texts?.actions?.add_new || "Nuevo Cargo"}
                getColumns={(handlers) => getJobPositionsColumns({
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
                    <JobPositionForm
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

            {/* Alert Dialog for Delete */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    {/* Simplified Modal for now, or use shadcn AlertDialog properly if I import it */}
                    {/* For speed and strict adherence, I should import AlertDialog from shadcn */}
                </div>
            )}
            <DeleteAlertDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                onConfirm={checkDelete}
                title={`¿Eliminar cargo ${deleteTarget?.name}?`}
                description="Esta acción no se puede deshacer. Esto eliminará permanentemente el cargo."
            />
        </>
    );
}

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
