"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { User } from "@/components/users/users-table-columns";

interface UsersResponse {
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Hook para listar usuarios
export function useUsers(page: number = 1, limit: number = 10, search: string = "", roleId: string = "all", sortBy: string | null = null, sortOrder: "asc" | "desc" | null = null) {
  return useQuery<UsersResponse>({
    queryKey: ["users", page, limit, search, roleId, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
      });

      if (roleId && roleId !== "all") {
        params.append("roleId", roleId);
      }

      if (sortBy && sortOrder) {
        params.append("sortBy", sortBy);
        params.append("sortOrder", sortOrder);
      }

      const res = await fetch(`/api/v1/users?${params}`);
      if (!res.ok) throw new Error("Error al cargar usuarios");

      return res.json();
    },
  });
}

// Hook para listar roles
export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await fetch("/api/v1/roles");
      if (!res.ok) throw new Error("Error al cargar roles");
      return res.json();
    },
  });
}

// Hook para crear usuario
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear usuario");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario creado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Hook para actualizar usuario
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await fetch(`/api/v1/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar usuario");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Hook para desbloquear usuario
export function useUnlockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/users/${id}/unlock`, {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al desbloquear usuario");
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(data.message || "Usuario desbloqueado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Hooks para gestión de avatar por Admin
export function useUpdateUserAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, file }: { userId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/v1/users/${userId}/avatar`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al subir avatar de usuario");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Avatar de usuario actualizado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRemoveUserAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/v1/users/${userId}/avatar`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar avatar de usuario");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Avatar de usuario eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
