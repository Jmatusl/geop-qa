"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface JobPosition {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface JobPositionsResponse {
  data: JobPosition[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useJobPositions(page: number = 1, limit: number = 10, search: string = "") {
  return useQuery<JobPositionsResponse>({
    queryKey: ["mnt-job-positions", page, limit, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);

      const res = await fetch(`/api/v1/mantencion/configuracion/job-positions?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar cargos");
      return res.json();
    },
  });
}

export function useJobPosition(id?: string | null) {
  return useQuery<JobPosition>({
    queryKey: ["mnt-job-positions", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/v1/mantencion/configuracion/job-positions/${id}`);
      if (!res.ok) throw new Error("Error al cargar elemento");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useAllJobPositions() {
  return useQuery<JobPosition[]>({
    queryKey: ["mnt-job-positions", "all"],
    queryFn: async () => {
      const res = await fetch("/api/v1/mantencion/configuracion/job-positions?all=true");
      if (!res.ok) throw new Error("Error al cargar lista de cargos");
      return res.json();
    },
  });
}

export function useCreateJobPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<JobPosition>) => {
      const res = await fetch("/api/v1/mantencion/configuracion/job-positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear cargo");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-job-positions"] });
      toast.success("Cargo creado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateJobPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<JobPosition>) => {
      const res = await fetch(`/api/v1/mantencion/configuracion/job-positions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar cargo");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-job-positions"] });
      toast.success("Cargo actualizado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteJobPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/mantencion/configuracion/job-positions/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-job-positions"] });
      toast.success("Cargo eliminado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
