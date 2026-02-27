/**
 * Hooks: Dashboard de Solicitud de Insumos
 * Archivo: lib/hooks/supply/use-supply-dashboard.ts
 * 
 * React Query hooks para el dashboard del módulo de insumos
 */

import { useQuery } from '@tanstack/react-query';
import type { SupplyDashboardKPIs, RecentSupplyRequest } from '@/lib/services/supply/supply-dashboard-service';

/**
 * Query keys factory para supply dashboard
 */
export const supplyDashboardQueryKeys = {
  all: ['supply', 'dashboard'] as const,
  kpis: () => [...supplyDashboardQueryKeys.all, 'kpis'] as const,
  recentRequests: (limit?: number) => [...supplyDashboardQueryKeys.all, 'recent', limit] as const,
  attentionRequests: () => [...supplyDashboardQueryKeys.all, 'attention'] as const,
};

/**
 * Hook para obtener los KPIs del dashboard
 */
export function useSupplyDashboardKPIs() {
  return useQuery({
    queryKey: supplyDashboardQueryKeys.kpis(),
    queryFn: async () => {
      const response = await fetch('/api/v1/supply/dashboard/kpis');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al cargar KPIs');
      }
      const json = await response.json();
      return json.data as SupplyDashboardKPIs;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos (datos que cambian frecuentemente)
    refetchOnMount: true,
  });
}

/**
 * Hook para obtener solicitudes recientes
 */
export function useRecentSupplyRequests(limit: number = 10) {
  return useQuery({
    queryKey: supplyDashboardQueryKeys.recentRequests(limit),
    queryFn: async () => {
      const response = await fetch(`/api/v1/supply/dashboard/recent-requests?limit=${limit}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al cargar solicitudes recientes');
      }
      const json = await response.json();
      return json.data as RecentSupplyRequest[];
    },
    staleTime: 1 * 60 * 1000, // 1 minuto
    refetchOnMount: true,
  });
}

/**
 * Hook para obtener solicitudes que requieren atención del usuario
 */
export function useSupplyRequestsRequiringAttention() {
  return useQuery({
    queryKey: supplyDashboardQueryKeys.attentionRequests(),
    queryFn: async () => {
      const response = await fetch('/api/v1/supply/dashboard/recent-requests?attention=true');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al cargar solicitudes');
      }
      const json = await response.json();
      return json.data as RecentSupplyRequest[];
    },
    staleTime: 1 * 60 * 1000, // 1 minuto
    refetchOnMount: true,
  });
}
