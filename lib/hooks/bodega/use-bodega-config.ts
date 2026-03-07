"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type BodegaConfigResponse = Record<string, any>;

export function useBodegaConfig() {
  return useQuery<BodegaConfigResponse>({
    queryKey: ["bodega", "config"],
    queryFn: async () => {
      const response = await fetch("/api/v1/bodega/config", { credentials: "include" });
      if (!response.ok) {
        throw new Error("No se pudo cargar configuración de bodega");
      }
      return response.json();
    },
    staleTime: 60_000,
  });
}

export function useUpdateBodegaConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { key: string; value: unknown; description?: string; category?: string }) => {
      const response = await fetch("/api/v1/bodega/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo guardar configuración");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodega", "config"] });
      queryClient.invalidateQueries({ queryKey: ["bodega-warehouses"] });
      toast.success("Configuración guardada");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
