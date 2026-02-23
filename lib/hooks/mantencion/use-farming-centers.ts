"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ProductionArea } from "./use-production-areas";

export interface FarmingCenter {
  id: string;
  siepCode: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  responsibleName: string | null;
  commune: string | null;
  region: string | null;
  ownerCompany: string | null;
  productionAreaId: string | null;
  productionCycle: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  productionArea?: ProductionArea | null;
}

interface FarmingCentersResponse {
  data: FarmingCenter[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useFarmingCenters(page: number = 1, limit: number = 10, search: string = "") {
  return useQuery<FarmingCentersResponse>({
    queryKey: ["mnt-farming-centers", page, limit, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);

      const res = await fetch(`/api/v1/mantencion/configuracion/farming-centers?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar centros de cultivo");
      return res.json();
    },
  });
}

export function useFarmingCenter(id?: string | null) {
  return useQuery<FarmingCenter>({
    queryKey: ["mnt-farming-centers", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/v1/mantencion/configuracion/farming-centers/${id}`);
      if (!res.ok) throw new Error("Error al cargar elemento");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useAllFarmingCenters() {
  return useQuery<FarmingCenter[]>({
    queryKey: ["mnt-farming-centers", "all"],
    queryFn: async () => {
      const res = await fetch("/api/v1/mantencion/configuracion/farming-centers?all=true");
      if (!res.ok) throw new Error("Error al cargar lista de centros de cultivo");
      return res.json();
    },
  });
}

export function useCreateFarmingCenter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<FarmingCenter>) => {
      const res = await fetch("/api/v1/mantencion/configuracion/farming-centers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear centro de cultivo");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-farming-centers"] });
      toast.success("Centro de cultivo creado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateFarmingCenter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<FarmingCenter>) => {
      const res = await fetch(`/api/v1/mantencion/configuracion/farming-centers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar centro de cultivo");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-farming-centers"] });
      toast.success("Centro de cultivo actualizado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteFarmingCenter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/mantencion/configuracion/farming-centers/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-farming-centers"] });
      toast.success("Centro de cultivo eliminado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
