"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Clock, AlertCircle, CheckCircle2, PackageOpen } from "lucide-react";
import { useBodegaInternalRequestStats } from "@/lib/hooks/bodega/use-bodega-internal-requests";

interface MetricBadgeProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: "blue" | "amber" | "green" | "purple";
}

function MetricBadge({ title, value, icon, color }: MetricBadgeProps) {
  const colors = {
    blue: "bg-[#ecf2fe] dark:bg-blue-950/40 text-[#283c7f] dark:text-blue-300 border-[#d4e1fc] dark:border-blue-900/50",
    amber: "bg-[#fff8da] dark:bg-amber-950/40 text-[#b5651d] dark:text-amber-400 border-[#fce9bc] dark:border-amber-900/50",
    green: "bg-[#e5ffe9] dark:bg-green-950/40 text-[#1b8036] dark:text-green-400 border-[#ceead6] dark:border-green-900/50",
    purple: "bg-[#f4e8fb] dark:bg-purple-950/40 text-[#7b1fa2] dark:text-purple-400 border-[#e1bee7] dark:border-purple-900/50",
  };

  return (
    <div className={`border rounded-xl px-4 py-4 text-center transition-all hover:shadow-md ${colors[color]}`}>
      <div className="flex items-center justify-center gap-2 mb-1.5 opacity-90">
        {icon}
        <span className="text-[11px] font-black uppercase tracking-widest">{title}</span>
      </div>
      <p className="text-3xl font-black leading-none tracking-tight">{value}</p>
    </div>
  );
}

export function EstadisticasWidget({ soloMias = false, setSoloMias }: { soloMias?: boolean; setSoloMias?: (val: boolean) => void }) {
  const { data: stats, isLoading, error } = useBodegaInternalRequestStats(soloMias);

  if (error) {
    return (
      <Card className="border-destructive p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-bold uppercase tracking-widest">Error al cargar estadísticas</p>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 pt-10">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      {/* Header del Widget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{soloMias ? "Resumen Personal" : "Resumen de Solicitudes"}</h2>
          {stats.permisos?.esAdministrador || stats.permisos?.puedeAprobar || stats.permisos?.puedePreparar ? (
            <Badge variant="outline" className="text-[10px] h-5 px-2 uppercase tracking-widest font-bold bg-white dark:bg-slate-800 border-slate-200 text-slate-500 shadow-sm">
              {soloMias ? "MIS SOLICITUDES" : "VISTA GLOBAL"}
            </Badge>
          ) : null}
        </div>

        {setSoloMias && (
          <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden shadow-sm mt-3 sm:mt-0">
            <button
              onClick={() => setSoloMias(false)}
              className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                !soloMias ? "bg-[#283c7f] text-white" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Global
            </button>
            <button
              onClick={() => setSoloMias(true)}
              className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                soloMias ? "bg-[#283c7f] text-white" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Mis Solicitudes
            </button>
          </div>
        )}
      </div>
      {/* Alertas Críticas */}
      <div className="flex flex-col gap-2">
        {stats.permisos?.puedeAprobar && stats.pendientesAprobacion > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 dark:bg-amber-900/60 p-2 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-[11px] font-black text-amber-900 dark:text-amber-100 uppercase tracking-widest italic">
                {stats.pendientesAprobacion === 1 ? "1 SOLICITUD PENDIENTE DE APROBACIÓN" : `${stats.pendientesAprobacion} SOLICITUDES PENDIENTES DE APROBACIÓN`}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[9px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 italic"
              onClick={() => (window.location.href = "?status=PENDIENTE")}
            >
              Revisar →
            </Button>
          </div>
        )}

        {stats.permisos?.puedePreparar && stats.pendientesPreparacion > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/60 p-2 rounded-lg">
                <PackageOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-[11px] font-black text-blue-900 dark:text-blue-100 uppercase tracking-widest italic">
                {stats.pendientesPreparacion === 1 ? "1 SOLICITUD PARA PREPARAR" : `${stats.pendientesPreparacion} SOLICITUDES PARA PREPARAR`}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[9px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 italic"
              onClick={() => (window.location.href = "?status=APROBADA")}
            >
              Ver Lista →
            </Button>
          </div>
        )}
      </div>

      {/* Métricas Principales */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <MetricBadge title="Total" value={stats.general.total} icon={<BarChart3 className="h-4 w-4" />} color="blue" />
        <MetricBadge title="En Proceso" value={stats.enProceso} icon={<TrendingUp className="h-4 w-4" />} color="amber" />
        <MetricBadge title="Completadas" value={stats.completadas} icon={<CheckCircle2 className="h-4 w-4" />} color="green" />
        <MetricBadge title="T. Promedio" value={`${stats.rendimiento.tiempoPromedioHoras}h`} icon={<Clock className="h-4 w-4" />} color="purple" />
      </div>
    </div>
  );
}
