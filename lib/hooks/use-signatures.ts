import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Signature {
  id: string;
  name: string;
  data: string;
  isActive: boolean;
  isDefault: boolean;
  userId?: string | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export function useSignatures(search: string = "") {
  return useQuery({
    queryKey: ["signatures", search],
    queryFn: async () => {
      const response = await fetch(`/api/v1/signatures?search=${encodeURIComponent(search)}`);
      if (!response.ok) throw new Error("Error al cargar firmas");
      return response.json() as Promise<Signature[]>;
    },
  });
}

export function useSignature(id: string | null | undefined) {
  return useQuery({
    queryKey: ["signature", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/v1/signatures/${id}`);
      if (!response.ok) throw new Error("Error al cargar firma");
      return response.json() as Promise<Signature>;
    },
    enabled: !!id,
  });
}

export function useCreateSignature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Signature>) => {
      const response = await fetch("/api/v1/signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Error al crear firma");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signatures"] });
      toast.success("Firma creada correctamente");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateSignature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Signature> }) => {
      const response = await fetch(`/api/v1/signatures/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Error al actualizar firma");
      }
      return response.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["signatures"] });
      queryClient.invalidateQueries({ queryKey: ["signature", id] });
      toast.success("Firma actualizada correctamente");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteSignature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/signatures/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Error al eliminar firma");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signatures"] });
      toast.success("Firma eliminada correctamente");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}
