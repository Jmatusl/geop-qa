"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ===========================================================================
// Tipos — Centro de Costo
// ===========================================================================

export interface BodegaCostCenter {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BodegaAdjustmentReason {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MasterListResponse<T> {
  success: boolean;
  data: T[];
}

interface MasterInput {
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

// ===========================================================================
// Hooks — Centros de Costo
// ===========================================================================

export function useBodegaCostCenters(search = "", activeOnly?: boolean) {
  return useQuery<MasterListResponse<BodegaCostCenter>>({
    queryKey: ["bodega-centros-costo", search, activeOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (activeOnly !== undefined) params.append("active", String(activeOnly));

      const res = await fetch(`/api/v1/bodega/maestros/centros-costo?${params.toString()}`);
      if (!res.ok) throw new Error("No se pudo cargar los centros de costo");
      return res.json();
    },
    staleTime: 60 * 1000, // 1 minuto de caché
  });
}

export function useBodegaCostCenter(id: string | null) {
  return useQuery<BodegaCostCenter>({
    queryKey: ["bodega-centro-costo", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/bodega/maestros/centros-costo/${id}`);
      if (!res.ok) throw new Error("No se pudo cargar el centro de costo");
      const json = await res.json();
      return json.data;
    },
    enabled: !!id,
  });
}

export function useCreateBodegaCostCenter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MasterInput) => {
      const res = await fetch("/api/v1/bodega/maestros/centros-costo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "No se pudo crear el centro de costo");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodega-centros-costo"] });
      // Invalidar también el hook genérico por compatibilidad
      queryClient.invalidateQueries({ queryKey: ["bodega-maestros", "centros-costo"] });
      toast.success("Centro de costo creado correctamente");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateBodegaCostCenter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MasterInput> }) => {
      const res = await fetch(`/api/v1/bodega/maestros/centros-costo/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "No se pudo actualizar el centro de costo");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodega-centros-costo"] });
      queryClient.invalidateQueries({ queryKey: ["bodega-maestros", "centros-costo"] });
      toast.success("Centro de costo actualizado correctamente");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteBodegaCostCenter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/bodega/maestros/centros-costo/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "No se pudo eliminar el centro de costo");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodega-centros-costo"] });
      queryClient.invalidateQueries({ queryKey: ["bodega-maestros", "centros-costo"] });
      toast.success("Centro de costo eliminado correctamente");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ===========================================================================
// Hooks — Motivos de Ajuste
// ===========================================================================

export function useBodegaAdjustmentReasons(search = "", activeOnly?: boolean) {
  return useQuery<MasterListResponse<BodegaAdjustmentReason>>({
    queryKey: ["bodega-motivos-ajuste", search, activeOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (activeOnly !== undefined) params.append("active", String(activeOnly));

      const res = await fetch(`/api/v1/bodega/maestros/motivos-ajuste?${params.toString()}`);
      if (!res.ok) throw new Error("No se pudo cargar los motivos de ajuste");
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}

export function useBodegaAdjustmentReason(id: string | null) {
  return useQuery<BodegaAdjustmentReason>({
    queryKey: ["bodega-motivo-ajuste", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/bodega/maestros/motivos-ajuste/${id}`);
      if (!res.ok) throw new Error("No se pudo cargar el motivo de ajuste");
      const json = await res.json();
      return json.data;
    },
    enabled: !!id,
  });
}

export function useCreateBodegaAdjustmentReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MasterInput) => {
      const res = await fetch("/api/v1/bodega/maestros/motivos-ajuste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "No se pudo crear el motivo de ajuste");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodega-motivos-ajuste"] });
      queryClient.invalidateQueries({ queryKey: ["bodega-maestros", "motivos-ajuste"] });
      toast.success("Motivo de ajuste creado correctamente");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateBodegaAdjustmentReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MasterInput> }) => {
      const res = await fetch(`/api/v1/bodega/maestros/motivos-ajuste/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "No se pudo actualizar el motivo de ajuste");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodega-motivos-ajuste"] });
      queryClient.invalidateQueries({ queryKey: ["bodega-maestros", "motivos-ajuste"] });
      toast.success("Motivo de ajuste actualizado correctamente");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteBodegaAdjustmentReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/bodega/maestros/motivos-ajuste/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "No se pudo eliminar el motivo de ajuste");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodega-motivos-ajuste"] });
      queryClient.invalidateQueries({ queryKey: ["bodega-maestros", "motivos-ajuste"] });
      toast.success("Motivo de ajuste eliminado correctamente");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
