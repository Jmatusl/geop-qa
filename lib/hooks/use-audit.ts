"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface AuditLogsResponse {
    data: any[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }
}

interface AuditFilters {
    userId?: string;
    eventType?: string;
    module?: string;
    from?: string;
    to?: string;
    search?: string;
}

export function useAuditLogs(page: number = 1, limit: number = 20, filters: AuditFilters = {}) {
    return useQuery<AuditLogsResponse>({
        queryKey: ["audit-logs", page, limit, filters],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...Object.fromEntries(
                    Object.entries(filters).filter(([_, v]) => v && v !== "all")
                )
            });

            const res = await fetch(`/api/v1/audit/logs?${params}`);
            if (!res.ok) throw new Error("Error al cargar logs de auditoría");

            return res.json();
        },
    });
}

export function useAuditMetadata() {
    return useQuery({
        queryKey: ["audit-metadata"],
        queryFn: async () => {
            const res = await fetch("/api/v1/audit/metadata");
            if (!res.ok) throw new Error("Error al cargar metadatos de auditoría");
            return res.json();
        }
    });
}

export function useExportAudit() {
    return useMutation({
        mutationFn: async (filters: AuditFilters) => {
            const res = await fetch("/api/v1/audit/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filters }),
            });

            if (!res.ok) throw new Error("Error al generar exportación");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `auditoria_${new Date().getTime()}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        },
        onSuccess: () => {
            toast.success("Exportación generada exitosamente");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });
}
