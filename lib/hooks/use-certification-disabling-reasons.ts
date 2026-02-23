"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface CertificationDisablingReason {
    id: string;
    code: string;
    name: string;
    description: string | null;
    isActive: boolean;
    displayOrder: number;
}

export interface ReasonsResponse {
    data: CertificationDisablingReason[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export function useCertificationDisablingReasons(page = 1, limit = 10, search = "") {
    return useQuery<ReasonsResponse>({
        queryKey: ["certification-disabling-reasons", page, limit, search],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search
            });
            const res = await fetch(`/api/v1/certifications/disabling-reasons?${params}`);
            if (!res.ok) throw new Error("Error al cargar motivos de baja");
            return res.json();
        }
    });
}

// Para selectores (trae todos los activos)
export function useAllActiveCertificationDisablingReasons() {
    return useQuery<CertificationDisablingReason[]>({
        queryKey: ["certification-disabling-reasons", "active"],
        queryFn: async () => {
            const res = await fetch("/api/v1/certifications/disabling-reasons?all=true&active=true");
            if (!res.ok) throw new Error("Error al cargar motivos de baja");
            return res.json();
        }
    });
}

export function useCreateCertificationDisablingReason() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Omit<CertificationDisablingReason, "id">) => {
            const res = await fetch("/api/v1/certifications/disabling-reasons", {
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
            queryClient.invalidateQueries({ queryKey: ["certification-disabling-reasons"] });
            toast.success("Motivo creado exitosamente");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });
}

export function useUpdateCertificationDisablingReason() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: CertificationDisablingReason) => {
            const res = await fetch(`/api/v1/certifications/disabling-reasons/${id}`, {
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
            queryClient.invalidateQueries({ queryKey: ["certification-disabling-reasons"] });
            toast.success("Motivo actualizado exitosamente");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });
}

export function useDeleteCertificationDisablingReason() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/v1/certifications/disabling-reasons/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Error al eliminar motivo");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["certification-disabling-reasons"] });
            toast.success("Motivo eliminado exitosamente");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });
}
