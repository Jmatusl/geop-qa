"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface CredentialTheme {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    config: any;
    createdAt: string;
    updatedAt: string;
    createdBy?: {
        firstName: string;
        lastName: string;
    };
}

export function useCredentialThemes() {
    return useQuery<CredentialTheme[]>({
        queryKey: ["credential-themes"],
        queryFn: async () => {
            const res = await fetch("/api/v1/credential-themes");
            if (!res.ok) throw new Error("Error al cargar temas");
            return res.json();
        }
    });
}

export function useCreateCredentialTheme() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Partial<CredentialTheme>) => {
            const res = await fetch("/api/v1/credential-themes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Error al crear tema");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["credential-themes"] });
            toast.success("Tema creado correctamente");
        },
        onError: (err: Error) => toast.error(err.message)
    });
}

export function useUpdateCredentialTheme() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string } & Partial<CredentialTheme>) => {
            const res = await fetch(`/api/v1/credential-themes/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Error al actualizar tema");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["credential-themes"] });
            toast.success("Tema actualizado correctamente");
        },
        onError: (err: Error) => toast.error(err.message)
    });
}

export function useDeleteCredentialTheme() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/v1/credential-themes/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Error al eliminar tema");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["credential-themes"] });
            toast.success("Tema eliminado correctamente");
        },
        onError: (err: Error) => toast.error(err.message)
    });
}
