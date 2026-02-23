import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface EmailTemplate {
    id: string;
    code: string;
    name: string;
    subject: string;
    htmlContent: string;
    description?: string;
    variables?: string[];
    isActive: boolean;
    updatedAt: string;
    updatedBy?: {
        firstName: string;
        lastName: string;
    };
}

// Fetch Templates
export function useEmailTemplates() {
    return useQuery<EmailTemplate[]>({
        queryKey: ["email-templates"],
        queryFn: async () => {
            const res = await fetch("/api/v1/email-templates");
            if (!res.ok) throw new Error("Error al cargar templates");
            return res.json();
        },
    });
}

// Update Template
export function useUpdateEmailTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<EmailTemplate> }) => {
            const res = await fetch(`/api/v1/email-templates/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Error al actualizar template");
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success("Template actualizado correctamente");
            queryClient.invalidateQueries({ queryKey: ["email-templates"] });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}
