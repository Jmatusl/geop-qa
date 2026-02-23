import { useQuery } from "@tanstack/react-query";

export interface PersonalStats {
    sessions: any[];
    activity: any[];
    securityAlerts: any[];
}

export function usePersonalDashboard() {
    return useQuery<PersonalStats>({
        queryKey: ["dashboard-personal-stats"],
        queryFn: async () => {
            const res = await fetch("/api/v1/dashboard/me");
            if (!res.ok) throw new Error("Failed to fetch personal stats");
            return res.json();
        },
        staleTime: 0, // Siempre considerar data stale (sensible al usuario)
        refetchOnMount: true, // Refetch cada vez que se monta el dashboard
        refetchInterval: 60000,
    });
}
