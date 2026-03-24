"use client";

import type { QueryClient } from "@tanstack/react-query";
import { bodegaQueryKeys } from "@/lib/hooks/query-keys";
import { bodegaInternalRequestsQueryKeys } from "@/lib/hooks/bodega/use-bodega-internal-requests";

export async function invalidateBodegaStockQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: bodegaQueryKeys.movements.all }),
    queryClient.invalidateQueries({ queryKey: bodegaQueryKeys.lots.all }),
    queryClient.invalidateQueries({ queryKey: bodegaQueryKeys.series.all }),
    queryClient.invalidateQueries({ queryKey: bodegaQueryKeys.stock.all }),
    queryClient.invalidateQueries({ queryKey: ["bodega", "consulta-rapida"] }),
    queryClient.invalidateQueries({ queryKey: ["bodega", "available-buckets"] }),
    queryClient.invalidateQueries({ queryKey: ["global-inventario-v2"] }),
    queryClient.invalidateQueries({ queryKey: ["historial-movimientos"] }),
    queryClient.invalidateQueries({ queryKey: ["bodega", "reportes", "low-stock"] }),
  ]);
}

export async function invalidateBodegaInternalRequestQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: bodegaInternalRequestsQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: ["bodega", "solicitudes-internas", "stats"] }),
  ]);
}