"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

/**
 * Hook para gestionar la autenticación y roles específicos del módulo de bodega
 */
export function useBodegaAuth() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const roles = useMemo(() => {
    if (!user) return { isStaff: false, isBodegaAdmin: false, isSupervisor: false, isAdmin: false };

    const userRoles = user.roles || [];
    return {
      isStaff: userRoles.includes("ADMIN") || userRoles.includes("BODEGA_STAFF") || userRoles.includes("BODEGA_ADMIN"),
      isBodegaAdmin: userRoles.includes("ADMIN") || userRoles.includes("BODEGA_ADMIN"),
      isSupervisor: userRoles.includes("ADMIN") || userRoles.includes("BODEGA_SUPERVISOR"),
      isAdmin: userRoles.includes("ADMIN"),
    };
  }, [user]);

  return {
    user,
    status: isLoading ? "loading" : isAuthenticated ? "authenticated" : "unauthenticated",
    ...roles,
  };
}
