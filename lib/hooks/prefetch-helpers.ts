/**
 * Prefetching Strategy - React Query
 * 
 * Implementa estrategias de prefetching para mejorar la perceived performance.
 * Los datos se pre-cargan en hover o antes de navegación.
 * 
 * @module PrefetchHelpers
 */

import { QueryClient } from "@tanstack/react-query";
import { actividadesQueryKeys, mantencionQueryKeys, staleTimes } from "./query-keys";

/**
 * Crear query client con configuración optimizada
 */
export function createOptimizedQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: staleTimes.lists,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 1,
      },
    },
  });
}

/**
 * Prefetch de detalle de requerimiento
 * Se ejecuta en hover sobre un link o card de requerimiento
 */
export async function prefetchRequirementDetail(
  queryClient: QueryClient,
  requirementId: string
) {
  await queryClient.prefetchQuery({
    queryKey: actividadesQueryKeys.detail(requirementId),
    queryFn: async () => {
      const response = await fetch(`/api/v1/actividades/requirements/${requirementId}`);
      if (!response.ok) throw new Error("Error al cargar requerimiento");
      return response.json();
    },
    staleTime: staleTimes.details,
  });
}

/**
 * Prefetch de catálogos de actividades
 * Se ejecuta al montar la app o al entrar al módulo
 */
export async function prefetchActivityCatalogs(queryClient: QueryClient) {
  const catalogPromises = [
    // Activity Types
    queryClient.prefetchQuery({
      queryKey: actividadesQueryKeys.catalogs.activityTypes,
      queryFn: async () => {
        const response = await fetch("/api/v1/actividades/catalogs/activity-types");
        if (!response.ok) throw new Error("Error al cargar tipos de actividad");
        return response.json();
      },
      staleTime: staleTimes.catalogs,
    }),

    // Priorities
    queryClient.prefetchQuery({
      queryKey: actividadesQueryKeys.catalogs.priorities,
      queryFn: async () => {
        const response = await fetch("/api/v1/actividades/catalogs/priorities");
        if (!response.ok) throw new Error("Error al cargar prioridades");
        return response.json();
      },
      staleTime: staleTimes.catalogs,
    }),

    // Statuses
    queryClient.prefetchQuery({
      queryKey: actividadesQueryKeys.catalogs.statuses,
      queryFn: async () => {
        const response = await fetch("/api/v1/actividades/catalogs/statuses");
        if (!response.ok) throw new Error("Error al cargar estados");
        return response.json();
      },
      staleTime: staleTimes.catalogs,
    }),

    // Locations
    queryClient.prefetchQuery({
      queryKey: actividadesQueryKeys.catalogs.locations,
      queryFn: async () => {
        const response = await fetch("/api/v1/actividades/catalogs/locations");
        if (!response.ok) throw new Error("Error al cargar ubicaciones");
        return response.json();
      },
      staleTime: staleTimes.catalogs,
    }),

    // Ships
    queryClient.prefetchQuery({
      queryKey: actividadesQueryKeys.catalogs.ships,
      queryFn: async () => {
        const response = await fetch("/api/v1/actividades/catalogs/ships");
        if (!response.ok) throw new Error("Error al cargar naves");
        return response.json();
      },
      staleTime: staleTimes.catalogs,
    }),

    // Users
    queryClient.prefetchQuery({
      queryKey: actividadesQueryKeys.catalogs.users,
      queryFn: async () => {
        const response = await fetch("/api/v1/users");
        if (!response.ok) throw new Error("Error al cargar usuarios");
        return response.json();
      },
      staleTime: staleTimes.catalogs,
    }),
  ];

  await Promise.allSettled(catalogPromises);
}

/**
 * Prefetch de listado de requerimientos con filtros específicos
 */
