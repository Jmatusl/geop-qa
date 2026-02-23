"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Area } from "./use-areas";

export interface System {
  id: string;
  name: string;
  areaId: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  area?: Area | null;
}

interface SystemsResponse {
  data: System[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useSystems(page: number = 1, limit: number = 10, search: string = "") {
  return useQuery<SystemsResponse>({
    queryKey: ["mnt-systems", page, limit, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);

      const res = await fetch(`/api/v1/mantencion/configuracion/systems?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar sistemas");
      return res.json();
    },
  });
}

export function useSystem(id?: string | null) {
  return useQuery<System>({
    queryKey: ["mnt-systems", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/v1/mantencion/configuracion/systems/${id}`);
      if (!res.ok) throw new Error("Error al cargar elemento");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useAllSystems() {
  return useQuery<System[]>({
    queryKey: ["mnt-systems", "all"],
    queryFn: async () => {
      const res = await fetch("/api/v1/mantencion/configuracion/systems?all=true");
      if (!res.ok) throw new Error("Error al cargar lista de sistemas");
      return res.json();
    },
  });
}

export function useCreateSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<System>) => {
      const res = await fetch("/api/v1/mantencion/configuracion/systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear sistema");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-systems"] });
      toast.success("Sistema creado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<System>) => {
      const res = await fetch(`/api/v1/mantencion/configuracion/systems/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar sistema");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-systems"] });
      toast.success("Sistema actualizado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/mantencion/configuracion/systems/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-systems"] });
      toast.success("Sistema eliminado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
