"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface AppSetting {
    id: string;
    key: string;
    value: any; // JSON
    description?: string;
    isActive: boolean;
    hasCustomUi: boolean;
    version: number;
    createdAt: string;
    updatedAt: string;
}

export function useSettings() {
    return useQuery<AppSetting[]>({
        queryKey: ["settings"],
        queryFn: async () => {
            const res = await fetch("/api/v1/settings", { cache: 'no-store' });
            if (!res.ok) throw new Error("Error fetching settings");
            return res.json();
        }
    });
}

export function useCreateSetting() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/v1/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Error al crear configuración");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["settings"] });
            toast.success("Configuración creada");
        },
        onError: (err: Error) => toast.error(err.message)
    });
}

export function useUpdateSetting() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: any) => {
            const res = await fetch(`/api/v1/settings/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Error al actualizar configuración");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["settings"] });
            toast.success("Configuración actualizada");
        },
        onError: (err: Error) => toast.error(err.message)
    });
}

export function useDeleteSetting() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/v1/settings/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Error al eliminar configuración");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["settings"] });
            toast.success("Configuración eliminada");
        },
        onError: (err: Error) => toast.error(err.message)
    });
}
