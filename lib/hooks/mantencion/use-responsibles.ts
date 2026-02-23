"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Area } from "./use-areas";

export interface TechnicalResponsible {
  id: string;
  userId: string;
  name: string;
  areaId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  area?: Area | null;
  user?: any | null; // using any for now if User type isn't fully imported
}

interface ResponsiblesResponse {
  data: TechnicalResponsible[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useResponsibles(page: number = 1, limit: number = 10, search: string = "") {
  return useQuery<ResponsiblesResponse>({
    queryKey: ["mnt-responsibles", page, limit, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);

      const res = await fetch(`/api/v1/mantencion/configuracion/responsibles?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar responsables");
      return res.json();
    },
  });
}

export function useTechnicalResponsible(id?: string | null) {
  return useQuery<TechnicalResponsible>({
    queryKey: ["mnt-responsibles", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/v1/mantencion/configuracion/responsibles/${id}`);
      if (!res.ok) throw new Error("Error al cargar elemento");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useAllResponsibles() {
  return useQuery<TechnicalResponsible[]>({
    queryKey: ["mnt-responsibles", "all"],
    queryFn: async () => {
      const res = await fetch("/api/v1/mantencion/configuracion/responsibles?all=true");
      if (!res.ok) throw new Error("Error al cargar lista de responsables");
      return res.json();
    },
  });
}

export function useCreateResponsible() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<TechnicalResponsible>) => {
      const res = await fetch("/api/v1/mantencion/configuracion/responsibles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear responsable");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-responsibles"] });
      toast.success("Responsable creado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateResponsible() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<TechnicalResponsible>) => {
      const res = await fetch(`/api/v1/mantencion/configuracion/responsibles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar responsable");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-responsibles"] });
      toast.success("Responsable actualizado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteResponsible() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/mantencion/configuracion/responsibles/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-responsibles"] });
      toast.success("Responsable eliminado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
