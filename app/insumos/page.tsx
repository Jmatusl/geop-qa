/**
 * Página: Dashboard del Módulo de Solicitud de Insumos
 * Archivo: app/insumos/page.tsx
 * 
 * Vista principal con KPIs y solicitudes recientes del módulo
 */

"use client";

import { DashboardKPIs } from "@/components/supply/dashboard-kpis";
import { RecentRequestsTable } from "@/components/supply/recent-requests-table";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { supplyDashboardQueryKeys } from "@/lib/hooks/supply/use-supply-dashboard";
import { useState } from "react";

export default function InsumosPage() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({
      queryKey: supplyDashboardQueryKeys.all,
    });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Solicitud de Insumos</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de solicitudes y cotizaciones de insumos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Link href="/insumos/ingreso">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Solicitud
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs Dashboard */}
      <DashboardKPIs />

      {/* Sección de Solicitudes Recientes */}
      <RecentRequestsTable />
    </div>
  );
}
