"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface BodegaArticle {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit: string;
  minimumStock: number | string;
  partNumber?: string | null;
  brand?: string | null;
  model?: string | null;
  internalCode?: string | null;
  articleType?: string | null;
  quality?: string | null;
  isCritical?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BodegaArticlesResponse {
  data: BodegaArticle[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useBodegaArticles(page = 1, limit = 10, search = "") {
  return useQuery<BodegaArticlesResponse>({
    queryKey: ["bodega-articles", page, limit, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);

      const response = await fetch(`/api/v1/bodega/articulos?${params.toString()}`);
      if (!response.ok) throw new Error("Error al cargar artículos");
      return response.json();
    },
  });
}

export function useCreateBodegaArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<BodegaArticle>) => {
      const response = await fetch("/api/v1/bodega/articulos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al crear artículo");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodega-articles"] });
      toast.success("Artículo creado correctamente");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateBodegaArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<BodegaArticle>) => {
      const response = await fetch(`/api/v1/bodega/articulos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al actualizar artículo");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodega-articles"] });
      toast.success("Artículo actualizado correctamente");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteBodegaArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/bodega/articulos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al eliminar artículo");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodega-articles"] });
      toast.success("Artículo eliminado correctamente");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
