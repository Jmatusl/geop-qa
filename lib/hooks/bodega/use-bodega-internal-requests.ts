import { useQuery } from "@tanstack/react-query";

export interface BodegaInternalRequestFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  warehouseId?: string;
  priority?: "BAJA" | "NORMAL" | "ALTA" | "URGENTE";
  requestedBy?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: "createdAt" | "requiredDate" | "folio" | "priority";
  sortOrder?: "asc" | "desc";
}

export interface BodegaInternalRequestListItem {
  id: string;
  folio: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  requiredDate: string | null;
  createdAt: string;
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
  requester: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  _count: {
    items: number;
    logs: number;
  };
}

export interface BodegaInternalRequestListResponse {
  data: BodegaInternalRequestListItem[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export const bodegaInternalRequestsQueryKeys = {
  all: ["bodega", "solicitudes-internas"] as const,
  lists: () => [...bodegaInternalRequestsQueryKeys.all, "list"] as const,
  list: (filters: BodegaInternalRequestFilters) => [...bodegaInternalRequestsQueryKeys.lists(), filters] as const,
  detail: (id: string) => [...bodegaInternalRequestsQueryKeys.all, "detail", id] as const,
};

export function useBodegaInternalRequests(filters: BodegaInternalRequestFilters = {}) {
  return useQuery({
    queryKey: bodegaInternalRequestsQueryKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });

      const response = await fetch(`/api/v1/bodega/solicitudes-internas?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Error al obtener solicitudes internas");
      }

      return response.json() as Promise<BodegaInternalRequestListResponse>;
    },
    staleTime: 30_000,
  });
}

export function useBodegaInternalRequestStats(soloMias: boolean = false) {
  return useQuery({
    queryKey: ["bodega", "solicitudes-internas", "stats", { soloMias }],
    queryFn: async () => {
      const response = await fetch(`/api/v1/bodega/solicitudes-internas/stats?soloMias=${soloMias}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Error al obtener estadísticas de solicitudes");
      }

      return response.json();
    },
    staleTime: 60_000, // Estadísticas pueden estar un poco más stale
  });
}
