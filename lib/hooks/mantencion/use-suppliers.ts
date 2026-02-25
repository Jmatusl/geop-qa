"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Supplier {
  id: string;
  rut: string;
  businessLine: string;
  legalName: string | null;
  fantasyName: string | null;
  contactName: string | null;
  phone: string | null;
  contactEmail: string | null;
  activityEmails?: string[] | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SuppliersResponse {
  data: Supplier[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useSuppliers(page: number = 1, limit: number = 10, search: string = "") {
  return useQuery<SuppliersResponse>({
    queryKey: ["mnt-suppliers", page, limit, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);

      const res = await fetch(`/api/v1/mantencion/configuracion/suppliers?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar proveedores");
      return res.json();
    },
  });
}

export function useSupplier(id?: string | null) {
  return useQuery<Supplier>({
    queryKey: ["mnt-suppliers", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/v1/mantencion/configuracion/suppliers/${id}`);
      if (!res.ok) throw new Error("Error al cargar elemento");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useAllSuppliers(initialData?: Supplier[]) {
  return useQuery<Supplier[]>({
    queryKey: ["mnt-suppliers", "all"],
    queryFn: async () => {
      const res = await fetch("/api/v1/mantencion/configuracion/suppliers?all=true");
      if (!res.ok) throw new Error("Error al cargar lista de proveedores");
      return res.json();
    },
    initialData,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Supplier>) => {
      const res = await fetch("/api/v1/mantencion/configuracion/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear proveedor");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-suppliers"] });
      toast.success("Proveedor creado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Supplier>) => {
      const res = await fetch(`/api/v1/mantencion/configuracion/suppliers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar proveedor");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-suppliers"] });
      toast.success("Proveedor actualizado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/mantencion/configuracion/suppliers/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-suppliers"] });
      toast.success("Proveedor eliminado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
