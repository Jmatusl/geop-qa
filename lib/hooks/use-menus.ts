"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface MenuItem {
    id: string;
    key: string;
    title: string;
    icon?: string;
    path?: string;
    enabled: boolean;
    order: number;
    showIcon: boolean;
    parentId?: string; // ID del nodo padre
    roles?: string[];
    createdAt: string;
    children?: MenuItem[];
    parent?: { title: string }; // Para mostrar en tabla plana
}

// Hook para obtener el árbol de menús
export function useMenuTree(enabledOnly: boolean = false) {
    return useQuery<MenuItem[]>({
        queryKey: ["menus", "tree", enabledOnly],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (enabledOnly) params.append("enabled", "true");

            const res = await fetch(`/api/v1/menus?${params}`);
            if (!res.ok) throw new Error("Error al cargar menús");
            return res.json();
        }
    });
}

// Hook auxiliar para aplanar el árbol si necesitamos lista plana (e.g. selector de Padre)
// O mejor: usar la API GET sin procesar árbol? 
// No, mejor procesar en cliente si el dataset es pequeño, o tener endpoint 'flat'.
// Por simplicidad, usaremos el mismo tree y aplanaremos en UI si hace falta.

export function useCreateMenu() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/v1/menus", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Error al crear menú");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["menus"] });
            toast.success("Item de menú creado");
        },
        onError: (err: Error) => toast.error(err.message)
    });
}

export function useUpdateMenu() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: any) => {
            const res = await fetch(`/api/v1/menus/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Error al actualizar menú");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["menus"] });
            toast.success("Item actualizado");
        },
        onError: (err: Error) => toast.error(err.message)
    });
}

export function useDeleteMenu() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/v1/menus/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Error al eliminar menú");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["menus"] });
            toast.success("Item eliminado");
        },
        onError: (err: Error) => toast.error(err.message)
    });
}
export function useReorderMenus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (items: { id: string; parentId: string | null; order: number }[]) => {
            const res = await fetch("/api/v1/menus", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Error al reordenar menús");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["menus"] });
            toast.success("Estructura de menús guardada");
        },
        onError: (err: Error) => toast.error(err.message)
    });
}
