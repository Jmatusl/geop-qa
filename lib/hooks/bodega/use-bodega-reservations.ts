"use client";

import { useQuery } from "@tanstack/react-query";

export interface BodegaReservationItem {
  id: string;
  requestItemId: string;
  articleId: string;
  warehouseId: string;
  quantity: string;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  article: {
    id: string;
    code: string;
    name: string;
  };
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
  requestItem: {
    request: {
      id: string;
      folio: string;
      statusCode: string;
    };
  };
}

interface BodegaReservationsResponse {
  data: BodegaReservationItem[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface BodegaReservationsFilters {
  page?: number;
  pageSize?: number;
  search?: string;
}

export function useBodegaReservations(filters: BodegaReservationsFilters = {}) {
  return useQuery<BodegaReservationsResponse>({
    queryKey: ["bodega-reservations", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });

      const response = await fetch(`/api/v1/bodega/reservas?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Error al cargar reservas");
      }

      return response.json();
    },
    staleTime: 30_000,
  });
}
