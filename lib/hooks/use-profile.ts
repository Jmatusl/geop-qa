"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// -- PROFILE HOOKS --

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/v1/profile");
      if (!res.ok) throw new Error("Error fetching profile");
      return res.json();
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/v1/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error updating profile");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Perfil actualizado correctamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/v1/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al subir avatar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Foto de perfil actualizada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/profile/avatar", {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar avatar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Foto de perfil eliminada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// -- SESSION HOOKS (MY SESSIONS) --

export function useMySessions() {
  return useQuery({
    queryKey: ["my-sessions"],
    queryFn: async () => {
      const res = await fetch("/api/v1/profile/sessions");
      if (!res.ok) throw new Error("Error fetching sessions");
      return res.json();
    },
  });
}

export function useRevokeMySession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, type }: { sessionId?: string; type: "single" | "others" }) => {
      const res = await fetch("/api/v1/profile/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, type }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error revoking session");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["my-sessions"] });
      if (variables.type === "others") {
        toast.success("Se han cerrado todas las otras sesiones");
      } else {
        toast.success("Sesión cerrada correctamente");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// -- SESSION HOOKS (ADMIN) --

export function useUserSessions(userId: string) {
  return useQuery({
    queryKey: ["user-sessions", userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(`/api/v1/users/${userId}/sessions`);
      if (!res.ok) throw new Error("Error fetching user sessions");
      return res.json();
    },
    enabled: !!userId,
  });
}

export function useRevokeUserSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, sessionId, type }: { userId: string; sessionId?: string; type: "single" | "all" }) => {
      const res = await fetch(`/api/v1/users/${userId}/sessions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, type }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error revoking session");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-sessions", variables.userId] });
      toast.success("Sesión(es) revocar(as)");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
