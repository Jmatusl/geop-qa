"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface CertificationMaster {
  id: string;
  code: string;
  name: string;
  description: string | null;
  validityMonths: number;
  requiresMedical: boolean;
  isActive: boolean;
}

export interface WorkerCertification {
  id: string;
  status: string; // VIGENTE, VENCIDA, POR_VENCER
  expiryDate: string;
  certificationMaster: CertificationMaster;
  workerResolution: WorkerResolution;
  renewedFromId?: string | null;
  renewedFrom?: {
    certificationMaster: CertificationMaster;
    workerResolution: WorkerResolution;
  } | null;
}

export interface WorkerResolution {
  id: string;
  resolutionNumber: string;
  inscriptionNumber: string;
  issueDate: string;
  validationImageUrl: string | null;
  attachments: string[]; // JSONb
  createdAt: string;
}

export interface DisableCertificationData {
  id: string;
  disabledReasonId: string;
  disabledComment?: string;
  suspensionStartDate?: string;
  suspensionEndDate?: string;
}

export function useCertificationMasters() {
  return useQuery<CertificationMaster[]>({
    queryKey: ["certification-masters"],
    queryFn: async () => {
      const res = await fetch("/api/v1/certifications/types?all=true");
      if (!res.ok) throw new Error("Error al cargar catálogo");
      return res.json();
    },
  });
}

export function useWorkerCertifications(personId: string) {
  return useQuery<WorkerCertification[]>({
    queryKey: ["worker-certifications", personId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/persons/${personId}/certifications`);
      if (!res.ok) throw new Error("Error al cargar certificaciones");
      // La API retornará la lista de certificaciones vinculadas a la persona.
      return res.json();
    },
    enabled: !!personId,
  });
}

export function useCreateResolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: FormData) => {
      // Using FormData for file upload
      const res = await fetch("/api/v1/certifications/resolutions", {
        method: "POST",
        body: data,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear resolución");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate person to refresh certifications
      const personId = variables.get("personId") as string;
      if (personId) {
        queryClient.invalidateQueries({ queryKey: ["person", personId] });
        queryClient.invalidateQueries({ queryKey: ["worker-certifications", personId] });
      }
      queryClient.invalidateQueries({ queryKey: ["global-certifications"] });
      toast.success("Resolución registrada correctamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDisableCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: DisableCertificationData) => {
      const res = await fetch(`/api/v1/certifications/${id}/disable`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al deshabilitar certificación");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker-certifications"] });
      queryClient.invalidateQueries({ queryKey: ["person"] });
      queryClient.invalidateQueries({ queryKey: ["global-certifications"] });
      toast.success("Certificación deshabilitada correctamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateResolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const res = await fetch(`/api/v1/certifications/resolutions/${id}`, {
        method: "PATCH",
        body: data,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar resolución");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker-certifications"] });
      queryClient.invalidateQueries({ queryKey: ["person"] });
      queryClient.invalidateQueries({ queryKey: ["global-certifications"] });
      toast.success("Resolución actualizada correctamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useReactivateCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/certifications/${id}/reactivate`, {
        method: "PATCH",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al reactivar certificación");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker-certifications"] });
      queryClient.invalidateQueries({ queryKey: ["person"] });
      queryClient.invalidateQueries({ queryKey: ["global-certifications"] });
      toast.success("Certificación reactivada correctamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useExpireCertification() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/certifications/${id}/expire`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Error expiring certification");
      return res.json();
    },
  });
}

export function useRenewableCertifications(personId: string) {
  return useQuery<WorkerCertification[]>({
    queryKey: ["renewable-certifications", personId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/persons/${personId}/certifications/renewable`);
      if (!res.ok) throw new Error("Error al cargar certificaciones renovables");
      return res.json();
    },
    enabled: !!personId,
  });
}

/**
 * Obtener token de validación para una certificación específica
 */
export function useCertificationToken(personId: string, certificationId?: string) {
  return useQuery<{ token: string; expiresAt: string }>({
    queryKey: ["certification-token", personId, certificationId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/persons/${personId}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificationId }),
      });
      if (!res.ok) throw new Error("Error al generar token de validación");
      return res.json();
    },
    enabled: !!personId,
    staleTime: 10 * 60 * 1000, // 10 minutos (vence en 15)
  });
}
