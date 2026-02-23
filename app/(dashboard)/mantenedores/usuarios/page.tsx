"use client";

import { useEffect, useState, useMemo } from "react";
import { BaseMaintainer } from "@/components/maintainer/base-maintainer";
import { getColumns, User, SortDirection } from "@/components/users/users-table-columns";
import { useUsers, useUpdateUser } from "@/lib/hooks/use-users";
import { useAllRoles } from "@/lib/hooks/use-roles";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { UserDeactivateDialog } from "@/components/users/user-deactivate-dialog";
import { toast } from "sonner";
import { UserForm } from "@/components/users/user-form";
import maintenanceConfig from "@/lib/config/ui/maintainers.json";

export default function UsersPage() {
    const { usuarios: texts } = maintenanceConfig;
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState("");
    const [roleIdFilter, setRoleIdFilter] = useState<string>("all");
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: SortDirection }>({ key: null, direction: null });
    const [mounted, setMounted] = useState(false);

    // Estado de desactivación
    const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
    const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Hooks de datos
    // Nota: Eliminamos sortConfig del hook para evitar refetching, ordenamos lado cliente
    const { data, isLoading, isFetching, refetch } = useUsers(page, pageSize, search, roleIdFilter);
    const { data: roles } = useAllRoles();
    const { mutate: updateUser } = useUpdateUser();

    const users = data?.data || [];
    const meta = data?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

    // Ordenamiento lado cliente (Client-side sorting)
    const sortedUsers = useMemo(() => {
        if (!sortConfig.key || !sortConfig.direction) return users;

        return [...users].sort((a, b) => {
            const { key, direction } = sortConfig;
            let valA: any = "";
            let valB: any = "";

            switch (key) {
                case "rut":
                    valA = a.rut || "";
                    valB = b.rut || "";
                    break;
                case "fullName":
                    // Construir nombre completo para comparar
                    valA = `${a.firstName} ${a.lastName}`.toLowerCase();
                    valB = `${b.firstName} ${b.lastName}`.toLowerCase();
                    break;
                case "email":
                    valA = a.email.toLowerCase();
                    valB = b.email.toLowerCase();
                    break;
                case "role.name":
                    valA = a.role?.name?.toLowerCase() || "";
                    valB = b.role?.name?.toLowerCase() || "";
                    break;
                case "isActive":
                    // Sort boolean: true (Activo) before false (Inactivo) ? or vice versa
                    // let's treat true as 1, false as 0
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
    }, [users, sortConfig]);

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

    const handleConfirmDeactivation = (reasonId: string, comment: string) => {
        if (!userToDeactivate) return;

        updateUser({
            id: userToDeactivate.id,
            isDeactivated: true,
            deactivationReasonId: reasonId,
            deactivationComment: comment
        }, {
            onSuccess: () => {
                setDeactivateDialogOpen(false);
                setUserToDeactivate(null);
                refetch();
                toast.success(`Usuario ${userToDeactivate.firstName} desactivado correctamente`);
            }
        });
    };

    const handleSuccess = () => {
        refetch();
        toast.success("Operación realizada con éxito");
    };

    return (
        <>
            <BaseMaintainer<User>
                title={texts.header.title}
                description={texts.header.description}
                addNewLabel={texts.actions.add_new}
                getColumns={(handlers) => getColumns({
                    ...handlers,
                    onDelete: (user) => {
                        setUserToDeactivate(user);
                        setDeactivateDialogOpen(true);
                    },
                    currentSort: sortConfig,
                    onSort: handleSort
                })}
                onDelete={() => { }} // Manejado por el custom handler arriba
                data={sortedUsers as User[]}
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
                filters={
                    <div className="flex items-center gap-4">
                        <Input
                            placeholder={texts.actions.search_placeholder}
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="h-9 w-[250px]"
                        />
                        {mounted ? (
                            <Select value={roleIdFilter} onValueChange={(val) => {
                                setRoleIdFilter(val);
                                setPage(1);
                            }}>
                                <SelectTrigger className="w-[180px] h-9">
                                    <SelectValue placeholder="Filtrar por Rol" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los Roles</SelectItem>
                                    {roles?.map((role: any) => (
                                        <SelectItem key={role.id} value={role.id}>
                                            {role.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="w-[180px] h-9 border rounded-md" />
                        )}
                    </div>
                }
                renderForm={(mode, initialData, onCancel, onSuccess) => (
                    <UserForm
                        mode={mode}
                        initialData={initialData}
                        onCancel={onCancel}
                        onSuccess={() => {
                            handleSuccess();
                            onSuccess();
                        }}
                    />
                )}
            />

            <UserDeactivateDialog
                open={deactivateDialogOpen}
                onOpenChange={setDeactivateDialogOpen}
                onConfirm={handleConfirmDeactivation}
                user={userToDeactivate}
            />
        </>
    );
}
