import { useQuery } from "@tanstack/react-query";

export interface DashboardStats {
    metrics: {
        users: number;
        roles: number;
        sessions: number;
    };
    activeSessions: any[];
    recentActivity: any[];
}

export function useDashboard() {
    return useQuery<DashboardStats>({
        queryKey: ["dashboard-stats"],
        queryFn: async () => {
            const res = await fetch("/api/v1/dashboard/stats");
            if (!res.ok) throw new Error("Failed to fetch dashboard stats");
            return res.json();
        },
        staleTime: 0, // Siempre considerar data stale (sensible al rol)
        refetchOnMount: true, // Refetch cada vez que se monta el dashboard
        refetchInterval: 60000, // Refresh every minute
    });
}
