"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface DeactivationReason {
    id: string;
    code: string;
    name: string;
    description: string | null;
    displayOrder: number;
    isActive: boolean;
    createdAt: string;
}

interface DeactivationReasonsResponse {
    data: DeactivationReason[];
    meta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }
}

export function useDeactivationReasons(page?: number, limit?: number, search?: string) {
    return useQuery<DeactivationReasonsResponse | DeactivationReason[]>({
        queryKey: ["deactivation-reasons", page, limit, search],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (page) params.append("page", page.toString());
            if (limit) params.append("limit", limit.toString());
            if (search) params.append("search", search);

            const queryString = params.toString();
            const url = queryString ? `/api/v1/deactivation-reasons?${queryString}` : "/api/v1/deactivation-reasons";

            const res = await fetch(url);
            if (!res.ok) throw new Error("Error al cargar motivos de baja");
            return res.json();
        }
    })
}

export function useAllDeactivationReasons() {
    return useQuery<DeactivationReason[]>({
        queryKey: ["deactivation-reasons", "all"],
        queryFn: async () => {
            const res = await fetch("/api/v1/deactivation-reasons?all=true");
            if (!res.ok) throw new Error("Error al cargar lista de motivos");
            return res.json();
        }
    })
}

export function useCreateDeactivationReason() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/v1/deactivation-reasons", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Error al crear motivo");
            }

            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deactivation-reasons"] });
            toast.success("Motivo creado correctamente");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });
}

export function useUpdateDeactivationReason() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...data }: any) => {
            const res = await fetch(`/api/v1/deactivation-reasons/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Error al actualizar motivo");
            }

            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deactivation-reasons"] });
            toast.success("Motivo actualizado correctamente");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });
}

export function useDeleteDeactivationReason() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/v1/deactivation-reasons/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Error al eliminar");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deactivation-reasons"] });
            toast.success("Motivo eliminado correctamente");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    })
}
