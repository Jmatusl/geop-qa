/**
 * Hook: Listado de Solicitudes de Insumos
 * Archivo: lib/hooks/supply/use-supply-requests.ts
 * 
 * React Query hook para obtener y filtrar solicitudes
 */

import { useQuery } from '@tanstack/react-query';
import { supplyCatalogsQueryKeys } from './use-supply-catalogs';

/**
 * Filtros para listado de solicitudes
 */
export interface SupplyRequestFilters {
  page?: number;
  pageSize?: number;
  status?: string;
  installationId?: string;
  priority?: string;
  createdBy?: string;
  startDate?: string;
  endDate?: string;
  requester?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Tipo de solicitud en listado
 */
export interface SupplyRequestListItem {
  id: string;
  folio: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  requestedDate: Date;
  createdAt: Date;
  estimatedValue: number;
  creator: {
    id: string;
    name: string;
  };
  installation: {
    id: string;
    name: string;
  };
  itemsCount: number;
  /** Cantidad de cotizaciones vinculadas */
  quotationsCount: number;
  quotationsSummary: Array<{
    id: string;
    folio: string;
    statusCode: string;
    totalAmount: number | null;
    supplierName: string;
    purchaseOrderNumber: string | null;
  }>;
  /** Resumen de estados de items: { PENDIENTE: 3, COTIZADO: 2, ... } */
  itemStatusSummary: Record<string, number>;
}

/**
 * Respuesta del API
 */
export interface SupplyRequestListResponse {
  data: SupplyRequestListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Query keys para solicitudes
 */
export const supplyRequestsQueryKeys = {
  all: ['supply-requests'] as const,
  lists: () => [...supplyRequestsQueryKeys.all, 'list'] as const,
  list: (filters: SupplyRequestFilters) => [...supplyRequestsQueryKeys.lists(), filters] as const,
  details: () => [...supplyRequestsQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...supplyRequestsQueryKeys.details(), id] as const,
};

/**
 * Hook para obtener listado de solicitudes
 */
export function useSupplyRequests(filters: SupplyRequestFilters = {}) {
  return useQuery({
    queryKey: supplyRequestsQueryKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();

      // Agregar filtros al query string
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await fetch(`/api/v1/supply-requests?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Error al obtener solicitudes');
      }

      return response.json() as Promise<SupplyRequestListResponse>;
    },
    staleTime: 30 * 1000, // 30 segundos (datos dinámicos)
  });
}

/**
 * Hook para obtener detalle de una solicitud
 */
export function useSupplyRequest(id: string | null) {
  return useQuery({
    queryKey: supplyRequestsQueryKeys.detail(id || 'none'),
    queryFn: async () => {
      if (!id) return null;

      const response = await fetch(`/api/v1/supply-requests/${id}`);

      if (!response.ok) {
        throw new Error('Error al obtener solicitud');
      }

      return response.json();
    },
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minuto
  });
}
