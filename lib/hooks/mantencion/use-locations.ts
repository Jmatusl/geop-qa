"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface ActivityLocation {
  id: string;
  name: string;
  commune: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LocationsResponse {
  data: ActivityLocation[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useLocations(page: number = 1, limit: number = 10, search: string = "") {
  return useQuery<LocationsResponse>({
    queryKey: ["mnt-locations", page, limit, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);

      const res = await fetch(`/api/v1/mantencion/configuracion/locations?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar lugares");
      return res.json();
    },
  });
}

export function useLocation(id?: string | null) {
  return useQuery<ActivityLocation>({
    queryKey: ["mnt-locations", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/v1/mantencion/configuracion/locations/${id}`);
      if (!res.ok) throw new Error("Error al cargar elemento");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useAllLocations() {
  return useQuery<ActivityLocation[]>({
    queryKey: ["mnt-locations", "all"],
    queryFn: async () => {
      const res = await fetch("/api/v1/mantencion/configuracion/locations?all=true");
      if (!res.ok) throw new Error("Error al cargar lista de lugares");
      return res.json();
    },
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<ActivityLocation>) => {
      const res = await fetch("/api/v1/mantencion/configuracion/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear lugar");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-locations"] });
      toast.success("Lugar creado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<ActivityLocation>) => {
      const res = await fetch(`/api/v1/mantencion/configuracion/locations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar lugar");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-locations"] });
      toast.success("Lugar actualizado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/mantencion/configuracion/locations/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-locations"] });
      toast.success("Lugar eliminado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
