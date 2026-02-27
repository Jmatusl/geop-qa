/**
 * Custom Hooks: Mantenedor de Unidades de Medida
 * Archivo: lib/hooks/units/use-units.ts
 * 
 * React Query hooks para gestionar el CRUD de unidades de medida
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { UnitMaster } from '@prisma/client';
import type { CreateUnitInput, UpdateUnitInput, UnitFilters } from '@/lib/validations/units';

// Query Keys
export const unitsQueryKeys = {
  all: ['units'] as const,
  lists: () => [...unitsQueryKeys.all, 'list'] as const,
  list: (filters: UnitFilters) => [...unitsQueryKeys.lists(), filters] as const,
  details: () => [...unitsQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...unitsQueryKeys.details(), id] as const,
};

/**
 * Hook para obtener listado de unidades con filtros
 */
export function useUnits(filters: UnitFilters = { page: 1, pageSize: 20 }) {
  return useQuery({
    queryKey: unitsQueryKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.isActive !== undefined) params.append('isActive', String(filters.isActive));
      params.append('page', String(filters.page));
      params.append('pageSize', String(filters.pageSize));

      const response = await fetch(`/api/v1/units?${params}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al cargar unidades');
      }
      return response.json() as Promise<{
        data: UnitMaster[];
        meta: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      }>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener una unidad por ID
 */
export function useUnit(id: string | null) {
  return useQuery({
    queryKey: unitsQueryKeys.detail(id!),
    queryFn: async () => {
      const response = await fetch(`/api/v1/units/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al cargar unidad');
      }
      return response.json() as Promise<UnitMaster>;
    },
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minuto
  });
}

/**
 * Hook para crear una nueva unidad
 */
export function useCreateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUnitInput) => {
      const response = await fetch('/api/v1/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear unidad');
      }

      return response.json() as Promise<UnitMaster>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unitsQueryKeys.lists() });
      toast.success('Unidad creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Hook para actualizar una unidad existente
 */
export function useUpdateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUnitInput }) => {
      const response = await fetch(`/api/v1/units/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar unidad');
      }

      return response.json() as Promise<UnitMaster>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: unitsQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: unitsQueryKeys.detail(variables.id) });
      toast.success('Unidad actualizada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Hook para eliminar una unidad (soft delete)
 */
export function useDeleteUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/units/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.detail || 'Error al eliminar unidad');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unitsQueryKeys.lists() });
      toast.success('Unidad eliminada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
