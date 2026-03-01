"use client";

import { useQuery } from "@tanstack/react-query";

export interface BodegaReportsSummary {
  totalArticles: number;
  lowStockCount: number;
  lotsExpiringSoon: number;
  activeReservations: number;
  recentMovements: number;
}

export interface BodegaMovementByType {
  movementType: string;
  count: number;
}

export interface BodegaTopWarehouse {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  movements: number;
}

export interface BodegaReportsDashboardData {
  summary: BodegaReportsSummary;
  movementByType: BodegaMovementByType[];
  topWarehouses: BodegaTopWarehouse[];
}

interface DashboardResponse {
  success: boolean;
  data: BodegaReportsDashboardData;
}

export function useBodegaReportsDashboard(warehouseId?: string) {
  return useQuery<DashboardResponse>({
    queryKey: ["bodega-reportes-dashboard", warehouseId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (warehouseId) params.append("warehouseId", warehouseId);

      const response = await fetch(`/api/v1/bodega/reportes/dashboard?${params.toString()}`);
      if (!response.ok) throw new Error("No se pudieron cargar los reportes de bodega");

      return response.json();
    },
    staleTime: 30_000,
  });
}
