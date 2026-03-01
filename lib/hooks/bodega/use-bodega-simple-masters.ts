"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface BodegaSimpleMaster {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  success: boolean;
  data: BodegaSimpleMaster[];
}

interface SimpleMasterInput {
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export function useBodegaSimpleMasters(resource: "centros-costo" | "motivos-ajuste", search = "") {
  return useQuery<ListResponse>({
    queryKey: ["bodega-maestros", resource, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      const response = await fetch(`/api/v1/bodega/maestros/${resource}?${params.toString()}`);
      if (!response.ok) throw new Error("No se pudo cargar el mantenedor");
      return response.json();
    },
  });
}

export function useCreateBodegaSimpleMaster(resource: "centros-costo" | "motivos-ajuste") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SimpleMasterInput) => {
      const response = await fetch(`/api/v1/bodega/maestros/${resource}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "No se pudo crear el registro");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodega-maestros", resource] });
      toast.success("Registro creado correctamente");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateBodegaSimpleMaster(resource: "centros-costo" | "motivos-ajuste") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SimpleMasterInput> }) => {
      const response = await fetch(`/api/v1/bodega/maestros/${resource}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "No se pudo actualizar el registro");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodega-maestros", resource] });
      toast.success("Registro actualizado correctamente");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteBodegaSimpleMaster(resource: "centros-costo" | "motivos-ajuste") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/bodega/maestros/${resource}/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "No se pudo eliminar el registro");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodega-maestros", resource] });
      toast.success("Registro eliminado correctamente");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
