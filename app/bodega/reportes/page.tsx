"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, BarChart3, CalendarDays, Package, TrendingUp, Warehouse } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBodegaWarehouses } from "@/lib/hooks/bodega/use-bodega-warehouses";
import { useBodegaReportsDashboard } from "@/lib/hooks/bodega/use-bodega-reports-dashboard";

export default function BodegaReportesPage() {
  const router = useRouter();
  const [warehouseId, setWarehouseId] = useState<string | undefined>(undefined);
  const { data: warehousesData } = useBodegaWarehouses(1, 200, "");
  const { data, isLoading, isFetching, refetch } = useBodegaReportsDashboard(warehouseId);
  const today = new Date().toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

  const summary = data?.data.summary;
  const movementByType = data?.data.movementByType || [];
  const topWarehouses = data?.data.topWarehouses || [];

  return (
    <div className="w-full space-y-6">
      <div className="border-b border-border bg-white dark:bg-slate-900 lg:hidden">
        <div className="flex items-center justify-between py-3">
          <Button type="button" variant="outline" size="icon" onClick={() => router.back()} className="rounded-xl dark:text-white">
            <span className="sr-only">Volver</span>
            ←
          </Button>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <h1 className="text-sm font-extrabold uppercase tracking-wide">Reportes</h1>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">{today}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold tracking-tight">Reportes de Bodega</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dashboard ejecutivo de inventario y movimientos.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <Select value={warehouseId ?? "ALL"} onValueChange={(value) => setWarehouseId(value === "ALL" ? undefined : value)}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Todas las bodegas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las bodegas</SelectItem>
              {(warehousesData?.data || []).map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} · {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading || isFetching}>
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="rounded-xl border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Artículos</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-2xl font-bold">{summary?.totalArticles ?? 0}</p>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-2xl font-bold">{summary?.lowStockCount ?? 0}</p>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lotes por Vencer</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-2xl font-bold">{summary?.lotsExpiringSoon ?? 0}</p>
            <CalendarDays className="h-4 w-4 text-orange-600" />
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reservas Activas</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-2xl font-bold">{summary?.activeReservations ?? 0}</p>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Movimientos (7 días)</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-2xl font-bold">{summary?.recentMovements ?? 0}</p>
            <BarChart3 className="h-4 w-4 text-emerald-600" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="rounded-xl border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Movimientos por Tipo (30 días)
            </CardTitle>
            <CardDescription>Distribución reciente de movimientos de inventario.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {movementByType.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin movimientos en el período.</p>
            ) : (
              movementByType.map((row) => (
                <div key={row.movementType} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-sm font-medium">{row.movementType}</span>
                  <Badge variant="secondary">{row.count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Warehouse className="h-4 w-4" />
              Bodegas con Mayor Actividad
            </CardTitle>
            <CardDescription>Top de bodegas por cantidad de movimientos (30 días).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {topWarehouses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay actividad registrada.</p>
            ) : (
              topWarehouses.map((row, index) => (
                <div key={row.warehouseId} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">#{index + 1} · {row.warehouseName}</p>
                    <p className="text-xs text-muted-foreground">{row.warehouseCode}</p>
                  </div>
                  <Badge>{row.movements}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border border-border shadow-sm">
        <CardHeader>
          <CardTitle>Accesos de Reporte</CardTitle>
          <CardDescription>Navegación rápida a listados con capacidad de exportación y trazabilidad.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/bodega/solicitudes-internas">Solicitudes Internas</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/bodega/historial">Historial de Movimientos</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/bodega/consulta-rapida">Consulta Rápida</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
