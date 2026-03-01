"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bodegaQueryKeys } from "@/lib/hooks/query-keys";
import { toast } from "sonner";

interface UseBodegaSeriesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  warehouseId?: string;
  status?: string;
  articleId?: string;
}

interface BodegaSeriesRow {
  id: string;
  serialNumber: string;
  sourceFolio: string;
  status: string;
  quantity: string;
  createdAt: string;
  article: {
    id: string;
    code: string;
    name: string;
    unit: string;
  };
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
}

interface BodegaSeriesResponse {
  data: BodegaSeriesRow[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export function useBodegaSeries(params: UseBodegaSeriesParams = {}) {
  const {
    page = 1,
    pageSize = 20,
    search = "",
    warehouseId = "",
    status = "",
    articleId = "",
  } = params;

  return useQuery<BodegaSeriesResponse>({
    queryKey: bodegaQueryKeys.series.list({ page, pageSize, search, warehouseId, status, articleId }),
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("page", String(page));
      qs.set("pageSize", String(pageSize));
      if (search) qs.set("search", search);
      if (warehouseId) qs.set("warehouseId", warehouseId);
      if (status) qs.set("status", status);
      if (articleId) qs.set("articleId", articleId);

      const response = await fetch(`/api/v1/bodega/series?${qs.toString()}`);
      if (!response.ok) {
        throw new Error("Error al cargar números de serie");
      }

      return response.json();
    },
  });
}

interface CreateBodegaSeriesPayload {
  lotId: string;
  serialNumber: string;
  status?: "DISPONIBLE" | "RESERVADO" | "ENTREGADO" | "BAJA";
  notes?: string | null;
}

export function useCreateBodegaSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateBodegaSeriesPayload) => {
      const response = await fetch("/api/v1/bodega/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Error al crear número de serie");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bodegaQueryKeys.series.all });
      toast.success("Número de serie creado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}