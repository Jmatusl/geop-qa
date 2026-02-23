"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FarmingCenter } from "./use-farming-centers";

export interface Installation {
  id: string;
  name: string;
  folio: string | null;
  internalCode: string | null;
  installationType: string | null;
  latitude: number | null;
  longitude: number | null;
  farmingCenterId: string | null;
  description: string | null;
  observations: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  farmingCenter?: FarmingCenter | null;
}

interface InstallationsResponse {
  data: Installation[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useInstallations(page: number = 1, limit: number = 10, search: string = "") {
  return useQuery<InstallationsResponse>({
    queryKey: ["mnt-installations", page, limit, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);

      const res = await fetch(`/api/v1/mantencion/configuracion/installations?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar instalaciones");
      return res.json();
    },
  });
}

export function useInstallation(id?: string | null) {
  return useQuery<Installation>({
    queryKey: ["mnt-installations", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/v1/mantencion/configuracion/installations/${id}`);
      if (!res.ok) throw new Error("Error al cargar elemento");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useAllInstallations() {
  return useQuery<Installation[]>({
    queryKey: ["mnt-installations", "all"],
    queryFn: async () => {
      const res = await fetch("/api/v1/mantencion/configuracion/installations?all=true");
      if (!res.ok) throw new Error("Error al cargar lista de instalaciones");
      return res.json();
    },
  });
}

export function useCreateInstallation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Installation>) => {
      const res = await fetch("/api/v1/mantencion/configuracion/installations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear instalación");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-installations"] });
      toast.success("Instalación creada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateInstallation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Installation>) => {
      const res = await fetch(`/api/v1/mantencion/configuracion/installations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar instalación");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-installations"] });
      toast.success("Instalación actualizada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteInstallation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/mantencion/configuracion/installations/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-installations"] });
      toast.success("Instalación eliminada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
