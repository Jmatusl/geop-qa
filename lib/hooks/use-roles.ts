"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Role {
    id: string;
    code: string;
    name: string;
    description: string | null;
    isActive: boolean;
    createdAt: string;
}

interface RolesResponse {
    data: Role[];
    meta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }
}

// Hook para listar roles (Soporta paginación y modo lista simple)
export function useRoles(page?: number, limit?: number, search?: string) {
    return useQuery<RolesResponse | Role[]>({
        queryKey: ["roles", page, limit, search],
        queryFn: async () => {
            // Si no hay paginación, llamar sin params (compatible con selectores que esperan array)
            // Pero vamos a estandarizar: si se pasan params, se aplica paginación.
            // Si no, la API devolverá todos (o una lista default).

            const params = new URLSearchParams();
            if (page) params.append("page", page.toString());
            if (limit) params.append("limit", limit.toString());
            if (search) params.append("search", search);

            const queryString = params.toString();
            const url = queryString ? `/api/v1/roles?${queryString}` : "/api/v1/roles";

            const res = await fetch(url);
            if (!res.ok) throw new Error("Error al cargar roles");
            return res.json();
        }
    })
}

// Hook específico para obtener TODOS los roles para selectores (sin paginación)
// Esto asegura compatibilidad con UserForm
export function useAllRoles() {
    return useQuery<Role[]>({
        queryKey: ["roles", "all"],
        queryFn: async () => {
            const res = await fetch("/api/v1/roles?all=true");
            if (!res.ok) throw new Error("Error al cargar lista de roles");
            // La API debe retornar un array directo cuando all=true
            return res.json();
        }
    })
}


export function useCreateRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/v1/roles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Error al crear rol");
            }

            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            toast.success("Rol creado correctamente");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });
}

export function useUpdateRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...data }: any) => {
            const res = await fetch(`/api/v1/roles/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Error al actualizar rol");
            }

            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });
}

export function useDeleteRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/v1/roles/${id}`, {
                method: "DELETE", // O PATCH para soft delete
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Error al eliminar");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            toast.success("Rol desactivado/eliminado correctamente");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    })
}
