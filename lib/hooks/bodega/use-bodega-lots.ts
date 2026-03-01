"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bodegaQueryKeys } from "@/lib/hooks/query-keys";
import { toast } from "sonner";

interface UseBodegaLotsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  warehouseId?: string;
  articleId?: string;
  status?: string;
}

interface BodegaLot {
  id: string;
  loteCode: string;
  movementType: string;
  status: string;
  quantity: string;
  initialQuantity: string;
  unitCost: string | null;
  expirationDate: string | null;
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
  serialCount: number;
}

interface BodegaLotsResponse {
  data: BodegaLot[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export function useBodegaLots(params: UseBodegaLotsParams = {}) {
  const {
    page = 1,
    pageSize = 20,
    search = "",
    warehouseId = "",
    articleId = "",
    status = "",
  } = params;

  return useQuery<BodegaLotsResponse>({
    queryKey: bodegaQueryKeys.lots.list({ page, pageSize, search, warehouseId, articleId, status }),
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("page", String(page));
      qs.set("pageSize", String(pageSize));
      if (search) qs.set("search", search);
      if (warehouseId) qs.set("warehouseId", warehouseId);
      if (articleId) qs.set("articleId", articleId);
      if (status) qs.set("status", status);

      const response = await fetch(`/api/v1/bodega/lotes?${qs.toString()}`);
      if (!response.ok) {
        throw new Error("Error al cargar lotes");
      }

      return response.json();
    },
  });
}

interface CreateBodegaLotPayload {
  code: string;
  warehouseId: string;
  articleId: string;
  initialQuantity: number;
  currentQuantity?: number;
  unitCost?: number | null;
  manufactureDate?: string | null;
  expirationDate?: string | null;
  provider?: string | null;
  invoiceNumber?: string | null;
  status?: "ACTIVO" | "VENCIDO" | "AGOTADO" | "RETIRADO";
  observations?: string | null;
}

export function useCreateBodegaLot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateBodegaLotPayload) => {
      const response = await fetch("/api/v1/bodega/lotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Error al crear lote");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bodegaQueryKeys.lots.all });
      toast.success("Lote creado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}