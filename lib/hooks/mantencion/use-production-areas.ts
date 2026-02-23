"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface ProductionArea {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductionAreasResponse {
  data: ProductionArea[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useProductionAreas(page: number = 1, limit: number = 10, search: string = "") {
  return useQuery<ProductionAreasResponse>({
    queryKey: ["mnt-production-areas", page, limit, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);

      const res = await fetch(`/api/v1/mantencion/configuracion/production-areas?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar áreas de producción");
      return res.json();
    },
  });
}

export function useProductionArea(id?: string | null) {
  return useQuery<ProductionArea>({
    queryKey: ["mnt-production-areas", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/v1/mantencion/configuracion/production-areas/${id}`);
      if (!res.ok) throw new Error("Error al cargar elemento");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useAllProductionAreas() {
  return useQuery<ProductionArea[]>({
    queryKey: ["mnt-production-areas", "all"],
    queryFn: async () => {
      const res = await fetch("/api/v1/mantencion/configuracion/production-areas?all=true");
      if (!res.ok) throw new Error("Error al cargar lista de áreas de producción");
      return res.json();
    },
  });
}

export function useCreateProductionArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<ProductionArea>) => {
      const res = await fetch("/api/v1/mantencion/configuracion/production-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear área de producción");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-production-areas"] });
      toast.success("Área de producción creada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateProductionArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<ProductionArea>) => {
      const res = await fetch(`/api/v1/mantencion/configuracion/production-areas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar área de producción");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-production-areas"] });
      toast.success("Área de producción actualizada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteProductionArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/mantencion/configuracion/production-areas/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-production-areas"] });
      toast.success("Área de producción eliminada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