export async function prefetchRequirementList(
  queryClient: QueryClient,
  filters: {
    page?: number;
    pageSize?: number;
    statusId?: string;
    priorityId?: string;
  }
) {
  await queryClient.prefetchQuery({
    queryKey: actividadesQueryKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append("page", String(filters.page));
      if (filters.pageSize) params.append("pageSize", String(filters.pageSize));
      if (filters.statusId) params.append("statusId", filters.statusId);
      if (filters.priorityId) params.append("priorityId", filters.priorityId);

      const response = await fetch(`/api/v1/actividades/requirements?${params.toString()}`);
      if (!response.ok) throw new Error("Error al cargar listado");
      return response.json();
    },
    staleTime: staleTimes.lists,
  });
}

/**
 * Prefetch de timeline y comentarios
 * Se ejecuta al abrir el detalle de un requerimiento
 */
export async function prefetchRequirementTimeline(
  queryClient: QueryClient,
  requirementId: string
) {
  await Promise.allSettled([
    // Timeline
    queryClient.prefetchQuery({
      queryKey: actividadesQueryKeys.timeline(requirementId),
      queryFn: async () => {
        const response = await fetch(`/api/v1/actividades/requirements/${requirementId}/timeline`);
        if (!response.ok) throw new Error("Error al cargar timeline");
        return response.json();
      },
      staleTime: staleTimes.realtime,
    }),

    // Comments
    queryClient.prefetchQuery({
      queryKey: actividadesQueryKeys.comments(requirementId),
      queryFn: async () => {
        const response = await fetch(`/api/v1/actividades/requirements/${requirementId}/comments`);
        if (!response.ok) throw new Error("Error al cargar comentarios");
        return response.json();
      },
      staleTime: staleTimes.realtime,
    }),
  ]);
}

/**
 * Prefetch de página siguiente en paginación
 * Se ejecuta automáticamente al renderizar una página
 */
export async function prefetchNextPage(
  queryClient: QueryClient,
  currentPage: number,
  filters: any
) {
  const nextPageFilters = { ...filters, page: currentPage + 1 };
  await prefetchRequirementList(queryClient, nextPageFilters);
}

/**
 * Prefetch de catálogos de mantención
 */
export async function prefetchMaintenanceCatalogs(queryClient: QueryClient) {
  const catalogPromises = [
    queryClient.prefetchQuery({
      queryKey: mantencionQueryKeys.catalogs.installations,
      queryFn: async () => {
        const response = await fetch("/api/v1/mantencion/catalogs/installations");
        if (!response.ok) throw new Error("Error al cargar instalaciones");
        return response.json();
      },
      staleTime: staleTimes.catalogs,
    }),

    queryClient.prefetchQuery({
      queryKey: mantencionQueryKeys.catalogs.areas,
      queryFn: async () => {
        const response = await fetch("/api/v1/mantencion/catalogs/areas");
        if (!response.ok) throw new Error("Error al cargar áreas");
        return response.json();
      },
      staleTime: staleTimes.catalogs,
    }),

    queryClient.prefetchQuery({
      queryKey: mantencionQueryKeys.catalogs.systems,
      queryFn: async () => {
        const response = await fetch("/api/v1/mantencion/catalogs/systems");
        if (!response.ok) throw new Error("Error al cargar sistemas");
        return response.json();
      },
      staleTime: staleTimes.catalogs,
    }),

    queryClient.prefetchQuery({
      queryKey: mantencionQueryKeys.catalogs.types,
      queryFn: async () => {
        const response = await fetch("/api/v1/mantencion/catalogs/types");
        if (!response.ok) throw new Error("Error al cargar tipos");
        return response.json();
      },
      staleTime: staleTimes.catalogs,
    }),
  ];

  await Promise.allSettled(catalogPromises);
}

/**
 * Optimistic update helper
 * Actualiza la caché optimísticamente antes de la mutación
 */
export function optimisticUpdate<T>(
  queryClient: QueryClient,
  queryKey: any[],
  updater: (old: T | undefined) => T
) {
  const previousData = queryClient.getQueryData<T>(queryKey);
  
  queryClient.setQueryData<T>(queryKey, (old) => updater(old));

  return {
    previousData,
    rollback: () => {
      if (previousData !== undefined) {
        queryClient.setQueryData(queryKey, previousData);
      }
    },
  };
}
