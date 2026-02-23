"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface WorkGroup {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface WorkGroupsResponse {
    data: WorkGroup[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }
}

export function useWorkGroups(page: number = 1, limit: number = 10, search: string = "") {
    return useQuery<WorkGroupsResponse>({
        queryKey: ["work-groups", page, limit, search],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append("page", page.toString());
            params.append("limit", limit.toString());
            if (search) params.append("search", search);

            const res = await fetch(`/api/v1/organization/work-groups?${params.toString()}`);
            if (!res.ok) throw new Error("Error al cargar grupos");
            return res.json();
        }
    });
}

export function useAllWorkGroups() {
    return useQuery<WorkGroup[]>({
        queryKey: ["work-groups", "all"],
        queryFn: async () => {
            const res = await fetch("/api/v1/organization/work-groups?all=true");
            if (!res.ok) throw new Error("Error al cargar lista de grupos");
            return res.json();
        }
    });
}

export function useCreateWorkGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Partial<WorkGroup>) => {
            const res = await fetch("/api/v1/organization/work-groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Error al crear grupo");
            }

            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["work-groups"] });
            toast.success("Grupo creado correctamente");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });
}

export function useUpdateWorkGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string } & Partial<WorkGroup>) => {
            const res = await fetch(`/api/v1/organization/work-groups/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Error al actualizar grupo");
            }

            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["work-groups"] });
            toast.success("Grupo actualizado correctamente");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });
}

export function useDeleteWorkGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/v1/organization/work-groups/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Error al eliminar");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["work-groups"] });
            toast.success("Grupo eliminado correctamente");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });
}
