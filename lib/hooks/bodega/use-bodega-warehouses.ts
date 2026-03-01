"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface BodegaWarehouse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BodegaWarehousesResponse {
  data: BodegaWarehouse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useBodegaWarehouses(page = 1, limit = 10, search = "") {
  return useQuery<BodegaWarehousesResponse>({
    queryKey: ["bodega-warehouses", page, limit, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);

      const response = await fetch(`/api/v1/bodega/bodegas?${params.toString()}`);
      if (!response.ok) throw new Error("Error al cargar bodegas");
      return response.json();
    },
  });
}

export function useCreateBodegaWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<BodegaWarehouse>) => {
      const response = await fetch("/api/v1/bodega/bodegas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al crear bodega");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodega-warehouses"] });
      toast.success("Bodega creada correctamente");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateBodegaWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<BodegaWarehouse>) => {
      const response = await fetch(`/api/v1/bodega/bodegas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al actualizar bodega");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodega-warehouses"] });
      toast.success("Bodega actualizada correctamente");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteBodegaWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/bodega/bodegas/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al eliminar bodega");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodega-warehouses"] });
      toast.success("Bodega eliminada correctamente");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
