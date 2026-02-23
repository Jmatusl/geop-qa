"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Area {
  id: string;
  name: string;
  description: string | null;
  signatureId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AreasResponse {
  data: Area[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useAreas(page: number = 1, limit: number = 10, search: string = "") {
  return useQuery<AreasResponse>({
    queryKey: ["mnt-areas", page, limit, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);

      const res = await fetch(`/api/v1/mantencion/configuracion/areas?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar áreas");
      return res.json();
    },
  });
}

export function useArea(id?: string | null) {
  return useQuery<Area>({
    queryKey: ["mnt-areas", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/v1/mantencion/configuracion/areas/${id}`);
      if (!res.ok) throw new Error("Error al cargar elemento");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useAllAreas() {
  return useQuery<Area[]>({
    queryKey: ["mnt-areas", "all"],
    queryFn: async () => {
      const res = await fetch("/api/v1/mantencion/configuracion/areas?all=true");
      if (!res.ok) throw new Error("Error al cargar lista de áreas");
      return res.json();
    },
  });
}

export function useCreateArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Area>) => {
      const res = await fetch("/api/v1/mantencion/configuracion/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear área");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-areas"] });
      toast.success("Área creada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Area>) => {
      const res = await fetch(`/api/v1/mantencion/configuracion/areas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar área");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-areas"] });
      toast.success("Área actualizada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/mantencion/configuracion/areas/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-areas"] });
      toast.success("Área eliminada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
