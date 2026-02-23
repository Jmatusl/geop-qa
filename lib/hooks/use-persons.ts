"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { JobPosition } from "./use-job-positions";
import { Area } from "./use-areas";
import { WorkGroup } from "./use-work-groups";

export interface Person {
  id: string;
  rut: string;
  firstName: string;
  lastName: string;
  motherLastName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  birthDate: string | null;
  nationality: string | null;
  civilStatus: string | null; // Added field
  maritalStatus: string | null; // Keep for compatibility if used, or consolidate
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  shirtSize: string | null;
  pantsSize: string | null;
  shoeSize: number | null;
  bankName: string | null;
  accountType: string | null;
  accountNumber: string | null;
  isActive: boolean;
  imagePath: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;

  // Relations
  jobPositions: { jobPosition: JobPosition; isActive: boolean; startDate: string; endDate: string | null }[];
  areas: { area: Area; assignedAt: string }[];
  workGroups: { workGroup: WorkGroup; assignedAt: string }[];
  supervisors?: { supervisor: Person; isActive: boolean; assignedAt: string }[];
  user?: {
    id: string;
    email: string;
    isActive: boolean;
    userRoles: { role: { code: string; name: string } }[];
  } | null;
}

interface PersonsResponse {
  data: Person[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function usePersons(page: number = 1, limit: number = 10, search: string = "") {
  return useQuery<PersonsResponse>({
    queryKey: ["persons", page, limit, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);

      const res = await fetch(`/api/v1/persons?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar personas");
      return res.json();
    },
  });
}

export function usePerson(id: string) {
  return useQuery<Person>({
    queryKey: ["person", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/persons/${id}`);
      if (!res.ok) throw new Error("Error al cargar ficha");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useAllPersons() {
  return useQuery<Person[]>({
    queryKey: ["persons", "all"],
    queryFn: async () => {
      const res = await fetch("/api/v1/persons?all=true");
      if (!res.ok) throw new Error("Error al cargar lista de personas");
      const result = await res.json();
      return result.data || result; // Handle both paginated and flat responses if API is updated
    },
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Person>) => {
      const res = await fetch("/api/v1/persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear persona");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      toast.success("Persona creada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Person>) => {
      const res = await fetch(`/api/v1/persons/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar persona");
      }

      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      queryClient.invalidateQueries({ queryKey: ["person", variables.id] });
      toast.success("Persona actualizada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/persons/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] });
      toast.success("Persona eliminada correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Assignments
export function useAssignJobPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ personId, ...data }: { personId: string; jobPositionId: string; startDate: string }) => {
      const res = await fetch(`/api/v1/persons/${personId}/job-positions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Error al asignar cargo");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["person", variables.personId] });
      toast.success("Cargo asignado correctamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAssignArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ personId, ...data }: { personId: string; areaId: string; startDate: string }) => {
      const res = await fetch(`/api/v1/persons/${personId}/areas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Error al asignar área");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["person", variables.personId] });
      toast.success("Área asignada correctamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAssignWorkGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ personId, ...data }: { personId: string; workGroupId: string; startDate: string }) => {
      const res = await fetch(`/api/v1/persons/${personId}/work-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Error al asignar grupo");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["person", variables.personId] });
      toast.success("Grupo asignado correctamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAssignSupervisor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ personId, ...data }: { personId: string; supervisorId: string; startDate: string }) => {
      const res = await fetch(`/api/v1/persons/${personId}/supervisors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Error al asignar supervisor");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["person", variables.personId] });
      toast.success("Supervisor asignado correctamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useBulkAssignSupervisor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ supervisorId, personIds }: { supervisorId: string; personIds: string[] }) => {
      const res = await fetch("/api/v1/persons/bulk-supervisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supervisorId, personIds }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error en asignación masiva");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Asignación masiva realizada con éxito");
      queryClient.invalidateQueries({ queryKey: ["person"] });
      queryClient.invalidateQueries({ queryKey: ["persons"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
