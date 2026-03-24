"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeftRight, PackageMinus, PackagePlus, Activity, TrendingUp, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBodegaMovements } from "@/lib/hooks/bodega/use-bodega-movements";

function getStatusVariant(status: string) {
  if (status === "APLICADO") return "secondary" as const;
  if (status === "APROBADO") return "default" as const;
  return "outline" as const;
}

export default function OperacionesMasivasClient() {
  const { data, isLoading, refetch } = useBodegaMovements({ page: 1, pageSize: 30 });
  const rows = data?.data ?? [];

  const stats = useMemo(() => {
    const completed = rows.filter((row) => row.status === "APLICADO").length;
    const pending = rows.length - completed;
    return { total: rows.length, completed, pending };
  }, [rows]);

  const actions = [
    {
      title: "Ingreso Bodega",
      description: "Registrar ingreso de artículos",
      href: "/bodega/ingreso-bodega",
      Icon: PackagePlus,
      icon: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Retiro Bodega",
      description: "Registrar retiro inmediato",
      href: "/bodega/retiro-bodega",
      Icon: PackageMinus,
      icon: "text-orange-600 dark:text-orange-400",
    },
    {
      title: "Movimiento Artículo",
      description: "Transferencia entre bodegas",
      href: "/bodega/movimiento-articulo",
      Icon: ArrowLeftRight,
      icon: "text-blue-600 dark:text-blue-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Operaciones</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-2xl font-bold">{stats.total}</p>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aplicadas</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
            <Package className="h-4 w-4 text-blue-600" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {actions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="h-full rounded-xl border shadow-sm transition hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <action.Icon className={`h-5 w-5 ${action.icon}`} />
                  {action.title}
                </CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Abrir flujo operativo</CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="rounded-xl border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historial de Operaciones</CardTitle>
              <CardDescription>Últimos movimientos ejecutados en bodega</CardDescription>
            </div>
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>Actualizar</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Cargando operaciones...</div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No hay operaciones registradas.</div>
          ) : (
            <div className="space-y-3">
              {rows.slice(0, 12).map((row) => (
                <div key={row.id} className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <p className="font-semibold">{row.folio}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.warehouse.name} · {new Date(row.createdAt).toLocaleDateString("es-CL")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{row.type}</Badge>
                    <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
