/**
 * Hooks: Catálogos para Solicitud de Insumos
 * Archivo: lib/hooks/supply/use-supply-catalogs.ts
 * 
 * React Query hooks para obtener datos de referencia (catálogos)
 */

import { useQuery } from '@tanstack/react-query';
import type { UnitMaster, MntSupplyCategory, MntInstallation } from '@prisma/client';

/**
 * Query keys factory para catálogos de supply
 */
export const supplyCatalogsQueryKeys = {
  all: ['supply', 'catalogs'] as const,
  categories: () => [...supplyCatalogsQueryKeys.all, 'categories'] as const,
  units: () => [...supplyCatalogsQueryKeys.all, 'units'] as const,
  installations: () => [...supplyCatalogsQueryKeys.all, 'installations'] as const,
};

/**
 * Hook para obtener categorías de insumos activas
 */
export function useSupplyCategories() {
  return useQuery({
    queryKey: supplyCatalogsQueryKeys.categories(),
    queryFn: async () => {
      const response = await fetch('/api/v1/supply-categories?isActive=true');
      if (!response.ok) {
        throw new Error('Error al cargar categorías');
      }
      const json = await response.json();
      return json.data as MntSupplyCategory[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutos (catálogos cambian poco)
  });
}

/**
 * Hook para obtener unidades de medida activas
 */
export function useUnitsForSupply() {
  return useQuery({
    queryKey: supplyCatalogsQueryKeys.units(),
    queryFn: async () => {
      const response = await fetch('/api/v1/units?isActive=true&pageSize=100');
      if (!response.ok) {
        throw new Error('Error al cargar unidades');
      }
      const json = await response.json();
      return json.data as UnitMaster[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Hook para obtener instalaciones activas
 */
export function useInstallationsForSupply() {
  return useQuery({
    queryKey: supplyCatalogsQueryKeys.installations(),
    queryFn: async () => {
      const response = await fetch('/api/v1/installations?isActive=true');
      if (!response.ok) {
        throw new Error('Error al cargar instalaciones');
      }
      const json = await response.json();
      return json.data as MntInstallation[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Hook agregado: Obtiene todos los catálogos a la vez
 */
export function useSupplyCatalogs() {
  const categories = useSupplyCategories();
  const units = useUnitsForSupply();
  const installations = useInstallationsForSupply();

  return {
    categories: categories.data || [],
    units: units.data || [],
    installations: installations.data || [],
    isLoading: categories.isLoading || units.isLoading || installations.isLoading,
    isError: categories.isError || units.isError || installations.isError,
  };
}
