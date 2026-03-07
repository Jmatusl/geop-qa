import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook para gestionar la autenticación y roles específicos del módulo de bodega
 */
export function useBodegaAuth() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  // Obtener permisos específicos del módulo
  const { data: permissionsData, isLoading: isLoadingPermissions } = useQuery({
    queryKey: ["permissions", "me", "bodega"],
    queryFn: async () => {
      const res = await fetch("/api/v1/permissions/me/bodega");
      if (!res.ok) throw new Error("Error fetching permissions");
      const json = await res.json();
      return json.data as string[];
    },
    enabled: isAuthenticated,
  });

  const roles = useMemo(() => {
    if (!user) return { isStaff: false, isBodegaAdmin: false, isSupervisor: false, isAdmin: false, canApprove: false };

    const perms = permissionsData || [];

    // Soporte para ambos formatos: roles[] (plano) o userRoles[] (relación DB)
    const rawRoles = user.roles || [];
    const relationRoles = (user as any).userRoles?.map((ur: any) => ur.role?.code) || [];
    const combinedRoles = [...new Set([...rawRoles, ...relationRoles])];

    const isAdminRole = combinedRoles.includes("ADMIN");
    const isBodegaAdminRole = combinedRoles.includes("BODEGA_ADMIN");
    const isSupervisorRole = combinedRoles.includes("BODEGA_SUPERVISOR");

    return {
      isStaff: isAdminRole || combinedRoles.includes("BODEGA_STAFF") || isBodegaAdminRole,
      isBodegaAdmin: isAdminRole || isBodegaAdminRole,
      isSupervisor: isAdminRole || isSupervisorRole,
      isAdmin: isAdminRole,
      canApprove: isAdminRole || perms.includes("aprobar") || perms.includes("APPROVE"),
    };
  }, [user, permissionsData]);

  return {
    user,
    status: isLoading || isLoadingPermissions ? "loading" : isAuthenticated ? "authenticated" : "unauthenticated",
    ...roles,
  };
}
