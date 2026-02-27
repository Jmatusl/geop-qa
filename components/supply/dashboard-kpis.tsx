/**
 * Componente: Dashboard KPIs de Insumos
 * Archivo: components/supply/dashboard-kpis.tsx
 * 
 * Muestra las tarjetas de métricas del módulo de insumos
 */

"use client";

import { KPICard } from "./kpi-card";
import { useSupplyDashboardKPIs } from "@/lib/hooks/supply/use-supply-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  ShoppingCart,
  FileText,
  TrendingUp,
  DollarSign,
  Calendar,
} from "lucide-react";

export function DashboardKPIs() {
  const { data: kpis, isLoading } = useSupplyDashboardKPIs();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array(8)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se pudieron cargar las métricas
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sección: Estado de Solicitudes */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Estado de Solicitudes</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total de Solicitudes"
            value={kpis.totalRequests}
            icon={ClipboardList}
            variant="default"
            description="Todas las solicitudes registradas"
          />
          <KPICard
            title="Pendientes de Aprobación"
            value={kpis.pendingRequests}
            icon={Clock}
            variant="warning"
            description="Requieren revisión"
          />
          <KPICard
            title="En Proceso"
            value={kpis.inProcessRequests}
            icon={TrendingUp}
            variant="default"
            description="En gestión de cotizaciones"
          />
          <KPICard
            title="Finalizadas"
            value={kpis.finalizedRequests}
            icon={CheckCircle2}
            variant="success"
            description="Solicitudes completadas"
          />
        </div>
      </div>

      {/* Sección: Estado de Items */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Estado de Items</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total de Items"
            value={kpis.totalItems}
            icon={Package}
            variant="default"
            description="Todos los items solicitados"
          />
          <KPICard
            title="Pendientes"
            value={kpis.pendingItems}
            icon={Clock}
            variant="warning"
            description="Sin cotización"
          />
          <KPICard
            title="Cotizados"
            value={kpis.quotedItems}
            icon={FileText}
            variant="default"
            description="Con cotización recibida"
          />
          <KPICard
            title="Entregados"
            value={kpis.deliveredItems}
            icon={CheckCircle2}
            variant="success"
            description="Items recibidos"
          />
        </div>
      </div>

      {/* Sección: Cotizaciones y Valores */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Cotizaciones y Valores</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Cotizaciones Enviadas"
            value={kpis.sentQuotations}
            icon={ShoppingCart}
            variant="default"
            description="Pendientes de respuesta"
          />
          <KPICard
            title="Cotizaciones Recibidas"
            value={kpis.receivedQuotations}
            icon={FileText}
            variant="default"
            description="En revisión"
          />
          <KPICard
            title="Valor Estimado Total"
            value={kpis.totalEstimatedValue}
            icon={DollarSign}
            variant="default"
            format="currency"
            description="Monto estimado de solicitudes activas"
          />
          <KPICard
            title="Valor Cotizado Total"
            value={kpis.totalQuotedValue}
            icon={DollarSign}
            variant="success"
            format="currency"
            description="Monto de cotizaciones recibidas"
          />
        </div>
      </div>

      {/* Sección: Mes Actual */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Mes Actual</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <KPICard
            title="Solicitudes Este Mes"
            value={kpis.requestsThisMonth}
            icon={Calendar}
            variant="default"
            description="Nuevas solicitudes ingresadas"
          />
          <KPICard
            title="Finalizadas Este Mes"
            value={kpis.finalizedThisMonth}
            icon={CheckCircle2}
            variant="success"
            description="Solicitudes completadas"
          />
          <KPICard
            title="Valor del Mes"
            value={kpis.valueThisMonth}
            icon={DollarSign}
            variant="default"
            format="currency"
            description="Monto de solicitudes del mes"
          />
        </div>
      </div>
    </div>
  );
}
