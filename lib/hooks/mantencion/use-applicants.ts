"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Installation } from "./use-installations";
import { JobPosition } from "./use-job-positions";
import { User } from "lucide-react"; // Or actual User type from user hook

export interface Applicant {
  id: string;
  name: string;
  email: string | null;
  jobPositionId: string | null;
  signatureUrl: string | null;
  userId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  installations?: Installation[];
  jobPosition?: JobPosition | null;
  user?: any | null; // using any for now if User type isn't fully imported
}

interface ApplicantsResponse {
  data: Applicant[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useApplicants(page: number = 1, limit: number = 10, search: string = "") {
  return useQuery<ApplicantsResponse>({
    queryKey: ["mnt-applicants", page, limit, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);

      const res = await fetch(`/api/v1/mantencion/configuracion/applicants?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar solicitantes");
      return res.json();
    },
  });
}

export function useApplicant(id: string | null) {
  return useQuery<Applicant>({
    queryKey: ["mnt-applicants", id],
    queryFn: async () => {
      if (!id) return null as any;
      const res = await fetch(`/api/v1/mantencion/configuracion/applicants/${id}`);
      if (!res.ok) throw new Error("Error al cargar el solicitante");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useAllApplicants() {
  return useQuery<Applicant[]>({
    queryKey: ["mnt-applicants", "all"],
    queryFn: async () => {
      const res = await fetch("/api/v1/mantencion/configuracion/applicants?all=true");
      if (!res.ok) throw new Error("Error al cargar lista de solicitantes");
      return res.json();
    },
  });
}

export function useCreateApplicant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Applicant>) => {
      const res = await fetch("/api/v1/mantencion/configuracion/applicants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear solicitante");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-applicants"] });
      toast.success("Solicitante creado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateApplicant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Applicant>) => {
      const res = await fetch(`/api/v1/mantencion/configuracion/applicants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar solicitante");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-applicants"] });
      toast.success("Solicitante actualizado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteApplicant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/mantencion/configuracion/applicants/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mnt-applicants"] });
      toast.success("Solicitante eliminado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
