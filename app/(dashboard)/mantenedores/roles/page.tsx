"use client";

import { useState, useMemo } from "react";
import { useRoles, useDeleteRole, Role } from "@/lib/hooks/use-roles";
import { getRolesColumns, SortDirection } from "@/components/roles/roles-table-columns";
import { RoleForm } from "@/components/roles/role-form";
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
} from "@/components/ui/alert-dialog";

export default function RolesPage() {
    const { roles: texts } = maintenanceConfig;
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: SortDirection }>({ key: null, direction: null });

    // Estado para Delete Dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

    // Hooks de datos
    const { data: queryData, isLoading, isFetching, refetch } = useRoles(page, pageSize, search) as any;
    const { mutate: deleteRole } = useDeleteRole();

    const roles = queryData?.data || [];
    const meta = queryData?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

    // Ordenamiento lado cliente
    const sortedRoles = useMemo(() => {
        if (!sortConfig.key || !sortConfig.direction) return roles;

        return [...roles].sort((a: Role, b: Role) => {
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
                case "description":
                    valA = a.description?.toLowerCase() || "";
                    valB = b.description?.toLowerCase() || "";
                    break;
                case "isActive":
                    valA = a.isActive ? 1 : 0;
                    valB = b.isActive ? 1 : 0;
                    break;
                default:
                    return 0;
            }

            if (valA < valB) return direction === "asc" ? -1 : 1;
            if (valA > valB) return direction === "asc" ? 1 : -1;
            return 0;
        });
    }, [roles, sortConfig]);

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

    const handleConfirmDelete = () => {
        if (!roleToDelete) return;
        deleteRole(roleToDelete.id, {
            onSuccess: () => {
                toast.success(`Rol ${roleToDelete.name} desactivado`);
                setDeleteDialogOpen(false);
                setRoleToDelete(null);
                refetch();
            }
        });
    };

    return (
        <>
            <BaseMaintainer<Role>
                title={texts.header.title}
                description={texts.header.description}
                addNewLabel={texts.actions.add_new}
                getColumns={(handlers) => getRolesColumns({
                    ...handlers,
                    currentSort: sortConfig,
                    onSort: handleSort,
                    onDelete: (role) => {
                        setRoleToDelete(role);
                        setDeleteDialogOpen(true);
                    }
                })}
                onDelete={() => { }}
                data={sortedRoles}
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
                    <RoleForm
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

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción desactivará el rol <strong>{roleToDelete?.name}</strong>. Esto puede afectar el acceso de los usuarios asociados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setRoleToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Desactivar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
