/**
 * Componente: Tarjeta de Métrica (KPI Card)
 * Archivo: components/supply/kpi-card.tsx
 * 
 * Tarjeta reutilizable para mostrar métricas del dashboard
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
  variant?: "default" | "success" | "warning" | "danger";
  format?: "number" | "currency";
}

const variantClasses = {
  default: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const iconVariantClasses = {
  default: "text-slate-600 dark:text-slate-400",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
};

export function KPICard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  variant = "default",
  format = "number",
}: KPICardProps) {
  const formatValue = (val: number | string): string => {
    if (typeof val === "string") return val;
    
    if (format === "currency") {
      return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        minimumFractionDigits: 0,
      }).format(val);
    }
    
    return new Intl.NumberFormat("es-CL").format(val);
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("rounded-lg p-2", variantClasses[variant])}>
          <Icon className={cn("h-4 w-4", iconVariantClasses[variant])} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2 text-xs">
            <span
              className={cn(
                "font-medium",
                trend.value > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : trend.value < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground"
              )}
            >
              {trend.value > 0 ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
