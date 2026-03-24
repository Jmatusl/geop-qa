"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { bodegaQueryKeys } from "@/lib/hooks/query-keys";
import { invalidateBodegaStockQueries } from "@/lib/hooks/bodega/query-invalidation";

export interface BodegaMovement {
  id: string;
  folio: string;
  warehouseId: string;
  requestId: string | null;
  type: string;
  status: string;
  reason: string | null;
  observations: string | null;
  responsable: string | null;
  externalReference: string | null;
  quotationNumber: string | null;
  deliveryGuide: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
  request: {
    id: string;
    folio: string;
    status: string;
  } | null;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
  };
  approver: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  _count: {
    items: number;
  };
}

interface BodegaMovementsResponse {
  data: BodegaMovement[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

interface UseBodegaMovementsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  status?: string;
  warehouseId?: string;
}

export function useBodegaMovements(params: UseBodegaMovementsParams = {}) {
  const { page = 1, pageSize = 20, search = "", type = "", status = "", warehouseId = "" } = params;

  return useQuery<BodegaMovementsResponse>({
    queryKey: bodegaQueryKeys.movements.list({ page, pageSize, search, type, status, warehouseId }),
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("page", String(page));
      qs.set("pageSize", String(pageSize));
      if (search) qs.set("search", search);
      if (type) qs.set("type", type);
      if (status) qs.set("status", status);
      if (warehouseId) qs.set("warehouseId", warehouseId);

      const response = await fetch(`/api/v1/bodega/movimientos?${qs.toString()}`);
      if (!response.ok) {
        throw new Error("Error al cargar movimientos de bodega");
      }

      return response.json();
    },
  });
}

interface CreateBodegaMovementPayload {
  type: "INGRESO" | "SALIDA" | "AJUSTE" | "RESERVA" | "LIBERACION";
  warehouseId: string;
  articleId?: string;
  quantity?: number;
  unitCost?: number;
  items?: Array<{ articleId: string; quantity: number; unitCost?: number }>;
  reason?: string | null;
  observations?: string | null;
  responsable?: string | null;
  externalReference?: string | null;
  quotationNumber?: string | null;
  deliveryGuide?: string | null;
  evidence?: string[];
  autoVerify?: boolean;
}

export function useCreateBodegaMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateBodegaMovementPayload) => {
      const response = await fetch("/api/v1/bodega/movimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Error al crear movimiento");
      }

      return result;
    },
    onSuccess: async () => {
      await invalidateBodegaStockQueries(queryClient);
      toast.success("Movimiento registrado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useApproveBodegaMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/bodega/movimientos/${id}/aprobar`, {
        method: "POST",
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Error al aprobar movimiento");
      }

      return result;
    },
    onSuccess: async () => {
      await invalidateBodegaStockQueries(queryClient);
      toast.success("Movimiento aprobado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRejectBodegaMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await fetch(`/api/v1/bodega/movimientos/${id}/rechazar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Error al rechazar movimiento");
      }

      return result;
    },
    onSuccess: async () => {
      await invalidateBodegaStockQueries(queryClient);
      toast.success("Movimiento rechazado");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useApplyBodegaMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, observations }: { id: string; observations?: string }) => {
      const response = await fetch(`/api/v1/bodega/movimientos/${id}/aplicar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observations }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Error al aplicar movimiento");
      }

      return result;
    },
    onSuccess: async () => {
      await invalidateBodegaStockQueries(queryClient);
      toast.success("Movimiento aplicado y stock actualizado");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
