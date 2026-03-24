"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface UseVerificationFilters {
  warehouseId?: string;
  search?: string;
}

export function useBodegaPendingMovements({ warehouseId = "", search = "" }: UseVerificationFilters) {
  return useQuery({
    queryKey: ["bodega", "verification", "movements", warehouseId, search],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("page", "1");
      qs.set("pageSize", "100");
      qs.set("status", "PENDIENTE");
      if (warehouseId) qs.set("warehouseId", warehouseId);
      if (search) qs.set("search", search);

      const response = await fetch(`/api/v1/bodega/movimientos?${qs.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("No se pudieron obtener movimientos pendientes");
      }

      return response.json();
    },
  });
}

export function useBodegaStockForVerification({ warehouseId = "", search = "" }: UseVerificationFilters) {
  return useQuery({
    queryKey: ["bodega", "verification", "stock", warehouseId, search],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("page", "1");
      qs.set("pageSize", "200");
      if (warehouseId) qs.set("warehouseId", warehouseId);
      if (search) qs.set("search", search);

      const response = await fetch(`/api/v1/bodega/stock?${qs.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("No se pudo obtener stock");
      }

      return response.json();
    },
  });
}

export function useApplyBodegaMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      movementId,
      observations,
      items,
    }: {
      movementId: string;
      observations?: string;
      items?: Array<{ id: string; quantity: number; observations?: string; evidence?: string[] }>;
    }) => {
      const response = await fetch(`/api/v1/bodega/movimientos/${movementId}/aplicar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ observations, items }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "No se pudo aplicar el movimiento");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodega", "verification"] });
      queryClient.invalidateQueries({ queryKey: ["bodega", "movements"] });
      queryClient.invalidateQueries({ queryKey: ["bodega", "stock"] });
      toast.success("Movimiento aplicado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
export function useCompleteBodegaMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      movementId,
      items,
      destinationWarehouseId,
    }: {
      movementId: string;
      items: Array<{ id: string; quantity: number; observations?: string; evidence?: string[] }>;
      destinationWarehouseId?: string;
    }) => {
      const response = await fetch(`/api/v1/bodega/movimientos/${movementId}/completar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items, destinationWarehouseId }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "No se pudo completar la verificación");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodega", "verification"] });
      queryClient.invalidateQueries({ queryKey: ["bodega", "movements"] });
      queryClient.invalidateQueries({ queryKey: ["bodega", "stock"] });
      toast.success("Verificación física completada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
export function useBodegaToVerifyMovements({ warehouseId = "", search = "" }: UseVerificationFilters) {
  return useQuery({
    queryKey: ["bodega", "verification", "to-verify", warehouseId, search],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("page", "1");
      qs.set("pageSize", "100");
      qs.set("status", "APLICADA");
      qs.set("type", "INGRESO");
      if (warehouseId) qs.set("warehouseId", warehouseId);
      if (search) qs.set("search", search);

      const response = await fetch(`/api/v1/bodega/movimientos?${qs.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("No se pudieron obtener movimientos por verificar");
      }

      return response.json();
    },
  });
}
