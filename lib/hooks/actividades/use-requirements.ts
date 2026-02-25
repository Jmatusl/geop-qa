"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ActRequirementItem {
  id: string;
  folio: number;
  folioPrefix: string;
  title: string;
  description: string;
  observations?: string;
  estimatedDate?: string;
  createdAt: string;
  updatedAt: string;
  isApproved: boolean;
  approvedAt?: string;
  approvedById?: string;
  userCheckRequerido: boolean;
  userCheckObservaciones?: string;
  userCheckRequeridoAprobado: boolean;
  userCheckedById?: string;
  userCheckedAt?: string;
  shipId?: string;
  ship?: { id: string; name: string };
  activityType: { id: string; name: string; code: string };
  priority: { id: string; name: string; colorHex: string };
  status: { id: string; name: string; code: string; colorHex: string };
  location?: { id: string; name: string };
  applicant?: { id: string; firstName: string; lastName: string };
  responsible?: { id: string; firstName: string; lastName: string };
  userCheckedBy?: { id: string; firstName: string; lastName: string };
  activities: { id: string; statusActivity: string; isChecked: boolean; receptions?: { id: string; isAccepted: boolean }[] }[];
  emailsSent?: { 
    id: string; 
    requirementFolio?: string;
    providerName?: string;
    recipient: string; 
    subject?: string; 
    sentAt: string; 
    sentBy: { id: string; firstName: string; lastName: string } 
  }[];
  _count: { activities: number; attachments: number; comments: number; emailsSent: number };
}

export interface ActRequirementFilters {
  q?: string;
  estado?: string;
  prioridad?: string;
  tipo?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  pageSize?: number;
}

export function useRequirements(filters: ActRequirementFilters = {}) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.estado) params.set("estado", filters.estado);
  if (filters.prioridad) params.set("prioridad", filters.prioridad);
  if (filters.tipo) params.set("tipo", filters.tipo);
  if (filters.fechaDesde) params.set("fechaDesde", filters.fechaDesde);
  if (filters.fechaHasta) params.set("fechaHasta", filters.fechaHasta);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));

  return useQuery<{ data: ActRequirementItem[]; total: number; page: number; pageSize: number }>({
    queryKey: ["act-requirements", filters],
    queryFn: async () => {
      const res = await fetch(`/api/v1/actividades?${params.toString()}`);
      if (!res.ok) throw new Error("Error cargando requerimientos");
      return res.json();
    },
  });
}

export function useRequirement(id: string) {
  return useQuery({
    queryKey: ["act-requirement", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/actividades/${id}`);
      if (!res.ok) throw new Error("Error cargando requerimiento");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useChangeStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { statusId: string; comment?: string; responsibleUserId?: string }) => {
      const res = await fetch(`/api/v1/actividades/${id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Error cambiando estado");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["act-requirements"] });
      queryClient.invalidateQueries({ queryKey: ["act-requirement", id] });
    },
  });
}

export function useAddComment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { comment: string }) => {
      const res = await fetch(`/api/v1/actividades/${id}/comentarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Error agregando comentario");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["act-requirement", id] });
    },
  });
}
