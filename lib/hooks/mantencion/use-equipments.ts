"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { System } from "./use-systems";

export interface Equipment {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  partNumber: string | null;
  serialNumber: string | null;
  areaId: string;
  systemId: string;
  technicalComments: string | null;
  prevInstructions: string | null;
  estimatedLife: string | null;
  commissioningDate: string | null;
  imageUrl: string | null;
  imageDescription: string | null;
  datasheetUrl: string | null;
  datasheetName: string | null;
  referencePrice: number | null;
  responsibles?: Array<{ responsibleId: string }>;
  installationId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  system?: System | null;
}

interface EquipmentsResponse {
  data: Equipment[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useEquipments(page: number = 1, limit: number = 10, search: string = "") {
  return useQuery<EquipmentsResponse>({
    queryKey: ["mnt-equipments", page, limit, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);

      const res = await fetch(`/api/v1/mantencion/configuracion/equipments?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar equipos");
      return res.json();
    },
  });
}

export function useEquipment(id: string | null) {
  return useQuery<Equipment>({
    queryKey: ["mnt-equipments", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/v1/mantencion/configuracion/equipments/${id}`);
      if (!res.ok) throw new Error("Error al cargar el equipo");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useAllEquipments() {
  return useQuery<Equipment[]>({
    queryKey: ["mnt-equipments", "all"],
    queryFn: async () => {
      const res = await fetch("/api/v1/mantencion/configuracion/equipments?all=true");
      if (!res.ok) throw new Error("Error al cargar lista de equipos");
      return res.json();
    },
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Equipment>) => {
      const res = await fetch("/api/v1/mantencion/configuracion/equipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear equipo");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-equipments"] });
      toast.success("Equipo creado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Equipment>) => {
      const res = await fetch(`/api/v1/mantencion/configuracion/equipments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar equipo");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-equipments"] });
      toast.success("Equipo actualizado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/mantencion/configuracion/equipments/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-equipments"] });
      toast.success("Equipo eliminado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
