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
  partNumber?: string | null;
  internalCode?: string | null;
  bodegas: QuickSearchWarehouseStock[];
}

interface QuickSearchResponse {
  total: number;
  resultados: QuickSearchArticle[];
}

export function useBodegaQuickSearch(
  search: string,
  warehouseId?: string,
  options: { enabled?: boolean; context?: string; articleId?: string } = {},
) {
  const { enabled = true, context, articleId } = options;
  
  return useQuery<QuickSearchResponse>({
    queryKey: ["bodega", "consulta-rapida", search, warehouseId || "ALL", context || "ALL", articleId || "ALL_ARTICLES"],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("search", search);
      if (warehouseId) qs.set("warehouseId", warehouseId);
      if (context) qs.set("context", context);
      if (articleId) qs.set("articleId", articleId);

      const response = await fetch(`/api/v1/bodega/consulta-rapida?${qs.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("No se pudo consultar inventario");
      }

      return response.json();
    },
    enabled,
    staleTime: 60_000, 
  });
}
