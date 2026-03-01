"use client";

import { useQuery } from "@tanstack/react-query";

export interface QuickSearchWarehouseStock {
  bodegaId: string;
  bodegaCodigo: string;
  bodegaNombre: string;
  cantidadDisponible: number;
  stockMinimo: number;
  bajoStock: boolean;
}

export interface QuickSearchArticle {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  unidad: string;
  stockTotal: number;
  bodegas: QuickSearchWarehouseStock[];
}

interface QuickSearchResponse {
  total: number;
  resultados: QuickSearchArticle[];
}

export function useBodegaQuickSearch(search: string, warehouseId?: string) {
  return useQuery<QuickSearchResponse>({
    queryKey: ["bodega", "consulta-rapida", search, warehouseId || "ALL"],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("search", search);
      if (warehouseId) qs.set("warehouseId", warehouseId);

      const response = await fetch(`/api/v1/bodega/consulta-rapida?${qs.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("No se pudo consultar inventario");
      }

      return response.json();
    },
    enabled: search.trim().length >= 2,
    staleTime: 15_000,
  });
}
