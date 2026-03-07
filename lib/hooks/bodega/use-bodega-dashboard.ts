"use client";

import { useQuery } from "@tanstack/react-query";

// ============================================================================
// TIPOS
// ============================================================================

export interface DashboardMetrics {
  articulosBajoMinimo: number;
  movimientosPendientes: number;
  solicitudesPendientes: number;
  totalArticulos: number;
  totalBodegas: number;
  stockNegativo: number;
  articulosSinStock: number;
  movimientosHoy: number;
}

export interface BodegaDashboard {
  id: string;
  name: string;
  tipo: string;
  ubicacion: string | null;
  responsable: {
    nombre: string;
    email: string;
  } | null;
  estadisticas: {
    totalItems: number;
    stockNegativo: number;
    bajoMinimo: number;
    ingresosHoy: number;
    egresosHoy: number;
    valorTotal: number;
  };
  isActive: boolean;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Obtener métricas del dashboard de bodega
 */
export function useBodegaDashboardMetrics() {
  return useQuery<DashboardMetrics>({
    queryKey: ["bodega", "dashboard", "metrics"],
    queryFn: async () => {
      const res = await fetch("/api/v1/bodega/reportes/dashboard");
      if (!res.ok) throw new Error("Error al cargar métricas del dashboard");

      const json = await res.json();
      const stats = json.data;

      return {
        articulosBajoMinimo: stats.summary?.lowStockCount || 0,
        movimientosPendientes: stats.summary?.recentMovements || 0,
        solicitudesPendientes: stats.summary?.activeReservations || 0,
        totalArticulos: stats.summary?.totalArticles || 0,
        totalBodegas: stats.topWarehouses?.length || 0,
        stockNegativo: 0,
        articulosSinStock: 0,
        movimientosHoy: stats.summary?.recentMovements || 0,
      };
    },
    staleTime: 30000,
  });
}

/**
 * Obtener lista de bodegas con estadísticas para el dashboard
 */
export function useBodegasDashboard(params?: { soloActivas?: boolean; search?: string }) {
  const queryParams = new URLSearchParams();
  if (params?.soloActivas) queryParams.set("isActive", "true");
  if (params?.search) queryParams.set("search", params.search);

  return useQuery<BodegaDashboard[]>({
    queryKey: ["bodega", "dashboard", "bodegas", params],
    queryFn: async () => {
      const res = await fetch(`/api/v1/bodega/reportes/dashboard-bodegas?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Error al cargar bodegas del dashboard");

      const json = await res.json();
      const bodegas = json.data;

      return bodegas.map((b: any) => ({
        id: b.id,
        name: b.name,
        tipo: b.code,
        ubicacion: b.location,
        responsable: null,
        estadisticas: {
          totalItems: b.estadisticas.totalItems || 0,
          stockNegativo: 0,
          bajoMinimo: 0,
          ingresosHoy: 0,
          egresosHoy: 0,
          valorTotal: b.estadisticas.valorTotal || 0,
        },
        isActive: b.isActive,
      }));
    },
    staleTime: 30000,
  });
}
