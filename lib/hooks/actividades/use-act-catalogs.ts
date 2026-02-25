"use client";

import { useQuery } from "@tanstack/react-query";

export interface ActCatalogs {
  activityTypes: { id: string; name: string; code: string; description?: string }[];
  priorities: { id: string; name: string; code: string; colorHex: string }[];
  statuses: { id: string; name: string; code: string; colorHex: string }[];
  locations: { id: string; name: string; commune?: string }[];
  users: { id: string; firstName: string; lastName: string; email: string }[];
}

export function useActCatalogs() {
  return useQuery<ActCatalogs>({
    queryKey: ["act-catalogs"],
    queryFn: async () => {
      const res = await fetch("/api/v1/actividades/catalogs");
      if (!res.ok) throw new Error("Error cargando catálogos");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
