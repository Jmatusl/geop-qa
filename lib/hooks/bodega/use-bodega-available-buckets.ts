"use client";

import { useQuery } from "@tanstack/react-query";

export interface BodegaAvailableBucket {
  id: string;
  movimientoId: string | null;
  numeroMovimiento: string;
  documentoReferencia: string | null;
  fecha: string;
  saldo: number;
  cantidadOriginal: number;
  precioUnitario: number | null;
  esBucketSintetico?: boolean;
}

interface UseBodegaAvailableBucketsOptions {
  enabled?: boolean;
}

export function useBodegaAvailableBuckets(
  warehouseId?: string,
  articleId?: string,
  options: UseBodegaAvailableBucketsOptions = {},
) {
  const { enabled = true } = options;

  return useQuery<BodegaAvailableBucket[]>({
    queryKey: ["bodega", "available-buckets", warehouseId || "NO_WAREHOUSE", articleId || "NO_ARTICLE"],
    queryFn: async () => {
      const response = await fetch(`/api/v1/bodega/warehouses/${warehouseId}/disponibles?articleId=${articleId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("No se pudieron cargar los buckets disponibles");
      }

      return response.json();
    },
    enabled: enabled && !!warehouseId && !!articleId,
    staleTime: 60_000,
  });
}